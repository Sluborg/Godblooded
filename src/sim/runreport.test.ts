import { describe, expect, it } from 'vitest';
import { command, createWorld, runReport, step, TICK_MS, type GameData } from './api';
import { noteBeat, noteSale } from './runstats';
import { spawnHero } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const data: GameData = {
  buildings: [{ id: 'market', cost: 100 }],
  plots: [{ x: 700, y: 500 }],
  startGold: 1000,
  map: { width: 2000, height: 1000 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 5, sta: 20 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
};

const hero = (w: ReturnType<typeof createWorld>, at: { x: number; y: number }): UnitState => {
  const id = spawnHero(w, 'knight', at);
  return w.units.find((u) => u.id === id) as UnitState;
};

describe('run report: gear, shops and curve beats', () => {
  it('starts empty', () => {
    const r = runReport(createWorld(1, data));
    expect(r.gear).toEqual({ weapon: 0, armour: 0, headgear: 0, offhand: 0 });
    expect(r.shops.market).toEqual({ items: 0, spent: 0, tax: 0 });
    expect(r.beats).toEqual({
      firstPartyMs: null,
      firstTier2Ms: null,
      firstLairFallMs: null,
      firstTier3Ms: null,
    });
  });

  it('notes the first moment only, and tallies sales by shop', () => {
    const w = createWorld(1, data);
    w.timeMs = 5_000;
    noteBeat(w, 'firstTier2Ms');
    w.timeMs = 9_000;
    noteBeat(w, 'firstTier2Ms');
    noteSale(w, 'smithy', 1, 60, 6);
    noteSale(w, 'smithy', 1, 40, 4);
    noteSale(w, 'market', 0, 30, 3);
    const r = runReport(w);
    expect(r.beats.firstTier2Ms).toBe(5_000);
    expect(r.shops.smithy).toEqual({ items: 2, spent: 100, tax: 10 });
    expect(r.shops.market).toEqual({ items: 0, spent: 30, tax: 3 });
  });

  it('means the gear levels of the heroes standing', () => {
    const w = createWorld(1, data);
    const a = hero(w, { x: 600, y: 600 });
    const b = hero(w, { x: 610, y: 600 });
    a.items = { weapon: 2, armour: 1, headgear: 1, offhand: 0, potions: 0, charm: null };
    b.items = { weapon: 0, armour: 1, potions: 0, charm: null };
    expect(runReport(w).gear).toEqual({ weapon: 1, armour: 1, headgear: 0.5, offhand: 0 });
  });

  it('a hero spending at the market counts in the shop tally', () => {
    const w = createWorld(1, data);
    command(w, { kind: 'build', type: 'market', plot: 0 });
    const h = hero(w, { x: 700, y: 500 });
    h.gold = 100;
    h.hp = h.maxHp - 1;
    h.mode = 'rest';
    for (let t = 0; t < 20_000 && runReport(w).shops.market.spent === 0; t += TICK_MS) {
      step(w, TICK_MS);
    }
    const m = runReport(w).shops.market;
    expect(m.spent).toBeGreaterThan(0);
    expect(m.tax).toBeGreaterThan(0);
  });
});
