import { describe, expect, it } from 'vitest';
import { FpsGuard, WATCH_MS } from './fpsGuard';

// Runs frames every `step` ms from t0 to t1; the first true result, or null.
function run(g: FpsGuard, t0: number, t1: number, step: number, visible = true): number | null {
  for (let t = t0; t <= t1; t += step) if (g.frame(t, visible)) return t;
  return null;
}

describe('FpsGuard', () => {
  it('trips on a slow window after the warm-up', () => {
    const g = new FpsGuard();
    expect(run(g, 0, 20_000, 50)).not.toBeNull(); // 20 fps
  });

  it('stays quiet at 60 fps', () => {
    expect(run(new FpsGuard(), 0, WATCH_MS, 16)).toBeNull();
  });

  it('does not count a slow start', () => {
    const g = new FpsGuard();
    expect(run(g, 0, 2900, 200)).toBeNull();
    expect(run(g, 3000, 20_000, 16)).toBeNull();
  });

  it('ignores a hidden tab', () => {
    expect(run(new FpsGuard(), 0, 30_000, 500, false)).toBeNull();
  });

  it('restarts the window after a pause', () => {
    const g = new FpsGuard();
    expect(run(g, 0, 10_000, 16)).toBeNull();
    // Paused for 20 s, then fast again: the pause must not look like a slow window.
    expect(run(g, 30_000, 33_000, 16)).toBeNull();
  });

  it('stops watching after the first minute', () => {
    const g = new FpsGuard();
    expect(run(g, 0, WATCH_MS, 16)).toBeNull();
    expect(run(g, WATCH_MS + 1, WATCH_MS + 30_000, 100)).toBeNull();
  });
});
