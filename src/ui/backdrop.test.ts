import { describe, expect, it } from 'vitest';
import { coverScale, punchPixels } from './backdrop';

describe('coverScale', () => {
  it('covers the screen for a 16:9 and a 4:3 picture', () => {
    expect(coverScale(1280, 720)).toBeCloseTo(1);
    expect(coverScale(1024, 768)).toBeCloseTo(1.25);
    expect(coverScale(2560, 1440)).toBeCloseTo(0.5);
  });
});

describe('punchPixels', () => {
  it('adds contrast about mid grey and keeps alpha', () => {
    const d = new Uint8ClampedArray([200, 200, 200, 255, 50, 50, 50, 128]);
    punchPixels(d, 1.2, 1);
    expect(d[0]).toBeGreaterThan(200);
    expect(d[4]).toBeLessThan(50);
    expect(d[3]).toBe(255);
    expect(d[7]).toBe(128);
  });

  it('saturates a colour away from its grey', () => {
    const d = new Uint8ClampedArray([200, 100, 100, 255]);
    punchPixels(d, 1, 1.5);
    expect(d[0] - d[1]).toBeGreaterThan(100);
  });
});
