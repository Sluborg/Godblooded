import { describe, expect, it } from 'vitest';
import type { UnitState } from '../sim/api';
import { buildRoster, paginate } from './roster';

const u = (id: number, party: number, over: Partial<UnitState> = {}): UnitState =>
  ({
    id,
    kind: 'hero',
    god: 'thor',
    path: null,
    tier: 1,
    party,
    hp: 7.2,
    maxHp: 10,
    gold: 5,
    mode: 'explore',
    ko: false,
    ...over,
  }) as UnitState;

describe('buildRoster', () => {
  const snap = {
    units: [u(5, 0), u(3, 2), u(1, 1), u(2, 1), { ...u(9, 0), kind: 'monster' } as UnitState],
    parties: [
      { id: 1, level: 3 },
      { id: 2, level: 1 },
    ] as never,
  };
  it('groups by party, solo heroes last, monsters left out', () => {
    const rows = buildRoster(snap);
    expect(rows.map((r) => r.unit)).toEqual([1, 2, 3, 5]);
    expect(rows.map((r) => r.firstOfParty)).toEqual([true, false, true, true]);
    expect(rows[0].partyLevel).toBe(3);
  });
  it('labels by god and rounds hp up', () => {
    const r = buildRoster(snap)[0];
    expect(r.label).toBe('Thor-born');
    expect(r.hp).toBe(8);
  });
});

describe('paginate', () => {
  it('slices and clamps the page', () => {
    const rows = [1, 2, 3, 4, 5];
    expect(paginate(rows, 0, 2)).toEqual({ rows: [1, 2], page: 0, pages: 3 });
    expect(paginate(rows, 2, 2).rows).toEqual([5]);
    expect(paginate(rows, 9, 2).page).toBe(2);
    expect(paginate([], 3, 2)).toEqual({ rows: [], page: 0, pages: 1 });
  });
});
