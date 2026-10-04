import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, type GameData } from './api';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [
    { id: 'temple_aesir', cost: 100 },
    { id: 'market', cost: 100 },
    { id: 'shrine', cost: 100 },
  ],
  plots: [
    { x: 700, y: 500 },
    { x: 800, y: 500 },
    { x: 900, y: 500 },
  ],
  startGold: 1000,
  map: { width: 2000, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 7, sta: 8 },
      weapon: { baseAttackS: 1.5, range: 40 },
      startGold: 50,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 2, sta: 2 },
      weapon: { baseAttackS: 2, range: 40 },
      bounty: 12,
      xp: 10,
    },
  ],
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 5, maxAlive: 3, hp: 300 }],
  lairSites: [{ lair: 'barrow', pos: { x: 1000, y: 500 } }],
};

function town(buildings: string[], quiet = false) {
  const w = createWorld(1, quiet ? { ...data, lairSites: [] } : data);
  buildings.forEach((type, plot) => command(w, { kind: 'build', type, plot }));
  return w;
}

const heroes = (w: ReturnType<typeof town>) => snapshot(w).units.filter((u) => u.kind === 'hero');

describe('temples', () => {
  it('recruit heroes over time, capped per temple', () => {
    const w = town(['temple_aesir']);
    expect(heroes(w)).toHaveLength(0);
    step(w, 6_000);
    const first = heroes(w);
    expect(first).toHaveLength(1);
    expect(first[0].gold).toBe(50);
    step(w, 5 * 60_000);
    expect(heroes(w).length).toBeLessThanOrEqual(4);
  });

  it('a town without a temple draws nobody', () => {
    const w = town(['market']);
    step(w, 60_000);
    expect(heroes(w)).toHaveLength(0);
  });
});

describe('hero life', () => {
  it('heroes explore toward lairs, fight, and earn the bounty', () => {
    const w = town(['temple_aesir']);
    step(w, 120_000);
    const s = snapshot(w);
    expect(s.events.some((e) => e.kind === 'died')).toBe(true);
    const goldNow = heroes(w).map((h) => h.gold);
    expect(goldNow.some((g) => g > 50)).toBe(true);
  });

  it('a hurt hero flees, rests at the town hall and heals fully', () => {
    const w = town([], true);
    const id = spawnHero(w, 'warrior', { x: 1500, y: 900 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('setup');
    hero.hp = 5;
    step(w, 100);
    expect(hero.mode).toBe('return');
    expect(w.events.some((e) => e.kind === 'fled')).toBe(true);
    for (let i = 0; i < 2400 && hero.hp < hero.maxHp; i++) step(w, 50);
    expect(hero.hp).toBe(hero.maxHp);
    expect(Math.hypot(hero.pos.x - 600, hero.pos.y - 500)).toBeLessThan(60);
  });

  it('a shrine heals faster than the town hall', () => {
    const healTime = (buildings: string[]) => {
      const w = town(buildings, true);
      const id = spawnHero(w, 'warrior', { x: 800, y: 500 });
      const hero = w.units.find((u) => u.id === id);
      if (!hero) throw new Error('setup');
      hero.hp = 5;
      hero.mode = 'return';
      let t = 0;
      while (hero.hp < hero.maxHp && t < 120_000) {
        step(w, 50);
        t += 50;
      }
      return t;
    };
    expect(healTime(['shrine'])).toBeLessThan(healTime([]));
  });

  it('a knocked out hero is revived at the town hall', () => {
    const w = town([], true);
    const id = spawnHero(w, 'warrior', { x: 1500, y: 900 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('setup');
    hero.hp = 0;
    hero.ko = true;
    hero.mode = 'ko';
    w.heroRuntime.get(id)!.koMs = 10_000;
    step(w, 9_000);
    expect(hero.ko).toBe(true);
    step(w, 2_000);
    expect(hero.ko).toBe(false);
    expect(hero.hp).toBeGreaterThan(0);
    expect(w.events.some((e) => e.kind === 'revived')).toBe(true);
  });

  it('a rested hero with gold shops at the market and the town taxes the sale', () => {
    const w = town(['market']);
    const id = spawnHero(w, 'warrior', { x: 700, y: 500 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('setup');
    hero.gold = 100;
    hero.hp = hero.maxHp - 1;
    hero.mode = 'rest';
    const before = w.gold;
    for (let i = 0; i < 400 && !w.events.some((e) => e.kind === 'shopped'); i++) step(w, 50);
    const sale = w.events.find((e) => e.kind === 'shopped');
    expect(sale).toMatchObject({ spent: 60, tax: 30 });
    expect(w.gold).toBe(before + 30);
    expect(hero.gold).toBe(40);
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const w = createWorld(seed, data);
      command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
      step(w, 90_000);
      return JSON.stringify(snapshot(w));
    };
    expect(run(2)).toBe(run(2));
  });
});
