import { describe, expect, it } from 'vitest';
import {
  CHOP,
  WRIST_LIMIT,
  attackU,
  geomOf,
  sampleKeys,
  skeletonPose,
  solveLimb,
  weaponAngle,
} from './skeleton';

const bones = { upper: 5, fore: 4, thigh: 3, shin: 3, footH: 2, torsoW: 16, torsoH: 12 };
const g = geomOf(bones);

describe('solveLimb', () => {
  it('reaches the target and keeps both bone lengths', () => {
    const l = solveLimb({ x: 0, y: 0 }, { x: 5, y: 4 }, 5, 4, 1);
    expect(Math.hypot(l.mid.x, l.mid.y)).toBeCloseTo(5, 5);
    expect(Math.hypot(l.end.x - l.mid.x, l.end.y - l.mid.y)).toBeCloseTo(4, 5);
    expect(l.end.x).toBeCloseTo(5, 5);
  });
  it('bends to the clockwise side for +1 and the other for -1 (y down)', () => {
    const a = solveLimb({ x: 0, y: 0 }, { x: 0, y: 8 }, 5, 4, 1);
    const b = solveLimb({ x: 0, y: 0 }, { x: 0, y: 8 }, 5, 4, -1);
    // Reaching straight down: clockwise on screen (y down) is toward -x.
    expect(a.mid.x).toBeLessThan(0);
    expect(b.mid.x).toBeGreaterThan(0);
  });
  it('clamps an out-of-reach target to straight', () => {
    const l = solveLimb({ x: 0, y: 0 }, { x: 40, y: 0 }, 5, 4, 1);
    expect(l.end.x).toBeCloseTo(9, 2);
  });
});

describe('clips', () => {
  const close = (got: number[], want: number[]) =>
    got.forEach((v, i) => expect(v).toBeCloseTo(want[i], 9));
  it('samples the first and last key at the ends', () => {
    close(sampleKeys(CHOP.keys, 0), [0.2, 0.86, 0.3, 0, 0]);
    close(sampleKeys(CHOP.keys, 1), [0.2, 0.86, 0.3, 0, 0]);
  });
  it('hits a key exactly at its time', () => {
    close(sampleKeys(CHOP.keys, 0.44), [0.78, -0.04, 1.35, 11, 0.2]);
  });
  it('lands the contact key on the sim hit, whatever the windup length', () => {
    for (const lead of [0.2, 0.45, 0.9]) {
      expect(attackU(CHOP, lead, lead, 1)).toBeCloseTo(0.44, 6);
      expect(attackU(CHOP, lead / 2, lead, 1)).toBeCloseTo(0.22, 6);
    }
    expect(attackU(CHOP, 0.45 + 0.56, 0.45, 1)).toBeCloseTo(1, 6);
    expect(attackU(CHOP, 5, 0.45, 1)).toBe(1);
  });
  it('runs on its own time when no lead is given', () => {
    expect(attackU(CHOP, 0.5, 0, 1)).toBeCloseTo(0.5, 6);
  });
});

describe('weaponAngle (the wrist limit)', () => {
  const turn = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  // The wrist bend: the haft's turn from the forearm line, 0 when it points straight along it.
  const bend = (rot: number, forearm: number) => turn(rot - forearm);
  it('keeps the haft within the limit of the forearm however far the clip asks', () => {
    for (const forearm of [-1, 0.4, 1.2, 2.5]) {
      for (const want of [-3, -1.25, 0, 0.3, 1.75, 3]) {
        const b = bend(weaponAngle(want, forearm), forearm);
        expect(Math.abs(b)).toBeLessThanOrEqual(WRIST_LIMIT + 1e-9);
      }
    }
  });
  it('passes a wish inside the limit through unchanged', () => {
    const forearm = 0.4;
    // A wish of the forearm's own line (plus the haft offset) is the rest bend; nudging it by less
    // than the limit moves the haft by exactly that much.
    const base = weaponAngle(forearm, forearm);
    const nudged = weaponAngle(forearm + 0.3, forearm);
    expect(turn(nudged - base)).toBeCloseTo(0.3, 9);
  });
});

describe('skeletonPose', () => {
  it('marks the contact window and the cocked-back window of the chop', () => {
    const at = (u: number) => skeletonPose(g, { mode: 'attack', t: 0, walkPh: 0, u });
    expect(at(0.46).contact).toBe(true);
    expect(at(0.3).contact).toBe(false);
    expect(at(0.2).behind).toBe(true);
    expect(at(0.6).behind).toBe(false);
  });
  it('walks with the feet passing each other on the ground line', () => {
    const ys = [0, 1, 2, 3, 4, 5, 6, 7].map(
      (i) => skeletonPose(g, { mode: 'walk', t: 0, walkPh: (i / 8) * Math.PI * 2 }).feet[0].y,
    );
    expect(Math.max(...ys)).toBeLessThanOrEqual(0);
    expect(Math.min(...ys)).toBeLessThan(0);
  });
  it('flashes only at the start of a hurt and recovers to rest', () => {
    expect(skeletonPose(g, { mode: 'hurt', t: 0.05, walkPh: 0 }).flash).toBeGreaterThan(0);
    const late = skeletonPose(g, { mode: 'hurt', t: 0.6, walkPh: 0 });
    expect(late.flash).toBe(0);
    expect(late.px).toBeCloseTo(0, 5);
  });
  it('is deterministic', () => {
    const a = skeletonPose(g, { mode: 'attack', t: 0.3, walkPh: 0 });
    const b = skeletonPose(g, { mode: 'attack', t: 0.3, walkPh: 0 });
    expect(a).toEqual(b);
  });
});
