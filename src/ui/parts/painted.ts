// A hero drawn from a PAINTED PARTS KIT (Stefan, 2026-10-14): the parts rig, but every piece a
// painted picture. The rig is the prototype's `pose` (joints for the moment); this file solves the
// arms and legs (two bones each, in code), places the kit parts on the joints and draws them.
// bake.ts bakes the frames as before. Effects (glow, aura, trail, ravens) stay in code and are not
// drawn on painted looks yet. The contract with Art is in docs/asset-spec.md (kit sheets).
import {
  BUILDS,
  KIT_REQUIRED,
  type Build,
  type KitCombo,
  type KitMode,
  type KitSlot,
} from '../../data/heroKits';

export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  // Pivot name -> [fx, fy]: fractions (0..1, x right, y down) of the cell.
  pivots?: Readonly<Record<string, readonly [number, number]>>;
}

// A kit part ready to draw: its picture, its cell and the sheet's pixels per drawing unit.
export interface KitPart {
  img: CanvasImageSource;
  cell: Cell;
  ppu: number;
}
export type PartMap = Partial<Record<KitSlot, KitPart>>;

export interface Kit {
  parts: PartMap;
  layers: PartMap;
  build: Build;
  mode: KitMode;
}

// Pivot fallbacks (fractions) when a cell does not name one.
const FALLBACK: Readonly<Record<string, [number, number]>> = {
  neck: [0.5, 0.05],
  hip: [0.5, 0.9],
  shoulder_f: [0.7, 0.1],
  shoulder_b: [0.3, 0.1],
  hip_f: [0.6, 0.95],
  hip_b: [0.4, 0.95],
  clasp: [0.4, 0.1],
  brow: [0.5, 0.35],
  shoulder: [0.5, 0.05],
  elbow: [0.5, 0.95],
  wrist: [0.5, 0.95],
  knee: [0.5, 0.95],
  ground: [0.5, 0.95],
  grip: [0.5, 0.85],
  strap: [0.5, 0.5],
};

export const pivot = (part: KitPart, name: string): [number, number] => {
  const v = part.cell.pivots?.[name];
  const f = v ?? FALLBACK[name] ?? [0.5, 0.5];
  return [f[0], f[1]];
};

// Picture size in drawing units after the build's scale on the part's width and length.
export const sizeOf = (part: KitPart, sx = 1, sy = 1): [number, number] => [
  (part.cell.w / part.ppu) * sx,
  (part.cell.h / part.ppu) * sy,
];

// The build's name -> its factors.
export const buildOf = (combo: KitCombo): Build => BUILDS[combo.build ?? 'standard'];

// True when every part a painted look cannot do without has a picture.
export const kitComplete = (parts: PartMap, mode: KitMode = 'bent'): boolean =>
  KIT_REQUIRED[mode].every((s) => parts[s]);

// The standard figure, drawing units, feet at (0, 0), y up is negative: the torso's pelvis sits
// here, and a part whose cell has no pivot for a socket gets the fallback above.
export const HIP = { x: 0, y: -21 } as const;
// A floating torso reaches lower (no legs under it): its pelvis pivot sits here.
export const HIP_FLOAT = { x: 0, y: -15 } as const;
// The prototype's joints are for a 32 unit hero; the painted figure is 44 units.
export const PROTO_K = 44 / 32;
// A painted hero is 44 drawing units tall, the prototype's code hero 32 (before its own scale
// `codeScale`, usc in proto.gen.ts): the factor that gives both the same on-screen size.
export const kitScale = (codeScale: number): number => (codeScale * 32) / 44;

// A point in a part's picture as a point in drawing units, given where its anchor pivot sits.
function offsetIn(
  part: KitPart,
  from: string,
  to: string,
  sx: number,
  sy: number,
): [number, number] {
  const [a, b] = pivot(part, from);
  const [c, d] = pivot(part, to);
  const [w, h] = sizeOf(part, sx, sy);
  return [(c - a) * w, (d - b) * h];
}

export interface V2 {
  x: number;
  y: number;
}

