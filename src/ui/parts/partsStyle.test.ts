import { describe, expect, it } from 'vitest';
import { gradePixels } from './partsStyle';

describe('gradePixels', () => {
  it('mutes a saturated colour a little and warms it', () => {
    const px = new Uint8ClampedArray([200, 40, 40, 255]);
    gradePixels(px, 0.9, 0.04);
    // less saturated: the gap between red and green shrinks
    expect(px[0] - px[1]).toBeLessThan(160);
    expect(px[0] - px[1]).toBeGreaterThan(120);
    // warmer: red above, blue below, what plain desaturation would give
    const plain = new Uint8ClampedArray([200, 40, 40, 255]);
    gradePixels(plain, 0.9, 0);
    expect(px[0]).toBeGreaterThan(plain[0]);
    expect(px[2]).toBeLessThan(plain[2]);
  });
  it('leaves a grey and transparent pixels alone (no warmth)', () => {
    const px = new Uint8ClampedArray([100, 100, 100, 255, 10, 20, 30, 0]);
    gradePixels(px, 0.9, 0);
    expect([...px]).toEqual([100, 100, 100, 255, 10, 20, 30, 0]);
  });
});
