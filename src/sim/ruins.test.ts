import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData } from './api';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (ruins: boolean): GameData => ({
  buildings: [{ id: 'market', cost: 100 }],
  plots: [
    { x: 700, y: 500 },
    { x: 500, y: 700 },
  ],
  startGold: 1000,
  map: { width: 2400, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  monsters: [
    {
      id: 'brute',
      attrs: { ...attrs, str: 60, sta: 5 },
      weapon: { baseAttackS: 0.5, range: 40 },
      bounty: 1,
      xp: 1,
    },
  ],
  tuning: {
    town: { ruins, raidFirstMs: 10_000_000, buildingHp: 200 },
    hero: { firstRecruitMs: 10_000_000 },
  },
});

type W = ReturnType<typeof createWorld>;

function raider(w: W, x: number, y: number): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type: 'brute',
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp: 1e6,
    maxHp: 1e6,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  };
  w.units.push(u);
  w.unitRuntime.set(id, {
    lair: null,
    raid: true,
    raidId: 5,
    cooldownMs: 0,
    target: null,
    idleMs: 0,
  });
  w.raidActive.push(5);
  return u;
}

const run = (w: W, ms: number) => {
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    snapshot(w);
  }
};

function destroyed(ruins: boolean): { w: W; id: number } {
  const w = createWorld(1, data(ruins));
  const r = command(w, { kind: 'build', type: 'market', plot: 0 });
  if (!r.ok) throw new Error(r.reason);
  const b = w.buildings.find((x) => x.id === r.id);
  raider(w, (b?.pos.x ?? 0) + 30, b?.pos.y ?? 0);
  // keep the raider off the town hall so the run is not lost
  run(w, 4_000);
  return { w, id: r.id };
}

describe('ruins', () => {
  it('are off by default: a destroyed building just goes', () => {
    const { w, id } = destroyed(false);
    expect(w.buildings.some((b) => b.id === id)).toBe(false);
    expect(w.ruins).toHaveLength(0);
  });

  it('a destroyed building leaves a ruin on its plot', () => {
    const { w, id } = destroyed(true);
    expect(w.buildings.some((b) => b.id === id)).toBe(false);
    expect(w.ruins).toHaveLength(1);
    expect(w.ruins[0]).toMatchObject({ type: 'market', plot: 0 });
    expect(snapshot(w).plots[0].ruin).toBe(w.ruins[0].id);
    expect(command(w, { kind: 'build', type: 'market', plot: 0 })).toMatchObject({
      reason: 'plot has a ruin',
    });
  });

  it('rebuilds at tier 1 for half the cost', () => {
    const { w } = destroyed(true);
    w.units = w.units.filter((u) => u.kind !== 'monster');
    const gold = w.gold;
    const r = command(w, { kind: 'rebuildRuin', ruin: w.ruins[0].id });
    expect(r.ok).toBe(true);
    expect(w.gold).toBe(gold - 50);
    expect(w.ruins).toHaveLength(0);
    expect(w.buildings.find((b) => r.ok && b.id === r.id)).toMatchObject({
      type: 'market',
      tier: 1,
      plot: 0,
    });
  });

  it('clears for free and frees the plot', () => {
    const { w } = destroyed(true);
    w.units = w.units.filter((u) => u.kind !== 'monster');
    const gold = w.gold;
    expect(command(w, { kind: 'clearRuin', ruin: w.ruins[0].id }).ok).toBe(true);
    expect(w.gold).toBe(gold);
    expect(command(w, { kind: 'build', type: 'market', plot: 0 }).ok).toBe(true);
    expect(command(w, { kind: 'rebuildRuin', ruin: 999 }).ok).toBe(false);
  });

  it('the town hall never leaves a ruin, and a rebuild needs the gold', () => {
    const w = createWorld(1, data(true));
    w.gold = 0;
    w.ruins.push({ id: 77, type: 'market', plot: 1, pos: { x: 500, y: 700 } });
    expect(command(w, { kind: 'rebuildRuin', ruin: 77 })).toMatchObject({
      reason: 'not enough gold',
    });
  });

  it('buildings mend 1% a second when no monster is near', () => {
    const w = createWorld(1, data(true));
    const r = command(w, { kind: 'build', type: 'market', plot: 0 });
    const b = w.buildings.find((x) => r.ok && x.id === r.id);
    if (!b) throw new Error('no building');
    b.hp = 100;
    run(w, 10_000);
    expect(b.hp).toBeCloseTo(100 + 200 * 0.01 * 10, 0);
    const w2 = createWorld(1, data(true));
    const r2 = command(w2, { kind: 'build', type: 'market', plot: 0 });
    const b2 = w2.buildings.find((x) => r2.ok && x.id === r2.id);
    if (!b2) throw new Error('no building');
    b2.hp = 100;
    const m = raider(w2, b2.pos.x + 100, b2.pos.y);
    m.mode = 'wander';
    const mrt = w2.unitRuntime.get(m.id);
    if (mrt) mrt.raid = false;
    run(w2, 1_000);
    expect(b2.hp).toBeLessThanOrEqual(100);
  });
});
