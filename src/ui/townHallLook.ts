import Phaser from 'phaser';
import { bake } from './bake';
import { blobPoints, hash } from './organic';

// The town hall has to read as THE main building, in code until Art draws a great hall (Stefan,
// playtest 2026-10-14): larger than any other building, on a stone plaza with a gold rim, two tall
// banner poles with the town colour waving, and a health bar that is always shown.
export const HALL_STYLE = {
  // Picture size relative to the other buildings.
  scale: 1.5,
  plaza: { w: 504, h: 211, stone: 0x8d8778, light: 0xa8a290, joint: 0x5f5a4e, trim: 0xf2c14e },
  pole: { x: 214, height: 250, color: 0x4b2e1a, finial: 0xf2c14e },
  cloth: { color: 0x8a1c2b, trim: 0xf2c14e, w: 56, h: 70 },
  barWidth: 252,
} as const;

export function isTownHall(type: string): boolean {
  return type === 'townhall';
}

// The yard under the hall (Stefan 2026-10-18, "fix that brick ground"): packed, trodden earth that
// fades softly into the grass at the rim (many faint ragged layers, no hard edge), speckled with
// dark and pale grit and a few pebbles, grass creeping in at the edge, a few irregular flagstones by
// the door, and a worn path running out towards each plot. Baked once; the gold ring shows only when
// the hall is tapped (footprintRing).
export const YARD = {
  // Where the door is, from the hall's footprint centre (world units, at the 1.2x building scale).
  door: { x: 100, y: 40 },
  // The ring of plots the paths run to (offsets from the hall, from the game data).
  plotDirs: [
    [520, 0],
    [368, 269],
    [0, 380],
    [-368, 269],
    [-520, 0],
    [-368, -269],
    [0, -380],
    [368, -269],
  ],
} as const;

export function plazaDecal(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const { w, h } = HALL_STYLE.plaza;
  const halfW = w / 2 + 150;
  const halfH = h / 2 + 120;
  return bake(scene, 'yard1', halfW, halfH, (g) => {
    const cy = -6;
    // Soft layers: the outermost barely there, each inner one a little stronger and browner.
    const layers = 11;
    for (let i = 0; i < layers; i++) {
      const u = i / (layers - 1);
      const k = 1.2 - u * 0.68;
      const col = u < 0.5 ? 0x8d7a54 : u < 0.8 ? 0x8a7049 : 0x836845;
      g.fillStyle(col, 0.1 + u * 0.05).fillPoints(
        blobPoints(0, cy, (w / 2) * k, (h / 2) * k, 500 + i * 7, 0.16 - u * 0.06, 40),
        true,
      );
    }
    // Worn paths towards the plots: chains of soft ellipses along each direction, thinning out.
    for (const [dx, dy] of YARD.plotDirs) {
      const len = Math.hypot(dx, dy);
      const ux = dx / len;
      const uy = dy / len;
      // Start inside the yard rim along the ray, run on beyond it.
      const rim = 1 / Math.hypot(ux / (w / 2), uy / (h / 2));
      for (let i = 0; i < 6; i++) {
        const t = rim * 0.8 + i * 24;
        const f = 1 - i / 7;
        g.fillStyle(0x8e7650, 0.12 * f + 0.03).fillEllipse(
          ux * t,
          cy + uy * t,
          46 * f + 18,
          20 * f + 9,
        );
      }
    }
    // Grit: dark and pale specks, a few pebbles, over the middle of the yard.
    for (let i = 0; i < 260; i++) {
      const a = hash(i * 3 + 1) * Math.PI * 2;
      const r = Math.sqrt(hash(i * 3 + 2)) * 0.95;
      const x = Math.cos(a) * r * (w / 2) * 0.95;
      const y = cy + Math.sin(a) * r * (h / 2) * 0.95;
      const k = hash(i * 3 + 3);
      if (k < 0.5) g.fillStyle(0x56412a, 0.3).fillCircle(x, y, 0.8 + hash(i + 900) * 1.2);
      else if (k < 0.85) g.fillStyle(0xb79d72, 0.28).fillCircle(x, y, 0.8 + hash(i + 901) * 1.1);
      else {
        g.fillStyle(0x6a6558, 0.5).fillEllipse(x, y + 0.6, 4.2, 2.6);
        g.fillStyle(0xa9a493, 0.8).fillEllipse(x, y, 3.8, 2.4);
      }
    }
    // Grass creeping in at the rim: short dark strokes in a ragged ring.
    g.lineStyle(1.4, 0x4f6b2c, 0.55);
    for (let i = 0; i < 70; i++) {
      const a = hash(i * 5 + 11) * Math.PI * 2;
      const r = 0.9 + hash(i * 5 + 12) * 0.22;
      const x = Math.cos(a) * r * (w / 2);
      const y = cy + Math.sin(a) * r * (h / 2);
      g.lineBetween(x, y, x - 1.4, y - 4.5 - hash(i + 700) * 3);
      g.lineBetween(x, y, x + 1.8, y - 3.5 - hash(i + 701) * 3);
    }
    // A few irregular flagstones in front of the door, not a grid.
    const { x: dx, y: dy } = YARD.door;
    for (let i = 0; i < 7; i++) {
      const sx = dx + (i - 3) * 27 + (hash(i + 40) - 0.5) * 10;
      const sy = dy + 8 + Math.abs(i - 3) * 4 + (hash(i + 50) - 0.5) * 7;
      const rx = 11 + hash(i + 60) * 7;
      const ry = 5 + hash(i + 70) * 3;
      const pts = blobPoints(sx, sy, rx, ry, 600 + i * 13, 0.22, 9);
      g.fillStyle(0x3d3426, 0.3).fillPoints(
        pts.map((p) => ({ x: p.x + 1, y: p.y + 1.6 })),
        true,
      );
      g.fillStyle(hash(i + 80) < 0.5 ? 0x948d79 : 0x867f6b, 0.95).fillPoints(pts, true);
      g.lineStyle(1.1, 0x4f493d, 0.5).strokePoints(pts, true, true);
      g.fillStyle(0xcfc8b0, 0.22).fillEllipse(sx - rx * 0.2, sy - ry * 0.35, rx * 1.1, ry * 0.7);
    }
  });
}

