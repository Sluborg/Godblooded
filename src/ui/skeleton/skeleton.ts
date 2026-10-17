// The hero skeleton (Stefan 2026-10-17, docs/game-design.md "Hero animation: skeleton and weapon
// stances"): bones, two-bone IK for arms and legs, clips as keyframed data, and a weapon fixed in
// the hand whose wrist bends only about 40 degrees. Pure maths, no Phaser: the drawing layer reads
// a `SkeletonPose` and places the kit parts. Ported from docs/reference/skeleton-test.tpl.html.
// Units: drawing units, feet on y 0, y down, the figure faces +x (the view mirrors for -x).
import { solveTwoBone, type V2 } from '../parts/painted';

export const clamp = (x: number, a: number, b: number): number => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

// Named easings, so a clip is plain data.
export const EASE = {
  inOut: (x: number): number => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  in: (x: number): number => x * x,
  out: (x: number): number => 1 - (1 - x) * (1 - x),
} as const;
export type EaseName = keyof typeof EASE;

// The wrist may bend this far either way from the forearm's line (about 40 degrees).
export const WRIST_LIMIT = 0.7;

// The prototype's torso width, the body its constants were tuned on.
export const REF_TORSO_W = 92;
export const REF_LEG = 35;

// Bone lengths and the body's fixed offsets, in drawing units.
export interface Bones {
  upper: number;
  fore: number;
  thigh: number;
  shin: number;
  // Foot height (ankle to sole), torso size.
  footH: number;
  torsoW: number;
  torsoH: number;
}

export interface Geom extends Bones {
  // The ankle's height above the ground (negative: up).
  ankle: number;
  // The pelvis rest height, and how far the torso hangs below it (the skirt).
  pel: number;
  skirt: number;
  // The weapon-side shoulder, relative to the pelvis (the off shoulder mirrors x).
  sh: V2;
  hipX: number;
  reach: number;
  // Scale of the prototype's numbers (its torso was 92 wide): every fixed distance below is
  // written for that body and multiplied by this.
  k: number;
  // The same for the legs: the prototype's legs were 35 long (thigh 18 + shin 17), and strides,
  // steps and the stance are written for that.
  kl: number;
}

// `over` replaces the fixed offsets with the real ones read from the kit's pivots.
export function geomOf(b: Bones, over: Partial<Pick<Geom, 'sh' | 'hipX' | 'skirt'>> = {}): Geom {
  const ankle = -b.footH * 0.87;
  const pel = ankle - (b.thigh + b.shin) * 0.93;
  const skirt = over.skirt ?? b.thigh * 0.7;
  const bottom = pel + skirt;
  const top = bottom - b.torsoH;
  return {
    ...b,
    ankle,
    pel,
    skirt,
    sh: over.sh ?? { x: b.torsoW * 0.42, y: top + b.torsoH * 0.14 - pel },
    hipX: over.hipX ?? ((b.thigh + b.shin) / REF_LEG) * 3,
    reach: b.upper + b.fore,
    k: b.torsoW / REF_TORSO_W,
    kl: (b.thigh + b.shin) / REF_LEG,
  };
}

// A keyframe: time (0..1 of the clip), hand (x, y from the shoulder in arm lengths), weapon angle,
// hips forward (units), lean (rad), and the easing INTO this key.
export type Key = readonly [
  t: number,
  hx: number,
  hy: number,
  axe: number,
  dx: number,
  lean: number,
  ease: EaseName,
];

export interface Clip {
  keys: readonly Key[];
  // Key indices of the strike contact (hit pause) window.
  contact: readonly [from: number, to: number];
  // The weapon is cocked behind the head from this fraction to this one (the head draws in front).
  behind: readonly [from: number, to: number];
}

// The axe chop (prototype ATK table). The contact key is the moment of the sim's `hit`.
export const CHOP: Clip = {
  keys: [
    [0.0, 0.2, 0.86, 0.3, 0, 0, 'inOut'],
    [0.34, -0.58, -0.78, -1.25, -4, -0.1, 'in'],
    [0.44, 0.78, -0.04, 1.35, 11, 0.2, 'out'],
    [0.52, 0.78, -0.04, 1.35, 11, 0.2, 'out'],
    [0.68, 0.66, 0.32, 1.75, 11, 0.24, 'inOut'],
    [1.0, 0.2, 0.86, 0.3, 0, 0, 'inOut'],
  ],
  contact: [2, 3],
  behind: [0.08, 0.4],
};

