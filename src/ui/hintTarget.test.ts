import { describe, expect, it } from 'vitest';
import { firstTill, hintTargetPos, idleGold, monsterSeenBy, upgradeAffordable } from './hintTarget';

const snap = {
  plots: [
    { id: 0, pos: { x: 1, y: 1 }, occupied: true },
    { id: 1, pos: { x: 2, y: 2 }, occupied: false },
  ],
  buildings: [
    { id: 10, type: 'market', pos: { x: 5, y: 5 }, upgradeCost: 80 },
    { id: 11, type: 'smithy', pos: { x: 6, y: 6 }, upgradeCost: null },
  ],
  units: [
    { id: 20, kind: 'hero', pos: { x: 100, y: 100 }, ko: false },
    { id: 21, kind: 'monster', pos: { x: 300, y: 100 }, ko: false },
    { id: 22, kind: 'monster', pos: { x: 900, y: 900 }, ko: false },
  ],
  lairs: [{ id: 30, pos: { x: 7, y: 7 } }],
  bounties: [{ id: 40, pos: { x: 8, y: 8 }, gold: 50 }],
} as never;

describe('hintTargetPos', () => {
  it('finds the first free plot, a building by id or type, a unit, a lair and the newest flag', () => {
    expect(hintTargetPos({ kind: 'plot' }, snap, null)).toEqual({ x: 2, y: 2 });
    expect(hintTargetPos({ kind: 'building', type: '' }, snap, 11)).toEqual({ x: 6, y: 6 });
    expect(hintTargetPos({ kind: 'building', type: 'market' }, snap, null)).toEqual({ x: 5, y: 5 });
    expect(hintTargetPos({ kind: 'unit' }, snap, 20)).toEqual({ x: 100, y: 100 });
    expect(hintTargetPos({ kind: 'monster' }, snap, 20)).toBeNull();
    expect(hintTargetPos({ kind: 'monster' }, snap, 21)).toEqual({ x: 300, y: 100 });
    expect(hintTargetPos({ kind: 'lair' }, snap, 30)).toEqual({ x: 7, y: 7 });
    expect(hintTargetPos({ kind: 'flag' }, snap, null)).toEqual({ x: 8, y: 8 });
    expect(hintTargetPos({ kind: 'none' }, snap, 20)).toBeNull();
    expect(hintTargetPos({ kind: 'ui', id: 'x' }, snap, 20)).toBeNull();
  });
});

describe('conditions', () => {
  it('a monster is seen when it is within range of a hero', () => {
    expect(monsterSeenBy((snap as { units: never }).units)).toBe(21);
    expect(monsterSeenBy((snap as { units: never }).units, 100)).toBeNull();
  });
  it('an upgrade is affordable when gold covers a building cost', () => {
    const b = (snap as { buildings: never }).buildings;
    expect(upgradeAffordable(b, 79)).toBeNull();
    expect(upgradeAffordable(b, 80)).toBe(10);
  });
});

describe('idleGold', () => {
  const b = (type: string) => ({ type }) as never;
  const h = (gold: number, ko = false) => ({ kind: 'hero', gold, ko }) as never;

  it('needs a market, no smithy, and 100 gold on living heroes', () => {
    expect(idleGold({ buildings: [b('market')], units: [h(60), h(50)] })).toBe(true);
    expect(idleGold({ buildings: [b('market')], units: [h(60), h(30)] })).toBe(false);
    expect(idleGold({ buildings: [b('market')], units: [h(150, true)] })).toBe(false);
    expect(idleGold({ buildings: [b('market'), b('smithy')], units: [h(500)] })).toBe(false);
    expect(idleGold({ buildings: [], units: [h(500)] })).toBe(false);
  });
});

describe('firstTill', () => {
  it('finds the first building with a till of at least minTill', () => {
    const bs = [
      { id: 1, pos: { x: 1, y: 2 }, till: 5 },
      { id: 2, pos: { x: 3, y: 4 }, till: 12 },
      { id: 3, pos: { x: 5, y: 6 } },
    ] as never;
    expect(firstTill(bs, 10)).toEqual({ id: 2, pos: { x: 3, y: 4 } });
    expect(firstTill(bs, 20)).toBeNull();
  });
});
