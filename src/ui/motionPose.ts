// The one motion system every unit shares (docs/decisions.md, 2026-10-05, and the reference
// docs/reference/motion-test.html). Pure maths, no Phaser: each function turns a time into a
// pose {rot, dx, dy, sx, sy} for a picture that faces right. Callers mirror by facing.

export type Strike = 'chop' | 'double' | 'sweep' | 'upward' | 'thrust' | 'smash' | 'bolt' | 'shot';

export const STRIKES: readonly Strike[] = [
  'chop',
  'double',
  'sweep',
  'upward',
  'thrust',
  'smash',
  'bolt',
  'shot',
];

export interface Pose {
  rot: number;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
}

// Seconds of windup, strike and recover, then the lunge (fraction of height) and lean-back
// (radians) used by the pose.
interface AttackTiming {
  windup: number;
  strike: number;
  recover: number;
  lunge: number;
  lean: number;
}

export const ATTACK: Record<Strike, AttackTiming> = {
  chop: { windup: 0.26, strike: 0.09, recover: 0.3, lunge: 0.12, lean: 0.24 },
  sweep: { windup: 0.2, strike: 0.1, recover: 0.28, lunge: 0.12, lean: 0.14 },
  upward: { windup: 0.18, strike: 0.08, recover: 0.3, lunge: 0.1, lean: 0.06 },
  thrust: { windup: 0.22, strike: 0.07, recover: 0.3, lunge: 0.24, lean: 0.04 },
  double: { windup: 0.18, strike: 0.08, recover: 0.46, lunge: 0.1, lean: 0.2 },
  bolt: { windup: 0.3, strike: 0.06, recover: 0.3, lunge: 0, lean: 0.1 },
  smash: { windup: 0.42, strike: 0.1, recover: 0.45, lunge: 0.1, lean: 0.2 },
  shot: { windup: 0.2, strike: 0.06, recover: 0.24, lunge: 0, lean: 0.08 },
};

// The second blade of a double strike lands this long after the first one began its strike.
const DOUBLE_GAP = 0.25;
const DOUBLE_SECOND_IMPACT = 0.17;
const MIN_WINDUP = 0.04;

const ease = (x: number) => 1 - (1 - x) * (1 - x);

export const NEUTRAL: Readonly<Pose> = { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 };

// How long the windup may be when the hit has to land `leadS` seconds from now. The sim emits
// `hit` at impact, so without an earlier warning the windup is squeezed to what fits.
export function windupFor(strike: Strike, leadS: number | null): number {
  const t = ATTACK[strike];
  if (leadS === null) return t.windup;
  return Math.max(MIN_WINDUP, Math.min(t.windup, leadS - t.strike / 2));
}

// Seconds from the start of the attack to the n-th impact (0, or 1 for the second blade).
export function impactTime(strike: Strike, windup: number, n: 0 | 1): number {
  const t = ATTACK[strike];
  return n === 0 ? windup + t.strike / 2 : windup + t.strike + DOUBLE_SECOND_IMPACT;
}

export function attackDuration(strike: Strike, windup: number): number {
  const t = ATTACK[strike];
  return windup + t.strike + (strike === 'double' ? DOUBLE_GAP : 0) + t.recover;
}

