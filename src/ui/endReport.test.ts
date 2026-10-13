import { describe, expect, it } from 'vitest';
import { formatClock, sparkline, visibleHeroes } from './endReport';

describe('endReport', () => {
  it('formats the clock', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(185_000)).toBe('3:05');
  });
  it('scales the gold curve into the box, zero gold at the bottom', () => {
    const { points, maxGold } = sparkline(
      [
        { timeMs: 0, gold: 0 },
        { timeMs: 50_000, gold: 100 },
        { timeMs: 100_000, gold: 50 },
      ],
      200,
      100,
    );
    expect(maxGold).toBe(100);
    expect(points).toEqual([
      { x: 0, y: 100 },
      { x: 100, y: 0 },
      { x: 200, y: 50 },
    ]);
  });
  it('draws a flat line for an empty or one-sample history', () => {
    expect(sparkline([], 200, 100).points).toHaveLength(2);
    expect(sparkline([{ timeMs: 0, gold: 0 }], 200, 100).points[0].y).toBe(100);
  });
  it('limits the hero rows and counts the rest', () => {
    expect(visibleHeroes([1, 2, 3, 4], 3)).toEqual({ shown: [1, 2, 3], hidden: 1 });
    expect(visibleHeroes([1], 3)).toEqual({ shown: [1], hidden: 0 });
  });
});
