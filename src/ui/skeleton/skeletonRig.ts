// Draws a hero on the skeleton (skeleton.ts) from kit parts: one Phaser image per part, placed each
// frame from the pose. Facing left mirrors the whole figure (scale x -1). Part pictures come from
// the manifest's kit sheets by id (paintedLoad.partRef); a missing id leaves that part out.
import Phaser from 'phaser';
import { partRef, type PartRef } from '../parts/paintedLoad';
import {
  geomOf,
  skeletonPose,
  solveLimb,
  weaponAngle,
  type Geom,
  type PoseInput,
  type SkeletonPose,
  type Tune,
  TUNE,
} from './skeleton';

// Part ids a skeleton hero wears (kit_rig_test, kit_rig_hands, a head and boots from the G12 sheets).
export interface RigSpec {
  torso: string;
  upperarm: string;
  forearm: string;
  thigh: string;
  shin: string;
  head: string;
  boot: string;
  // The fist on the weapon arm and on the free arm.
  fistW: string;
  fistO: string;
  weapon?: string;
  // The weapon's size against its sheet (1 = as painted).
  weaponScale?: number;
}

const DARK = 0xb4b4b4;

const pv = (r: PartRef, name: string): [number, number] => {
  const p = r.cell.pivots?.[name];
  return p ? [p[0], p[1]] : [0.5, 0.5];
};
// Distance between two pivots of a part, in drawing units.
const span = (r: PartRef, a: string, b: string): number => {
  const [ax, ay] = pv(r, a);
  const [bx, by] = pv(r, b);
  return Math.hypot((bx - ax) * r.cell.w, (by - ay) * r.cell.h) / r.ppu;
};
// The angle of the bone a→b inside the part's picture (y down), 0 = to the right.
const axis = (r: PartRef, a: string, b: string): number => {
  const [ax, ay] = pv(r, a);
  const [bx, by] = pv(r, b);
  return Math.atan2((by - ay) * r.cell.h, (bx - ax) * r.cell.w);
};

export class SkeletonRig extends Phaser.GameObjects.Container {
  readonly geom: Geom;
  private readonly refs: Record<string, PartRef | null>;
  private readonly imgs = new Map<string, Phaser.GameObjects.Image>();
  private readonly legs: Phaser.GameObjects.Container;
  private readonly upper: Phaser.GameObjects.Container;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private lastOrder = '';

  // `unit`: screen pixels per drawing unit.
  constructor(
    scene: Phaser.Scene,
    readonly spec: RigSpec,
    private readonly unit: number,
    private readonly tune: Tune = TUNE,
  ) {
    super(scene, 0, 0);
    const ids = [
      spec.torso,
      spec.upperarm,
      spec.forearm,
      spec.thigh,
      spec.shin,
      spec.head,
      spec.boot,
      spec.fistW,
      spec.fistO,
      ...(spec.weapon ? [spec.weapon] : []),
    ];
    this.refs = {};
    for (const id of ids) this.refs[id] = partRef(scene, id);
    this.geom = this.measure();
    this.shadow = scene.add.ellipse(0, 0, this.geom.torsoW * 1.05, 1.4, 0x000000, 0.22);
    this.legs = scene.add.container(0, 0);
    this.upper = scene.add.container(0, 0);
    this.add([this.shadow, this.legs, this.upper]);
    this.setScale(unit);
  }

  // Whether every part the rig needs has a picture.
  get ready(): boolean {
    const s = this.spec;
    return [s.torso, s.upperarm, s.forearm, s.thigh, s.shin, s.head, s.boot].every(
      (id) => this.refs[id],
    );
  }

  private ref(id: string | undefined): PartRef | null {
    return id ? (this.refs[id] ?? null) : null;
  }

