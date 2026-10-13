import { describe, expect, it } from 'vitest';
import { STYLE, fxScale, scaledCount } from './style';

describe('style parameters', () => {
  it('has no screen shake', () => {
    expect(STYLE.screenShake).toBe(false);
  });
  it('effects grow with the tier and a boss is biggest', () => {
    expect(fxScale(1)).toBeLessThan(fxScale(2));
    expect(fxScale(2)).toBeLessThan(fxScale(3));
    expect(fxScale(3, true)).toBeGreaterThan(fxScale(3));
    expect(fxScale(9)).toBe(fxScale(3));
    expect(fxScale(0)).toBe(fxScale(1));
  });
  it('scales a particle count and keeps at least one', () => {
    expect(scaledCount(7, 1)).toBe(7);
    expect(scaledCount(7, 0.55)).toBe(4);
    expect(scaledCount(1, 0.1)).toBe(1);
  });
});
