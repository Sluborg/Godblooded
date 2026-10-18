import { describe, expect, it } from 'vitest';
import { ScaleGovernor, WARMUP_MS } from './scaleGovernor';

// Feeds frames at `fps` for `ms`, from `from`; returns the changes seen and the end time.
function run(g: ScaleGovernor, from: number, ms: number, fps: number) {
  const changes: number[] = [];
  let t = from;
  const dt = 1000 / fps;
  while (t < from + ms) {
    const c = g.frame(t);
    if (c !== null) changes.push(c);
    t += dt;
  }
  return { changes, end: t };
}

describe('ScaleGovernor', () => {
  it('stays put while the frame rate is fine', () => {
    const g = new ScaleGovernor(2, 2);
    expect(run(g, 1, 20_000, 60).changes).toEqual([]);
  });

  it('ignores the warm-up', () => {
    const g = new ScaleGovernor(2, 2);
    expect(run(g, 1, WARMUP_MS - 100, 10).changes).toEqual([]);
  });

  it('steps down one level when a 2 s window is slow, and again if it stays slow', () => {
    const g = new ScaleGovernor(2, 2);
    const r = run(g, 1, 20_000, 30);
    expect(r.changes.slice(0, 3)).toEqual([1.75, 1.5, 1.25]);
    expect(g.current).toBe(1.25);
  });

  it('never goes below the lowest step', () => {
    const g = new ScaleGovernor(2, 2);
    run(g, 1, 60_000, 10);
    expect(g.current).toBe(1.25);
  });

  it('steps back up after 10 s above 58 fps, not into a level it just left until the ban ends', () => {
    const g = new ScaleGovernor(2, 2);
    let r = run(g, 1, 6000, 30);
    // Let the window that straddled the change settle, then note where it stands.
    r = run(g, r.end, 4000, 60);
    const low = g.current;
    expect(low).toBeLessThan(2);
    // Fast: it waits out the ban on the level above (it came down from there).
    r = run(g, r.end, 20_000, 60);
    expect(g.current).toBe(low);
    // Much later it has climbed back, one step at a time, with no step down on the way.
    r = run(g, r.end, 200_000, 60);
    expect(r.changes.every((c) => c > low)).toBe(true);
    expect(g.current).toBe(2);
  });

  it('does not go above the ceiling of the device', () => {
    const g = new ScaleGovernor(1.5, 1.5);
    expect(run(g, 1, 60_000, 60).changes).toEqual([]);
  });

  it('a pause is not slowness', () => {
    const g = new ScaleGovernor(2, 2);
    let r = run(g, 1, 5000, 60);
    r = { changes: [], end: r.end + 30_000 };
    expect(run(g, r.end, 1500, 60).changes).toEqual([]);
  });
});