// The polygon of a waving cloth hanging from a pole top at (0, 0) towards `dir` (1 right, -1 left):
// `t` in ms. The free edge swings sideways and bobs; the pole edge stays put.
export function clothPoints(t: number, dir: 1 | -1, still = false): { x: number; y: number }[] {
  const { w, h } = HALL_STYLE.cloth;
  const phase = still ? 0 : t / 380;
  const pts: { x: number; y: number }[] = [];
  const cols = 5;
  for (let i = 0; i <= cols; i++) {
    const u = i / cols;
    const wave = Math.sin(phase + u * 3.2) * 9 * u;
    pts.push({ x: dir * w * u, y: wave });
  }
  for (let i = cols; i >= 0; i--) {
    const u = i / cols;
    const wave = Math.sin(phase + u * 3.2) * 9 * u;
    // The lower edge slopes up to a swallow-tail point.
    pts.push({ x: dir * w * u, y: h * (1 - 0.35 * u) + wave });
  }
  return pts;
}

// Draws both banner poles and cloths into `g` (container coordinates: the foot at the origin).
export function drawBanners(g: Phaser.GameObjects.Graphics, t: number, still: boolean): void {
  const { x, height, color, finial } = HALL_STYLE.pole;
  const cloth = HALL_STYLE.cloth;
  g.clear();
  // Only the rightmost banner stays (Stefan: remove the decorative flags).
  for (const side of [1] as const) {
    const px = side * x;
    // The pole: a slim shaft with a lit edge and a small finial; no ground shadow (Stefan: ugly).
    g.fillStyle(color, 1).fillRect(px - 3, -height, 6, height);
    g.fillStyle(0x7a5532, 0.8).fillRect(px - 3, -height, 2, height);
    g.fillStyle(finial, 1).fillCircle(px, -height - 3, 5);
    // Both cloths blow the same way, the way the wind does (to the right).
    const pts = clothPoints(t + (side === 1 ? 400 : 0), 1, still).map((p) => ({
      x: px + p.x + 3,
      y: -height + 6 + p.y,
    }));
    g.fillStyle(cloth.color, 1).fillPoints(pts, true);
    // Cloth shading: the folds follow the wave, alternate light and dark bands across the cloth.
    const n = pts.length / 2;
    for (let i = 0; i < n - 1; i++) {
      const quad = [pts[i], pts[i + 1], pts[pts.length - 2 - i], pts[pts.length - 1 - i]];
      const dark = i % 2 === 0;
      g.fillStyle(dark ? 0x3a0a12 : 0xd45a66, dark ? 0.22 : 0.16).fillPoints(quad, true);
    }
    g.lineStyle(2, cloth.trim, 0.9).strokePoints(pts, true);
  }
}
