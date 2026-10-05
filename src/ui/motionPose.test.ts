import { describe, expect, it } from 'vitest';
import {
  ATTACK,
  STRIKES,
  attackDuration,
  attackPose,
  hurtFlash,
  idlePose,
  impactTime,
  koPose,
  walkPose,
  windupFor,
} from './motionPose';

const finite = (p: object) => Object.values(p).every((v) => Number.isFinite(v));

describe('motion poses', () => {
  it('every strike gives finite poses across its whole timeline and ends level', () => {
    for (const s of STRIKES) {
      const w = windupFor(s, null);
      const total = attackDuration(s, w);
      for (let t = 0; t <= total + 0.05; t += 0.01)
        expect(finite(attackPose(s, t, 100, w))).toBe(true);
      const end = attackPose(s, total + 0.05, 100, w);
      expect(Math.abs(end.rot)).toBeLessThan(0.01);
      expect(Math.abs(end.dx)).toBeLessThan(1);
    }
  });

  it('leans back during the windup and lunges forward at the strike', () => {
    for (const s of STRIKES.filter((x) => ATTACK[x].lean > 0)) {
      const w = windupFor(s, null);
      expect(attackPose(s, w * 0.99, 100, w).rot).toBeLessThan(0);
      expect(attackPose(s, w + ATTACK[s].strike * 0.95, 100, w).rot).toBeGreaterThan(0);
    }
  });

  it('squeezes the windup to fit a short lead but never below the minimum', () => {
    expect(windupFor('chop', null)).toBe(ATTACK.chop.windup);
    expect(windupFor('chop', 0.5)).toBe(ATTACK.chop.windup);
    const squeezed = windupFor('chop', 0.1);
    expect(squeezed).toBeLessThan(ATTACK.chop.windup);
    expect(impactTime('chop', squeezed, 0)).toBeLessThanOrEqual(0.1 + 1e-9);
    expect(windupFor('chop', 0)).toBeGreaterThan(0);
  });

  it('a double strike has a second impact after the first', () => {
    const w = windupFor('double', null);
    expect(impactTime('double', w, 1)).toBeGreaterThan(impactTime('double', w, 0));
    expect(attackDuration('double', w)).toBeGreaterThan(impactTime('double', w, 1));
  });

  it('walks in hops that alternate tilt and squash on landing', () => {
    const up = walkPose(0.5, 100, 1);
    expect(up.dy).toBeLessThan(0);
    expect(walkPose(0.02, 100, 1).sy).toBeLessThan(1);
    expect(Math.sign(walkPose(0.5, 100, 1).rot - 0.05)).not.toBe(
      Math.sign(walkPose(1.5, 100, 1).rot - 0.05),
    );
    expect(finite(idlePose(3.7))).toBe(true);
  });

  it('knock-out tips away from the blow, dims, and the flash runs white then red then off', () => {
    expect(koPose(0, 1).pose.rot).toBe(0);
    expect(koPose(1, 1).pose.rot).toBeGreaterThan(1);
    expect(koPose(1, -1).pose.rot).toBeLessThan(-1);
    expect(koPose(1, 1).alpha).toBeLessThan(1);
    expect(hurtFlash(1)?.color).toBe(0xffffff);
    expect(hurtFlash(0.5)?.color).toBe(0xc0201a);
    expect(hurtFlash(0.1)).toBeNull();
  });
});
