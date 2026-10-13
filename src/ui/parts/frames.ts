// Which baked frame to show: pure mapping from what the unit is doing to a frame index. The
// frames themselves are baked once per look (bake.ts) and played like a sprite sheet.
import type { PartsPose } from './heroDraw';

export type PoseName = 'idle' | 'walk' | 'attack' | 'ko';

// Frames per pose. Idle is four steps of the breathing cycle, walk is one full stride.
export const FRAME_COUNT: Readonly<Record<PoseName, number>> = {
  idle: 4,
  walk: 6,
  attack: 6,
  ko: 3,
};

// The frame box in drawing units (hero standing on its feet at ORIGIN), and the feet.
export const FRAME_W = 80;
export const FRAME_H = 84;
export const ORIGIN = { x: 32, y: 72 };

// Breathing cycle length in seconds (matches the prototype's sin(t * 2.6)).
const BREATH_S = (Math.PI * 2) / 2.6;

export function idleFrame(timeS: number): number {
  const f = (timeS / BREATH_S) % 1;
  return Math.floor((f < 0 ? f + 1 : f) * FRAME_COUNT.idle) % FRAME_COUNT.idle;
}

// `stepT` counts strides (one unit is one full stride).
export function walkFrame(stepT: number): number {
  const f = stepT % 1;
  return Math.floor((f < 0 ? f + 1 : f) * FRAME_COUNT.walk) % FRAME_COUNT.walk;
}

// `progress` runs 0..1 through the swing.
export function attackFrame(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return Math.min(FRAME_COUNT.attack - 1, Math.round(p * (FRAME_COUNT.attack - 1)));
}

// `koK` runs 0..1 as the unit falls.
export function koFrame(koK: number): number {
  const k = Math.min(1, Math.max(0, koK));
  return Math.min(FRAME_COUNT.ko - 1, Math.floor(k * FRAME_COUNT.ko));
}

// The drawing state of frame `i` of a pose.
export function frameState(pose: PoseName, i: number): { time: number; pose: PartsPose } {
  const base: PartsPose = {
    ph: 0,
    ko: false,
    koT: 0,
    moving: false,
    walkPh: 0,
    cheer: 0,
    channel: 0,
    atkT: -1,
    flash: 0,
    sparkT: 0,
    glow: 0,
    tgt: true,
  };
  if (pose === 'idle') return { time: (i / FRAME_COUNT.idle) * BREATH_S, pose: base };
  if (pose === 'walk')
    return {
      time: 0,
      pose: { ...base, moving: true, walkPh: (i / FRAME_COUNT.walk) * Math.PI * 2 },
    };
  if (pose === 'attack')
    return {
      time: 0,
      pose: { ...base, atkT: i / (FRAME_COUNT.attack - 1), sparkT: 1, glow: 1 },
    };
  // KO: the fall plays over koT 0..0.35 (the prototype's get-down time).
  const k = (i + 1) / FRAME_COUNT.ko;
  return { time: 0, pose: { ...base, ko: true, koT: 0.35 * k } };
}
