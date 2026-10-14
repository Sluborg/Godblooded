// Bakes the frames of a part-based look into ONE canvas atlas per look, once, on first sight.
// Drawing a hero from parts every frame would cost far too much on a phone; a baked frame is one
// image draw. Memory is kept small on purpose (a phone has a hard canvas budget): a modest bake
// scale, one canvas per look (not one per frame), and looks nobody uses any more are released.
import Phaser from 'phaser';
import type { PartsDef } from '../../data/heroParts';
import { drawHuman, pose as rigPose, setState, usc } from './proto.gen';
import { drawKit, kitScale, layout } from './painted';
import { kitOf } from './paintedLoad';
import { gradePixels } from './partsStyle';
import {
  ATLAS_COLS as COLS,
  FRAME_COUNT,
  FRAME_H,
  FRAME_W,
  ORIGIN,
  frameState,
  pxPerUnit,
  type PoseName,
} from './frames';

export interface BakedSet {
  id: string;
  // The atlas texture key and, per pose, the frame names inside it.
  atlas: string;
  frames: Record<PoseName, string[]>;
  // Where the feet are in a frame, as fractions of the frame (the image origin).
  originX: number;
  originY: number;
  // Baked pixels per drawing unit.
  pxPerUnit: number;
  lastUsed: number;
}

const POSES: PoseName[] = ['idle', 'walk', 'attack', 'ko'];
const sets = new Map<string, BakedSet>();

// Returns the baked set for a look, baking it now if it is not there yet.
export function ensureHeroSet(scene: Phaser.Scene, id: string, def: PartsDef, tier = 1): BakedSet {
  const have = sets.get(id);
  if (have && scene.textures.exists(have.atlas)) {
    have.lastUsed = scene.time.now;
    return have;
  }
  const k = pxPerUnit();
  const fw = Math.ceil(FRAME_W * k);
  const fh = Math.ceil(FRAME_H * k);
  const total = POSES.reduce((n, p) => n + FRAME_COUNT[p], 0);
  const rows = Math.ceil(total / COLS);
  const atlas = `parts_${id}`;
  if (scene.textures.exists(atlas)) scene.textures.remove(atlas);
  // A painted look (a kit combo in data/heroKits.ts) is drawn from its pictures on the same rig.
  const kit = kitOf(scene, id);
  const tex = scene.textures.createCanvas(atlas, fw * COLS, fh * rows);
  const frames = { idle: [], walk: [], attack: [], ko: [] } as Record<PoseName, string[]>;
  const set: BakedSet = {
    id,
    atlas,
    frames,
    originX: ORIGIN.x / FRAME_W,
    originY: ORIGIN.y / FRAME_H,
    pxPerUnit: k,
    lastUsed: scene.time.now,
  };
  if (!tex) return set; // no canvas to draw on: the caller's frame names stay empty
  const c = tex.getContext();
  let n = 0;
  for (const pose of POSES) {
    for (let i = 0; i < FRAME_COUNT[pose]; i++, n++) {
      const x = (n % COLS) * fw;
      const y = Math.floor(n / COLS) * fh;
      const name = `${pose}${i}`;
      frames[pose].push(name);
      tex.add(name, 0, x, y, fw, fh);
      c.save();
      c.beginPath();
      c.rect(x, y, fw, fh);
      c.clip();
      c.translate(x, y);
      c.scale(k, k);
      c.translate(ORIGIN.x, ORIGIN.y);
      const st = frameState(pose, i);
      setState({ ctx: c, T: st.time, FL: 0 });
      // The prototype scales effects by the hero's tier (sel.t): subtle at 1, clearly effectful at 3.
      const u = {
        ...st.pose,
        d: def,
        kind: 'hero',
        sel: { t: Math.min(3, Math.max(1, Math.round(tier))), p: 0 },
        x: 0,
        y: 0,
        face: 1,
        alpha: 1,
        hits: 0,
      };
      if (kit) {
        const p = rigPose(u);
        // The same on-screen size as the code look: the painted figure is 44 units tall, the
        // prototype's is 32, drawn at usc(u) (its scale and the 0.86 unit scale).
        c.save();
        c.scale(kitScale(usc(u)), kitScale(usc(u)));
        drawKit(c, layout(kit, p, p.armF > 2.0 && u.atkT >= 0), p);
        c.restore();
      } else drawHuman(u);
      setState({ ctx: null });
      c.restore();
    }
  }
  // The palette grade, once over the whole atlas.
  const img = c.getImageData(0, 0, tex.width, tex.height);
  if (!kit) gradePixels(img.data);
  c.putImageData(img, 0, 0);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  sets.set(id, set);
  return set;
}

// Looks nobody has used for `idleMs` (and that `inUse` does not name) are released. Called every
// few seconds, so a run that moves on to higher tiers does not keep every old look.
export function sweepSets(scene: Phaser.Scene, inUse: ReadonlySet<string>, idleMs = 60_000): void {
  for (const [id, set] of sets) {
    if (inUse.has(id)) {
      set.lastUsed = scene.time.now;
      continue;
    }
    if (scene.time.now - set.lastUsed < idleMs) continue;
    if (scene.textures.exists(set.atlas)) scene.textures.remove(set.atlas);
    sets.delete(id);
  }
}

// Releases every baked look (the run ended or restarted).
export function releaseSets(scene: Phaser.Scene): void {
  for (const set of sets.values())
    if (scene.textures.exists(set.atlas)) scene.textures.remove(set.atlas);
  sets.clear();
}
