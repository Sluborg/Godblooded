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
import { drawLedgerHeld, drawSackBack } from './collectorProps';
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

// Painted pictures are finely detailed: bake their frames denser (pixels per drawing unit) than the
// code shapes, or they upscale to mush on a phone. 29 frames in 6 atlas rows: about 2.5 MB per
// look at 1.5, 6.9 MB at 2.5. With 8 or more painted looks on screen that is 50 MB or more of
// canvas textures on a phone: measure before the hero kits go live (or lower this on low-memory
// devices).
export const KIT_BAKE = 2.5;

const POSES: PoseName[] = ['idle', 'walk', 'attack', 'ko'];
const sets = new Map<string, BakedSet>();

// Returns the baked set for a look, baking it now if it is not there yet.
export function ensureHeroSet(scene: Phaser.Scene, id: string, def: PartsDef, tier = 1): BakedSet {
  const have = sets.get(id);
  if (have && scene.textures.exists(have.atlas)) {
    have.lastUsed = scene.time.now;
    return have;
  }
  // A painted look (a kit combo in data/heroKits.ts) is drawn from its pictures on the same rig.
  // The tax collector's look carries a sack size (0 to 2) and names the kit it would use.
  const sack =
    typeof def.sack === 'number' ? (Math.min(2, Math.max(0, def.sack)) as 0 | 1 | 2) : -1;
  const kit = kitOf(scene, typeof def.kit === 'string' ? def.kit : id);
  const k = kit ? Math.max(pxPerUnit(), KIT_BAKE) : pxPerUnit();
  const fw = Math.ceil(FRAME_W * k);
  const fh = Math.ceil(FRAME_H * k);
  const total = POSES.reduce((n, p) => n + FRAME_COUNT[p], 0);
  const rows = Math.ceil(total / COLS);
  const atlas = `parts_${id}`;
  if (scene.textures.exists(atlas)) scene.textures.remove(atlas);
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
      // The collector's sack hangs behind him; the ledger is drawn over the body at the front hand.
      const props = sack >= 0 ? rigPose(u) : null;
      if (props) {
        c.save();
        c.scale(usc(u), usc(u));
        drawSackBack(c, sack as 0 | 1 | 2, props);
        c.restore();
      }
      if (kit) {
        const p = rigPose(u);
        // The head follows the body a moment late (its own bob and tilt) and nods into a blow: the
        // pose a fraction of a second earlier, minus the pose now, is the head's offset.
        const early = {
          ...u,
          walkPh: u.walkPh - 0.55,
          atkT: u.atkT >= 0 ? Math.max(0, u.atkT - 0.07) : u.atkT,
        };
        setState({ ctx: c, T: st.time - 0.14, FL: 0 });
        const q = rigPose(early);
        setState({ ctx: c, T: st.time, FL: 0 });
        const into = u.atkT >= 0 ? Math.sin(Math.PI * Math.min(1, u.atkT * 1.15)) : 0;
        const headOff = kit.threeQuarter
          ? { dx: 0, dy: 0, rot: 0 }
          : {
              dx: 0.7 * into,
              dy: (q.bob - p.bob) * 1.5 + 0.35 * into,
              rot: (q.lean - p.lean) * 1.7 + 0.03 * Math.sin(st.time * 1.1) + 0.05 * into,
            };
        // The same on-screen size as the code look: the painted figure is 44 units tall, the
        // prototype's is 32, drawn at usc(u) (its scale and the 0.86 unit scale).
        c.save();
        c.scale(kitScale(usc(u)), kitScale(usc(u)));
        drawKit(c, layout(kit, p, p.armF > 2.0 && u.atkT >= 0, headOff), p);
        c.restore();
      } else drawHuman(u);
      if (props) {
        c.save();
        c.scale(usc(u), usc(u));
        drawLedgerHeld(c, props, String(def.skin ?? '#d3ab88'));
        c.restore();
      }
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
