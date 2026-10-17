import { describe, expect, it } from 'vitest';
import { BUILDS, kitFor } from '../../data/heroKits';
import {
  HIP,
  bodyPoint,
  kitComplete,
  keepOffGround,
  kitScale,
  layout,
  solveTwoBone,
  type Kit,
  type KitPart,
  type RigPose,
} from './painted';

const img = {} as CanvasImageSource;
const part = (w: number, h: number, pivots: Record<string, [number, number]> = {}): KitPart => ({
  img,
  cell: { x: 0, y: 0, w, h, pivots },
  ppu: 8,
});
const kit = (extra: Partial<Kit['parts']> = {}): Kit => ({
  build: BUILDS.standard,
  mode: 'bent',
  layers: {},
  parts: {
    torso: part(120, 160, {
      hip: [0.5, 0.9],
      neck: [0.5, 0.05],
      shoulder_f: [0.7, 0.1],
      shoulder_b: [0.3, 0.1],
      hip_f: [0.6, 0.95],
      hip_b: [0.4, 0.95],
      clasp: [0.4, 0.1],
    }),
    head: part(64, 64, { neck: [0.5, 0.95], brow: [0.5, 0.4] }),
    upperarm: part(24, 68, { shoulder: [0.5, 0.05], elbow: [0.5, 0.95] }),
    forearm: part(24, 64, { elbow: [0.5, 0.05], wrist: [0.5, 0.95] }),
    thigh: part(32, 84, { hip: [0.5, 0.05], knee: [0.5, 0.95] }),
    shin: part(28, 84, { knee: [0.5, 0.05], ground: [0.5, 0.97] }),
    ...extra,
  },
});
const pose: RigPose = {
  bob: 0,
  lean: 0,
  dx: 0,
  sy: 1,
  hf: { x: 5.5, y: -11 },
  hb: { x: -5.5, y: -11 },
  wa: 0.55,
  wb: 0.4,
  f0: { x: -2.5, y: 0 },
  f1: { x: 3, y: 0 },
  rot: 0,
  cape: 0,
  hem: 0,
};

describe('solveTwoBone', () => {
  it('reaches a target inside the reach with both bones their length', () => {
    const r = solveTwoBone({ x: 0, y: 0 }, { x: 6, y: 8 }, 8, 8, (p) => p.x);
    expect(Math.hypot(r.end.x - 6, r.end.y - 8)).toBeLessThan(1e-6);
    expect(Math.hypot(r.mid.x, r.mid.y)).toBeCloseTo(8, 5);
    expect(Math.hypot(r.end.x - r.mid.x, r.end.y - r.mid.y)).toBeCloseTo(8, 5);
  });
  it('clamps a target out of reach to a straight limb', () => {
    const r = solveTwoBone({ x: 0, y: 0 }, { x: 0, y: 40 }, 8, 8, (p) => p.x);
    expect(r.end.y).toBeCloseTo(16, 2);
  });
  it('bends to the preferred side', () => {
    const front = solveTwoBone({ x: 0, y: 0 }, { x: 0, y: 12 }, 8, 8, (p) => p.x);
    const back = solveTwoBone({ x: 0, y: 0 }, { x: 0, y: 12 }, 8, 8, (p) => -p.x);
    expect(front.mid.x).toBeGreaterThan(0);
    expect(back.mid.x).toBeLessThan(0);
  });
});

describe('keepOffGround', () => {
  // A weapon 20 units tall, gripped 15 units from its far end.
  const axe = part(16, 160, { grip: [0.5, 0.75] });
  const upLen = 0.75 * (160 / 8);
  it('leaves a swing that stays above the ground alone', () => {
    expect(keepOffGround(axe, -20, 0.5)).toBe(0.5);
    expect(keepOffGround(axe, -20, -2)).toBe(-2);
  });
  it('turns a blow that would bury the head back to the ground line', () => {
    const r = keepOffGround(axe, -12, 2.8);
    expect(r).toBeLessThan(2.8);
    expect(-12 - upLen * Math.cos(r)).toBeLessThanOrEqual(0);
  });
});

