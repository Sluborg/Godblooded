import { describe, expect, it } from 'vitest';
import { nineSliceArgs } from './nineSlice';

describe('nineSliceArgs', () => {
  it('returns left, right, top, bottom', () => {
    expect(nineSliceArgs({ sliceLeft: 10, sliceRight: 12, sliceTop: 8, sliceBottom: 9 })).toEqual([
      10, 12, 8, 9,
    ]);
  });
  it('is null when a field or the row is missing', () => {
    expect(nineSliceArgs(undefined)).toBeNull();
    expect(nineSliceArgs({ sliceLeft: 10, sliceRight: 12, sliceTop: 8 })).toBeNull();
    expect(nineSliceArgs({ sliceLeft: -1, sliceRight: 1, sliceTop: 1, sliceBottom: 1 })).toBeNull();
  });
});
