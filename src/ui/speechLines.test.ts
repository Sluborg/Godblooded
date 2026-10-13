import { describe, expect, it } from 'vitest';
import { BARK_META, barkRoll } from './speechLines';

describe('barkRoll', () => {
  it('is deterministic and in [0, 1)', () => {
    expect(barkRoll(3, 0)).toBe(barkRoll(3, 0));
    for (let i = 0; i < 50; i++) {
      const r = barkRoll(i, i * 3);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(1);
    }
    expect(barkRoll(3, 0)).not.toBe(barkRoll(3, 1));
  });
  it('roughly matches a chance over many rolls', () => {
    let hits = 0;
    for (let i = 0; i < 2000; i++) if (barkRoll(7, i) < 0.25) hits++;
    expect(hits).toBeGreaterThan(400);
    expect(hits).toBeLessThan(600);
  });
});

describe('BARK_META', () => {
  it('big moments always speak', () => {
    for (const k of ['arrived', 'fled', 'knockout', 'died'] as const) {
      expect(BARK_META[k]).toEqual({ priority: 'high', chance: 1 });
    }
  });
});