describe('layout: a shield replaces the off-hand', () => {
  const floating = (extra: Partial<Kit['parts']> = {}): Kit => ({
    ...kit({
      hand: part(20, 20, { wrist: [0.5, 0.5], grip: [0.5, 0.5] }),
      boot: part(24, 16),
      ...extra,
    }),
    mode: 'floating',
  });
  const farHands = (k: Kit) =>
    layout(k, pose).filter((d) => d.far && d.part === k.parts.hand).length;
  it('draws the far hand when the off-hand is a held item', () => {
    expect(farHands(floating({ offhand: part(28, 40, { grip: [0.5, 0.5] }) }))).toBe(1);
  });
  it('draws no far hand behind a shield, and puts the shield on the off-hand socket', () => {
    const k = floating({ offhand: part(40, 44, { strap: [0.5, 0.5] }) });
    expect(farHands(k)).toBe(0);
    const d = layout(k, pose).find((x) => x.part === k.parts.offhand);
    expect(d?.pivot).toBe('strap');
    expect(d?.x).toBeCloseTo(pose.hb.x * (44 / 32));
    expect(d?.y).toBeCloseTo(pose.hb.y * (44 / 32));
  });
});

describe('layout', () => {
  it('needs the body parts and skips the optional ones', () => {
    expect(kitComplete(kit().parts, 'bent')).toBe(true);
    expect(kitComplete({ ...kit().parts, shin: undefined }, 'bent')).toBe(false);
    // The default is the floating rig: it needs hands and boots, not limbs.
    expect(kitComplete(kit().parts)).toBe(false);
    expect(kitComplete(kit({ hand: part(20, 20), boot: part(24, 16) }).parts)).toBe(true);
    const draws = layout(kit(), pose);
    expect(draws.some((d) => d.part === kit().parts.cloak)).toBe(false);
  });
  it('draws cloak, back leg, back arm, torso, then the head and the front limbs', () => {
    const k = kit({ cloak: part(80, 112), weapon: part(28, 168) });
    const order = layout(k, pose).map((d) => `${d.pivot}${d.far ? '*' : ''}`);
    expect(order[0]).toBe('clasp');
    expect(order.indexOf('hip')).toBeGreaterThan(order.indexOf('shoulder*'));
    expect(order.indexOf('neck')).toBeGreaterThan(order.indexOf('hip'));
    expect(order.lastIndexOf('elbow')).toBeGreaterThan(order.indexOf('grip'));
  });
  it('draws a weapon cocked behind the head before the head', () => {
    const k = kit({ weapon: part(28, 168) });
    const draws = layout(k, pose, true);
    const iw = draws.findIndex((d) => d.pivot === 'grip');
    const ih = draws.findIndex((d) => d.part === k.parts.head);
    expect(iw).toBeLessThan(ih);
  });
  it('puts a worn layer right after the part it covers, same placement', () => {
    const chest = part(120, 160);
    const k = { ...kit(), layers: { torso: chest } };
    const draws = layout(k, pose);
    const i = draws.findIndex((d) => d.part === k.parts.torso);
    expect(draws[i + 1].part).toBe(chest);
    expect(draws[i + 1].x).toBe(draws[i].x);
  });
  it('plants the feet on their targets (legs are solved in the world)', () => {
    const draws = layout(kit(), pose).filter((d) => d.pivot === 'knee');
    expect(draws).toHaveLength(2);
    expect(draws.every((d) => !d.inBody)).toBe(true);
  });
  it('lets the build change a limb without moving the sockets', () => {
    const lean = layout({ ...kit(), build: BUILDS.lean }, pose);
    const std = layout(kit(), pose);
    const arm = (ds: typeof std) => ds.find((d) => d.pivot === 'shoulder' && !d.far)!;
    expect(arm(lean).sy).toBe(BUILDS.lean.arm[0]);
    expect(arm(std).sy).toBe(1);
  });
});

describe('bodyPoint', () => {
  it('is the prototype body transform: scale y, rotate by lean, translate', () => {
    const p = { ...pose, lean: 0, dx: 1, bob: 2, sy: 2 };
    expect(bodyPoint(p, { x: 3, y: -10 })).toEqual({ x: 4, y: -20 + 2.6 });
    expect(HIP.y).toBe(-21);
  });
});

describe('kitFor', () => {
  it('finds the combo, a tier 3 look falls back to tier 2, a path to the god', () => {
    expect(kitFor('odin_t1')).toBeDefined();
    expect(kitFor('odin-seer_t2')).toBe(kitFor('odin_t1'));
    expect(kitFor('odin-seer_t3')).toBe(kitFor('odin_t1'));
    expect(kitFor('thor_t1')).toBeUndefined();
  });
});

describe('kitScale', () => {
  it('maps the 44 unit painted figure to the code figure height (32 units at usc)', () => {
    expect(kitScale(0.86) * 44).toBeCloseTo(32 * 0.86, 6);
    expect(kitScale(0.86 * 1.3) * 44).toBeCloseTo(32 * 0.86 * 1.3, 6);
  });
});

