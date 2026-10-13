import { describe, expect, it } from 'vitest';
import type { UnitState } from '../sim/api';
import { easeToward, findFights, MIN_HOLD_MS, WatchDirector } from './watchCam';

function unit(id: number, x: number, y: number, over: Partial<UnitState> = {}): UnitState {
  return {
    id,
    kind: 'hero',
    type: 'x',
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp: 10,
    maxHp: 10,
    target: null,
    ko: false,
    mode: 'explore',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
    ...over,
  };
}

// A hero (id h) fighting a monster (id h+1) at x.
function duel(h: number, x: number, monTier = 1): UnitState[] {
  return [
    unit(h, x, 0, { target: h + 1 }),
    unit(h + 1, x + 40, 0, { kind: 'monster', target: h, tier: monTier }),
  ];
}

describe('findFights', () => {
  it('ignores units that are not fighting', () => {
    expect(findFights([unit(1, 0, 0), unit(2, 50, 0, { kind: 'monster' })])).toEqual([]);
  });
  it('groups nearby fighters and keeps far fights apart', () => {
    const fights = findFights([...duel(1, 0), ...duel(3, 100), ...duel(5, 2000)]);
    expect(fights).toHaveLength(2);
    expect(fights.find((f) => f.key === 1)?.members).toHaveLength(4);
  });
  it('scores a boss fight higher', () => {
    const [a, b] = [findFights(duel(1, 0))[0], findFights(duel(1, 0, 3))[0]];
    expect(b.score).toBeGreaterThan(a.score);
  });
});

describe('structure fights and healing', () => {
  it('counts an attack on a lair or building, but not a heal on a party mate', () => {
    const raider = unit(1, 0, 0, { kind: 'monster', target: 500 });
    expect(findFights([raider])).toEqual([]);
    expect(findFights([raider], [500])).toHaveLength(1);
    const healer = unit(2, 0, 0, { target: 3 });
    expect(findFights([healer, unit(3, 20, 0)])).toEqual([]);
  });
});

describe('WatchDirector', () => {
  it('returns null with no fight', () => {
    expect(new WatchDirector().update([unit(1, 0, 0)], 16)).toBeNull();
  });
  it('holds the current fight against a slightly better one, switches to a much better one', () => {
    const d = new WatchDirector();
    const small = [...duel(1, 0), ...duel(3, 100)];
    expect(d.update(small, 16)?.key).toBe(1);
    const slightly = [...small, ...duel(10, 3000, 3)];
    expect(d.update(slightly, MIN_HOLD_MS + 1)?.key).toBe(1);
    const much = [...small, ...duel(10, 3000, 5)];
    expect(d.update(much, 16)?.key).toBe(10);
  });
  it('does not switch before the hold time', () => {
    const d = new WatchDirector();
    d.update(duel(1, 0), 16);
    expect(d.update([...duel(1, 0), ...duel(10, 3000, 6)], 100)?.key).toBe(1);
  });
  it('moves on when the watched fight ends', () => {
    const d = new WatchDirector();
    d.update([...duel(1, 0), ...duel(10, 3000)], 16);
    expect(d.update(duel(10, 3000), 16)?.key).toBe(10);
  });
});

describe('easeToward', () => {
  it('moves part of the way and never overshoots', () => {
    const p = easeToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 400);
    expect(p.x).toBeGreaterThan(50);
    expect(p.x).toBeLessThan(100);
    expect(easeToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 0).x).toBe(0);
  });
});
