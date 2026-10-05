import Phaser from 'phaser';
import type { Strike } from '../data/looks';

// Strike effects and particles, ported from the reference (docs/reference/motion-test.html).
// `buildStrike` is pure (it only decides which effects start where); `FxLayer` draws them.

type Rgb = readonly [number, number, number];
const GOLD: Rgb = [255, 236, 190];
const VIOLET: Rgb = [235, 200, 255];
const STEEL: Rgb = [200, 225, 255];
const HEAL_SPARKS: readonly Rgb[] = [
  [150, 255, 160],
  [255, 240, 150],
];

export interface Vec {
  x: number;
  y: number;
}

export type FxEffect =
  | {
      type: 'arc';
      x: number;
      y: number;
      r: number;
      f: number;
      a0: number;
      a1: number;
      tilt?: number;
      flat?: number;
      col: Rgb;
      age: number;
      life: number;
    }
  | {
      type: 'thrust';
      x: number;
      y: number;
      len: number;
      f: number;
      col: Rgb;
      age: number;
      life: number;
    }
  | { type: 'bolt'; x: number; y: number; tx: number; ty: number; age: number; life: number }
  | { type: 'ring'; x: number; y: number; r: number; age: number; life: number }
  // A heal: a soft gold-green beam from the healer's weapon to the target's chest.
  | { type: 'heal'; x: number; y: number; tx: number; ty: number; age: number; life: number }
  | { type: 'arrow'; x: number; y: number; tx: number; ty: number; age: number; life: number };

export interface StrikeInput {
  strike: Strike;
  // Feet position of the striker, its facing (1 right, -1 left) and picture height.
  x: number;
  y: number;
  face: 1 | -1;
  h: number;
  // Weapon point(s) in world space.
  weapon: Vec;
  weapon2?: Vec;
  // Chest of the target (or a point ahead of the striker when there is none).
  target: Vec | null;
  // Which impact of a double strike this is (0 or 1) and this swing's random choices.
  n: 0 | 1;
  backFirst: boolean;
  cross: boolean;
  // Ground distance in front of the striker where a smash lands, and where its front foot is
  // (a stomp lands there).
  reach: number;
  foot: number;
  rnd?: (a: number, b: number) => number;
}

export interface StrikeResult {
  effects: FxEffect[];
  // Spawn a dust ring and shake the camera (smash).
  smash: Vec | null;
}

export const HEAL_BEAM_S = 0.55;

// The beam of a heal, from the healer's weapon to the target (or a point ahead when the target
// is not on the map).
export function buildHeal(weapon: Vec, target: Vec | null, face: 1 | -1): FxEffect[] {
  const to = target ?? { x: weapon.x + face * 80, y: weapon.y };
  return [
    { type: 'heal', x: weapon.x, y: weapon.y, tx: to.x, ty: to.y, age: 0, life: HEAL_BEAM_S },
  ];
}

const defaultRnd = (a: number, b: number) => a + Math.random() * (b - a);

// Start angle of an arc that must begin at the weapon: a weapon low behind the body starts the
// arc below-back, so the swing visibly leaves the weapon and goes over the head.
export function fromWeapon(cx: number, cy: number, p: Vec, f: number, cap: number): number {
  let a = Math.atan2(p.y - cy, (p.x - cx) * f);
  if (a > 0.6) a -= Math.PI * 2;
  return Math.min(a, cap);
}

