import { describe, expect, it } from 'vitest';
import { blobPoints, hash, insidePoly } from './organic';

describe('organic', () => {
  it('is deterministic and varies with the seed', () => {
    expect(hash(3)).toBe(hash(3));
    expect(blobPoints(0, 0, 100, 40, 5)).toEqual(blobPoints(0, 0, 100, 40, 5));
    expect(blobPoints(0, 0, 100, 40, 5)).not.toEqual(blobPoints(0, 0, 100, 40, 6));
  });
  it('stays roughly round around its centre but not a perfect ellipse', () => {
    const pts = blobPoints(0, 0, 100, 100, 2, 0.2, 48);
    const radii = pts.map((p) => Math.hypot(p.x, p.y));
    expect(Math.min(...radii)).toBeGreaterThan(55);
    expect(Math.max(...radii)).toBeLessThan(150);
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(8);
  });
  it('tells inside from outside', () => {
    const pts = blobPoints(0, 0, 100, 60, 1);
    expect(insidePoly(pts, 0, 0)).toBe(true);
    expect(insidePoly(pts, 400, 0)).toBe(false);
  });
});
