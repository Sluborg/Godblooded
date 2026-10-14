import { describe, expect, it } from 'vitest';
import {
  STATUS_LOOK,
  angleTo,
  skillAtTier,
  jagged,
  liveStatuses,
  newestRing,
  shapeBox,
  skillTint,
  skillVisuals,
  type StatusKind,
} from './skillLook';

const dmg = (type?: string) => ({ effects: [{ kind: 'damage', mult: 1, type }] }) as never;

describe('skillTint', () => {
  it('takes the damage effect type, else the caster type, else heal green', () => {
    expect(skillTint(dmg('fire'))).toBe(0xff9a4d);
    expect(skillTint(dmg(undefined), 'frost')).toBe(0x9fe0ff);
    expect(skillTint({ effects: [{ kind: 'heal', mult: 1 }] } as never)).toBe(0xb6ffb0);
    expect(skillTint(undefined)).toBe(0xffd9d9);
  });
});

describe('skillVisuals and shapeBox', () => {
  it('keeps only the ten known pictures', () => {
    expect(skillVisuals({ visual: ['bolt', 'nope', 'pillar'] } as never)).toEqual([
      'bolt',
      'pillar',
    ]);
    expect(skillVisuals(undefined)).toEqual([]);
  });
  it('reads radius, angle and line size from the shape', () => {
    expect(shapeBox({ shape: { kind: 'cone', radius: 200, angle: 60 } } as never)).toMatchObject({
      radius: 200,
      angle: 60,
    });
    expect(shapeBox({ shape: { kind: 'line', length: 300 } } as never)).toMatchObject({
      length: 300,
      width: 40,
    });
    expect(shapeBox({ shape: { kind: 'single' } } as never).radius).toBe(60);
  });
});

describe('geometry', () => {
  it('angleTo points from a to b', () => {
    expect(angleTo({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(Math.PI / 2);
    expect(angleTo({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0);
  });
  it('jagged is repeatable, starts and ends on the points and bends in between', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const a = jagged(pts, 7);
    expect(jagged(pts, 7)).toEqual(a);
    expect(a[0]).toEqual(pts[0]);
    expect(a[a.length - 1]).toEqual(pts[2]);
    expect(a).toHaveLength(1 + 2 * 4);
    expect(jagged(pts, 8)).not.toEqual(a);
  });
});

describe('statuses', () => {
  it('drops expired ones and keeps only the newest ring', () => {
    const held = new Map<StatusKind, { until: number; seq: number }>([
      ['shield', { until: 5000, seq: 1 }],
      ['buff', { until: 5000, seq: 2 }],
      ['hot', { until: 5000, seq: 3 }],
      ['mark', { until: 900, seq: 4 }],
    ]);
    const live = liveStatuses(held, 1000);
    expect(live).toEqual(['shield', 'buff', 'hot']);
    expect(held.has('mark')).toBe(false);
    expect(newestRing(held, live)).toBe('hot');
    expect(newestRing(held, ['shield'])).toBeNull();
    expect(STATUS_LOOK.shield.style).toBe('bubble');
  });
});

describe('skillAtTier', () => {
  const def = { visual: ['bolt'], t3: { visual: ['pillar'] } };
  it('merges the t3 fields from tier 3 on and leaves lower tiers alone', () => {
    expect(skillAtTier(def, 2)).toBe(def);
    expect(skillAtTier(def, 3)?.visual).toEqual(['pillar']);
    const plain: { visual: string[]; t3?: object } = { visual: ['bolt'] };
    expect(skillAtTier(plain, 3)?.visual).toEqual(['bolt']);
    expect(skillAtTier(undefined, 3)).toBeUndefined();
  });
});
