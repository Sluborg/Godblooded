import { describe, expect, it } from 'vitest';
import { emberPose } from './lairFx';

describe('emberPose', () => {
  it('rises from the ground and fades at both ends', () => {
    const start = emberPose(0, 0.2, 0, 0, 100);
    expect(start.y).toBeCloseTo(0);
    expect(start.alpha).toBe(0);
    const mid = emberPose(0, 0.2, 0, 2000, 100);
    expect(mid.y).toBeLessThan(-30);
    expect(mid.alpha).toBeGreaterThan(0.3);
    const late = emberPose(0.99, 0.2, 0, 0, 100);
    expect(late.alpha).toBeLessThan(0.05);
  });
  it('loops', () => {
    const a = emberPose(0.2, 0.25, 4, 1000, 80);
    const b = emberPose(0.2, 0.25, 4, 5000, 80);
    expect(a.y).toBeCloseTo(b.y, 5);
  });
});