// Two-bone solve: from `s` towards `t` with bones l1 and l2; the end is clamped to the reach. The
// bend is on the side `prefer` scores higher (an elbow behind, a knee in front).
export function solveTwoBone(
  s: V2,
  t: V2,
  l1: number,
  l2: number,
  prefer: (p: V2) => number,
): { mid: V2; end: V2 } {
  const dx = t.x - s.x;
  const dy = t.y - s.y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  const d = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-4, dist));
  const ux = dx / dist;
  const uy = dy / dist;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const bx = s.x + ux * a;
  const by = s.y + uy * a;
  const c1 = { x: bx - uy * h, y: by + ux * h };
  const c2 = { x: bx + uy * h, y: by - ux * h };
  const mid = prefer(c1) >= prefer(c2) ? c1 : c2;
  return { mid, end: { x: s.x + ux * d, y: s.y + uy * d } };
}

// What `pose` gives (the fields the placement reads), in prototype units.
export interface RigPose {
  bob: number;
  lean: number;
  dx: number;
  sy: number;
  hf: V2;
  hb: V2;
  wa: number;
  wb: number;
  f0: V2;
  f1: V2;
  rot: number;
  cape: number;
  hem: number;
}

// One thing to draw: a part (base or worn layer) placed with its pivot at (x, y), rotated, scaled.
export interface Draw {
  part: KitPart;
  pivot: string;
  x: number;
  y: number;
  rot: number;
  sx: number;
  sy: number;
  // True: inside the body transform (dx/bob, lean, sy); false: in the world (the legs).
  inBody: boolean;
  // The far side of the figure: shaded a little darker.
  far: boolean;
}

// The body transform the prototype applies to everything but the feet.
export const bodyPoint = (p: RigPose, v: V2): V2 => {
  const y = v.y * p.sy;
  const c = Math.cos(p.lean);
  const s = Math.sin(p.lean);
  return { x: v.x * c - y * s + p.dx, y: v.x * s + y * c + p.bob + 0.6 };
};

const ang = (v: V2): number => Math.atan2(v.y, v.x);