export type KeyValues = [hx: number, hy: number, axe: number, dx: number, lean: number];

// The keyed values at clip time `t` (0..1).
export function sampleKeys(keys: readonly Key[], t: number): KeyValues {
  const first = keys[0];
  const last = keys[keys.length - 1];
  const vals = (k: Key): KeyValues => [k[1], k[2], k[3], k[4], k[5]];
  if (t <= first[0]) return vals(first);
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (t <= b[0]) {
      const a = keys[i - 1];
      const k = EASE[b[6]]((t - a[0]) / (b[0] - a[0]));
      return [
        lerp(a[1], b[1], k),
        lerp(a[2], b[2], k),
        lerp(a[3], b[3], k),
        lerp(a[4], b[4], k),
        lerp(a[5], b[5], k),
      ];
    }
  }
  return vals(last);
}

// Clip fraction for `elapsed` seconds since the windup began, so the contact key lands exactly when
// the sim's `hit` does (`leadS` after the windup): the wind-up is stretched or squeezed to fit, the
// follow-through runs at the clip's own speed (`attackS` for the whole clip).
export function attackU(clip: Clip, elapsed: number, leadS: number, attackS: number): number {
  const contactAt = clip.keys[clip.contact[0]][0];
  if (leadS <= 0) return clamp(elapsed / attackS, 0, 1);
  if (elapsed < leadS) return (elapsed / leadS) * contactAt;
  return clamp(contactAt + (elapsed - leadS) / attackS, 0, 1);
}

// The weapon's angle in the hand, kept within the wrist limit of the forearm: `want` is the angle
// the clip asks for (0 = up, clockwise), `forearm` the forearm's direction (atan2 of the elbow to
// the wrist). Returns the haft's rotation to draw (0 = up, clockwise).
export function weaponAngle(want: number, forearm: number): number {
  let rel = want + 0.26 - Math.PI / 2 - forearm;
  rel = Math.atan2(Math.sin(rel), Math.cos(rel));
  rel = clamp(rel, -Math.PI / 2 - WRIST_LIMIT, -Math.PI / 2 + WRIST_LIMIT);
  return forearm + rel + Math.PI / 2;
}

export interface Foot {
  x: number;
  y: number;
  toe: number;
}

export interface Tune {
  stride: number;
  bob: number;
  swing: number;
  // Seconds for the whole attack clip.
  attackS: number;
  // Walk phase (radians) per second: the prototype's 1.8 steps a second.
  walkPhaseRate: number;
}
export const TUNE: Tune = {
  stride: 18,
  bob: 2.4,
  swing: 1,
  attackS: 1,
  walkPhaseRate: 1.8 * Math.PI,
};

export type SkeletonMode = 'idle' | 'walk' | 'attack' | 'hurt';

// What the drawing layer needs: root offset, joints' targets and the weapon's wish.
export interface SkeletonPose {
  px: number;
  py: number;
  lean: number;
  feet: [Foot, Foot];
  // Hand targets from the weapon shoulder (front) and the off shoulder (back), in drawing units
  // relative to the pelvis column.
  hf: V2;
  hb: V2;
  axe: number;
  nod: number;
  attack: boolean;
  contact: boolean;
  flash: number;
  // The weapon is cocked behind the head: draw it before the head.
  behind: boolean;
}

export interface PoseInput {
  mode: SkeletonMode;
  // Seconds in the mode (attack/hurt) and the walk phase (radians, 2 pi = one step cycle).
  t: number;
  walkPh: number;
  clip?: Clip;
  // Clip fraction, when the caller times the attack (see attackU); else t / attackS.
  u?: number;
}

