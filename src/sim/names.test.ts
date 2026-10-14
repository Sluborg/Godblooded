import { describe, expect, it } from 'vitest';
import { NAMES } from '../data/names';
import { createWorld, runReport, type GameData } from './api';
import { spawnHero } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const data = (names = true): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 5, sta: 30 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  gods: [
    { id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' },
    { id: 'ares', pantheon: 'greek', name: 'Ares', template: 'knight' },
    { id: 'anubis', pantheon: 'egyptian', name: 'Anubis', template: 'knight' },
  ],
  ...(names ? { names: NAMES } : {}),
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
});

const hero = (w: ReturnType<typeof createWorld>, god: string): UnitState => {
  const id = spawnHero(w, god, { x: 600, y: 600 });
  return w.units.find((u) => u.id === id) as UnitState;
};

describe('hero names', () => {
  it('every hero gets a name from its pantheon, the same for the same seed', () => {
    const w = createWorld(7, data());
    const a = hero(w, 'thor');
    const b = hero(createWorld(7, data()), 'thor');
    expect(a.name).toBeTruthy();
    expect(a.name).toBe(b.name);
    expect(hero(w, 'ares').name).toMatch(/^[A-Z]/);
  });

  it('reads as a given name with parentage or an epithet', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const w = createWorld(seed, data());
      for (const god of ['thor', 'ares', 'anubis']) {
        const n = hero(w, god).name as string;
        seen.add(n);
        const [given, ...rest] = n.split(' ');
        expect(rest.length).toBeGreaterThan(0);
        const set = NAMES[{ thor: 'aesir', ares: 'greek', anubis: 'egyptian' }[god] as string];
        expect([...set.male, ...set.female]).toContain(given);
      }
    }
    const all = [...seen];
    expect(all.some((n) => /(son|dottir)$/.test(n))).toBe(true);
    expect(all.some((n) => / (son|daughter) of /.test(n))).toBe(true);
    expect(all.length).toBeGreaterThan(60);
  });

  it('does not touch the run: no names, no change; naming draws no random numbers', () => {
    const a = createWorld(3, data(false));
    const b = createWorld(3, data(true));
    const ua = hero(a, 'thor');
    const ub = hero(b, 'thor');
    expect(ua.name).toBeUndefined();
    expect(ub.trait).toBe(ua.trait);
    expect(a.rng.state()).toEqual(b.rng.state());
  });

  it('the run report carries the name', () => {
    const w = createWorld(2, data());
    const u = hero(w, 'thor');
    expect(runReport(w).heroes.find((h) => h.unit === u.id)?.name).toBe(u.name);
  });

  it('name lists are long enough and unique per pantheon', () => {
    for (const set of Object.values(NAMES)) {
      expect(set.male.length + set.female.length).toBeGreaterThanOrEqual(40);
      expect(new Set(set.male).size).toBe(set.male.length);
      expect(new Set(set.female).size).toBe(set.female.length);
      expect(set.epithets.length).toBeGreaterThanOrEqual(15);
      for (const g of [...set.male, ...set.female]) expect(g.length).toBeLessThanOrEqual(10);
    }
  });
});
