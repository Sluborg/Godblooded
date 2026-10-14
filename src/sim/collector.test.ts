import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { collectorOf, payIntoTill } from './collector';
import { loadWorld, saveWorld } from './save';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (collector: object = { enabled: true }): GameData => ({
  buildings: [
    { id: 'market', cost: 100 },
    { id: 'temple_aesir', cost: 150 },
  ],
  plots: [
    { x: 700, y: 500 },
    { x: 500, y: 700 },
  ],
  startGold: 1000,
  map: { width: 4000, height: 4000 },
  townHall: { x: 500, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 30, sta: 30 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 8, sta: 3 },
      weapon: { baseAttackS: 1, range: 40 },
      bounty: 12,
      xp: 10,
    },
  ],
  tuning: {
    hero: { firstRecruitMs: 10_000_000, tithe: 0.5 },
    town: { raidFirstMs: 10_000_000 },
    collector,
  },
});

type W = ReturnType<typeof createWorld>;

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

// Runs until the collector carries gold (it picked up a till), at most ms.
function runUntilLoaded(w: W, ms: number): UnitState {
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    snapshot(w);
    const c = collectorOf(w);
    if (c && c.gold > 0) return c;
  }
  throw new Error('the collector never picked anything up');
}

function build(w: W, type: string, plot: number): number {
  const r = command(w, { kind: 'build', type, plot });
  if (!r.ok) throw new Error(r.reason);
  return r.id as number;
}

function monster(w: W, x: number, y: number, hp = 1e6): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type: 'draugr',
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp,
    maxHp: hp,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  };
  w.units.push(u);
  w.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  return u;
}

describe('tills', () => {
  it('with the collector off, tax and tithe go straight to the treasury', () => {
    const w = createWorld(1, data({ enabled: false }));
    const m = build(w, 'market', 0);
    const gold = w.gold;
    payIntoTill(w, m, 30);
    expect(w.gold).toBe(gold + 30);
    expect(w.stats.taxCollected).toBe(30);
    expect(w.buildings.find((b) => b.id === m)?.till).toBeUndefined();
  });

  it('with it on, gold waits in the till and the treasury only gets it on delivery', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    const gold = w.gold;
    payIntoTill(w, m, 30);
    expect(w.gold).toBe(gold);
    expect(w.stats.taxCollected).toBe(0);
    expect(w.buildings.find((b) => b.id === m)?.till).toBe(30);
    const ev = snapshot(w).events;
    expect(ev).toContainEqual({ kind: 'till', building: m, gold: 30, total: 30 });
  });

  it('a hero tithe goes into the till of the temple that called it', () => {
    const w = createWorld(1, data());
    const temple = build(w, 'temple_aesir', 1);
    const id = spawnHero(w, 'warrior', { x: 520, y: 520 }, temple);
    const hero = w.units.find((u) => u.id === id) as UnitState;
    const m = monster(w, 560, 520, 1);
    m.hp = 0;
    w.pendingDeaths.push({ victim: m.id, by: hero.id });
    run(w, 100);
    // bounty 12, tithe 50%: 6 to the temple's till, 6 to the purse
    expect(w.buildings.find((b) => b.id === temple)?.till).toBe(6);
    expect(hero.gold).toBe(6);
  });
});

describe('the collector', () => {
  it('walks to a till, empties it and brings the gold home', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    const gold = w.gold;
    const ev = run(w, 60_000);
    expect(ev.some((e) => e.kind === 'collectorOut')).toBe(true);
    expect(ev).toContainEqual(
      expect.objectContaining({ kind: 'tillEmptied', building: m, gold: 40, carried: 40 }),
    );
    expect(ev).toContainEqual(expect.objectContaining({ kind: 'taxDelivered', gold: 40 }));
    expect(w.gold).toBe(gold + 40);
    expect(w.stats.taxCollected).toBe(40);
    expect(w.buildings.find((b) => b.id === m)?.till).toBe(0);
  });

  it('does not come out for a till under minTill', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 5);
    run(w, 5_000);
    expect(collectorOf(w)).toBeUndefined();
  });

  it('goes home early when a monster is near, and a fallen collector drops its gold', () => {
    const w = createWorld(1, data({ enabled: true, capacity: 40 }));
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    // the collector picks up the 40 and, full, heads home
    const c = runUntilLoaded(w, 20_000);
    expect(c.gold).toBe(40);
    // a monster catches it
    c.hp = 0;
    w.pendingDeaths.push({ victim: c.id, by: 9999 });
    const ev = run(w, 100);
    expect(ev).toContainEqual(expect.objectContaining({ kind: 'collectorDown', gold: 40 }));
    expect(collectorOf(w)).toBeUndefined();
    expect(snapshot(w).drops).toHaveLength(1);
    expect(snapshot(w).drops[0].gold).toBe(40);
  });

  it('a hero standing on the dropped gold takes it; a new collector comes after respawnMs', () => {
    const w = createWorld(1, data({ enabled: true, respawnMs: 10_000 }));
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    const c = runUntilLoaded(w, 20_000);
    const at = { ...c.pos };
    c.hp = 0;
    w.pendingDeaths.push({ victim: c.id, by: 9999 });
    run(w, 100);
    const id = spawnHero(w, 'warrior', at);
    const hero = w.units.find((u) => u.id === id) as UnitState;
    void hero;
    const ev = run(w, 200);
    expect(ev.some((e) => e.kind === 'dropClaimed' && e.unit === id && e.gold === 40)).toBe(true);
    // (the hero went shopping with it right away: the market takes a share)
    expect(w.heroRecords.get(id)?.goldEarned).toBe(40);
    expect(w.drops).toHaveLength(0);
    // more tax, then a new collector only after the respawn time
    payIntoTill(w, m, 30);
    run(w, 3_000);
    expect(collectorOf(w)).toBeUndefined();
    run(w, 10_000);
    expect(collectorOf(w)).toBeDefined();
  });

  it('runs home from a monster', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    run(w, 1_500);
    const c = collectorOf(w);
    if (!c) throw new Error('collector');
    monster(w, c.pos.x + 60, c.pos.y);
    const before = Math.hypot(c.pos.x - 500, c.pos.y - 500);
    run(w, 1_000);
    expect(Math.hypot(c.pos.x - 500, c.pos.y - 500)).toBeLessThan(before);
  });

  it('survives a save: collector, tills and drops', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    run(w, 3_000);
    w.drops.push({ id: w.nextId++, pos: { x: 900, y: 900 }, gold: 25 });
    const back = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data());
    expect(back.drops).toEqual(w.drops);
    expect(collectorOf(back)?.id).toBe(collectorOf(w)?.id);
    expect(back.buildings.find((b) => b.id === m)?.till).toBe(
      w.buildings.find((b) => b.id === m)?.till,
    );
    run(back, 60_000);
    expect(back.stats.taxCollected).toBe(40);
  });
});