describe('floating mode', () => {
  const k = (): Kit => ({
    ...kit({ hand: part(24, 24), boot: part(40, 24) }),
    mode: 'floating',
  });
  it('is complete with torso, head, hand and foot only', () => {
    expect(kitComplete(k().parts, 'floating')).toBe(true);
    expect(kitComplete(kit().parts, 'floating')).toBe(false);
  });
  it('draws only hands and boots at the joints, no limb segments', () => {
    const draws = layout(k(), pose);
    const pivots = draws.map((d) => d.pivot);
    expect(pivots.filter((v) => v === 'shoulder' || v === 'elbow' || v === 'knee')).toHaveLength(0);
    expect(pivots.filter((v) => v === 'wrist')).toHaveLength(2);
    expect(pivots.filter((v) => v === 'ground')).toHaveLength(2);
  });
  it('sits the torso lower than the bent figure', () => {
    const t = (kit: Kit) => layout(kit, pose).find((d) => d.part === kit.parts.torso)!;
    expect(t(k()).y).toBeGreaterThan(t(kit()).y);
  });
  it('adds hand and boot on a bent limb when the sheet has them', () => {
    const bent = layout({ ...kit({ hand: part(24, 24), boot: part(40, 24) }) }, pose);
    expect(bent.filter((d) => d.pivot === 'wrist').length).toBe(2);
    expect(bent.filter((d) => d.pivot === 'ankle').length).toBe(2);
  });
});

describe('hand and boot', () => {
  const withHand = (): Kit => ({
    ...kit({
      weapon: part(28, 168, { grip: [0.5, 0.88] }),
      hand: part(24, 24, { wrist: [0.5, 0.1], grip: [0.5, 0.6] }),
      boot: part(40, 24, { ankle: [0.3, 0.1], ground: [0.4, 0.95] }),
    }),
  });
  it('puts the weapon grip on the hand grip point', () => {
    const draws = layout(withHand(), pose);
    const hand = draws.find((d) => d.pivot === 'wrist' && !d.far)!;
    const weapon = draws.find((d) => d.pivot === 'grip')!;
    // The grip point is below the wrist by (0.6 - 0.1) x 24 px / 8 = 1.5 units, turned by the hand.
    expect(Math.hypot(weapon.x - hand.x, weapon.y - hand.y)).toBeCloseTo(1.5, 5);
  });
  it('ends the shin at the ankle so the boot reaches the ground', () => {
    const k = withHand();
    const boots = layout(k, pose).filter((d) => d.pivot === 'ankle');
    const front = boots.find((d) => !d.far)!;
    const [bx, by] = [(0.4 - 0.3) * 5, (0.95 - 0.1) * 3];
    // The boot's ground point lands on the foot target (f1 scaled to the painted figure).
    expect(front.x + bx).toBeCloseTo(pose.f1.x * (44 / 32), 4);
    expect(front.y + by).toBeCloseTo(pose.f1.y * (44 / 32), 4);
  });
});

describe('grip pair and closed fist', () => {
  const pair = (): Kit => {
    const k = kit({
      weapon: part(28, 168, { grip: [0.5, 0.88] }),
      hand: part(24, 24, { wrist: [0.1, 0.5], grip: [0.7, 0.5] }),
      fist: part(24, 24, { wrist: [0.1, 0.5], grip: [0.7, 0.5] }),
      boot: part(40, 24, { ankle: [0.3, 0.1], ground: [0.4, 0.95] }),
    });
    return { ...k, mode: 'floating', layers: { hand: part(24, 24, { wrist: [0.1, 0.5] }) } };
  };
  it('draws the haft between the back and the front half of the weapon hand', () => {
    const k = pair();
    const draws = layout(k, pose);
    const at = (p: KitPart | undefined) => draws.findIndex((d) => d.part === p);
    expect(at(k.parts.hand)).toBeGreaterThanOrEqual(0);
    expect(at(k.parts.hand)).toBeLessThan(at(k.parts.weapon));
    expect(at(k.parts.weapon)).toBeLessThan(at(k.layers.hand));
  });
  it('draws the closed fist for the empty off hand, with no grip front over it', () => {
    const k = pair();
    const far = layout(k, pose).filter((d) => d.far && d.pivot === 'wrist');
    expect(far.map((d) => d.part)).toEqual([k.parts.fist]);
  });
});
