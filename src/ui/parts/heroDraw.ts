// A hero drawn from parts (head, body, cape, hands, weapon), ported from the style prototype
// (docs/reference/style-test.html). One call draws one frame of one pose into the current canvas
// context (see gfx.ts); bake.ts calls it for every frame and stores the pictures.
import type { HeroPartsRow, WeaponKind } from '../../data/heroParts';
import {
  C,
  E,
  INK,
  LW,
  P,
  RR,
  T,
  TAU,
  bolt,
  clamp,
  eio,
  eout,
  flame,
  fs,
  g,
  glow,
  lerp,
  line,
  mix,
  rnd,
  setFlash,
  zig,
} from './gfx';

// What a frame needs to know about the unit: the pose and the moment inside it.
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

interface Vec {
  x: number;
  y: number;
}
interface Pose {
  bob: number;
  lean: number;
  dx: number;
  hf: Vec;
  hb: Vec;
  wa: number;
  wb: number;
  f0: Vec;
  f1: Vec;
  rot: number;
  sy: number;
  cape: number;
  trail: (number | string)[] | null;
  cast: number;
}

function bump(a: number, s: number, m: number, e: number): number {
  return a < s || a > e ? 0 : a < m ? eout((a - s) / (m - s)) : 1 - eio((a - m) / (e - m));
}

function restAngle(w: WeaponKind | undefined): number {
  const map: Partial<Record<WeaponKind, number>> = {
    staff: 0.12,
    eyestaff: 0.12,
    lstaff: 0.12,
    froststaff: 0.12,
    spear: 0.2,
    club: 2.5,
    wand: 0.4,
  };
  return (w && map[w]) ?? 0.55;
}

function pose(u: PartsPose, d: HeroPartsRow): Pose {
  const t = T() + u.ph;
  const p: Pose = {
    bob: 0,
    lean: 0,
    dx: 0,
    hf: { x: 5.5, y: -11 },
    hb: { x: -5.5, y: -11 },
    wa: restAngle(d.weapon),
    wb: 0.4,
    f0: { x: -2.6, y: -0.4 },
    f1: { x: 3, y: 0.4 },
    rot: 0,
    sy: 1,
    cape: Math.sin(t * 1.5) * 0.6,
    trail: null,
    cast: 0,
  };
  if (u.ko || u.koT > 0) {
    const k = eout(clamp(u.koT / 0.35, 0, 1));
    p.rot = (-Math.PI / 2) * 0.92 * k;
    p.hf = { x: 7, y: -15 };
    p.hb = { x: -4, y: -16 };
    p.wa = 1.2;
    return p;
  }
  const br = Math.sin(t * 2.6);
  p.sy = 1 + br * 0.035;
  p.bob = -br * 0.3;
  p.hf.y += br * 0.3;
  p.hb.y += br * 0.3;
  if (u.moving) {
    const w = u.walkPh;
    const s = Math.sin(w);
    const c = Math.cos(w);
    p.f0 = { x: -2.6 + s * 3.2, y: -0.4 - Math.max(0, c) * 2 };
    p.f1 = { x: 3 - s * 3.2, y: 0.4 - Math.max(0, -c) * 2 };
    p.bob = -Math.abs(c) * 1.7;
    p.lean += 0.1;
    p.hb.x -= s * 2.2;
    p.hf.x += s * 1.6;
    p.cape = -2 - Math.abs(s) * 2.5;
    p.sy = 1;
  }
  if (u.cheer > 0) {
    const h = Math.abs(Math.sin(u.cheer * 7));
    p.bob = -h * 6;
    p.hf = { x: 5, y: -27 };
    p.hb = { x: -5, y: -27 };
    p.wa = -0.15;
    p.wb = -0.3;
    p.lean = 0;
    p.sy = 1 + h * 0.06;
    p.f0.y = p.f1.y = -h * 1;
  }
  if (u.channel > 0) {
    p.hf = { x: 9, y: -20 + Math.sin(T() * 8) };
    p.hb = { x: 7, y: -17 };
    p.wa = 0.2;
    p.lean = 0.05;
    p.cast = 1;
  }
  if (u.atkT >= 0) attackPose(u, d, p);
  if (u.flash > 0) p.lean -= 0.3 * u.flash;
  return p;
}

