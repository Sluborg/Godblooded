import { describe, expect, it } from 'vitest';
import { createWorld, type GameData } from './api';
import { generateMap } from './mapgen';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const lair = (id: string) => ({ id, monster: 'm', spawnS: 10, maxAlive: 2, hp: 100 });
const data = (rules: object = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 3000 },
  townHall: { x: 2000, y: 1500 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  monsters: [{ id: 'm', attrs, weapon: { baseAttackS: 1, range: 40 }, bounty: 1, xp: 1 }],
  lairs: ['a', 'b', 'wyrm-nest', 'serpent-shore', 'hydra-marsh', 'gate-of-hades'].map(lair),
  mapRules: {
    lairs: [3, 3],
    pool: [
      { lair: 'a', pantheon: 'aesir' },
      { lair: 'b', pantheon: 'aesir' },
    ],
    boss: 'wyrm-nest',
    leanCount: 1,
    leanWeight: 3,
    margin: 150,
    minTownDist: 400,
    minLairDist: 200,
    ...rules,
  },
});

const bossOf = (seed: number, d: GameData, avoid?: string) => {
  const m = generateMap(seed, d, avoid);
  return m.sites[m.bossIndex].lair;
};

describe('boss by lean', () => {
  const byLean = {
    bossesByPantheon: {
      aesir: ['wyrm-nest', 'serpent-shore'],
      greek: ['hydra-marsh', 'gate-of-hades'],
    },
  };

  it('picks one of the lean pantheon pair, seeded, both turning up', () => {
    const d = data(byLean);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const boss = bossOf(seed, d);
      expect(['wyrm-nest', 'serpent-shore']).toContain(boss);
      expect(bossOf(seed, d)).toBe(boss);
      seen.add(boss);
    }
    expect(seen.size).toBe(2);
  });

  it('follows the lean: a Greek lean gets a Greek boss', () => {
    const d = data({
      ...byLean,
      pool: [
        { lair: 'a', pantheon: 'greek' },
        { lair: 'b', pantheon: 'greek' },
      ],
    });
    for (let seed = 1; seed <= 20; seed++) {
      expect(['hydra-marsh', 'gate-of-hades']).toContain(bossOf(seed, d));
    }
  });

  it('never the boss of the previous run when there is a pair', () => {
    const d = data(byLean);
    for (let seed = 1; seed <= 30; seed++) {
      expect(bossOf(seed, d, 'wyrm-nest')).toBe('serpent-shore');
      expect(bossOf(seed, d, 'serpent-shore')).toBe('wyrm-nest');
    }
  });

  it('falls back to the single boss row without a row for the lean', () => {
    const d = data({ bossesByPantheon: { greek: ['hydra-marsh'] } });
    expect(bossOf(1, d)).toBe('wyrm-nest');
    expect(bossOf(1, data())).toBe('wyrm-nest');
  });

  it('a world uses it, and avoidBoss reaches the map', () => {
    const d = data(byLean);
    const w = createWorld(3, d, { avoidBoss: 'wyrm-nest' });
    const boss = w.lairs.find((l) => l.boss);
    expect(boss?.type).toBe('serpent-shore');
  });

  it('does not change the maps of data without a boss pair', () => {
    const plain = data();
    const withEmpty = data({ bossesByPantheon: {} });
    for (let seed = 1; seed <= 5; seed++) {
      expect(generateMap(seed, withEmpty)).toEqual(generateMap(seed, plain));
    }
  });
});
