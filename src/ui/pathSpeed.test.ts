import { describe, expect, it } from 'vitest';
import { PATH_OFFER_SPEED, effectiveSpeed } from './pathSpeed';

describe('effectiveSpeed', () => {
  it('is the button speed while no path offer is open', () => {
    expect(effectiveSpeed(1, false)).toBe(1);
    expect(effectiveSpeed(4, false)).toBe(4);
  });
  it('is 0.3 whatever the button says while one is open', () => {
    for (const s of [1, 2, 4]) expect(effectiveSpeed(s, true)).toBe(PATH_OFFER_SPEED);
  });
});
