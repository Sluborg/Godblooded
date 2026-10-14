import { describe, expect, it } from 'vitest';
import { computeRenderScale } from './config';

describe('computeRenderScale', () => {
  it('is 1 on a desktop window at density 1', () => {
    expect(computeRenderScale(1, 1280, 720)).toBe(1);
    expect(computeRenderScale(1, 900, 500)).toBe(1);
  });

  it('matches the device pixels of a phone, to quarters', () => {
    // 915 x 412 CSS px at density 2.6: 1280 x 720 FIT is 0.5722 wide, so 1.49 device px per design px.
    expect(computeRenderScale(2.625, 915, 412)).toBe(1.5);
  });

  it('is capped, and treats portrait as landscape', () => {
    expect(computeRenderScale(3, 2560, 1440)).toBe(2);
    expect(computeRenderScale(2.625, 412, 915)).toBe(1.5);
  });

  it('never goes below 1', () => {
    expect(computeRenderScale(0.5, 800, 400)).toBe(1);
  });
});
