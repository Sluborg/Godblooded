import { describe, expect, it } from 'vitest';
import { activeWarnings, edgeArrow, trailDots } from './raidArrow';

const area = { left: 60, top: 84, right: 1220, bottom: 660 };

describe('edgeArrow', () => {
  it('shows no arrow for a lair on screen', () => {
    const a = edgeArrow({ x: 600, y: 300 }, area);
    expect(a.onScreen).toBe(true);
  });

  it('clamps an off-screen lair to the border, towards it', () => {
    const a = edgeArrow({ x: 3000, y: 372 }, area);
    expect(a.onScreen).toBe(false);
    expect(a.x).toBeCloseTo(1220);
    expect(a.angle).toBeCloseTo(0, 1);
    const b = edgeArrow({ x: 640, y: -2000 }, area);
    expect(b.y).toBeCloseTo(84);
    expect(b.angle).toBeCloseTo(-Math.PI / 2, 1);
  });

  it('keeps a diagonal target on the border', () => {
    const a = edgeArrow({ x: 5000, y: 5000 }, area);
    const onBorder = Math.abs(a.x - area.right) < 0.5 || Math.abs(a.y - area.bottom) < 0.5;
    expect(onBorder).toBe(true);
    expect(a.x).toBeLessThanOrEqual(area.right + 0.5);
    expect(a.y).toBeLessThanOrEqual(area.bottom + 0.5);
  });
});

describe('warnings and trail', () => {
  it('drops a warning when its time is up', () => {
    const notes = [
      { raid: 1, lair: 2, untilMs: 15_000 },
      { raid: 2, lair: 3, untilMs: 5_000 },
    ];
    expect(activeWarnings(notes, 10_000).map((n) => n.raid)).toEqual([1]);
  });

  it('spaces the dots along the way and shifts them with the phase', () => {
    const a = trailDots({ x: 0, y: 0 }, { x: 1000, y: 0 }, 0.5, 100, 0);
    expect(a.map((p) => p.x)).toEqual([0, 100, 200, 300, 400, 500]);
    const b = trailDots({ x: 0, y: 0 }, { x: 1000, y: 0 }, 0.5, 100, 0.5);
    expect(b[0].x).toBeCloseTo(50);
    expect(trailDots({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([]);
  });
});
