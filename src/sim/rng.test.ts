import { describe, expect, it } from 'vitest';
import { makeRng } from './rng';

describe('makeRng', () => {
  it('is deterministic per seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it('stays in [0, 1)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 10000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
