import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const base: GameData = {
  buildings: [],
  plots: [],
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
      attrs: { ...attrs, str: 1, sta: 1 },
      weapon: { baseAttackS: 1, range: 40 },
      bounty: 12,
      xp: 10,
    },
  ],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;

function hero(w: W, x = 500, y = 500): UnitState {
  const id = spawnHero(w, 'warrior', { x, y });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.trait = null;
  u.mode = 'explore';
  return u;
}

function monster(w: W, x: number, y: number): UnitState {
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
    hp: 30,
    maxHp: 30,
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

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const flag = (w: W, x: number, y: number, gold: number): number => {
  const r = command(w, { kind: 'placeBounty', pos: { x, y }, gold });
  if (!r.ok) throw new Error(r.reason);
  return r.id as number;
};
const flagOf = (w: W, id: number) => w.bounties.find((b) => b.id === id);

describe('hunt flags', () => {
  it('a flag placed within 60 of a monster binds to it; farther out it is open ground', () => {
    const w = createWorld(1, base);
    const m = monster(w, 2000, 2000);
    const hunt = flag(w, 2030, 2030, 50);
    const open = flag(w, 2300, 2000, 50);
    expect(flagOf(w, hunt)?.target).toBe(m.id);
    expect(flagOf(w, hunt)?.pos).toEqual(m.pos);
    expect(flagOf(w, open)?.target).toBeUndefined();
    const placed = snapshot(w).events.filter((e) => e.kind === 'bountyPlaced');
    expect(placed.map((e) => (e.kind === 'bountyPlaced' ? e.target : -1))).toEqual([
      m.id,
      undefined,
    ]);
  });

  it('the flag follows the monster', () => {
    const w = createWorld(1, base);
    const m = monster(w, 2000, 2000);
    const id = flag(w, 2000, 2000, 50);
    m.pos = { x: 2400, y: 2100 };
    run(w, 100);
    expect(flagOf(w, id)?.pos).toEqual({ x: 2400, y: 2100 });
  });

  it('is paid to the hero that lands the kill, and the flag is gone', () => {
    const w = createWorld(1, base);
    const h = hero(w, 700, 500);
    const m = monster(w, 740, 500);
    const id = flag(w, 740, 500, 50);
    const ev = run(w, 8_000);
    expect(m.hp).toBe(0);
    expect(flagOf(w, id)).toBeUndefined();
    const claimed = ev.filter((e) => e.kind === 'bountyClaimed');
    expect(claimed).toEqual([{ kind: 'bountyClaimed', bounty: id, unit: h.id, gold: 50 }]);
    // the monster's own 12 gold plus the flag's 50
    expect(h.gold).toBeGreaterThanOrEqual(62);
  });

  it('a kill by something that is no hero takes the flag down with the cancel refund', () => {
    const w = createWorld(1, base);
    const m = monster(w, 2000, 2000);
    const id = flag(w, 2000, 2000, 50);
    const gold = w.gold;
    m.hp = 0;
    w.pendingDeaths.push({ victim: m.id, by: 9999 });
    const ev = run(w, 100);
    expect(flagOf(w, id)).toBeUndefined();
    expect(ev.some((e) => e.kind === 'bountyCancelled' && e.bounty === id && e.refund === 25)).toBe(
      true,
    );
    expect(w.gold).toBe(gold + 25);
  });

  it('its target is not danger: a hero heads for a 50 gold hunt flag it would skip on open ground', () => {
    const near = (hunt: boolean) => {
      const w = createWorld(1, base);
      const h = hero(w, 500, 500);
      const m = monster(w, 900, 500);
      m.mode = 'wander';
      // freeze the monster: a flag on it, or the same flag 120 away from it (open ground)
      const id = flag(w, hunt ? 900 : 900, hunt ? 500 : 620, 50);
      run(w, 1_100);
      return { goal: w.heroRuntime.get(h.id)?.goal, id };
    };
    const hunt = near(true);
    expect(hunt.goal?.kind).toBe('flag');
    expect(hunt.goal?.id).toBe(hunt.id);
    const open = near(false);
    expect(open.goal?.kind).not.toBe('flag');
  });

  it('other monsters near the target do count as danger', () => {
    const w = createWorld(1, base);
    const h = hero(w, 500, 500);
    monster(w, 900, 500);
    for (let i = 0; i < 4; i++) monster(w, 900 + i * 10, 540);
    flag(w, 900, 500, 50);
    run(w, 1_100);
    expect(w.heroRuntime.get(h.id)?.goal?.kind).not.toBe('flag');
  });
});

describe('open ground flags', () => {
  it('are claimed when no monster is within 100, even with one 150 away', () => {
    const w = createWorld(1, base);
    const h = hero(w, 2000, 2000);
    h.mode = 'rest';
    monster(w, 2150, 2000).mode = 'wander';
    const id = flag(w, 2000, 2000, 40);
    run(w, 200);
    expect(flagOf(w, id)).toBeUndefined();
    expect(h.gold).toBe(40);
  });

  it('wait while a monster stands within 100', () => {
    const w = createWorld(1, base);
    const h = hero(w, 2000, 2000);
    h.mode = 'rest';
    const m = monster(w, 2080, 2000);
    m.hp = 1e9;
    m.maxHp = 1e9;
    const id = flag(w, 2000, 2000, 40);
    // the flag sits more than 60 from the monster, so it is open ground
    expect(flagOf(w, id)?.target).toBeUndefined();
    run(w, 200);
    expect(flagOf(w, id)).toBeDefined();
  });
});

describe('responsiveness', () => {
  it('weighing a flag worth 70% of the goal says so once, without switching', () => {
    const w = createWorld(1, base);
    const h = hero(w, 500, 500);
    const a = flag(w, 1500, 500, 200);
    run(w, 1_100);
    expect(w.heroRuntime.get(h.id)?.goal?.id).toBe(a);
    // a: 200 - 50 = 150; b: 140 - 50 = 90 (60%) is below, c: 170 - 50 = 120 (80%) is considered
    flag(w, 1500, 520, 140);
    const c = flag(w, 1500, 540, 170);
    const ev = run(w, 3_000);
    const considering = ev.filter((e) => e.kind === 'considering');
    expect(considering).toEqual([{ kind: 'considering', party: h.party, bounty: c }]);
    expect(w.heroRuntime.get(h.id)?.goal?.id).toBe(a);
  });
});