function attackPose(u: PartsPose, d: HeroPartsRow, p: Pose): void {
  const a = u.atkT;
  const st = d.style;
  const A0 = p.wa;
  const h0 = { ...p.hf };
  if (st === 'swing') {
    const UP = -2.1;
    const DN = 2.3;
    if (a < 0.45) {
      const e = eio(a / 0.45);
      p.wa = lerp(A0, UP, e);
      p.hf = { x: lerp(h0.x, 1, e), y: lerp(h0.y, -21, e) };
      p.lean += lerp(0, -0.12, e);
    } else if (a < 0.62) {
      const e = eout((a - 0.45) / 0.17);
      p.wa = lerp(UP, DN, e);
      p.hf = { x: lerp(1, 9, e), y: lerp(-21, -9, e) };
      p.lean += 0.22;
      p.dx = 3 * e;
      p.trail = [UP, p.wa, 1];
    } else {
      const e = eio((a - 0.62) / 0.38);
      p.wa = lerp(DN, A0, e);
      p.hf = { x: lerp(9, h0.x, e), y: lerp(-9, h0.y, e) };
      p.lean += lerp(0.22, 0, e);
      p.dx = 3 * (1 - e);
      if (e < 0.35) p.trail = [UP, DN, 1 - e / 0.35];
    }
  } else if (st === 'stab') {
    const s1 = bump(a, 0.15, 0.42, 0.6);
    const s2 = bump(a, 0.45, 0.7, 0.92);
    p.hf = { x: lerp(h0.x, 13, s1), y: lerp(h0.y, -13, s1) };
    p.wa = lerp(A0, 1.55, s1);
    p.hb = { x: lerp(-5.5, 12, s2), y: lerp(-11, -10, s2) };
    p.wb = lerp(0.4, 1.6, s2);
    p.lean += 0.18 * Math.max(s1, s2);
    p.dx = 3 * Math.max(s1, s2);
  } else if (st === 'thrust') {
    const back = bump(a, 0, 0.4, 0.5);
    const fwd = bump(a, 0.4, 0.52, 0.95);
    p.wa = lerp(A0, 1.5, Math.max(back, fwd));
    p.hf = { x: h0.x - 6 * back + 9 * fwd, y: lerp(h0.y, -14, Math.max(back, fwd)) };
    p.lean += -0.1 * back + 0.2 * fwd;
    p.dx = 4 * fwd;
    if (fwd > 0.2) p.trail = ['thrust', fwd];
  } else if (st === 'cast') {
    const up = a < 0.5 ? eout(a / 0.5) : 1 - eio((a - 0.5) / 0.5);
    p.hf = { x: lerp(h0.x, 7, up), y: lerp(h0.y, -24, up) };
    p.wa = lerp(A0, 0.05, up);
    p.hb = { x: lerp(-5.5, 4, up * 0.7), y: lerp(-11, -17, up * 0.7) };
    p.lean += lerp(0, -0.1, up);
    p.cast = up;
  }
  void u;
}

