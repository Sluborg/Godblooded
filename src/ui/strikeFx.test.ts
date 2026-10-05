import { describe, expect, it } from 'vitest';
import { STRIKES } from './motionPose';
import { buildStrike, fromWeapon, type StrikeInput } from './strikeFx';

const base: StrikeInput = {
  strike: 'chop',
  x: 100,
  y: 300,
  face: 1,
  h: 120,
  weapon: { x: 70, y: 220 },
  weapon2: { x: 150, y: 260 },
  target: { x: 220, y: 250 },
  n: 0,
  backFirst: true,
  cross: false,
  reach: 60,
  // fixed "random" so the result is repeatable: always the middle of the range
  rnd: (a, b) => (a + b) / 2,
};

describe('strike effects', () => {
  it('every strike builds at least one effect with a positive life', () => {
    for (const strike of STRIKES) {
      const r = buildStrike({ ...base, strike });
      expect(r.effects.length).toBeGreaterThan(0);
      for (const e of r.effects) expect(e.life).toBeGreaterThan(0);
    }
  });

  it('an overhead chop starts its arc at the weapon, behind the head', () => {
    const r = buildStrike(base);
    const e = r.effects[0];
    if (e.type !== 'arc') throw new Error('expected an arc');
    // the first point of the arc, in world space, is near the weapon (behind and above)
    const x0 = e.x + Math.cos(e.a0) * e.r * e.f;
    expect(x0).toBeLessThan(base.x);
    expect(e.a0).toBeLessThan(0);
  });

  it('a thrust starts at the weapon and a smash lands on the ground ahead with a shake', () => {
    const t = buildStrike({ ...base, strike: 'thrust' }).effects[0];
    expect(t.type === 'thrust' && t.x).toBe(base.weapon.x);
    const s = buildStrike({ ...base, strike: 'smash' });
    expect(s.smash).toEqual({ x: base.x + base.reach, y: base.y });
    expect(buildStrike(base).smash).toBeNull();
  });

  it('a bolt runs from the weapon to the target and a shot flies there', () => {
    const bolt = buildStrike({ ...base, strike: 'bolt' }).effects[0];
    expect(bolt.type === 'bolt' && [bolt.x, bolt.y, bolt.tx, bolt.ty]).toEqual([70, 220, 220, 250]);
    const shot = buildStrike({ ...base, strike: 'shot' }).effects[0];
    expect(shot.type === 'arrow' && [shot.tx, shot.ty]).toEqual([220, 250]);
  });

  it('a double strike swings the back blade first or second as rolled', () => {
    const a = buildStrike({ ...base, strike: 'double', n: 0, backFirst: true }).effects[0];
    const b = buildStrike({ ...base, strike: 'double', n: 0, backFirst: false }).effects[0];
    if (a.type !== 'arc' || b.type !== 'arc') throw new Error('expected arcs');
    expect(a.life).not.toBe(b.life);
  });

  it('an arc that must start at a weapon low behind the body wraps below the back', () => {
    expect(fromWeapon(100, 250, { x: 60, y: 290 }, 1, -1.7)).toBeLessThan(-Math.PI);
  });
});
