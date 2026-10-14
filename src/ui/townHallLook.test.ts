import { describe, expect, it } from 'vitest';
import { HALL_STYLE, clothPoints, isTownHall } from './townHallLook';

describe('town hall look', () => {
  it('is bigger than the other buildings', () => {
    expect(HALL_STYLE.scale).toBeGreaterThanOrEqual(1.5);
    expect(isTownHall('townhall')).toBe(true);
    expect(isTownHall('market')).toBe(false);
  });

  it('keeps the pole edge of the cloth still and waves the free edge', () => {
    const a = clothPoints(0, 1);
    const b = clothPoints(500, 1);
    expect(a[0]).toEqual(b[0]);
    expect(a[a.length - 1]).toEqual(b[b.length - 1]);
    const tipA = a[5].y;
    const tipB = b[5].y;
    expect(tipA).not.toBeCloseTo(tipB, 3);
  });

  it('mirrors to the left and stands still when asked', () => {
    expect(clothPoints(100, -1).every((p) => p.x <= 0)).toBe(true);
    expect(clothPoints(0, 1, true)).toEqual(clothPoints(9999, 1, true));
  });
});
