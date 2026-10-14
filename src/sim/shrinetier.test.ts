import { describe, expect, it } from 'vitest';
import { createWorld, step, TICK_MS, type GameData } from './api';
import { spawnHero } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const data: GameData = {
  buildings: [{ id: 'shrine', cost: 100 }],
  plots: [{ x: 700, y: 500 }],
  startGold: 1000,
  map: { width: 2000, height: 1000 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 5, sta: 40 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000, hallTiers: false },
  },
};

function healed(tier: number): number {
  const w = createWorld(1, data);
  w.buildings.push({
    id: w.nextId++,
    type: 'shrine',
    tier,
    pos: { x: 700, y: 500 },
    plot: 0,
    hp: 100,
    maxHp: 100,
  });
  const id = spawnHero(w, 'knight', { x: 700, y: 520 });
  const u = w.units.find((x) => x.id === id) as UnitState;
  u.mode = 'rest';
  u.hp = u.maxHp * 0.05;
  const before = u.hp;
  for (let t = 0; t < 1_000; t += TICK_MS) step(w, TICK_MS);
  return u.hp - before;
}

describe('shrine tiers', () => {
  it('rest faster by tier: 3, 4, 5 times', () => {
    const [a, b, c] = [healed(1), healed(2), healed(3)];
    expect(b / a).toBeCloseTo(4 / 3, 1);
    expect(c / a).toBeCloseTo(5 / 3, 1);
  });
});
