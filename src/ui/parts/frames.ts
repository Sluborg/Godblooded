// Which baked frame to show: pure mapping from what the unit is doing to a frame index. The
// frames themselves are baked once per look (bake.ts) and played like a sprite sheet.
// What the drawing needs to know about the unit: the pose and the moment inside it.
export interface PartsPose {
  ph: number; // personal phase offset (seconds)
  ko: boolean;
  koT: number; // 0..0.6 into the fall
  moving: boolean;
  walkPh: number; // radians
  cheer: number; // seconds left of the cheer
  channel: number;
  atkT: number; // 0..1 through the swing, -1 when not attacking
  flash: number; // 0..1 white hit flash
  sparkT: number; // > 0: weapon sparks (thunder hammer)
  glow: number; // 0..1 god glow (gold fx)
  tgt: boolean; // has a target (draws the swing trail)
}

export type PoseName = 'idle' | 'walk' | 'attack' | 'ko';

// Frames per pose. Idle is eight steps of the full idle loop (two breaths and one sway), walk is
// one full stride.
export const FRAME_COUNT: Readonly<Record<PoseName, number>> = {
  idle: 8,
  walk: 6,
  attack: 12,
  ko: 3,
};

// The frame box in drawing units (hero standing on its feet at ORIGIN), and the feet.
export const FRAME_W = 96;
export const FRAME_H = 96;
export const ORIGIN = { x: 38, y: 84 };

// The idle loop in seconds: the prototype breathes at sin(t * 1.5) and sways at sin(t * 0.75), so
// the loop closes after one sway, which is two breaths. Eight frames keep four per breath.
const BREATH_S = (Math.PI * 2) / 0.75;

export function idleFrame(timeS: number): number {
  const f = (timeS / BREATH_S) % 1;
  return Math.floor((f < 0 ? f + 1 : f) * FRAME_COUNT.idle) % FRAME_COUNT.idle;
}

// `stepT` counts strides (one unit is one full stride).
export function walkFrame(stepT: number): number {
  const f = stepT % 1;
  return Math.floor((f < 0 ? f + 1 : f) * FRAME_COUNT.walk) % FRAME_COUNT.walk;
}

// The strike lands at this share of the swing (the prototype's SWING.std `hit`), and the frame at
// contact is held for a moment (a tiny hit-stop: the blow has weight).
const HIT_AT = 0.62;
const HIT_STOP = 0.06;

// `progress` runs 0..1 through the swing.
export function attackFrame(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const q =
    p < HIT_AT
      ? p
      : p < HIT_AT + HIT_STOP
        ? HIT_AT
        : HIT_AT + ((p - HIT_AT - HIT_STOP) * (1 - HIT_AT)) / (1 - HIT_AT - HIT_STOP);
  return Math.min(FRAME_COUNT.attack - 1, Math.round(q * (FRAME_COUNT.attack - 1)));
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

// Frames per row of a look's atlas.
export const ATLAS_COLS = 5;

// Bake pixels per drawing unit. A hero is 44 drawing units, so 1.5 gives a 66 px figure: about
// one screen pixel per baked pixel on a phone. Capped so a look stays near 2 MB (plus the same
// again in its canvas), however dense the screen.
export function pxPerUnit(dpr: number = globalThis.devicePixelRatio || 1): number {
  return Math.round(Math.min(1.5, Math.max(1.2, dpr * 0.8)) * 10) / 10;
}

// Approximate GPU bytes of one baked look at a pixel scale (for budgeting and tests).
export function lookBytes(k: number): number {
  const total = FRAME_COUNT.idle + FRAME_COUNT.walk + FRAME_COUNT.attack + FRAME_COUNT.ko;
  const rows = Math.ceil(total / ATLAS_COLS);
  return Math.ceil(FRAME_W * k) * ATLAS_COLS * Math.ceil(FRAME_H * k) * rows * 4;
}
