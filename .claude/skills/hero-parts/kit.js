/* eslint-disable */
// Drawing kit: colour helpers, shape paths, the painted fill and the palette.
// Part of the hero-parts skill (.claude/skills/hero-parts/SKILL.md). Plain browser script: files are
// concatenated in the order kit.js, parts.js, hero.js, then the page script.
// ---------- colour helpers ----------
const hx = (c) => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];
const toHex = (r) =>
  '#' +
  r
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const mix = (a, b, t) => {
  const A = hx(a),
    B = hx(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
};
const tone = (c, k) => (k >= 0 ? mix(c, '#fff4dc', k) : mix(c, '#120d0a', -k));
const dark = (c) => mix(c, '#140f0b', 0.6);

// ---------- drawing state ----------
let ctx = null,
  SC = 1; // SC = px per unit for outline width
const LW = () => Math.max(1, 0.17 * SC) / SC;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const E =
  (x, y, rx, ry, rot = 0) =>
  () =>
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
// smooth closed curve through points (Catmull-Rom)
const C = (pts) => () => {
  const n = pts.length;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n],
      p1 = pts[i],
      p2 = pts[(i + 1) % n],
      p3 = pts[(i + 2) % n];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1],
    );
  }
  ctx.closePath();
};
const P = (pts) => () => {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
};
const R =
  (x, y, w, h, r = 0.6) =>
  () =>
    ctx.roundRect(x, y, w, h, r);
// shaded fill: light top-left to dark bottom-right, a little grit, a thin outline in a darker shade of its own colour
function paint(fill, path, box, o = {}) {
  const [bx, by, bw, bh] = box;
  ctx.beginPath();
  path();
  const g = ctx.createLinearGradient(bx, by, bx + bw * 0.8, by + bh);
  g.addColorStop(0, tone(fill, o.hi ?? 0.2));
  g.addColorStop(0.5, fill);
  g.addColorStop(1, tone(fill, -(o.lo ?? 0.38)));
  ctx.fillStyle = g;
  ctx.fill();
  if (o.grit && SC > 3) {
    ctx.save();
    ctx.clip();
    const r = rng(o.grit),
      n = Math.round(bw * bh * 0.12);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = r() < 0.7 ? tone(fill, -0.3) + '88' : tone(fill, 0.25) + '66';
      const x = bx + r() * bw,
        y = by + r() * bh;
      if (r() < 0.75) {
        ctx.beginPath();
        ctx.arc(x, y, 0.12 + r() * 0.22, 0, 7);
        ctx.fill();
      } else {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.14;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 2, y + (r() - 0.5) * 1.2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  if (o.rim !== false) {
    ctx.save();
    ctx.beginPath();
    path();
    ctx.clip();
    ctx.strokeStyle = tone(fill, 0.35) + 'aa';
    ctx.lineWidth = Math.max(0.35, 1.6 / SC);
    ctx.translate(0.35, 0.35);
    ctx.beginPath();
    path();
    ctx.stroke();
    ctx.restore();
  }
  if (o.line !== false) {
    ctx.beginPath();
    path();
    ctx.lineWidth = LW();
    ctx.strokeStyle = o.ink || dark(fill);
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}
function flat(fill, path, line = true) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (line) {
    ctx.lineWidth = LW();
    ctx.strokeStyle = dark(fill);
    ctx.stroke();
  }
}
function stroke(color, w, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// ---------- palette ----------
const COL = {
  ink: '#20160f',
  leather: '#6b4a32',
  leatherD: '#4a3426',
  wood: '#6e4a2c',
  iron: '#7f868d',
  fur: '#b8a786',
  red: '#8a3328',
  cloth: '#5a6372',
  bronze: '#a8713a',
  rope: '#a58a5c',
};
const TIER = [
  { name: 'Iron', metal: '#868c93', trim: '#5e646b', gem: null },
  { name: 'Silver', metal: '#cdd4dc', trim: '#8f99a4', gem: null },
  { name: 'Gold', metal: '#d6a83a', trim: '#9c7420', gem: '#4ab0ff' },
];
