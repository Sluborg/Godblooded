import { describe, expect, it } from 'vitest';
import {
  ALL_HEADS,
  FOOT_UNITS,
  GLOVE_COLOR,
  HAND_UNITS,
  HEAD_SIZE,
  HEAD_FIT,
  HEAD_SKIN,
} from './heroLayout';

describe('hero layout', () => {
  it('keeps hand and foot sizes locked: no per-hero size in a layout, only positions', () => {
    for (const k of ['handF', 'handB'] as const) {
      expect(Object.keys(ALL_HEADS[k]).sort()).toEqual(['x', 'y']);
    }
    // Both feet share one height: an x per foot and a single footY.
    for (const k of ['footF', 'footB'] as const) expect(Object.keys(ALL_HEADS[k])).toEqual(['x']);
    expect(typeof ALL_HEADS.footY).toBe('number');
    expect(HAND_UNITS).toBe(6);
    expect(FOOT_UNITS).toEqual({ w: 7, h: 3.8 });
  });
  it('fits every head at scale 1 (the fitted scale is baked into its size)', () => {
    for (const id of Object.keys(HEAD_SIZE)) {
      expect(HEAD_FIT[id]).toBeDefined();
      expect(HEAD_FIT[id].s).toBe(1);
    }
    expect(Object.keys(HEAD_FIT).length).toBe(12);
  });
  it('has a skin tone per head and a glove colour', () => {
    for (const h of ['m1', 'm2', 'f1', 'f2'] as const)
      expect(HEAD_SKIN[h]).toMatch(/^#[0-9a-f]{6}$/);
    expect(GLOVE_COLOR).toBe('#7a5536');
  });
  it('lists every part its order names, back to front, and the collar only if drawn', () => {
    const known = ['cape', 'footB', 'footF', 'body', 'collar', 'head', 'handF', 'weapon', 'handB'];
    for (const k of ALL_HEADS.order) expect(known).toContain(k);
    expect(ALL_HEADS.order.indexOf('handB')).toBe(ALL_HEADS.order.length - 1);
  });
});
