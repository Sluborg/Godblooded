// Canvas drawing helpers for the part-based units, ported from docs/reference/style-test.html.
// They draw into one module-level 2D context (set with `withCtx`), the way the prototype does;
// baking is single threaded and synchronous, so the shared state is safe.

export const INK = '#2a201b';
export const LW = 1.8;
export const TAU = Math.PI * 2;

let ctx!: CanvasRenderingContext2D;
let flash = 0; // white flash amount for the unit being drawn
let clock = 0; // animation time in seconds
let seed = 1;

export function withCtx(
  c: CanvasRenderingContext2D,
  t: number,
  rngSeed: number,
  fn: () => void,
): void {
  ctx = c;
  clock = t;
  seed = rngSeed | 0 || 1;
  flash = 0;
  fn();
}

export const g = (): CanvasRenderingContext2D => ctx;
export const T = (): number => clock;
export function setFlash(f: number): void {
  flash = f;
}

// Deterministic randomness for sparks and bolts, so a baked frame is the same every run.
export function rnd(a: number, b: number): number {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return a + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (b - a);
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const eio = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const eout = (t: number): number => 1 - Math.pow(1 - t, 3);

const RGB: Record<string, [number, number, number]> = {};
export function rgb(h: string): [number, number, number] {
  const hit = RGB[h];
  if (hit) return hit;
  let s = h.slice(1);
  if (s.length === 3) s = s.replace(/./g, '$&$&');
  const n = parseInt(s, 16);
  return (RGB[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a);
  const B = rgb(b);
  return `rgb(${(A[0] + (B[0] - A[0]) * t) | 0},${(A[1] + (B[1] - A[1]) * t) | 0},${(A[2] + (B[2] - A[2]) * t) | 0})`;
}
export function rgba(h: string, a: number): string {
  const c = rgb(h);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
// A colour, whitened by the current hit flash.
export const C = (c: string): string => (flash > 0 ? mix(c, '#ffffff', Math.min(1, flash)) : c);

export type PathFn = () => void;

// Fill and outline in one call; `path` adds to the current path.
export function fs(fill: string | null, path: PathFn, lw = LW, stroke = INK): void {
  ctx.beginPath();
  path();
  if (fill) {
    ctx.fillStyle = C(fill);
    ctx.fill();
  }
  if (lw) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}
export const E =
  (x: number, y: number, rx: number, ry: number, r = 0): PathFn =>
  () =>
    ctx.ellipse(x, y, rx, ry, r, 0, TAU);
export const P =
  (p: number[]): PathFn =>
  () => {
    ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath();
  };
export const RR =
  (x: number, y: number, w: number, h: number, r: number): PathFn =>
  () => {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

export function line(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  col: string,
  lw: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function glow(x: number, y: number, r: number, col: string, a: number): void {
  if (a <= 0.01) return;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a));
  gr.addColorStop(1, rgba(col, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function flame(x: number, y: number, s: number, c1: string, c2: string, a: number): void {
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.globalCompositeOperation = 'lighter';
  const f = (sc: number, col: string): void => {
    ctx.beginPath();
    ctx.moveTo(x, y - 2.2 * s * sc);
    ctx.quadraticCurveTo(x + 1.3 * s * sc, y - 0.6 * s * sc, x + 0.9 * s * sc, y + 0.4 * s * sc);
    ctx.arc(x, y + 0.4 * s * sc, 0.9 * s * sc, 0, Math.PI);
    ctx.quadraticCurveTo(x - 1.3 * s * sc, y - 0.6 * s * sc, x, y - 2.2 * s * sc);
    ctx.fillStyle = col;
    ctx.fill();
  };
  f(1, c1);
  f(0.55, c2);
  ctx.restore();
}

export function zig(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  n: number,
  j: number,
): [number, number][] {
  const pts: [number, number][] = [[x0, y0]];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([lerp(x0, x1, t) + rnd(-j, j), lerp(y0, y1, t) + rnd(-j, j)]);
  }
  pts.push([x1, y1]);
  return pts;
}

function strokePts(pts: [number, number][], col: string, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts) ctx.lineTo(p[0], p[1]);
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

export function bolt(pts: [number, number][], col: string): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  strokePts(pts, rgba(col, 0.45), 4.5);
  strokePts(pts, '#ffffff', 1.4);
  ctx.restore();
}
