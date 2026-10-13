import { describe, expect, it } from 'vitest';
import { monsterPartsLook, TIER_COLORS } from '../../data/monsterParts';
import { IDLE_POSE, mix, outlineOf } from './wyrm';
import {
  WYRM_COUNT,
  WYRM_H,
  WYRM_W,
  breathFrame,
  wyrmBytes,
  wyrmFrameState,
  wyrmIdleFrame,
  wyrmPxPerUnit,
} from './wyrmFrames';

describe('colours', () => {
  it('mix goes from a to b and the outline is darker than the fill', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ff0000', 0.5)).toBe('#800000');
    const o = outlineOf('#80c080');
    expect(parseInt(o.slice(1, 3), 16)).toBeLessThan(0x80);
  });
});

describe('wyrm frames', () => {
  it('has the frames the pose names say', () => {
    expect(WYRM_COUNT).toEqual({ idle: 4, walk: 6, attack: 5, breath: 5, ko: 2 });
  });
  it('the idle loop and the stride close on themselves', () => {
    expect(wyrmFrameState('idle', 0).t).toBe(0);
    expect(wyrmFrameState('idle', 4 - 1).t).toBeLessThan(Math.PI * 2);
    expect(wyrmIdleFrame(0)).toBe(wyrmIdleFrame(Math.PI * 2));
    const seen = new Set<number>();
    for (let t = 0; t < 7; t += 0.05) seen.add(wyrmIdleFrame(t));
    expect(seen.size).toBe(WYRM_COUNT.idle);
  });
  it('a bite rears back, lunges with the jaw open and settles', () => {
    const f = Array.from({ length: 5 }, (_, i) => wyrmFrameState('attack', i));
    expect(f[1].lift).toBeGreaterThan(f[0].lift);
    expect(Math.max(...f.map((p) => p.lunge))).toBeGreaterThan(0.9);
    expect(f[4].lunge).toBeCloseTo(0, 5);
    expect(f[4].jaw).toBeCloseTo(0, 5);
  });
  it('the fire breath burns in the middle frames and the fall goes down', () => {
    const b = Array.from({ length: 5 }, (_, i) => wyrmFrameState('breath', i));
    expect(b[0].fire).toBe(0);
    expect(b[2].fire).toBe(1);
    expect(b[2].jaw).toBe(1);
    expect(wyrmFrameState('ko', 1).ko).toBe(1);
    expect(wyrmFrameState('walk', 0)).toMatchObject({ ...IDLE_POSE, walk: 0 });
    expect(breathFrame(0)).toBe(0);
    expect(breathFrame(1)).toBe(4);
    expect(breathFrame(9)).toBe(4);
  });
  it('one baked Fafnir stays under 8 MB at the largest scale', () => {
    expect(wyrmPxPerUnit(3)).toBe(1);
    expect(wyrmBytes(wyrmPxPerUnit(3))).toBeLessThan(8 * 1024 * 1024);
    expect(WYRM_W).toBeGreaterThan(300);
    expect(WYRM_H).toBeGreaterThan(200);
  });
});

describe('monsterPartsLook', () => {
  it('only the wyrm has parts; the tier shows in the eye and the ring', () => {
    expect(monsterPartsLook('troll', 1)).toBeNull();
    const t1 = monsterPartsLook('wyrm', 1);
    const t3 = monsterPartsLook('wyrm', 3);
    expect(t1?.look.eye).toBe(TIER_COLORS[1]);
    expect(t3?.look.eye).toBe(TIER_COLORS[3]);
    expect(t1?.id).not.toBe(t3?.id);
    expect(t1?.ring).not.toBe(t3?.ring);
    expect(monsterPartsLook('wyrm', 9)?.id).toBe('mon-wyrm_t3');
  });
});