  // Bone lengths and body offsets from the parts' own pivots (kit_rig_test is cut to Stefan's sizes).
  private measure(): Geom {
    const s = this.spec;
    const torso = this.ref(s.torso);
    const up = this.ref(s.upperarm);
    const fore = this.ref(s.forearm);
    const thigh = this.ref(s.thigh);
    const shin = this.ref(s.shin);
    const boot = this.ref(s.boot);
    if (!torso || !up || !fore || !thigh || !shin || !boot) {
      return geomOf({ upper: 5, fore: 4, thigh: 3, shin: 3, footH: 2, torsoW: 16, torsoH: 12 });
    }
    const w = torso.cell.w / torso.ppu;
    const h = torso.cell.h / torso.ppu;
    const [hrx, hry] = pv(torso, 'hip_r');
    const [hlx] = pv(torso, 'hip_l');
    const [, shy] = pv(torso, 'shoulder_l');
    const [shx] = pv(torso, 'shoulder_l');
    const footH = ((pv(boot, 'ground')[1] - pv(boot, 'ankle')[1]) * boot.cell.h) / boot.ppu;
    return geomOf(
      {
        upper: span(up, 'shoulder', 'elbow'),
        fore: span(fore, 'elbow', 'wrist'),
        thigh: span(thigh, 'hip', 'knee'),
        shin: span(shin, 'knee', 'ankle'),
        footH,
        torsoW: w,
        torsoH: h,
      },
      {
        // The weapon-side shoulder is the viewer's right one (x < 0 after the mirror in `update`).
        sh: { x: (shx - 0.5) * w, y: (shy - hry) * h },
        hipX: ((hlx - hrx) / 2) * w,
        skirt: (1 - hry) * h,
      },
    );
  }

  private img(key: string, id: string | undefined, parent: Phaser.GameObjects.Container) {
    let im = this.imgs.get(key);
    const r = this.ref(id);
    if (!r) return null;
    if (!im) {
      im = this.scene.add.image(0, 0, r.tex, r.id);
      im.setScale(1 / r.ppu);
      this.imgs.set(key, im);
      parent.add(im);
    }
    return im;
  }

  // Puts `key`'s image with `pivot` on (x, y), turned by `rot`, optionally darkened.
  private put(
    key: string,
    id: string | undefined,
    parent: Phaser.GameObjects.Container,
    pivot: string,
    x: number,
    y: number,
    rot: number,
    dark = false,
    scale = 1,
    origin?: [number, number],
  ): void {
    const im = this.img(key, id, parent);
    const r = this.ref(id);
    if (!im || !r) return;
    const [fx, fy] = origin ?? pv(r, pivot);
    im.setOrigin(fx, fy)
      .setPosition(x, y)
      .setRotation(rot)
      .setScale(scale / r.ppu);
    if (dark) im.setTint(DARK);
    else im.clearTint();
    im.setVisible(true);
  }

  private order(parent: Phaser.GameObjects.Container, keys: string[]): void {
    const sig = parent === this.upper ? keys.join(',') : '';
    if (parent === this.upper) {
      if (sig === this.lastOrder) return;
      this.lastOrder = sig;
    }
    keys.forEach((k) => {
      const im = this.imgs.get(k);
      if (im) parent.bringToTop(im);
    });
  }

