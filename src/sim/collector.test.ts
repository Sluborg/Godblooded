import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { collectorOf, collectors, dropTill, payIntoTill, uncollected } from './collector';
import { runReport } from './runstats';
import { loadWorld, saveWorld } from './save';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (collector: object = { enabled: true }, extra: Partial<GameData> = {}): GameData => ({
  buildings: [
    { id: 'market', cost: 100 },
    { id: 'tower', cost: 80 },
    { id: 'shrine', cost: 100 },
    { id: 'temple_aesir', cost: 150, pantheon: 'aesir' },
  ],
  plots: [
    { x: 700, y: 500 },
    { x: 500, y: 700 },
    { x: 300, y: 500 },
    { x: 500, y: 300 },
    { x: 700, y: 700 },
    { x: 300, y: 700 },
    { x: 300, y: 300 },
    { x: 700, y: 300 },
  ],
  startGold: 2000,
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
  gods: [{ id: 'odin', pantheon: 'aesir', name: 'Odin', template: 'warrior' }],
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
  ...extra,
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

const tillOf = (w: W, id: number) => w.buildings.find((b) => b.id === id)?.till;

function runUntilLoaded(w: W, ms: number): UnitState {
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    snapshot(w);
    const c = collectors(w).find((x) => x.gold > 0);
    if (c) return c;
  }
  throw new Error('the collector never picked anything up');
}

describe('tills', () => {
  it('with the collector off, tax goes straight to the treasury', () => {
    const w = createWorld(1, data({ enabled: false }));
    const m = build(w, 'market', 0);
    const gold = w.gold;
    payIntoTill(w, m, 30);
    expect(w.gold).toBe(gold + 30);
    expect(w.stats.taxCollected).toBe(30);
    expect(tillOf(w, m)).toBeUndefined();
  });

  it('with it on, tax waits in the shop till and the treasury gets it only on delivery', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    const gold = w.gold;
    payIntoTill(w, m, 30);
    expect(w.gold).toBe(gold);
    expect(tillOf(w, m)).toBe(30);
    expect(snapshot(w).events).toContainEqual({ kind: 'till', building: m, gold: 30, total: 30 });
  });

  it('a bounty sets the tithe aside; it is paid into the home temple on resting, not before', () => {
    const w = createWorld(1, data());
    const far = build(w, 'temple_aesir', 3);
    const near = build(w, 'temple_aesir', 0);
    const id = spawnHero(w, 'warrior', { x: 650, y: 500 });
    const hero = w.units.find((u) => u.id === id) as UnitState;
    hero.god = 'odin';
    hero.mode = 'explore';
    const m = monster(w, 700, 520, 1);
    m.hp = 0;
    w.pendingDeaths.push({ victim: m.id, by: hero.id });
    run(w, 100);
    // bounty 12, tithe 50%: 6 owed, 6 in the purse, nothing in any till yet
    expect(w.heroRuntime.get(id)?.titheOwed).toBe(6);
    expect(hero.gold).toBe(6);
    expect(tillOf(w, near) ?? 0).toBe(0);
    hero.mode = 'return';
    const ev = run(w, 8_000);
    // the nearest temple of its pantheon gets it
    expect(tillOf(w, near)).toBe(6);
    expect(tillOf(w, far) ?? 0).toBe(0);
    expect(ev).toContainEqual({ kind: 'tithe', unit: id, building: near, gold: 6 });
    expect(w.heroRuntime.get(id)?.titheOwed).toBe(0);
  });

  it('with no temple of its pantheon the tithe is banked at once', () => {
    const w = createWorld(1, data());
    const id = spawnHero(w, 'warrior', { x: 520, y: 520 });
    const hero = w.units.find((u) => u.id === id) as UnitState;
    hero.god = 'odin';
    const rt = w.heroRuntime.get(id);
    if (rt) rt.titheOwed = 7;
    const gold = w.gold;
    hero.mode = 'return';
    run(w, 3_000);
    expect(w.gold).toBe(gold + 7);
  });
});

