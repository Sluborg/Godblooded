import { describe, expect, it } from 'vitest';
import { GROUND, gradedHex, groundPlan } from './ground';

describe('groundPlan', () => {
  it('is the same every time and stays inside the tile', () => {
    const a = groundPlan();
    expect(groundPlan()).toEqual(a);
    for (const t of a.tufts) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThan(GROUND.tileSize);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThan(GROUND.tileSize);
    }
  });
  it('scales with the area like the prototype (about 620 tufts on 1280x720)', () => {
    const { tufts, flowers } = groundPlan(1000);
    expect(tufts.length).toBe(GROUND.tuftsPerMegapx);
    expect(flowers.length).toBe(GROUND.flowersPerMegapx);
    const light = tufts.filter((t) => t.light).length / tufts.length;
    expect(light).toBeGreaterThan(0.2);
    expect(light).toBeLessThan(0.4);
  });
});

describe('gradedHex', () => {
  it('keeps a valid colour and leans warm', () => {
    const g = gradedHex(GROUND.grass);
    expect(g).toMatch(/^#[0-9a-f]{6}$/);
    expect(parseInt(g.slice(1, 3), 16)).toBeGreaterThan(parseInt('7f', 16) - 8);
  });
});