// Pose at time `t` into the attack. `h` is the picture height, so lunges scale with the unit.
export function attackPose(strike: Strike, t: number, h: number, windup: number): Pose {
  const { strike: b, recover: c, lunge, lean } = ATTACK[strike];
  const a = windup;
  if (t < a) {
    const p = ease(Math.max(0, t) / a);
    const low = strike === 'upward' || strike === 'thrust';
    return {
      rot: -lean * p,
      dx: -(strike === 'thrust' ? 0.12 : 0.05) * h * p,
      dy: strike === 'smash' || strike === 'chop' ? -0.05 * h * p : 0,
      sx: 1 + (low ? 0.04 : -0.03) * p,
      sy: 1 + (low ? -0.07 : 0.04) * p,
    };
  }
  if (t < a + b) {
    const p = (t - a) / b;
    return {
      rot: -lean + (lean + 0.2) * p,
      dx: (-0.05 + (lunge + 0.05) * p) * h,
      dy: 0,
      sx: 1 + 0.05 * p,
      sy: 1 - 0.06 * p,
    };
  }
  if (strike === 'double' && t < a + b + DOUBLE_GAP) {
    // second blade: a quick lean back, then another chop
    const k = (t - a - b) / DOUBLE_GAP;
    const s2 = k < 0.6 ? -Math.sin(((k / 0.6) * Math.PI) / 2) : -1 + ((k - 0.6) / 0.4) * 2;
    return {
      rot: 0.2 * s2 * (s2 < 0 ? 0.8 : 1),
      dx: lunge * h * (0.6 + 0.4 * Math.max(0, s2)),
      dy: 0,
      sx: 1,
      sy: 1 - 0.04 * Math.max(0, s2),
    };
  }
  const p = Math.min(1, (t - a - b - (strike === 'double' ? DOUBLE_GAP : 0)) / c);
  const q = 1 - ease(p);
  return { rot: 0.2 * q, dx: lunge * h * q, dy: 0, sx: 1 + 0.05 * q, sy: 1 - 0.06 * q };
}

// Distance walked per hop, as a fraction of the picture height. A step is tied to distance, so
// a fast unit hops faster and a standing one does not hop at all.
export const STEP_LENGTH = 0.32;

// `stepT` counts steps (its integer part is the step number, the fraction the hop phase).
export function walkPose(stepT: number, h: number, face: 1 | -1): Pose {
  const ph = stepT % 1;
  const hop = Math.sin(ph * Math.PI);
  const land = ph < 0.15 ? 1 - ph / 0.15 : 0;
  return {
    rot: (Math.floor(stepT) % 2 ? 1 : -1) * 0.07 * hop + 0.05 * face,
    dx: 0,
    dy: -hop * h * 0.07,
    sx: 1 + land * 0.05,
    sy: 1 - land * 0.06,
  };
}

// Idle breathing: a barely visible swell.
export function idlePose(phase: number): Pose {
  return {
    rot: Math.sin(phase * 1.3) * 0.012,
    dx: 0,
    dy: 0,
    sx: 1,
    sy: 1 + Math.sin(phase * 2.4) * 0.012,
  };
}

export const FALL_S = 0.28;
export const RISE_S = 0.4;

// Knocked-out fall: `k` runs 0 (standing) to 1 (down). Tips over away from the blow and dims.
export function koPose(k: number, dir: 1 | -1): { pose: Pose; alpha: number } {
  const e = 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  return { pose: { rot: e * 1.5 * dir, dx: 0, dy: 0, sx: 1, sy: 1 }, alpha: 1 - 0.3 * e };
}

// Hurt flash: `hit` runs 1 (just hit) down to 0. White first, then red, then nothing.
export function hurtFlash(hit: number): { color: number; alpha: number } | null {
  if (hit <= 0.2) return null;
  return hit > 0.8
    ? { color: 0xffffff, alpha: hit - 0.2 }
    : { color: 0xc0201a, alpha: (hit - 0.2) * 0.7 };
}

// How long after the promised time a swing started by a sim `windup` waits for its `hit`
// before it counts as cancelled.
export const CANCEL_GRACE_S = 0.1;

export interface SwingClock {
  strike: Strike;
  t: number;
  windup: number;
  // Started by a sim `windup` event and still waiting for the matching `hit`.
  awaitingHit: boolean;
  leadS: number;
  fired: readonly [boolean, boolean];
}

// What to do this frame: which impacts to fire now, and whether the swing was cancelled. An
// impact waits for its hit when the swing came from a windup event; it fires at its scheduled
// time (or at once if the hit came late) once the hit has arrived.
export function swingStep(c: SwingClock): { fire: (0 | 1)[]; cancel: boolean } {
  if (c.awaitingHit) return { fire: [], cancel: c.t > c.leadS + CANCEL_GRACE_S };
  const fire: (0 | 1)[] = [];
  for (const n of [0, 1] as const) {
    if (n === 1 && c.strike !== 'double') continue;
    if (!c.fired[n] && c.t >= impactTime(c.strike, c.windup, n)) fire.push(n);
  }
  return { fire, cancel: false };
}
