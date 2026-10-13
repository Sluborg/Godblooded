import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../sim/api';
import { BRIEF_RIDER_MS, RIDER_LOOK, riderDurationMs } from './riderLook';

describe('riderLook', () => {
  it('has a look for each of the five riders', () => {
    expect(Object.keys(RIDER_LOOK).sort()).toEqual(['arc', 'burn', 'chill', 'sear', 'wither']);
    expect(new Set(Object.values(RIDER_LOOK).map((l) => l.shape)).size).toBe(5);
  });
  it('lasting riders last as long as their effect', () => {
    const t = DEFAULT_TUNING.rider;
    expect(riderDurationMs('burn')).toBe(t.burnTicks * t.burnEveryMs);
    expect(riderDurationMs('chill')).toBe(t.chillMs);
    expect(riderDurationMs('wither')).toBe(t.witherMs);
  });
  it('one-hit riders flash briefly', () => {
    expect(riderDurationMs('arc')).toBe(BRIEF_RIDER_MS);
    expect(riderDurationMs('sear')).toBe(BRIEF_RIDER_MS);
  });
});
