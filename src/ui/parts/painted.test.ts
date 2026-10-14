import { describe, expect, it } from 'vitest';
import { RIG, pivotOf, placements, type PartName, type RigPose } from './painted';

const pose: RigPose = {
  bob: 0,
  lean: 0,
  dx: 0,
  sy: 1,
  hf: { x: 5.5, y: -11 },
  hb: { x: -5.5, y: -11 },
  wa: 0.55,
  f0: { x: -2.5, y: 0 },
  f1: { x: 3, y: 0 },
  rot: 0,
  cape: 0,
  hem: 0,
};
const all = () => true;

describe('painted parts', () => {
  it('draws feet first, then the cape, back hand, body, head, headgear, shield, weapon, front hand', () => {
    expect(placements(pose, all).map((p) => p.part)).toEqual([
      'foot_back',
      'foot_front',
      'cape',
      'hand_back',
      'body',
      'head',
      'headgear',
      'shield',
      'weapon',
      'hand_front',
    ]);
  });
  it('draws a weapon cocked behind the head before the head', () => {
    const order = placements(pose, all, true).map((p) => p.part);
    expect(order.indexOf('weapon')).toBeLessThan(order.indexOf('head'));
  });
  it('skips parts the sheet does not have', () => {
    const has = (p: PartName) => p !== 'cape' && p !== 'shield';
    const parts = placements(pose, has).map((p) => p.part);
    expect(parts).not.toContain('cape');
    expect(parts).not.toContain('shield');
  });
  it('puts the weapon on the front hand at the weapon angle and the feet outside the body transform', () => {
    const list = placements(pose, all);
    const w = list.find((p) => p.part === 'weapon')!;
    expect([w.x, w.y, w.rot]).toEqual([5.5, -11, 0.55]);
    expect(list.find((p) => p.part === 'foot_front')!.inBody).toBe(false);
    expect(list.find((p) => p.part === 'body')).toMatchObject({ x: RIG.neck.x, y: RIG.neck.y });
  });
  it('reads a pivot from the row or falls back', () => {
    const row = { x: 0, y: 0, w: 10, h: 10, pivots: { neck: [0.4, 0.1] as const } };
    expect(pivotOf(row, 'body')).toEqual([0.4, 0.1]);
    expect(pivotOf({ x: 0, y: 0, w: 1, h: 1 }, 'weapon')).toEqual([0.5, 0.8]);
  });
});
