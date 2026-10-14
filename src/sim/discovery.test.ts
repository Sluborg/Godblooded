import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData } from './api';
import { spawnHero } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const data = (discovery = true, over: Partial<GameData> = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 2000, height: 1000 },
  townHall: { x: 200, y: 500 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 8, sta: 60, dex: 5 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'imp',
      attrs: { ...none, str: 1, sta: 3 },
      weapon: { baseAttackS: 2, range: 40 },
      bounty: 5,
      xp: 5,
    },
    {
      id: 'wyrm',
      attrs: { ...none, str: 10, sta: 30 },
      weapon: { baseAttackS: 2, range: 60 },
      bounty: 5,
      xp: 5,
      boss: {},
      hp: 3000,
    },
  ],
  lairs: [
    { id: 'nest', monster: 'imp', spawnS: 100_000, maxAlive: 1, hp: 500 },
    { id: 'den', monster: 'wyrm', spawnS: 100_000, maxAlive: 1, hp: 3000 },
  ],
  lairSites: [
    { lair: 'nest', pos: { x: 500, y: 500 } },
    { lair: 'den', pos: { x: 1800, y: 500 } },
  ],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    boss: { sealUntilMs: 60_000 },
    ai: { discovery },
  },
  ...over,
});

const hero = (w: ReturnType<typeof createWorld>, x: number, y: number): UnitState => {
  const id = spawnHero(w, 'knight', { x, y });
  return w.units.find((u) => u.id === id) as UnitState;
};
const run = (w: ReturnType<typeof createWorld>, ms: number) => {
  for (let t = 0; t < ms; t += TICK_MS) step(w, TICK_MS);
};

describe('discovery', () => {
  it('is off by default: every lair known, no fog in the snapshot', () => {
    const w = createWorld(1, data(false));
    expect(w.lairs.every((l) => l.discovered !== false)).toBe(true);
    expect(snapshot(w).fog).toBeNull();
  });

  it('starts with the far lair in the fog and the near one known', () => {
    const w = createWorld(1, data());
    const [near, far] = w.lairs;
    expect(near.discovered).not.toBe(false);
    expect(far.discovered).toBe(false);
    const fog = snapshot(w).fog;
    expect(fog).toMatchObject({ cell: 200, cols: 10, rows: 5 });
  });

  it('a hero within range discovers a lair, once, with an event', () => {
    const w = createWorld(1, data());
    const h = hero(w, 1500, 500);
    h.mode = 'rest';
    run(w, 2_000);
    const far = w.lairs[1];
    expect(far.discovered).toBe(true);
    expect(snapshot(w).events.filter((e) => e.kind === 'lairFound').length).toBeLessThanOrEqual(1);
  });

  it('heroes explore cells as they pass, and head for the nearest unexplored one', () => {
    const w = createWorld(
      1,
      data(true, { lairSites: [{ lair: 'den', pos: { x: 1800, y: 900 } }] }),
    );
    hero(w, 300, 500);
    run(w, 1_000);
    const first = w.exploredCells.length;
    expect(first).toBeGreaterThan(0);
    run(w, 20_000);
    expect(w.exploredCells.length).toBeGreaterThan(first);
    expect(snapshot(w).fog?.explored.length).toBe(w.exploredCells.length);
  });

  it('the unsealed boss lair is revealed', () => {
    const w = createWorld(1, data());
    expect(w.lairs[1].discovered).toBe(false);
    run(w, 61_000);
    expect(w.lairs[1].discovered).toBe(true);
  });

  it('an undiscovered lair is not a hero goal', () => {
    const w = createWorld(1, data());
    const h = hero(w, 300, 500);
    run(w, 3_000);
    const goal = w.heroRuntime.get(h.id)?.goal;
    expect(goal?.kind === 'lair' ? goal.id : undefined).not.toBe(w.lairs[1].id);
  });

  it("Odin's favour sees through the fog: discoverMult widens the sight", () => {
    const d = data(true, {
      upgrades: [{ id: 'sight', name: 's', text: 's', effect: { keys: { discoverMult: 2 } } }],
    });
    const plain = createWorld(1, d);
    const seer = createWorld(1, d);
    for (const [w, cards] of [
      [plain, []],
      [seer, ['sight']],
    ] as const) {
      const h = hero(w, 1150, 500);
      h.mode = 'rest';
      w.parties.get(h.party)?.upgrades.push(...cards);
      run(w, 1_100);
    }
    expect(plain.lairs[1].discovered).toBe(false);
    expect(seer.lairs[1].discovered).toBe(true);
  });
});
