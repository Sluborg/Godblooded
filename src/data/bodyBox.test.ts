import { describe, expect, it } from 'vitest';
import { BODY_BOX, BODY_BOX_HIP, boxPoint } from './bodyBox';

describe('body box', () => {
  it('is 352 x 400 px at 16 px per unit, the prototype body ratio 14 : 16', () => {
    expect(BODY_BOX.w * BODY_BOX.ppu).toBe(352);
    expect(BODY_BOX.h * BODY_BOX.ppu).toBe(400);
    expect(BODY_BOX.w / BODY_BOX.h).toBeCloseTo(14 / 16, 1);
  });
  it('keeps every anchor inside the box and the feet just below it', () => {
    for (const f of [
      BODY_BOX.anchors.hip,
      BODY_BOX.anchors.neck,
      BODY_BOX.anchors.clasp,
      BODY_BOX.hands.back,
      BODY_BOX.hands.front,
    ]) {
      expect(f[0]).toBeGreaterThanOrEqual(0);
      expect(f[0]).toBeLessThanOrEqual(1);
      expect(f[1]).toBeGreaterThanOrEqual(0);
      expect(f[1]).toBeLessThanOrEqual(1);
    }
    expect(BODY_BOX.feet.y).toBeGreaterThan(1);
    expect(BODY_BOX.feet.y).toBeLessThan(1.15);
  });
  it('puts the hip on the rig pivot, the chin at the top and the feet near the ground', () => {
    expect(boxPoint(BODY_BOX.anchors.hip)).toEqual(BODY_BOX_HIP);
    const neck = boxPoint(BODY_BOX.anchors.neck);
    expect(neck.y).toBeLessThan(BODY_BOX_HIP.y - 8);
    // The feet land about 1.5 units under the box and a few units above the ground (ball feet are
    // about 3 units tall).
    const foot = boxPoint([0.5, BODY_BOX.feet.y]);
    expect(foot.y).toBeGreaterThan(-4);
    expect(foot.y).toBeLessThan(1);
  });
  it('has the back hand on the cape side and the front hand ahead', () => {
    expect(BODY_BOX.hands.back[0]).toBeLessThan(0.5);
    expect(BODY_BOX.hands.front[0]).toBeGreaterThan(0.5);
    expect(BODY_BOX.anchors.clasp[0]).toBeLessThan(0.5);
  });
});
