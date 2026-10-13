import { describe, expect, it } from 'vitest';
import {
  MAX_COPIES,
  MAX_LIVE,
  SfxLimiter,
  hitRateOk,
  positionGain,
  presetLength,
  wobble,
} from './sfxPlan';

describe('wobble', () => {
  it('stays within +-6% pitch and +-10% volume and repeats for the same count', () => {
    for (let n = 0; n < 200; n++) {
      const w = wobble(n);
      expect(w.pitch).toBeGreaterThanOrEqual(0.94);
      expect(w.pitch).toBeLessThanOrEqual(1.06);
      expect(w.vol).toBeGreaterThanOrEqual(0.9);
      expect(w.vol).toBeLessThanOrEqual(1.1);
    }
    expect(wobble(7)).toEqual(wobble(7));
    expect(wobble(7)).not.toEqual(wobble(8));
  });
});

describe('positionGain', () => {
  const view = { x: 0, y: 0, w: 1000, h: 500 };
  it('is full at the centre, 0.4 at the edge of the enlarged view and 0 beyond', () => {
    expect(positionGain({ x: 500, y: 250 }, view)).toBe(1);
    expect(positionGain({ x: 1100, y: 250 }, view)).toBeCloseTo(0.4, 5);
    expect(positionGain({ x: 1101, y: 250 }, view)).toBe(0);
    expect(positionGain({ x: 500, y: -151 }, view)).toBe(0);
  });
});

describe('SfxLimiter', () => {
  it('allows 4 copies and 60 ms between starts', () => {
    const l = new SfxLimiter();
    expect(l.admit('a', 0, 1000, 1)).toBe(true);
    expect(l.admit('a', 30, 1000, 1)).toBe(false);
    for (let i = 1; i < MAX_COPIES; i++) expect(l.admit('a', i * 100, 1000, 1)).toBe(true);
    expect(l.admit('a', 500, 1000, 1)).toBe(false);
    expect(l.admit('a', 1100, 1000, 1)).toBe(true);
  });
  it('caps all sounds at 12: a quieter request drops, a louder or high one gets in', () => {
    const l = new SfxLimiter();
    for (let i = 0; i < MAX_LIVE; i++) expect(l.admit(`s${i}`, 0, 5000, 0.5)).toBe(true);
    expect(l.admit('x', 10, 5000, 0.3)).toBe(false);
    expect(l.admit('y', 10, 5000, 0.9)).toBe(true);
    expect(l.admit('horn', 10, 5000, 0.1, true)).toBe(true);
  });
});

describe('misc', () => {
  it('halves hit sounds at 4x', () => {
    expect(hitRateOk(1, 3)).toBe(true);
    expect(hitRateOk(4, 3)).toBe(false);
    expect(hitRateOk(4, 4)).toBe(true);
  });
  it('presetLength is the latest voice end', () => {
    expect(
      presetLength({
        id: 'p',
        voices: [
          { w: 'sine', f: 1, d: 0.2, g: 1 },
          { w: 'sine', f: 1, d: 0.3, g: 1, at: 0.4 },
        ],
      }),
    ).toBeCloseTo(0.7);
  });
});