describe('the collector', () => {
  it('is out at the start, a second one comes with the sixth building', () => {
    const w = createWorld(1, data());
    expect(run(w, 100).some((e) => e.kind === 'collectorOut')).toBe(true);
    expect(collectors(w)).toHaveLength(1);
    for (let i = 0; i < 5; i++) build(w, 'shrine', i);
    run(w, 100);
    expect(collectors(w)).toHaveLength(1);
    build(w, 'shrine', 5);
    run(w, 100);
    expect(collectors(w)).toHaveLength(2);
  });

  it('walks to a till, stops, empties it and brings the gold home', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    const gold = w.gold;
    const ev = run(w, 40_000);
    expect(ev).toContainEqual(
      expect.objectContaining({
        kind: 'tillEmptied',
        source: 'till',
        id: m,
        gold: 40,
        carried: 40,
      }),
    );
    expect(ev).toContainEqual(expect.objectContaining({ kind: 'collected', gold: 40 }));
    expect(w.gold).toBe(gold + 40);
    expect(w.stats.taxCollected).toBe(40);
    expect(tillOf(w, m)).toBe(0);
  });

  it('ignores a till under minTill', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 5);
    run(w, 20_000);
    expect(tillOf(w, m)).toBe(5);
  });

  it('turns for home when it is hit, and when a monster is near', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 1);
    payIntoTill(w, m, 40);
    run(w, 2_000);
    const c = collectorOf(w);
    if (!c) throw new Error('collector');
    const before = Math.hypot(c.pos.x - 500, c.pos.y - 500);
    c.hp -= 5;
    const ev = run(w, 600);
    expect(ev.some((e) => e.kind === 'collectorHit')).toBe(true);
    expect(Math.hypot(c.pos.x - 500, c.pos.y - 500)).toBeLessThan(before);
    // a monster close by sends it home too
    const w2 = createWorld(1, data());
    const m2 = build(w2, 'market', 0);
    payIntoTill(w2, m2, 40);
    run(w2, 1_500);
    const c2 = collectorOf(w2);
    if (!c2) throw new Error('collector');
    monster(w2, c2.pos.x + 60, c2.pos.y);
    const d0 = Math.hypot(c2.pos.x - 500, c2.pos.y - 500);
    run(w2, 800);
    expect(Math.hypot(c2.pos.x - 500, c2.pos.y - 500)).toBeLessThan(d0);
  });

  it('a fallen collector leaves its gold as a pile only a collector takes; a new one comes later', () => {
    const w = createWorld(1, data({ enabled: true, respawnMs: 10_000, carryCap: 40 }));
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    const c = runUntilLoaded(w, 20_000);
    expect(c.gold).toBe(40);
    const at = { ...c.pos };
    c.hp = 0;
    w.pendingDeaths.push({ victim: c.id, by: 9999 });
    const ev = run(w, 100);
    expect(ev).toContainEqual(expect.objectContaining({ kind: 'collectorFell', gold: 40 }));
    expect(w.stats.taxLost).toBe(40);
    expect(snapshot(w).piles).toEqual([expect.objectContaining({ gold: 40, pos: at })]);
    // a hero standing on it leaves it alone
    const id = spawnHero(w, 'warrior', at);
    const hero = w.units.find((u) => u.id === id) as UnitState;
    run(w, 3_000);
    expect(w.piles).toHaveLength(1);
    expect(hero.gold).toBe(0);
    // the replacement comes after respawnMs, picks the pile up and banks it
    expect(collectorOf(w)).toBeUndefined();
    const ev2 = run(w, 40_000);
    expect(ev2.some((e) => e.kind === 'collectorOut')).toBe(true);
    expect(ev2).toContainEqual(
      expect.objectContaining({ kind: 'tillEmptied', source: 'pile', gold: 40 }),
    );
    expect(w.piles).toHaveLength(0);
    expect(w.stats.taxCollected).toBe(40);
    // the gold was dropped, then brought home: banked once, not also counted as lost
    expect(w.stats.taxLost).toBe(0);
  });

  it('two collectors never go to the same till', () => {
    const w = createWorld(1, data());
    for (let i = 0; i < 6; i++) build(w, 'shrine', i);
    run(w, 100);
    expect(collectors(w)).toHaveLength(2);
    const ids = w.buildings
      .filter((b) => b.type === 'shrine')
      .slice(0, 2)
      .map((b) => b.id);
    for (const id of ids) payIntoTill(w, id, 50);
    run(w, 300);
    const stops = collectors(w).map((c) => w.unitRuntime.get(c.id)?.collector?.stop?.id);
    expect(stops.every((s) => s !== undefined)).toBe(true);
    expect(new Set(stops).size).toBe(2);
  });

  it('a destroyed building drops its till as a pile', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 25);
    const b = w.buildings.find((x) => x.id === m);
    if (!b) throw new Error('building');
    dropTill(w, b);
    expect(w.piles).toEqual([expect.objectContaining({ gold: 25, pos: b.pos })]);
    expect(b.till).toBe(0);
  });

  it('a tower shoots a monster that attacks a collector within its range', () => {
    const w = createWorld(1, data({ enabled: true, fearRange: 0 }));
    build(w, 'tower', 0);
    const m = build(w, 'market', 4);
    payIntoTill(w, m, 40);
    run(w, 1_000);
    const c = collectorOf(w);
    if (!c) throw new Error('collector');
    // the monster stands beyond the tower's range (300) but is on the collector inside it
    const t = w.buildings.find((x) => x.type === 'tower');
    if (!t) throw new Error('tower');
    c.pos = { x: t.pos.x + 280, y: t.pos.y };
    const foe = monster(w, t.pos.x + 330, t.pos.y);
    foe.target = c.id;
    const hp = foe.hp;
    // the first shots, before the monster has walked into the tower's own range
    run(w, 100);
    expect(foe.hp).toBeLessThan(hp);
  });

  it('survives a save: collector, tills and piles', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    run(w, 3_000);
    w.piles.push({ id: w.nextId++, pos: { x: 900, y: 900 }, gold: 25 });
    w.collectorQueue.push(w.timeMs + 5_000);
    const back = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data());
    expect(back.piles).toEqual(w.piles);
    expect(back.collectorQueue).toEqual(w.collectorQueue);
    expect(collectorOf(back)?.id).toBe(collectorOf(w)?.id);
    expect(tillOf(back, m)).toBe(tillOf(w, m));
  });

  it('the report counts banked, lost and uncollected gold', () => {
    const w = createWorld(1, data());
    const m = build(w, 'market', 0);
    payIntoTill(w, m, 40);
    w.piles.push({ id: w.nextId++, pos: { x: 900, y: 900 }, gold: 25 });
    expect(uncollected(w)).toBe(65);
    const r = runReport(w);
    expect(r).toMatchObject({ taxBanked: 0, taxLost: 0, uncollected: 65 });
  });
});