  // `face` 1 = right, -1 = left (the whole figure mirrors).
  update(input: PoseInput, face: 1 | -1): SkeletonPose {
    const g = this.geom;
    const s = this.spec;
    const P = skeletonPose(g, input, this.tune);
    this.setScale(face * this.unit, this.unit);
    this.shadow.setPosition(P.px + g.k * 6, 0.3);
    this.legs.setPosition(P.px, 0);
    this.upper.setPosition(P.px, 0);
    this.upper.setRotation(0);
    const pel = { x: 0, y: P.py };
    // Legs: the back (dark) one first, the front one over it. The knee bends forward.
    for (const i of [0, 1] as const) {
      const hip = { x: (i ? g.hipX : -g.hipX) * 0.9, y: pel.y - (i ? 0 : 2 * g.k) };
      const f = P.feet[i];
      const ankle = { x: f.x, y: g.ankle + f.y - (i ? 0 : 2 * g.k) };
      const l = solveLimb(hip, ankle, g.thigh, g.shin, -1);
      const th = this.ref(s.thigh);
      const sh = this.ref(s.shin);
      if (th)
        this.put(
          `th${i}`,
          s.thigh,
          this.legs,
          'hip',
          hip.x,
          hip.y,
          l.a1 - axis(th, 'hip', 'knee'),
          i === 0,
        );
      if (sh)
        this.put(
          `sh${i}`,
          s.shin,
          this.legs,
          'knee',
          l.mid.x,
          l.mid.y,
          l.a2 - axis(sh, 'knee', 'ankle'),
          i === 0,
        );
      this.put(`bt${i}`, s.boot, this.legs, 'ankle', l.end.x, l.end.y, f.toe, i === 0);
    }
    this.order(this.legs, ['th0', 'sh0', 'bt0', 'th1', 'sh1', 'bt1']);

    // The upper body leans about the pelvis.
    this.upper.setPosition(P.px + pel.x, pel.y);
    this.upper.setRotation(P.lean);
    // Weapon arm on the viewer's left of the torso (x < 0), like the prototype; free arm opposite.
    const wSh = { x: -g.sh.x, y: g.sh.y };
    const oSh = { x: g.sh.x, y: g.sh.y };
    const arm = (
      key: string,
      sh: { x: number; y: number },
      hand: { x: number; y: number },
      dark: boolean,
    ) => {
      const up = this.ref(s.upperarm);
      const fo = this.ref(s.forearm);
      const l = solveLimb(sh, { x: hand.x, y: hand.y - 0 }, g.upper, g.fore, 1);
      if (up)
        this.put(
          `${key}u`,
          s.upperarm,
          this.upper,
          'shoulder',
          sh.x,
          sh.y,
          l.a1 - axis(up, 'shoulder', 'elbow'),
          dark,
        );
      if (fo)
        this.put(
          `${key}f`,
          s.forearm,
          this.upper,
          'elbow',
          l.mid.x,
          l.mid.y,
          l.a2 - axis(fo, 'elbow', 'wrist'),
          dark,
        );
      return l;
    };
    // Strikes reach across the body; the free hand hangs a little outside its shoulder.
    const reachX = P.attack ? g.sh.x * 0.9 : 0;
    const out = Math.sign(oSh.x) * 0.08 * g.reach;
    const wl = arm('w', wSh, { x: wSh.x + P.hf.x + reachX, y: P.hf.y }, false);
    const ol = arm('o', oSh, { x: oSh.x + out + P.hb.x * 0.7, y: P.hb.y }, true);
    // Torso, head.
    const to = this.ref(s.torso);
    if (to) {
      const [nx, ny] = pv(to, 'neck');
      const [hx, hy] = pv(to, 'hip_l');
      const [hrx] = pv(to, 'hip_r');
      const midx = (hx + hrx) / 2;
      this.put('torso', s.torso, this.upper, 'hip_l', 0, 0, 0, false, 1, [midx, hy]);
      const neck = { x: (nx - midx) * (to.cell.w / to.ppu), y: (ny - hy) * (to.cell.h / to.ppu) };
      this.put('head', s.head, this.upper, 'neck', neck.x, neck.y, P.nod);
    }
    // The weapon sits in the weapon hand and follows the forearm within the wrist limit; the fist
    // is drawn over it.
    const wr = weaponAngle(P.axe, wl.a2);
    const ws = s.weaponScale ?? 1;
    this.put('weapon', s.weapon, this.upper, 'grip', wl.end.x, wl.end.y, wr, false, ws);
    this.put('fistW', s.fistW, this.upper, 'wrist', wl.end.x, wl.end.y, wl.a2 - Math.PI / 2);
    this.put(
      'fistO',
      s.fistO,
      this.upper,
      'wrist',
      ol.end.x,
      ol.end.y,
      ol.a2 - Math.PI / 2 - 0.42,
      true,
    );
    // Order: free arm and its fist behind the torso, then torso, then head and the weapon arm
    // (the weapon cocked behind the head is drawn before it).
    const tail = P.behind
      ? ['weapon', 'wu', 'wf', 'fistW', 'head']
      : ['head', 'wu', 'wf', 'weapon', 'fistW'];
    this.order(this.upper, ['ou', 'of', 'fistO', 'torso', ...tail]);
    return P;
  }

  destroy(fromScene?: boolean): void {
    this.imgs.clear();
    super.destroy(fromScene);
  }
}
