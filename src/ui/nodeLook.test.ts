import { describe, expect, it } from 'vitest';
import { gatherersAt, glowStrength, poolLine, poolShare } from './nodeLook';

describe('node look', () => {
  it('brightens a freed node with its pool, never fully dark', () => {
    expect(glowStrength('freed', 0, 80)).toBeCloseTo(0.3);
    expect(glowStrength('freed', 80, 80)).toBeCloseTo(1);
    expect(glowStrength('freed', 40, 80)).toBeGreaterThan(glowStrength('freed', 10, 80));
    expect(glowStrength('locked', 50, 80)).toBeLessThan(0.3);
  });

  it('clamps the pool share', () => {
    expect(poolShare(120, 80)).toBe(1);
    expect(poolShare(-5, 80)).toBe(0);
    expect(poolShare(5, 0)).toBe(0);
  });

  it('words the pool and counts gatherers', () => {
    expect(poolLine(42.6, 80)).toBe('Ambrosia 42 / 80');
    expect(gatherersAt([{ node: 1 }, { node: 2 }, { node: 1 }, { node: null }], 1)).toBe(2);
  });
});