export function buildStrike(i: StrikeInput): StrikeResult {
  const rnd = i.rnd ?? defaultRnd;
  const { x, y, face: f, h, weapon: wp } = i;
  const effects: FxEffect[] = [];
  let smash: Vec | null = null;
  switch (i.strike) {
    case 'chop': {
      // big overhead arc that starts at the weapon behind and ends low in front
      const cx = x + f * h * 0.08;
      const cy = y - h * 0.5;
      const r = Math.max(h * 0.62, Math.hypot(wp.x - cx, wp.y - cy) * 1.05) * rnd(0.9, 1.1);
      effects.push({
        type: 'arc',
        x: cx,
        y: cy,
        r,
        f,
        a0: fromWeapon(cx, cy, wp, f, -1.7),
        a1: rnd(0.3, 0.8),
        tilt: rnd(-0.3, 0.15),
        col: GOLD,
        age: 0,
        life: 0.24,
      });
      break;
    }
    case 'sweep':
      effects.push({
        type: 'arc',
        x: x + f * h * 0.1,
        y: y - h * 0.45,
        r: h * 0.6,
        f,
        a0: -Math.PI * 0.95,
        a1: 0.35,
        flat: 0.38,
        col: GOLD,
        age: 0,
        life: 0.24,
      });
      break;
    case 'upward':
      effects.push({
        type: 'arc',
        x: x + f * h * 0.2,
        y: y - h * 0.5,
        r: h * 0.48,
        f,
        a0: 1.1,
        a1: -1.7,
        col: GOLD,
        age: 0,
        life: 0.22,
      });
      break;
    case 'double': {
      // one blade each, random order; sometimes the front blade cuts upward (an X)
      const back = (i.n === 0) === i.backFirst && i.weapon2 !== undefined;
      const bp = back && i.weapon2 ? i.weapon2 : wp;
      if (!back && i.cross) {
        effects.push({
          type: 'arc',
          x: x + f * h * 0.2,
          y: y - h * 0.5,
          r: h * rnd(0.42, 0.52),
          f,
          a0: 1.1,
          a1: -1.6,
          tilt: rnd(-0.2, 0.2),
          col: VIOLET,
          age: 0,
          life: 0.2,
        });
      } else {
        const cx = x + f * h * (back ? 0 : 0.18);
        const cy = y - h * (back ? 0.55 : 0.45);
        const r =
          Math.max(h * (back ? 0.6 : 0.5), Math.hypot(bp.x - cx, bp.y - cy) * 1.05) *
          rnd(0.92, 1.08);
        effects.push({
          type: 'arc',
          x: cx,
          y: cy,
          r,
          f,
          a0: fromWeapon(cx, cy, bp, f, back ? -1.9 : -1.4),
          a1: rnd(0.4, 0.75),
          tilt: rnd(-0.25, 0.15),
          col: VIOLET,
          age: 0,
          life: back ? 0.26 : 0.2,
        });
      }
      break;
    }
    case 'thrust':
      effects.push({
        type: 'thrust',
        x: wp.x,
        y: y - h * 0.5,
        len: h,
        f,
        col: STEEL,
        age: 0,
        life: 0.2,
      });
      break;
    case 'bolt': {
      const to = i.target ?? { x: x + f * h * 2.4, y: y - h * 0.5 };
      effects.push({ type: 'bolt', x: wp.x, y: wp.y, tx: to.x, ty: to.y, age: 0, life: 0.2 });
      break;
    }
    case 'shot': {
      const to = i.target ?? { x: x + f * h * 2.4, y: y - h * 0.5 };
      const dist = Math.hypot(to.x - wp.x, to.y - wp.y);
      effects.push({
        type: 'arrow',
        x: wp.x,
        y: wp.y,
        tx: to.x,
        ty: to.y,
        age: 0,
        life: Math.max(0.08, Math.min(0.3, dist / 1400)),
      });
      break;
    }
    case 'stomp': {
      // the shockwave starts at the front foot
      const gx = x + f * i.foot;
      effects.push({ type: 'ring', x: gx, y, r: h * 0.75, age: 0, life: 0.45 });
      smash = { x: gx, y };
      break;
    }
    case 'smash': {
      const gx = x + f * i.reach;
      effects.push({ type: 'ring', x: gx, y, r: h * 0.75, age: 0, life: 0.45 });
      smash = { x: gx, y };
      break;
    }
  }
  return { effects, smash };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  age: number;
  life: number;
  col: Rgb;
  grow: number;
  a: number;
}

const hex = (c: Rgb) => (c[0] << 16) | (c[1] << 8) | c[2];

// One Graphics object drawn above the units: strike effects and particles in world space.
export class FxLayer {
  private readonly g: Phaser.GameObjects.Graphics;
  private effects: FxEffect[] = [];
  private parts: Particle[] = [];
  private dirty = false;