// Places every part for a pose, in draw order: cloak, back leg, back arm, torso, head, headgear,
// off-hand, front leg, front arm with the weapon; a weapon cocked behind the head goes before the
// head. A worn layer is drawn right after the part it covers with the same placement.
export function layout(kit: Kit, p: RigPose, raised = false): Draw[] {
  const out: Draw[] = [];
  const { parts, layers, build } = kit;
  const floating = kit.mode === 'floating';
  const hipAt = floating ? HIP_FLOAT : HIP;
  const torso = parts.torso as KitPart;
  const tsx = build.torso[0];
  const tsy = build.torso[1];
  const push = (slot: KitSlot, part: KitPart | undefined, d: Omit<Draw, 'part'>) => {
    if (!part) return;
    out.push({ part, ...d });
    const layer = layers[slot];
    if (layer) out.push({ part: layer, ...d });
  };
  // Sockets on the torso, in body coordinates.
  const sock = (name: string): V2 => {
    const [ox, oy] = offsetIn(torso, 'hip', name, tsx, tsy);
    return { x: hipAt.x + ox, y: hipAt.y + oy };
  };
  const neck = sock('neck');
  const head = parts.head as KitPart;
  const hsc = build.head;
  // Hands and feet from the prototype's pose, scaled to the painted figure.
  const hand = (h: V2): V2 => ({ x: h.x * PROTO_K, y: h.y * PROTO_K });
  // An arm from a shoulder socket to a hand target: its two Draws and where the wrist ends up.
  const arm = (slotShoulder: string, target: V2, far: boolean): { draws: Draw[]; end: V2 } => {
    const handDraw = (at: V2): Draw[] =>
      parts.hand
        ? [
            {
              part: parts.hand,
              pivot: 'wrist',
              x: at.x,
              y: at.y,
              rot: 0,
              sx: 1,
              sy: 1,
              inBody: true,
              far,
            },
          ]
        : [];
    // Floating: just the hand at the joint, like the code rig.
    if (floating) return { draws: handDraw(target), end: target };
    const up = parts.upperarm as KitPart;
    const fore = parts.forearm as KitPart;
    const [aw, al] = [build.arm[1], build.arm[0]];
    const shoulder = sock(slotShoulder);
    const [ex, ey] = offsetIn(up, 'shoulder', 'elbow', aw, al);
    const [wx, wy] = offsetIn(fore, 'elbow', 'wrist', aw, al);
    const r = solveTwoBone(shoulder, target, Math.hypot(ex, ey), Math.hypot(wx, wy), (q) => -q.x);
    const aUp = ang({ x: r.mid.x - shoulder.x, y: r.mid.y - shoulder.y }) - ang({ x: ex, y: ey });
    const aFore = ang({ x: r.end.x - r.mid.x, y: r.end.y - r.mid.y }) - ang({ x: wx, y: wy });
    const draws: Draw[] = [];
    const mk = (slot: KitSlot, part: KitPart, pv: string, at: V2, rot: number) => {
      draws.push({ part, pivot: pv, x: at.x, y: at.y, rot, sx: aw, sy: al, inBody: true, far });
      const layer = layers[slot];
      if (layer) draws.push({ ...draws[draws.length - 1], part: layer });
    };
    mk('upperarm', up, 'shoulder', shoulder, aUp);
    mk('forearm', fore, 'elbow', r.mid, aFore);
    draws.push(...handDraw(r.end));
    return { draws, end: r.end };
  };
  const footDraw = (at: V2, far: boolean) => {
    if (parts.foot)
      out.push({
        part: parts.foot,
        pivot: 'ground',
        x: at.x,
        y: at.y,
        rot: 0,
        sx: 1,
        sy: 1,
        inBody: false,
        far,
      });
  };
  const drawLeg = (slotHip: string, foot: V2, far: boolean) => {
    // Floating: just the boot at the foot, like the code rig.
    if (floating) return footDraw(foot, far);
    const thigh = parts.thigh as KitPart;
    const shin = parts.shin as KitPart;
    const [lw, ll] = [build.leg[1], build.leg[0]];
    const hip = bodyPoint(p, sock(slotHip));
    const [kx, ky] = offsetIn(thigh, 'hip', 'knee', lw, ll);
    const [gx, gy] = offsetIn(shin, 'knee', 'ground', lw, ll);
    const l1 = Math.hypot(kx, ky);
    const l2 = Math.hypot(gx, gy);
    const r = solveTwoBone(hip, foot, l1, l2, (q) => q.x);
    const aT = ang({ x: r.mid.x - hip.x, y: r.mid.y - hip.y }) - ang({ x: kx, y: ky });
    const aS = ang({ x: r.end.x - r.mid.x, y: r.end.y - r.mid.y }) - ang({ x: gx, y: gy });
    push('thigh', parts.thigh, {
      pivot: 'hip',
      x: hip.x,
      y: hip.y,
      rot: aT,
      sx: lw,
      sy: ll,
      inBody: false,
      far,
    });
    push('shin', parts.shin, {
      pivot: 'knee',
      x: r.mid.x,
      y: r.mid.y,
      rot: aS,
      sx: lw,
      sy: ll,
      inBody: false,
      far,
    });
    footDraw(r.end, far);
  };
  // Cloak behind everything.
  push('cloak', parts.cloak, {
    pivot: 'clasp',
    ...sock('clasp'),
    rot: p.cape * 0.03 + p.hem * 0.02,
    sx: tsx,
    sy: tsy,
    inBody: true,
    far: false,
  });
  // The prototype's f0 is the back foot, f1 the front one.
  drawLeg('hip_b', { x: p.f0.x * PROTO_K, y: p.f0.y * PROTO_K }, true);
  const back = arm('shoulder_b', hand(p.hb), true);
  out.push(...back.draws);
  push('torso', torso, {
    pivot: 'hip',
    ...hipAt,
    rot: 0,
    sx: tsx,
    sy: tsy,
    inBody: true,
    far: false,
  });
  drawLeg('hip_f', { x: p.f1.x * PROTO_K, y: p.f1.y * PROTO_K }, false);
  // The front arm, with the weapon in its hand drawn under the hand.
  const fr = arm('shoulder_f', hand(p.hf), false);
  const frontDraws: Draw[] = [];
  const weapon = parts.weapon;
  if (weapon) {
    const w = {
      part: weapon,
      pivot: 'grip',
      x: fr.end.x,
      y: fr.end.y,
      rot: p.wa,
      sx: 1,
      sy: 1,
      inBody: true,
      far: false,
    };
    frontDraws.push(w);
    if (layers.weapon) frontDraws.push({ ...w, part: layers.weapon });
  }
  frontDraws.push(...fr.draws);
  // A weapon cocked behind the head is drawn before the head.
  if (raised) out.push(...frontDraws);
  push('head', head, {
    pivot: 'neck',
    x: neck.x,
    y: neck.y,
    rot: 0,
    sx: hsc,
    sy: hsc,
    inBody: true,
    far: false,
  });
  const gear = parts.headgear;
  if (gear && head) {
    const [bx, by] = offsetIn(head, 'neck', 'brow', hsc, hsc);
    push('headgear', gear, {
      pivot: 'brow',
      x: neck.x + bx,
      y: neck.y + by,
      rot: 0,
      sx: hsc,
      sy: hsc,
      inBody: true,
      far: false,
    });
  }
  const off = parts.offhand;
  if (off) {
    const holds = off.cell.pivots?.strap ? 'strap' : 'grip';
    push('offhand', off, {
      pivot: holds,
      x: back.end.x,
      y: back.end.y,
      rot: holds === 'grip' ? p.wb : 0,
      sx: 1,
      sy: 1,
      inBody: true,
      far: false,
    });
  }
  if (!raised) out.push(...frontDraws);
  return out;
}

