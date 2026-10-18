import { describe, expect, it } from 'vitest';
import { CELL, DIRT_VARIANTS, dirtPlan, tintFor, tintGrid, toneAt } from './groundVariation';

const chan = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

describe('tone map', () => {
  it('is the same for a seed and differs between seeds', () => {
    expect(tintGrid(7, 3000, 2000)).toEqual(tintGrid(7, 3000, 2000));
    expect(tintGrid(7, 3000, 2000).nodes).not.toEqual(tintGrid(8, 3000, 2000).nodes);
  });
  it('has a node for every corner of the map', () => {
    const g = tintGrid(1, 3000, 2000);
    expect(g.cols).toBe(Math.ceil(3000 / CELL));
    expect(g.rows).toBe(Math.ceil(2000 / CELL));
    expect(g.nodes.length).toBe((g.cols + 1) * (g.rows + 1));
  });
  it('stays subtle: no channel falls below 160, most of the map stays near plain green', () => {
    const g = tintGrid(3, 3000, 2000);
    for (const n of g.nodes) for (const v of chan(n)) expect(v).toBeGreaterThanOrEqual(160);
    // Most of the map is close to plain green (every channel within 24 of full), some is not.
    const near = g.nodes.filter((n) => chan(n).every((v) => v >= 231)).length / g.nodes.length;
    expect(near).toBeGreaterThan(0.4);
    expect(near).toBeLessThan(0.98);
  });
  it('tones lie in 0..1 and no tone is a plain tint', () => {
    for (let i = 0; i < 50; i++) {
      const t = toneAt(5, i * 60, i * 37);
      for (const v of [t.dry, t.lush]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    expect(tintFor({ dry: 0, lush: 0 })).toBe(0xffffff);
  });
});

describe('dirtPlan', () => {
  const hall = { x: 1500, y: 1000 };
  const spots = [
    { x: 2020, y: 1000 },
    { x: 1500, y: 1380 },
  ];
  it('is seeded and keeps patches near the hall and its plots', () => {
    const a = dirtPlan(4, hall, spots);
    expect(dirtPlan(4, hall, spots)).toEqual(a);
    expect(dirtPlan(5, hall, spots)).not.toEqual(a);
    expect(a.length).toBeGreaterThanOrEqual(7 + 2 * spots.length);
    for (const d of a) {
      expect(Math.hypot(d.x - hall.x, d.y - hall.y)).toBeLessThan(560);
      expect(d.variant).toBeLessThan(DIRT_VARIANTS);
      expect(d.alpha).toBeGreaterThan(0.2);
      expect(d.alpha).toBeLessThan(0.9);
    }
  });
});
