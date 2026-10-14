import { describe, expect, it } from 'vitest';
import { command, createWorld, step, TICK_MS, type GameData } from './api';
import { bond, addBond, refreshMaxHp } from './parties';
import { hearthBuff } from './hearth';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (buildings: string[]): GameData => ({
  buildings: [
    { id: 'hearth_hall', cost: 100, hall: true },
    { id: 'shrine', cost: 100 },
  ],
  plots: [
    { x: 900, y: 500 },
    { x: 300, y: 500 },
  ],
  startGold: 1000,
  map: { width: 3000, height: 2000 },
  townHall: { x: 600, y: 500 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    party: { mergeEveryTicks: 1 },
  },
  ...(buildings.length ? {} : {}),
});

type W = ReturnType<typeof createWorld>;

function world(types: ('hearth_hall' | 'shrine')[]): W {
  const w = createWorld(1, data(types));
  types.forEach((type, i) => {
    command(w, { kind: 'build', type, plot: i });
  });
  return w;
}

const hero = (w: W, x: number, y: number): UnitState => {
  const id = spawnHero(w, 'warrior', { x, y });
  const u = w.units.find((v) => v.id === id) as UnitState;
  return u;
};

const run = (w: W, ms: number) => {
  for (let t = 0; t < ms; t += TICK_MS) step(w, TICK_MS);
};

describe('Hearth Hall', () => {
  it('heroes rest 1.5 times faster there than at the town hall', () => {
    const gain = (types: ('hearth_hall' | 'shrine')[]) => {
      const w = world(types);
      const h = hero(w, 880, 500);
      h.mode = 'rest';
      h.hp = h.maxHp * 0.3;
      const start = h.hp;
      run(w, 2_000);
      return h.hp - start;
    };
    // the hall-rest baseline is the town hall (no hearth, no shrine)
    const base = (() => {
      const w = world([]);
      const h = hero(w, 880, 500);
      h.mode = 'rest';
      h.hp = h.maxHp * 0.3;
      const start = h.hp;
      run(w, 2_000);
      return h.hp - start;
    })();
    expect(gain(['hearth_hall']) / base).toBeCloseTo(1.5, 1);
  });

  it('with a shrine too, the closer one; a party below half hp takes the shrine', () => {
    const w = world(['hearth_hall', 'shrine']);
    // hearth at plot 0 (900,500), shrine at plot 1 (300,500)
    const near = hero(w, 880, 500);
    near.mode = 'return';
    near.hp = near.maxHp * 0.8;
    run(w, 100);
    const hurt = hero(w, 880, 520);
    hurt.mode = 'return';
    hurt.hp = hurt.maxHp * 0.2;
    // hurt's own party is below half: it heads for the shrine (300) instead of the hearth (900)
    run(w, 3_000);
    expect(Math.abs(hurt.pos.x - 300)).toBeLessThan(Math.abs(near.pos.x - 300));
    expect(Math.abs(near.pos.x - 900)).toBeLessThan(120);
  });

  it('parties merge within 400 instead of 250 while one stands', () => {
    const merged = (types: ('hearth_hall' | 'shrine')[]) => {
      const w = world(types);
      const a = hero(w, 1400, 1200);
      const b = hero(w, 1750, 1200);
      addBond(w, a.id, b.id, 10);
      expect(bond(w, a.id, b.id)).toBeGreaterThan(5);
      run(w, 200);
      return a.party === b.party;
    };
    expect(merged([])).toBe(false);
    expect(merged(['hearth_hall'])).toBe(true);
  });

  it('bonds grow 1.5 times faster from tier 2', () => {
    const w = world(['hearth_hall']);
    const a = hero(w, 1400, 1200);
    const b = hero(w, 1450, 1200);
    addBond(w, a.id, b.id, 1);
    expect(bond(w, a.id, b.id)).toBe(1);
    const h = w.buildings.find((x) => x.type === 'hearth_hall');
    if (h) h.tier = 2;
    addBond(w, a.id, b.id, 1);
    expect(bond(w, a.id, b.id)).toBeCloseTo(2.5);
    addBond(w, a.id, b.id, -1);
    expect(bond(w, a.id, b.id)).toBeCloseTo(1.5);
  });

  it('tier 3: a resting hero has 10% more max hp until it next rests elsewhere', () => {
    const w = world(['hearth_hall']);
    const h = w.buildings.find((x) => x.type === 'hearth_hall');
    if (h) h.tier = 3;
    const u = hero(w, 880, 500);
    const base = u.maxHp;
    u.mode = 'return';
    u.hp = u.maxHp * 0.5;
    run(w, 3_000);
    expect(u.maxHp).toBe(base + Math.round(base * 0.1));
    const rt = w.heroRuntime.get(u.id);
    if (!rt) throw new Error('no runtime');
    // A card or a new tier recomputes max hp: the buff counts once, not twice.
    refreshMaxHp(w, u);
    expect(u.maxHp).toBe(base + Math.round(base * 0.1));
    hearthBuff(w, u, rt, false);
    expect(u.maxHp).toBe(base);
    refreshMaxHp(w, u);
    expect(u.maxHp).toBe(base);
  });
});