// ---------- drawing ----------

type Ctx = CanvasRenderingContext2D;
const shaded = new Map<CanvasImageSource, Map<string, HTMLCanvasElement>>();

// The cell's picture a little darker (the far limbs), cached.
function farImage(part: KitPart): CanvasImageSource {
  const key = `${part.cell.x},${part.cell.y},${part.cell.w},${part.cell.h}`;
  let m = shaded.get(part.img);
  if (!m) shaded.set(part.img, (m = new Map()));
  let c = m.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = part.cell.w;
    c.height = part.cell.h;
    const x = c.getContext('2d') as Ctx;
    x.drawImage(
      part.img,
      part.cell.x,
      part.cell.y,
      part.cell.w,
      part.cell.h,
      0,
      0,
      part.cell.w,
      part.cell.h,
    );
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(18,10,26,0.28)';
    x.fillRect(0, 0, c.width, c.height);
    m.set(key, c);
  }
  return c;
}

// Paints a layout. The caller has translated to the feet and set the bake scale.
export function drawKit(ctx: Ctx, draws: readonly Draw[], p: RigPose): void {
  ctx.save();
  if (p.rot) ctx.rotate(p.rot);
  for (const d of draws) {
    const { part } = d;
    const [fx, fy] = pivot(part, d.pivot);
    const [w, h] = sizeOf(part, d.sx, d.sy);
    ctx.save();
    if (d.inBody) {
      ctx.translate(p.dx, p.bob + 0.6);
      ctx.rotate(p.lean);
      ctx.scale(1, p.sy);
    }
    ctx.translate(d.x, d.y);
    if (d.rot) ctx.rotate(d.rot);
    if (d.far) {
      ctx.drawImage(farImage(part), 0, 0, part.cell.w, part.cell.h, -fx * w, -fy * h, w, h);
    } else {
      const c = part.cell;
      ctx.drawImage(part.img, c.x, c.y, c.w, c.h, -fx * w, -fy * h, w, h);
    }
    ctx.restore();
  }
  ctx.restore();
}

// A head and shoulders portrait of the kit in a square canvas of `size` px: the torso's top, the
// head and the headgear, facing right, centred. Transparent behind (the UI draws the plate).
export function drawPortrait(ctx: Ctx, kit: Kit, size: number): void {
  const { parts } = kit;
  const head = parts.head as KitPart;
  const torso = parts.torso as KitPart;
  const [, headH] = sizeOf(head, kit.build.head, kit.build.head);
  // The head takes about half the height; the neck sits two thirds down.
  const k = (size * 0.5) / headH;
  const nx = size / 2;
  const ny = size * 0.68;
  const put = (part: KitPart, name: string, x: number, y: number, sx: number, sy: number) => {
    const [fx, fy] = pivot(part, name);
    const [w, h] = sizeOf(part, sx, sy);
    const c = part.cell;
    ctx.drawImage(part.img, c.x, c.y, c.w, c.h, x - fx * w * k, y - fy * h * k, w * k, h * k);
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  if (parts.cloak) put(parts.cloak, 'clasp', nx - 4 * k, ny + 1 * k, 1, 1);
  put(torso, 'neck', nx, ny, kit.build.torso[0], kit.build.torso[1]);
  if (kit.layers.torso)
    put(kit.layers.torso, 'neck', nx, ny, kit.build.torso[0], kit.build.torso[1]);
  put(head, 'neck', nx, ny, kit.build.head, kit.build.head);
  const gear = parts.headgear;
  if (gear) {
    const [bx, by] = offsetIn(head, 'neck', 'brow', kit.build.head, kit.build.head);
    put(gear, 'brow', nx + bx * k, ny + by * k, kit.build.head, kit.build.head);
  }
  ctx.restore();
}
