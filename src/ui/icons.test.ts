import { describe, expect, it } from 'vitest';
import { iconScale } from './icons';

describe('iconScale', () => {
  it('fits the longer side into the box', () => {
    expect(iconScale(200, 100, 50)).toBeCloseTo(0.25);
    expect(iconScale(98, 247, 40) * 247).toBeCloseTo(40);
  });
  it('never divides by zero', () => {
    expect(Number.isFinite(iconScale(0, 0, 40))).toBe(true);
  });
});