function drawWeapon(kind: WeaponKind, u: PartsPose, d: HeroPartsRow, p: Pose): void {
  const ctx = g();
  switch (kind) {
    case 'hammer': {
      fs('#6e4628', RR(-1.2, -11, 2.4, 15, 1));
      fs('#9aa3aa', RR(-5.5, -17.5, 11, 7, 1.5));
      ctx.fillStyle = C('#737b82');
      ctx.fillRect(-4.6, -12.6, 9.2, 1.6);
      line(-1.5, -16, 1.5, -13, '#d9a441', 1);
      if (u.sparkT > 0) {
        bolt(zig(rnd(-6, 6), -14, rnd(-14, 14), rnd(-26, -8), 4, 2.5), '#7cc8ff');
        bolt(zig(0, -14, rnd(-12, 12), rnd(-24, -6), 3, 2), '#7cc8ff');
        glow(0, -14, 14, '#7cc8ff', 0.6);
      }
      break;
    }
    case 'lstaff':
      fs('#8a8f99', RR(-1.1, -22, 2.2, 30, 1));
      fs('#b9bec6', RR(-2.4, -21, 4.8, 2.4, 1), 1.2);
      fs('#ffe066', P([0, -31, 3.2, -25.5, 0, -21, -3.2, -25.5]), 1.4);
      glow(0, -26, 12 + p.cast * 8, '#fff27a', 0.45 + p.cast * 0.4);
      if (u.sparkT > 0) bolt(zig(0, -26, rnd(-12, 12), rnd(-38, -16), 4, 2.5), '#9fd8ff');
      break;
    case 'staff':
    case 'eyestaff':
      fs('#7a5532', () => {
        ctx.moveTo(-1.2, 8);
        ctx.lineTo(-1.4, -20);
        ctx.lineTo(1.2, -20);
        ctx.lineTo(1.2, 8);
        ctx.closePath();
      });
      if (kind === 'staff') {
        ctx.beginPath();
        ctx.arc(1.5, -22.5, 3.2, Math.PI * 0.9, Math.PI * 2.4);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = '#7a5532';
        ctx.lineWidth = 2;
        ctx.stroke();
        glow(1.5, -22.5, 9 + p.cast * 8, '#9be36b', 0.15 + p.cast * 0.5);
      } else {
        fs('#5a3a24', P([-3, -20, 3, -20, 0, -23]));
        fs('#9be36b', E(0, -26, 3.6, 3.6), 1.4);
        fs('#1d3a12', E(0.8, -26, 1.3, 1.6), 0);
        glow(0, -26, 12 + p.cast * 8, '#9be36b', 0.4 + p.cast * 0.4);
      }
      break;
    case 'froststaff':
      fs('#d8e2e8', RR(-1.1, -20, 2.2, 28, 1));
      fs('#bfe6ff', P([0, -32, 3, -25, 1, -20, -1, -20, -3, -25]), 1.4);
      fs('#e8f6ff', P([4, -27, 6, -24, 2, -22]), 1);
      glow(0, -26, 12 + p.cast * 8, '#a8dcff', 0.35 + p.cast * 0.4);
      break;
    case 'spear':
      fs('#7a5532', RR(-1, -26, 2, 32, 1));
      fs('#d6dade', P([0, -36, 2.8, -29, 0, -25, -2.8, -29]), 1.4);
      fs('#b8342a', P([-1, -25, 1, -25, 2, -21, -2, -21]), 1);
      break;
    case 'dagger':
      fs(d.blade || '#d6dade', P([-1.5, -2.5, 1.5, -2.5, 0, -11]), 1.3);
      fs('#d9a441', RR(-2.8, -3.2, 5.6, 1.6, 0.6), 1);
      break;
    case 'wand':
      fs('#d8c49a', RR(-0.9, -10, 1.8, 13, 0.8), 1.3);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + T();
        fs('#ffd34d', E(Math.cos(a) * 2.2, -12 + Math.sin(a) * 2.2, 1.6, 1.6), 0.8);
      }
      fs('#fff1b0', E(0, -12, 1.4, 1.4), 0);
      glow(0, -12, 10 + p.cast * 10, '#ffd34d', 0.3 + p.cast * 0.5);
      break;
    case 'fire':
      flame(0, -3, 3.4 + Math.sin(T() * 15) * 0.4 + p.cast * 1.5, '#ff7a1a', '#ffe08a', 0.95);
      glow(0, -4, 12 + p.cast * 8, '#ff9a3c', 0.4);
      break;
    case 'axe':
      fs('#5a4030', RR(-1.1, -15, 2.2, 18, 1));
      fs('#8a6a52', P([0.5, -15, 7, -18, 8, -10, 0.5, -10]));
      line(6, -17, 7, -11, '#c9b9a0', 1);
      break;
    case 'club':
      fs('#7a5a3a', P([-1.5, 3, -4, -16, -2, -20, 3, -20, 4.5, -15, 1.5, 3]));
      for (const [kx, ky] of [
        [-2, -12],
        [2, -16],
        [0, -6],
      ])
        fs('#5a4028', E(kx, ky, 1, 1), 0);
      break;
  }
}

