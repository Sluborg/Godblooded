import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, type GameData } from './api';
import { spawnHero } from './world';
import { attackMs, dodgeChance } from './units';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 1000, height: 1000 },
  townHall: { x: 900, y: 900 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 8, sta: 10 },
      weapon: { baseAttackS: 1.5, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 3, sta: 3 },
      weapon: { baseAttackS: 1.8, range: 40 },
      bounty: 12,
      xp: 10,
    },
  ],
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1, maxAlive: 1, hp: 300 }],
  lairSites: [{ lair: 'barrow', pos: { x: 200, y: 200 } }],
};

function fightWorld(seed: number) {
  const w = createWorld(seed, data);
  step(w, 1100); // one draugr spawns
  spawnHero(w, 'warrior', { x: 260, y: 200 });
  return w;
}

describe('combat formulas', () => {
  it('dex shortens attack time and dodge saturates below 90%', () => {
    const w = { weapon: { baseAttackS: 2, range: 40 } };
    expect(attackMs({ ...w, attrs: { ...attrs, dex: 10 } })).toBeLessThan(
      attackMs({ ...w, attrs: { ...attrs, dex: 0 } }),
    );
    expect(dodgeChance({ ...attrs, dex: 1000 })).toBeLessThan(0.9);
    expect(dodgeChance({ ...attrs, dex: 0 })).toBe(0);
  });
});

describe('combat', () => {
  it('a strong hero kills the monster, which is removed with bounty and xp', () => {
    const w = fightWorld(1);
    step(w, 20_000);
    const s = snapshot(w);
    const died = s.events.filter((e) => e.kind === 'died');
    expect(died.length).toBeGreaterThanOrEqual(1);
    expect(died[0]).toMatchObject({ type: 'draugr', bounty: 12, xp: 10 });
    expect(s.units.filter((u) => u.kind === 'hero')[0].hp).toBeGreaterThan(0);
  });

  it('a hero at 0 hp is knocked out and stops fighting', () => {
    const w = fightWorld(1);
    const hero = w.units.find((u) => u.kind === 'hero');
    const mon = w.units.find((u) => u.kind === 'monster');
    if (!hero || !mon) throw new Error('setup');
    hero.hp = 1;
    mon.hp = mon.maxHp = 100_000;
    mon.pos = { ...hero.pos };
    step(w, 30_000);
    const s = snapshot(w);
    expect(s.events.some((e) => e.kind === 'knockout')).toBe(true);
    const h = s.units.find((u) => u.kind === 'hero');
    expect(h).toMatchObject({ ko: true, hp: 0, target: null });
    expect(s.units.some((u) => u.kind === 'monster')).toBe(true);
  });

  it('monsters chase heroes but give up at the leash', () => {
    const w = createWorld(1, data);
    step(w, 1100);
    spawnHero(w, 'warrior', { x: 900, y: 200 });
    step(w, 5000);
    const mon = w.units.find((u) => u.kind === 'monster');
    expect(mon && Math.hypot(mon.pos.x - 200, mon.pos.y - 200) < 430).toBe(true);
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const w = fightWorld(seed);
      step(w, 15_000);
      return JSON.stringify([snapshot(w).units, w.events]);
    };
    expect(run(5)).toBe(run(5));
  });
});