export function skeletonPose(g: Geom, inp: PoseInput, tune: Tune = TUNE): SkeletonPose {
  const R = g.reach;
  const { mode, t } = inp;
  const P: SkeletonPose = {
    px: 0,
    py: g.pel,
    lean: 0,
    feet: [
      { x: -9 * g.kl, y: 0, toe: 0 },
      { x: 8 * g.kl, y: 0, toe: 0 },
    ],
    hf: { x: 0.2 * R, y: g.sh.y + 0.86 * R },
    hb: { x: 0.05 * R, y: g.sh.y + 0.95 * R },
    axe: 0.3,
    nod: 0,
    attack: false,
    contact: false,
    flash: 0,
    behind: false,
  };
  const k = g.k;
  P.py += Math.sin(t * 2.4) * 0.5 * k;
  if (mode === 'walk') {
    const St = tune.stride * g.kl;
    const H = 7 * g.kl;
    const u = (inp.walkPh / (Math.PI * 2)) % 1;
    for (const i of [0, 1] as const) {
      const v = (u + i * 0.5) % 1;
      let x: number;
      let y = 0;
      let toe = 0;
      if (v < 0.5) x = St - 4 * St * v;
      else {
        const w = (v - 0.5) * 2;
        x = -St + 2 * St * EASE.inOut(w);
        y = H * Math.sin(Math.PI * w);
        toe = -0.22 * Math.sin(Math.PI * w);
      }
      P.feet[i] = { x: (i ? g.hipX : -g.hipX) + x, y: -y, toe };
    }
    P.py = g.pel - (tune.bob * k * (1 - Math.cos(4 * Math.PI * u))) / 2 + tune.bob * k * 0.4;
    P.lean = 0.05;
    const sw = Math.cos(2 * Math.PI * u);
    const RR = 0.96 * R;
    const thB = 0.15 + 0.45 * sw;
    const thF = 0.4 - 0.18 * sw;
    P.hb = { x: Math.sin(thB) * RR, y: g.sh.y + Math.cos(thB) * RR };
    P.hf = { x: Math.sin(thF) * RR, y: g.sh.y + Math.cos(thF) * RR };
  }
  if (mode === 'attack') {
    const clip = inp.clip ?? CHOP;
    const u = inp.u ?? t / tune.attackS;
    const [hx, hy, axe, dx, lean] = sampleKeys(clip.keys, u);
    const sw = tune.swing;
    P.hf = { x: hx * R * sw, y: g.sh.y + hy * R * sw };
    P.attack = true;
    P.axe = axe * (0.7 + 0.3 * sw);
    P.px = dx * k;
    P.lean = lean;
    P.contact = u > clip.keys[clip.contact[0]][0] && u < clip.keys[clip.contact[1]][0];
    P.behind = u > clip.behind[0] && u < clip.behind[1];
    P.nod = lean * 0.4;
    P.feet[0].x = -9 * g.kl - dx * k;
    const step = clamp((u - 0.3) / 0.16, 0, 1);
    P.feet[1].y = -5 * g.kl * Math.sin(Math.PI * step);
    P.hb = { x: (-4 - lean * 20) * k, y: g.sh.y + 0.93 * R };
  }
  if (mode === 'hurt') {
    const kk = Math.sin(Math.PI * clamp(t / 0.6, 0, 1));
    P.px = -8 * k * kk;
    P.lean = -0.2 * kk;
    P.py += 2 * k * kk;
    P.nod = -0.15 * kk;
    P.flash = t < 0.16 ? 1 - t / 0.16 : 0;
    P.feet[0].x = -9 * g.kl + 2.4 * g.kl * kk;
    P.feet[1].x = 8 * g.kl + 4.8 * g.kl * kk;
    P.hf = { x: 4 * k, y: g.sh.y + 0.8 * R };
    P.hb = { x: -10 * k * kk, y: g.sh.y + 0.7 * R };
  }
  return P;
}

// A solved two-bone limb: the mid joint (elbow or knee) and the end (wrist or ankle), with the
// angles of both bones (atan2, y down). `side` +1 bends the elbow to one side, -1 to the other.
export interface Limb {
  mid: V2;
  end: V2;
  a1: number;
  a2: number;
}
export function solveLimb(root: V2, target: V2, l1: number, l2: number, side: 1 | -1): Limb {
  const r = solveTwoBone(root, target, l1, l2, (q) => {
    // Score the bend side by the cross product of the reach direction with the elbow offset.
    const cross = (target.x - root.x) * (q.y - root.y) - (target.y - root.y) * (q.x - root.x);
    return side * cross;
  });
  return {
    mid: r.mid,
    end: r.end,
    a1: Math.atan2(r.mid.y - root.y, r.mid.x - root.x),
    a2: Math.atan2(r.end.y - r.mid.y, r.end.x - r.mid.x),
  };
}