function drawHand(
  u: PartsPose,
  d: HeroPartsRow,
  h: Vec,
  kind: WeaponKind | 'shield' | undefined,
  ang: number,
  p: Pose,
): void {
  const ctx = g();
  if (kind && kind !== 'shield') {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(ang);
    drawWeapon(kind, u, d, p);
    ctx.restore();
  }
  fs(d.skin, E(h.x, h.y, 2.4, 2.4), 1.5);
}

function drawCape(d: HeroPartsRow, p: Pose): void {
  const ctx = g();
  const sw = p.cape;
  fs(d.cape ?? '#a8392c', () => {
    ctx.moveTo(-5, -19);
    ctx.lineTo(3, -19);
    ctx.quadraticCurveTo(1, -10, 0 + sw * 0.3, -2.5);
    ctx.lineTo(-12 + sw, -3.5);
    ctx.quadraticCurveTo(-11, -13, -5, -19);
    ctx.closePath();
  });
  if (d.feathers) {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const x = lerp(-12 + sw, -1 + sw * 0.3, t);
      const y = lerp(-3.5, -2.5, t);
      fs(i % 2 ? '#ffffff' : '#e8dcc0', E(x, y, 1.9, 2.8, 0.35), 1);
    }
    for (let i = 0; i < 3; i++)
      fs(
        i % 2 ? '#e8dcc0' : '#ffffff',
        E(lerp(-10.5 + sw * 0.8, -6.5, i / 2), lerp(-7, -15, i / 2), 1.7, 2.5, -0.5),
        1,
      );
  }
}

