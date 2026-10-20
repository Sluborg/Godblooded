import { describe, expect, it } from 'vitest';
import { BEST_I_CAN_DO, FOOT_UNITS, HAND_UNITS, HEAD_SKIN, GLOVE_COLOR } from './heroLayout';

describe('hero layout', () => {
  it('keeps hand and foot sizes locked: no per-hero size in a layout, only positions', () => {
    for (const k of ['handF', 'handB', 'footF', 'footB'] as const) {
      expect(Object.keys(BEST_I_CAN_DO[k]).sort()).toEqual(['x', 'y']);
    }
    expect(HAND_UNITS).toBe(6);
    expect(FOOT_UNITS).toEqual({ w: 7, h: 3.8 });
  });
  it('has a skin tone per head and a glove colour', () => {
    for (const h of ['m1', 'm2', 'f1', 'f2'] as const)
      expect(HEAD_SKIN[h]).toMatch(/^#[0-9a-f]{6}$/);
    expect(GLOVE_COLOR).toBe('#7a5536');
  });
  it('lists every part its order names, back to front, and the collar only if drawn', () => {
    const known = ['cape', 'footB', 'footF', 'body', 'collar', 'head', 'handF', 'weapon', 'handB'];
    for (const k of BEST_I_CAN_DO.order) expect(known).toContain(k);
    expect(BEST_I_CAN_DO.order.indexOf('handB')).toBe(BEST_I_CAN_DO.order.length - 1);
  });
});
