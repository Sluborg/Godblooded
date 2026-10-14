import { describe, expect, it } from 'vitest';
import { BUILDS, kitFor } from '../../data/heroKits';
import {
  HIP,
  bodyPoint,
  kitComplete,
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

describe('layout', () => {
  it('needs the body parts and skips the optional ones', () => {
    expect(kitComplete(kit().parts)).toBe(true);
    expect(kitComplete({ ...kit().parts, shin: undefined })).toBe(false);
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
    ...kit({ hand: part(24, 24), foot: part(40, 24) }),
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
    const bent = layout({ ...kit({ hand: part(24, 24), foot: part(40, 24) }) }, pose);
    expect(bent.filter((d) => d.pivot === 'wrist').length).toBe(2);
    expect(bent.filter((d) => d.pivot === 'ground').length).toBe(2);
  });
});