function drawBody(d: HeroPartsRow): void {
  const ctx = g();
  const bw = d.bw || 7;
  const bh = d.bh || 8;
  const cy = -3 - bh;
  const path = d.robe
    ? (): void => {
        ctx.moveTo(-5, -19);
        ctx.quadraticCurveTo(0, -21, 5, -19);
        ctx.quadraticCurveTo(8.5, -10, 8.5, -1.5);
        ctx.quadraticCurveTo(0, 1, -8.5, -1.5);
        ctx.quadraticCurveTo(-8.5, -10, -5, -19);
        ctx.closePath();
      }
    : E(0, cy, bw, bh);
  ctx.beginPath();
  path();
  ctx.fillStyle = C(d.body);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.17)';
  ctx.beginPath();
  ctx.ellipse(-3, cy + 6, bw + 2, bh * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.ellipse(2.5, cy - 4, bw * 0.45, bh * 0.35, 0, 0, TAU);
  ctx.fill();
  if (d.plate) {
    ctx.strokeStyle = 'rgba(40,40,50,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(1, cy - bh);
    ctx.lineTo(1, cy + 2);
    ctx.stroke();
    ctx.fillStyle = '#e6e9ec';
    for (const [rx, ry] of [
      [-3, -15],
      [4, -15],
      [-4, -11],
      [5, -11],
    ]) {
      ctx.beginPath();
      ctx.arc(rx, ry, 0.8, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = C(d.trim);
  ctx.fillRect(-bw - 2, cy + 2.2, bw * 2 + 4, 2.3);
  ctx.fillStyle = C('#e8c96a');
  ctx.fillRect(1, cy + 1.8, 2.6, 3);
  ctx.restore();
  ctx.beginPath();
  path();
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function hairCap(hx: number, hy: number, r: number, col: string): void {
  const ctx = g();
  fs(
    col,
    () => {
      ctx.arc(hx, hy - 0.5, r + 0.7, -0.25, -Math.PI - 0.75, true);
      ctx.lineTo(hx - 3, hy + 0.5);
      ctx.lineTo(hx - 1, hy - 2.5);
      ctx.lineTo(hx + 2, hy - 2);
      ctx.lineTo(hx + 4, hy - 4);
      ctx.closePath();
    },
    1.5,
  );
}

function helm(hx: number, hy: number, r: number, col: string): void {
  const ctx = g();
  fs(
    col,
    () => {
      ctx.arc(hx, hy - 0.5, r + 0.8, Math.PI, 0);
      ctx.lineTo(hx + r + 0.8, hy + 0.5);
      ctx.lineTo(hx - r - 0.8, hy + 0.5);
      ctx.closePath();
    },
    1.6,
  );
  fs(mix(col, '#000000', 0.15), RR(hx - r - 1.2, hy - 1.2, 2 * r + 2.4, 2.8, 1), 1.3);
  fs(col, RR(hx + r - 3, hy - 1, 2, 5.5, 0.8), 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(hx - 1, hy - 5, 3, 1.5, -0.4, 0, TAU);
  ctx.fill();
}

function eyes(u: PartsPose, d: HeroPartsRow, hx: number, hy: number, ex: number): void {
  const ctx = g();
  const e1 = [hx + ex, hy + 0.6];
  const e2 = [hx + ex + 2.8, hy + 0.6];
  if (u.ko) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    for (const e of [e1, e2]) {
      ctx.beginPath();
      ctx.moveTo(e[0] - 1, e[1] - 1);
      ctx.lineTo(e[0] + 1, e[1] + 1);
      ctx.moveTo(e[0] + 1, e[1] - 1);
      ctx.lineTo(e[0] - 1, e[1] + 1);
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = d.fx === 'greenflame' ? '#2f5a1a' : '#241a14';
  for (const e of [e1, e2]) {
    ctx.beginPath();
    ctx.arc(e[0], e[1], 1.1, 0, TAU);
    ctx.fill();
  }
  if (d.patch) {
    line(hx - 3, hy - 3, hx + 7, hy + 2, INK, 0.9);
    fs(INK, E(e2[0], e2[1], 1.7, 1.5), 0);
  }
}

function drawHead(u: PartsPose, d: HeroPartsRow): void {
  const ctx = g();
  const hx = d.hx ?? 1;
  const hy = d.hy ?? -25;
  const r = d.hr ?? 7;
  const hd = d.head;
  const hair = d.hairCol ?? '#8a5a3a';
  const hoodCol = d.hoodCol ?? '#4f8a3a';
  const hatCol = d.hatCol ?? '#5a6474';
  // back layers
  if (hd === 'braids')
    for (const [bx, by] of [
      [-6, -1],
      [-7, 3],
      [-7.5, 7],
      [-7.5, 11],
    ])
      fs(hair, E(hx + bx, hy + by, 2.4, 2.3), 1.2);
  if (hd === 'widehat' || hd === 'tallhat')
    fs(hair, P([hx - 6, hy - 3, hx - 8.5, hy + 7, hx - 3, hy + 5]), 1.4);
  if (hd === 'hair') fs(hair, E(hx - 6.8, hy - 2, 2.8, 2.8), 1.4);
  const hood = hd === 'hood' || hd === 'hornhood' || hd === 'frosthood';
  if (hood) {
    fs(hoodCol, P([hx - 5, hy - 4, hx - 12, hy + 5, hx - 4, hy + 4]), 1.5);
    fs(hoodCol, E(hx - 0.3, hy - 0.5, r + 1.6, r + 1.4));
    fs(d.skin, E(hx + 2.6, hy + 1.2, 4.6, 5), 1.2);
    if (hd === 'frosthood') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(hx + 2.6, hy + 1.2, 5, 5.4, 0, 0, TAU);
      ctx.stroke();
    }
    if (hd === 'hornhood')
      for (const s of [-1, 1])
        fs(
          d.trim,
          () => {
            ctx.moveTo(hx - 1 + s * 3, hy - 7);
            ctx.quadraticCurveTo(hx + s * 7, hy - 15, hx + s * 3 + 2, hy - 13);
            ctx.quadraticCurveTo(hx + s * 4, hy - 10, hx + 1 + s * 2, hy - 6);
            ctx.closePath();
          },
          1.3,
        );
    eyes(u, d, hx, hy, 2.3);
    return;
  }
  fs(d.skin, E(hx, hy, r, r));
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.arc(hx - 2, hy + 1, r - 1.5, 0, TAU);
  ctx.fill();
  fs(d.skin, E(hx + 0.8, hy - 0.6, r - 1.6, r - 1.6), 0);
  eyes(u, d, hx, hy, 2.2);
  const beardCol = d.beardCol ?? hair;
  if (d.beard === 'big') {
    fs(
      beardCol,
      P([
        hx - 2.5,
        hy + 1.5,
        hx + 7.4,
        hy + 0.5,
        hx + 6.8,
        hy + 6.5,
        hx + 3,
        hy + 11,
        hx - 1.5,
        hy + 7.5,
      ]),
      1.5,
    );
    line(hx + 2, hy + 3, hx + 6.5, hy + 2.5, mix(beardCol, '#000000', 0.25), 1.2);
  } else if (d.beard === 'long') {
    fs(
      beardCol,
      P([hx - 2.5, hy + 2, hx + 7.2, hy + 1, hx + 5.5, hy + 9, hx + 2, hy + 15, hx - 1, hy + 7]),
      1.4,
    );
  }
  if (hd === 'hair' || hd === 'braids') hairCap(hx, hy, r, hair);
  if (hd === 'braids') {
    fs('#f4f0e0', E(hx - 2, hy - 7.2, 1.7, 1.7), 1);
    fs('#e98a9e', E(hx + 1.5, hy - 7.8, 1.7, 1.7), 1);
  }
  if (hd === 'helm' || hd === 'winghelm') helm(hx, hy, r, '#a3acb4');
  if (hd === 'winghelm')
    for (const s of [0, 1]) {
      const wx = hx - 6 + s * 2;
      fs(
        '#ffffff',
        P([
          wx,
          hy - 3,
          wx - 8,
          hy - 12 - s * 2,
          wx - 4,
          hy - 4,
          wx - 9,
          hy - 7 - s,
          wx - 2,
          hy - 1,
        ]),
        1.3,
      );
    }
  if (hd === 'widehat' || hd === 'tallhat') {
    const tip = hd === 'tallhat' ? 26 : 18;
    fs(hatCol, () => {
      ctx.moveTo(hx - 5.5, hy - 4);
      ctx.quadraticCurveTo(hx - 4, hy - tip * 0.7, hx - 7, hy - tip);
      ctx.quadraticCurveTo(hx + 1.5, hy - tip * 0.75, hx + 5.5, hy - 4);
      ctx.closePath();
    });
    fs(
      '#c8b27a',
      P([hx - 5.4, hy - 6.5, hx + 5.4, hy - 6.5, hx + 5.4, hy - 4.5, hx - 5.4, hy - 4.5]),
      1.1,
    );
    if (hd === 'tallhat') {
      fs('#9be36b', E(hx, hy - 12, 1.8, 1.8), 0.8);
      glow(hx, hy - 12, 7, '#9be36b', 0.5);
    }
    fs(mix(hatCol, '#ffffff', 0.08), E(hx + 0.5, hy - 4, 12.5, 3.3, -0.06));
  }
}

function roundShield(x: number, y: number, r: number, a: string, b: string): void {
  const ctx = g();
  fs(a, E(x, y, r, r));
  ctx.fillStyle = C(b);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, r - 1, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  fs('#d9a441', E(x, y, r * 0.3, r * 0.3), 1);
}

function drawTrail(p: Pose): void {
  const ctx = g();
  const tr = p.trail;
  if (!tr) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (tr[0] === 'thrust') {
    line(2, -14, 26, -14, `rgba(255,255,255,${0.5 * (tr[1] as number)})`, 3);
  } else {
    const [a0, a1, al] = tr as number[];
    ctx.beginPath();
    ctx.arc(2, -15, 17, -Math.PI / 2 + a0, -Math.PI / 2 + a1);
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * al})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * al})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

function raven(x: number, y: number, f: number, ph: number): void {
  const ctx = g();
  const w = Math.sin(ph) * 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(f, 1);
  fs('#1e1c22', P([-1, 0, -7, -3 - w, -3, 1]), 1);
  fs('#1e1c22', E(0, 0, 3.6, 2), 1);
  fs('#1e1c22', E(3.3, -1, 1.8, 1.7), 1);
  fs('#d9a441', P([4.8, -1.3, 6.8, -0.6, 4.8, -0.2]), 0);
  fs('#2a2830', P([0, 0, -5, -2 + w * 0.6, -2, 1.5]), 1);
  ctx.restore();
}

// Draws one frame of a hero standing on (0, 0), facing right.
export function drawHero(u: PartsPose, d: HeroPartsRow): void {
  const ctx = g();
  const p = pose(u, d);
  const s = d.scale || 1;
  ctx.save();
  ctx.scale(s, s);
  if (p.rot) ctx.rotate(p.rot);
  setFlash(u.flash);
  fs(d.boots, E(p.f0.x, p.f0.y - 1, 3.1, 2.1), 1.5);
  fs(d.boots, E(p.f1.x, p.f1.y - 1, 3.1, 2.1), 1.5);
  ctx.translate(p.dx, p.bob);
  ctx.rotate(p.lean);
  ctx.scale(1, p.sy);
  if (d.fx === 'gold' && u.glow > 0) glow(0, -14, 30, '#ffd34d', 0.6 * u.glow);
  if (d.cape) drawCape(d, p);
  drawHand(u, d, p.hb, d.off === 'shield' ? undefined : d.off, p.wb, p);
  drawBody(d);
  drawHead(u, d);
  if (d.off === 'shield' && d.shield)
    roundShield(p.hb.x - 1, p.hb.y + 0.5, 6.5, d.shield[0], d.shield[1]);
  if (p.trail && u.tgt) drawTrail(p);
  drawHand(u, d, p.hf, d.weapon, p.wa, p);
  if (d.fx === 'greenflame' && !u.ko) {
    const a = 0.35 + Math.sin(T() * 11 + u.ph) * 0.15 + Math.sin(T() * 17) * 0.1;
    flame(p.hf.x, p.hf.y - 3, 2.2, '#5cff6a', '#d8ffb0', a);
    flame(p.hb.x, p.hb.y - 3, 1.9, '#5cff6a', '#d8ffb0', a * 0.8);
    flame(-3, -18, 1.6 + Math.sin(T() * 9) * 0.3, '#5cff6a', '#d8ffb0', a * 0.6);
  }
  ctx.restore();
  setFlash(0);
  if (d.fx === 'raven' && !u.ko) {
    const n = d.ravens || 1;
    for (let i = 0; i < n; i++) {
      const a = T() * 1.8 + u.ph + (i * TAU) / n;
      raven(Math.cos(a) * 20, -48 + Math.sin(a) * 6, Math.sin(a) > 0 ? -1 : 1, T() * 12 + i);
    }
  }
  void rnd;
}
