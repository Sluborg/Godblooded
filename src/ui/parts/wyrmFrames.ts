import { IDLE_POSE, type WyrmPose } from './wyrm';
import type { PoseName } from './frames';

// The frames of Fafnir's atlas: which pose each one is drawn in (pure, no canvas). Idle is one
// full loop (a sway and two breaths), walk one stride, bite and breath run from the first frame
// to the last, and the fall has two steps.
export const WYRM_COUNT: Readonly<Record<PoseName, number>> = {
  idle: 4,
  walk: 6,
  attack: 5,
  breath: 5,
  ko: 2,
};

// The frame box in drawing units and where the feet are: wide enough for the tail behind and the
// flame in front.
export const WYRM_W = 340;
export const WYRM_H = 230;
export const WYRM_ORIGIN = { x: 145, y: 208 };
// How tall Fafnir is in drawing units (feet to the top of the spines), for scaling to the map.
export const WYRM_DRAW_H = 130;

const LOOP_S = Math.PI * 2;

// A boss is one unit at a time, but its frames are big: the bake scale stays at 1 or below, which
// keeps its atlas under 8 MB (plus the canvas copy).
export function wyrmPxPerUnit(dpr: number = globalThis.devicePixelRatio || 1): number {
  return Math.round(Math.min(1, Math.max(0.8, dpr * 0.8)) * 10) / 10;
}

export function wyrmBytes(k: number): number {
  const total = Object.values(WYRM_COUNT).reduce((a, b) => a + b, 0);
  const rows = Math.ceil(total / 5);
  return Math.ceil(WYRM_W * k) * 5 * Math.ceil(WYRM_H * k) * rows * 4;
}

export function wyrmIdleFrame(timeS: number): number {
  const f = (timeS / LOOP_S) % 1;
  return Math.floor((f < 0 ? f + 1 : f) * WYRM_COUNT.idle) % WYRM_COUNT.idle;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// The bite: rest, rear back, lunge with the jaw open, pull back, settle.
const BITE: Pick<WyrmPose, 'lift' | 'lunge' | 'jaw'>[] = [
  { lift: 0, lunge: 0, jaw: 0 },
  { lift: 0.7, lunge: 0, jaw: 0.4 },
  { lift: 0, lunge: 1, jaw: 1 },
  { lift: 0, lunge: 0.45, jaw: 0.6 },
  { lift: 0, lunge: 0, jaw: 0 },
];

// The fire breath: rear up and inhale (one frame), open wide, burn (two), close.
const BREATH: Pick<WyrmPose, 'lift' | 'lunge' | 'jaw' | 'fire'>[] = [
  { lift: 0.5, lunge: 0, jaw: 0.1, fire: 0 },
  { lift: 1, lunge: 0, jaw: 0.6, fire: 0.25 },
  { lift: 0.7, lunge: 0.2, jaw: 1, fire: 1 },
  { lift: 0.5, lunge: 0.25, jaw: 1, fire: 0.9 },
  { lift: 0.2, lunge: 0, jaw: 0.4, fire: 0.3 },
];

export function wyrmFrameState(pose: PoseName, i: number): WyrmPose {
  switch (pose) {
    case 'idle':
      return { ...IDLE_POSE, t: (i / WYRM_COUNT.idle) * LOOP_S };
    case 'walk':
      return { ...IDLE_POSE, walk: (i / WYRM_COUNT.walk) * LOOP_S };
    case 'attack':
      return { ...IDLE_POSE, ...BITE[Math.min(i, BITE.length - 1)] };
    case 'breath':
      return { ...IDLE_POSE, ...BREATH[Math.min(i, BREATH.length - 1)], fireT: i * 0.37 };
    default: {
      const k = (i + 1) / WYRM_COUNT.ko;
      return { ...IDLE_POSE, ko: k, jaw: 0.5 * k, lift: 0.2 * k };
    }
  }
}

// The frame to show `progress` (0..1) through a fire breath.
export function breathFrame(progress: number): number {
  const p = clamp01(progress);
  return Math.min(WYRM_COUNT.breath - 1, Math.round(p * (WYRM_COUNT.breath - 1)));
}
