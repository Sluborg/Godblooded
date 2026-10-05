import { describe, expect, it } from 'vitest';
import { JITTER, pickVariant, rotateHue, sizeJitter, tierStyle, unitRoll } from './monsterLook';

describe('unitRoll', () => {
  it('is stable and in [0, 1)', () => {
    for (let id = 0; id < 200; id++) {
      const r = unitRoll(id);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
      expect(unitRoll(id)).toBe(r);
    }
  });
  it('spreads ids over the range', () => {
    const buckets = [0, 0, 0];
    for (let id = 1; id <= 300; id++) buckets[Math.floor(unitRoll(id, 2) * 3)]++;
    for (const n of buckets) expect(n).toBeGreaterThan(60);
  });
});

describe('tierStyle', () => {
  it('tier 1 is the base, 2 and 3 grow 10% and 20% and shift hue', () => {
    expect(tierStyle(1)).toEqual({ scale: 1, hue: 0 });
    expect(tierStyle(2).scale).toBeCloseTo(1.1);
    expect(tierStyle(3).scale).toBeCloseTo(1.2);
    expect(tierStyle(2).hue).not.toBe(0);
    expect(tierStyle(3).hue).not.toBe(tierStyle(2).hue);
  });
  it('clamps out-of-range tiers', () => {
    expect(tierStyle(0)).toEqual(tierStyle(1));
    expect(tierStyle(9)).toEqual(tierStyle(3));
  });
});

describe('sizeJitter', () => {
  it('stays within plus or minus 5% and is stable', () => {
    for (let id = 0; id < 200; id++) {
      const j = sizeJitter(id);
      expect(Math.abs(j - 1)).toBeLessThanOrEqual(JITTER + 1e-9);
      expect(sizeJitter(id)).toBe(j);
    }
  });
});

describe('pickVariant', () => {
  const has = (set: string[]) => (t: string) => set.includes(t);
  it('keeps the type when no variant exists or the picture is missing', () => {
    expect(pickVariant('draugr', 7, has([]))).toBe('draugr');
    expect(pickVariant('draugr', 7, has(['draugr']))).toBe('draugr');
  });
  it('only picks variants that exist, stable per id', () => {
    const ok = has(['draugr', 'draugr-v3']);
    const seen = new Set<string>();
    for (let id = 1; id <= 60; id++) {
      const v = pickVariant('draugr', id, ok);
      expect(['draugr', 'draugr-v3']).toContain(v);
      expect(pickVariant('draugr', id, ok)).toBe(v);
      seen.add(v);
    }
    expect(seen.size).toBe(2);
  });
  it('keeps a type that already names its variant', () => {
    expect(pickVariant('draugr-v2', 3, () => true)).toBe('draugr-v2');
  });
});

describe('rotateHue', () => {
  it('0 degrees is the identity and 360 comes back', () => {
    expect(rotateHue(0x6b4a2f, 0)).toBe(0x6b4a2f);
    expect(rotateHue(0x3a6ea5, 360)).toBe(0x3a6ea5);
  });
  it('keeps grey grey', () => {
    expect(rotateHue(0x808080, 120)).toBe(0x808080);
  });
  it('moves red toward green at 120 degrees', () => {
    const c = rotateHue(0xff0000, 120);
    expect((c >> 8) & 255).toBeGreaterThan((c >> 16) & 255);
  });
});
