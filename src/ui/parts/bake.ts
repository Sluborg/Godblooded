// Bakes the frames of a part-based look into canvas textures, once per look, on first sight.
// Drawing a hero from parts every frame would cost far too much on a phone; a baked frame is one
// image draw. Frames are baked at the screen's pixel density so they stay crisp.
import Phaser from 'phaser';
import type { HeroPartsRow } from '../../data/heroParts';
import { withCtx } from './gfx';
import { drawHero } from './heroDraw';
import { FRAME_COUNT, FRAME_H, FRAME_W, ORIGIN, frameState, type PoseName } from './frames';

export interface BakedSet {
  id: string;
  keys: Record<PoseName, string[]>;
  // Where the feet are in a frame, as fractions of the frame (the image origin).
  originX: number;
  originY: number;
  // World units per baked pixel is 1 / pxPerUnit of the frame's drawing units.
  pxPerUnit: number;
}

const POSES: PoseName[] = ['idle', 'walk', 'attack', 'ko'];
const sets = new Map<string, BakedSet>();

// Bake pixels per drawing unit: a hero draws about 4.5 world units per drawing unit, so this
// keeps a baked pixel at or below a screen pixel for a phone at 2.5x density.
export function pxPerUnit(dpr: number = globalThis.devicePixelRatio || 1): number {
  const perWorld = Math.min(2.5, Math.max(1.5, dpr));
  return Math.round(perWorld * 1.6 * 10) / 10;
}

function seedOf(id: string, pose: string, i: number): number {
  let h = 2166136261;
  for (const c of `${id}${pose}${i}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h | 0;
}

export function hasSet(scene: Phaser.Scene, id: string): boolean {
  const s = sets.get(id);
  return !!s && scene.textures.exists(s.keys.idle[0]);
}

export function getSet(id: string): BakedSet | undefined {
  return sets.get(id);
}

// Returns the baked set for a look, baking it now if it is not there yet.
export function ensureHeroSet(scene: Phaser.Scene, id: string, row: HeroPartsRow): BakedSet {
  const have = sets.get(id);
  if (have && scene.textures.exists(have.keys.idle[0])) return have;
  const k = pxPerUnit();
  const w = Math.ceil(FRAME_W * k);
  const h = Math.ceil(FRAME_H * k);
  const keys = { idle: [], walk: [], attack: [], ko: [] } as Record<PoseName, string[]>;
  for (const pose of POSES) {
    for (let i = 0; i < FRAME_COUNT[pose]; i++) {
      const key = `parts_${id}_${pose}_${i}`;
      keys[pose].push(key);
      if (scene.textures.exists(key)) continue;
      const tex = scene.textures.createCanvas(key, w, h);
      if (!tex) continue;
      const c = tex.getContext();
      c.clearRect(0, 0, w, h);
      c.save();
      c.scale(k, k);
      c.translate(ORIGIN.x, ORIGIN.y);
      const st = frameState(pose, i);
      withCtx(c, st.time, seedOf(id, pose, i), () => drawHero(st.pose, row));
      c.restore();
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
  const set: BakedSet = {
    id,
    keys,
    originX: ORIGIN.x / FRAME_W,
    originY: ORIGIN.y / FRAME_H,
    pxPerUnit: k,
  };
  sets.set(id, set);
  return set;
}