  constructor(scene: Phaser.Scene, depth = 999_000) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  add(effects: readonly FxEffect[]): void {
    this.effects.push(...effects);
  }

  dust(x: number, y: number, k: number): void {
    for (let i = 0; i < 3; i++)
      this.parts.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y - 2,
        vx: (Math.random() - 0.5) * 40,
        vy: -10 - Math.random() * 15,
        r: (5 + Math.random() * 5) * k * 1.2,
        g: 0,
        age: 0,
        life: 0.5,
        col: [150, 130, 100],
        grow: 1.8,
        a: 0.4,
      });
  }

  sparks(x: number, y: number, col: Rgb, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 120 + Math.random() * 200;
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        r: 2 + Math.random() * 2,
        g: 600,
        age: 0,
        life: 0.25 + Math.random() * 0.15,
        col,
        grow: 0,
        a: 1,
      });
    }
  }

  // Gold-green sparkles rising off a healed unit.
  sparkle(x: number, y: number, n: number, palette: readonly Rgb[] = HEAL_SPARKS): void {
    for (let i = 0; i < n; i++)
      this.parts.push({
        x: x + (Math.random() - 0.5) * 46,
        y: y + (Math.random() - 0.3) * 50,
        vx: (Math.random() - 0.5) * 24,
        vy: -50 - Math.random() * 60,
        r: 2 + Math.random() * 2.5,
        g: -40,
        age: 0,
        life: 0.55 + Math.random() * 0.3,
        col: palette[Math.floor(Math.random() * palette.length)],
        grow: 0,
        a: 1,
      });
  }

  blood(x: number, y: number, dir: number): void {
    for (let i = 0; i < 5; i++)
      this.parts.push({
        x,
        y,
        vx: dir * (60 + Math.random() * 120),
        vy: -80 - Math.random() * 80,
        r: 1.6 + Math.random() * 2,
        g: 700,
        age: 0,
        life: 0.45,
        col: [110, 14, 10],
        grow: 0,
        a: 0.9,
      });
  }

  update(dtS: number): void {
    if (this.effects.length === 0 && this.parts.length === 0) {
      if (this.dirty) {
        this.g.clear();
        this.dirty = false;
      }
      return;
    }
    for (const e of this.effects) e.age += dtS;
    this.effects = this.effects.filter((e) => e.age < e.life);
    for (const q of this.parts) {
      q.age += dtS;
      q.x += q.vx * dtS;
      q.y += q.vy * dtS;
      q.vy += q.g * dtS;
      q.vx *= 0.97;
    }
    this.parts = this.parts.filter((q) => q.age < q.life);
    this.g.clear();
    this.dirty = true;
    for (const e of this.effects) this.drawEffect(e);
    for (const q of this.parts) {
      const p = q.age / q.life;
      this.g.fillStyle(hex(q.col), q.a * (1 - p)).fillCircle(q.x, q.y, q.r * (1 + q.grow * p));
    }
  }

  private drawEffect(e: FxEffect): void {
    const g = this.g;
    const p = e.age / e.life;
    if (e.type === 'arc') {
      // a crescent swept from a0 to a1 in facing space, thick in the middle, fading
      const head = Math.min(1, p * 2.2);
      const N = 26;
      const tilt = e.tilt ?? 0;
      const flat = e.flat ?? 1;
      const pt = (a: number): [number, number] => {
        const lx = Math.cos(a) * e.r * e.f;
        const ly = Math.sin(a) * e.r * flat;
        return [
          e.x + lx * Math.cos(tilt) - ly * Math.sin(tilt),
          e.y + lx * Math.sin(tilt) + ly * Math.cos(tilt),
        ];
      };
      for (let i = 0; i < N; i++) {
        const k = i / N;
        if (k > head) break;
        const a = e.a0 + (e.a1 - e.a0) * k;
        const b = e.a0 + ((e.a1 - e.a0) * (i + 1)) / N;
        const fade = (1 - p) * (0.25 + 0.75 * (k / Math.max(head, 0.01)));
        const [x0, y0] = pt(a);
        const [x1, y1] = pt(b);
        g.lineStyle(e.r * 0.2 * Math.sin(Math.PI * Math.min(1, k + 0.05)) + 1, hex(e.col), fade);
        g.lineBetween(x0, y0, x1, y1);
      }
    } else if (e.type === 'thrust') {
      // a straight stab: a tapered streak shooting forward, bright at the tip
      const out = Math.min(1, p * 3);
      const tip = e.x + e.f * e.len * out;
      const a = 1 - p;
      g.fillStyle(hex(e.col), 0.5 * a);
      g.fillTriangle(e.x, e.y - e.len * 0.05, tip, e.y, e.x, e.y + e.len * 0.05);
      g.fillStyle(0xffffff, a).fillCircle(tip, e.y, 4 * a + 1);
    } else if (e.type === 'bolt') {
      // glow, then a jagged blue line, then a thin white core, re-rolled every frame
      const n = 9;
      const pts: Vec[] = [{ x: e.x, y: e.y }];
      for (let i = 1; i < n; i++) {
        const k = i / n;
        pts.push({
          x: e.x + (e.tx - e.x) * k + (Math.random() - 0.5) * 22,
          y: e.y + (e.ty - e.y) * k + (Math.random() - 0.5) * 22,
        });
      }
      pts.push({ x: e.tx, y: e.ty });
      for (const [lw, col, al] of [
        [12, 0x6f9bff, 0.25 * (1 - p)],
        [5, 0x8cb4ff, 1 - p],
        [2, 0xf0f8ff, 1 - p],
      ] as const) {
        g.lineStyle(lw, col, al).strokePoints(pts as Phaser.Types.Math.Vector2Like[], false);
      }
      g.fillStyle(0xc8e1ff, 0.7 * (1 - p)).fillCircle(e.x, e.y, 9 * (1 - p) + 3);
    } else if (e.type === 'heal') {
      // a glow, a thinner bright line that travels from the weapon to the target, then fades
      const head = Math.min(1, p * 2.5);
      const hx = e.x + (e.tx - e.x) * head;
      const hy = e.y + (e.ty - e.y) * head - Math.sin(Math.PI * head) * 18;
      const mx = e.x + (hx - e.x) * 0.5;
      const my = e.y + (hy - e.y) * 0.5 - Math.sin(Math.PI * head * 0.5) * 18;
      const pts = [
        { x: e.x, y: e.y },
        { x: mx, y: my },
        { x: hx, y: hy },
      ] as Phaser.Types.Math.Vector2Like[];
      const a = 1 - p;
      g.lineStyle(14, 0x7dff9a, 0.22 * a).strokePoints(pts, false);
      g.lineStyle(5, 0xc8ffb0, 0.7 * a).strokePoints(pts, false);
      g.lineStyle(2, 0xfff6c8, a).strokePoints(pts, false);
      g.fillStyle(0xe8ffc8, 0.8 * a).fillCircle(hx, hy, 8 * a + 3);
    } else if (e.type === 'ring') {
      g.lineStyle(6 * (1 - p) + 1, 0xe6d2aa, 0.8 * (1 - p));
      g.strokeEllipse(e.x, e.y, e.r * (0.2 + p) * 2, e.r * (0.2 + p) * 0.64);
    } else {
      // arrow: a short shaft with a head, flying from the bow to the target on a slight arc
      const x = e.x + (e.tx - e.x) * p;
      const y = e.y + (e.ty - e.y) * p - Math.sin(Math.PI * p) * 14;
      const ang = Math.atan2(e.ty - e.y, e.tx - e.x);
      const len = 34;
      const bx = x - Math.cos(ang) * len;
      const by = y - Math.sin(ang) * len;
      g.lineStyle(3, 0xf2e6c4, 1).lineBetween(bx, by, x, y);
      g.fillStyle(0xffffff, 1).fillTriangle(
        x + Math.cos(ang) * 8,
        y + Math.sin(ang) * 8,
        x - Math.sin(ang) * 4,
        y + Math.cos(ang) * 4,
        x + Math.sin(ang) * 4,
        y - Math.cos(ang) * 4,
      );
    }
  }
}
