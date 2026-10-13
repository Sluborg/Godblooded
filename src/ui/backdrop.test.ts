import { describe, expect, it } from 'vitest';
import { coverScale } from './backdrop';

describe('coverScale', () => {
  it('covers the screen for a 16:9 and a 4:3 picture', () => {
    expect(coverScale(1280, 720)).toBeCloseTo(1);
    expect(coverScale(1024, 768)).toBeCloseTo(1.25);
    expect(coverScale(2560, 1440)).toBeCloseTo(0.5);
  });
});
