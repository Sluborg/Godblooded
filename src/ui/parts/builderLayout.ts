// Draws one hero from a Hero Builder layout (data/heroLayout.ts) instead of the prototype's pose
// table: parts at the saved places and sizes, in the saved order, the builder's own walk (feet step
// and lift, body bob, hand swing) and, for an attack, the prototype's weapon-hand travel mapped on
// top. Test switch only (`?heroes=thorbloods`).
import { ATTACK_TIMING, DEFAULT_ATTACK, type HeroLayout } from '../../data/heroLayout';
import type { Draw, KitPart, RigPose } from './painted';

// The prototype's units to drawing units (as in painted.ts).
const PROTO_K = 44 / 32;

// What the builder knows of each picture at its natural size: the unit width, and for the picture's
// pixels to units. Pivots are fractions of the picture.
export const NATURAL: Record<string, { w: number; h: number; pivot: [number, number] }> = {
  head: { w: 27, h: 27.7, pivot: [0.55, 0.86] },
  body: { w: 19, h: 26, pivot: [0.5, 0.5] },
  collar: { w: 16, h: 8.6, pivot: [0.5, 0.5] },
  cape: { w: 26, h: 21.75, pivot: [0.92, 0.03] },
  weapon: { w: 8.96, h: 28, pivot: [0.5, 0.72] },
};

export interface BuilderKit {
  layout: HeroLayout;
  // Pictures by part name: head, body, collar, cape, weapon, hand, foot (hand and foot are balls).
  parts: Record<string, KitPart>;
}

const smooth = (k: number): number => k * k * (3 - 2 * k);
type Key = { x: number; y: number; r: number };
const mix = (a: Key, b: Key, k: number): Key => {
  const e = smooth(Math.max(0, Math.min(1, k)));
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, r: a.r + (b.r - a.r) * e };
};
// The back hand and weapon angle at attack progress t (0..1).
function attackKey(rest: Key, k: { raise: Key; strike: Key }, t: number): Key {
  const { raise, strike, back } = ATTACK_TIMING;
  if (t < raise) return mix(rest, k.raise, t / raise);
  if (t < raise + strike) return mix(k.raise, k.strike, (t - raise) / strike);
  return mix(k.strike, rest, (t - raise - strike) / back);
}
const rad = (deg: number | undefined): number => ((deg ?? 0) * Math.PI) / 180;

export function builderLayout(
  b: BuilderKit,
  p: RigPose,
  motion: { ph: number; moving: boolean; atk?: number },
): Draw[] {
  const L = b.layout;
  const m = L.motion;
  const s = motion.moving ? Math.sin(motion.ph) : 0;
  const c = motion.moving ? Math.cos(motion.ph) : 0;
  // Bob up by |sin| in a walk; a faint breath at rest from the pose.
  const bob = motion.moving ? -Math.abs(s) * m.bob : p.bob * 0.6;
  const lunge = p.dx * PROTO_K * 0.7;
  const one = (
    part: KitPart | undefined,
    pivot: string,
    x: number,
    y: number,
    scale: number,
    rot: number,
    scaleY = scale,
  ): Draw[] =>
    part ? [{ part, pivot, x, y, rot, sx: scale, sy: scaleY, inBody: false, far: false }] : [];
  // The attack runs on Stefan's keys (rest -> raise -> strike -> rest), not the prototype's travel.
  const atk = motion.atk !== undefined && motion.atk >= 0 ? Math.min(1, motion.atk) : -1;
  const attacking = atk >= 0;
  const keys = L.attack ?? DEFAULT_ATTACK;
  const rest = { x: L.handB.x, y: L.handB.y, r: L.weapon.r ?? 0 };
  const key = attacking ? attackKey(rest, keys, atk) : rest;
  const hb = {
    x: (attacking ? key.x : L.handB.x + s * m.swing * 0.6) + lunge,
    y: (attacking ? key.y : L.handB.y) + bob,
  };
  const hf = { x: L.handF.x - s * m.swing + lunge, y: L.handF.y + bob };
  const footF = { x: L.footF.x + s * m.step, y: L.footY - Math.max(0, c) * m.lift };
  const footB = { x: L.footB.x - s * m.step, y: L.footY - Math.max(0, -c) * m.lift };
  const by = (v: number) => v + bob;
  const parts = b.parts;
  const draws: Record<string, Draw[]> = {
    cape: one(
      parts.cape,
      'clasp',
      L.cape.x + lunge,
      by(L.cape.y),
      L.cape.s ?? 1,
      rad(L.cape.r) + p.cape * 0.03 + p.hem * 0.02,
    ),
    footB: one(parts.foot, 'c', footB.x, footB.y, 1, 0),
    footF: one(parts.foot, 'c', footF.x, footF.y, 1, 0),
    body: one(
      parts.body,
      'c',
      L.body.x + lunge,
      by(L.body.y),
      ((L.body.w ?? NATURAL.body.w) / NATURAL.body.w) * (L.body.s ?? 1),
      rad(L.body.r),
      ((L.body.h ?? NATURAL.body.h) / NATURAL.body.h) * (L.body.s ?? 1),
    ),
    collar: L.collar
      ? one(parts.collar, 'c', L.collar.x + lunge, by(L.collar.y), L.collar.s ?? 1, rad(L.collar.r))
      : [],
    head: one(parts.head, 'neck', L.head.x + lunge, by(L.head.y), L.head.s ?? 1, rad(L.head.r)),
    handF: one(parts.handF, 'c', hf.x, hf.y, 1, 0),
    weapon: one(
      parts.weapon,
      'grip',
      hb.x + L.weapon.x,
      hb.y + L.weapon.y,
      L.weapon.s ?? 1,
      rad(attacking ? key.r : L.weapon.r),
    ),
    handB: one(parts.handB, 'c', hb.x, hb.y, 1, 0),
  };
  return L.order.flatMap((k) => draws[k] ?? []);
}
