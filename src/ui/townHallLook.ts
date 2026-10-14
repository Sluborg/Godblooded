import Phaser from 'phaser';
import { bake } from './bake';
import { footprintPoints } from './groundDecal';
import { hash, insidePoly } from './organic';

// The town hall has to read as THE main building, in code until Art draws a great hall (Stefan,
// playtest 2026-10-14): larger than any other building, on a stone plaza with a gold rim, two tall
// banner poles with the town colour waving, and a health bar that is always shown.
export const HALL_STYLE = {
  // Picture size relative to the other buildings.
  scale: 1.5,
  plaza: { w: 420, h: 176, stone: 0x8d8778, light: 0xa8a290, joint: 0x5f5a4e, trim: 0xf2c14e },
  pole: { x: 178, height: 250, color: 0x4b2e1a, finial: 0xf2c14e },
  cloth: { color: 0x8a1c2b, trim: 0xf2c14e, w: 66, h: 84 },
  barWidth: 210,
} as const;

export function isTownHall(type: string): boolean {
  return type === 'townhall';
}

// The flagstone yard under the hall: an irregular patch shaped to the hall's footprint (a rounded
// diamond with a ragged edge), paved with uneven flagstones, some broken or missing at the edge, no
// rim. The gold ring shows only when the hall is tapped (footprintRing), like every building.
export function plazaDecal(scene: Phaser.Scene): Phaser.GameObjects.Image {
  const { w, h, stone, light, joint } = HALL_STYLE.plaza;
  return bake(scene, 'plaza2', w / 2 + 24, h / 2 + 24, (g) => {
    // The patch: the footprint diamond with its edge pushed in and out.
    const patch = footprintPoints(w).map((p, i) => {
      const k = 1 + (hash(i + 300) - 0.5) * 0.14 + Math.sin(i * 1.7) * 0.03;
      return { x: p.x * k, y: -6 + (p.y + 6) * k };
    });
    const grown = patch.map((p) => ({ x: p.x * 1.06, y: -6 + (p.y + 6) * 1.12 }));
    g.fillStyle(0x24140a, 0.22).fillPoints(grown, true);
    g.fillStyle(0x4a4538, 1).fillPoints(patch, true);
    // Flagstones on a loose grid in the iso plane; near the edge some are broken or missing.
    const cw = 36;
    const ch = 17;
    for (let row = -7; row <= 7; row++) {
      for (let col = -8; col <= 8; col++) {
        const n = row * 31 + col * 7;
        const cx = col * cw + (row % 2 ? cw / 2 : 0) + (hash(n) - 0.5) * 5;
        const cy = -6 + row * ch + (hash(n + 1) - 0.5) * 3;
        if (!insidePoly(patch, cx, cy)) continue;
        const edge = !insidePoly(patch, cx * 0.9, -6 + (cy + 6) * 0.9);
        if (edge && hash(n + 2) < 0.35) continue;
        const sw = cw * (0.82 + hash(n + 3) * 0.14);
        const sh = ch * (0.8 + hash(n + 4) * 0.14);
        const tone = hash(n + 5);
        const fill = tone < 0.33 ? joint : tone < 0.7 ? stone : light;
        const quad = [
          { x: cx - sw / 2 + (hash(n + 6) - 0.5) * 3, y: cy - sh / 2 },
          { x: cx + sw / 2 + (hash(n + 7) - 0.5) * 3, y: cy - sh / 2 + (hash(n + 8) - 0.5) * 2 },
          { x: cx + sw / 2 + (hash(n + 9) - 0.5) * 3, y: cy + sh / 2 },
          { x: cx - sw / 2 + (hash(n + 10) - 0.5) * 3, y: cy + sh / 2 + (hash(n + 11) - 0.5) * 2 },
        ];
        g.fillStyle(fill, edge ? 0.8 : 1).fillPoints(quad, true);
        g.lineStyle(1.5, 0x2e2a22, 0.7).strokePoints(quad, true, true);
        g.lineStyle(1, 0xe6dfc8, 0.22).lineBetween(
          quad[0].x + 1,
          quad[0].y + 1,
          quad[1].x - 1,
          quad[1].y + 1,
        );
      }
    }
    // A worn dark outline, not a gold rim.
    g.lineStyle(2, 0x2e2a22, 0.5).strokePoints(patch, true, true);
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
  for (const side of [-1, 1] as const) {
    const px = side * x;
    g.fillStyle(0x24140a, 0.35).fillEllipse(px + 6, 2, 26, 9);
    g.fillStyle(color, 1).fillRect(px - 4, -height, 8, height);
    g.fillStyle(finial, 1).fillCircle(px, -height - 4, 7);
    const pts = clothPoints(t + (side === 1 ? 400 : 0), side === 1 ? 1 : -1, still).map((p) => ({
      x: px + p.x + side * 4,
      y: -height + 8 + p.y,
    }));
    g.fillStyle(cloth.color, 1).fillPoints(pts, true);
    g.lineStyle(3, cloth.trim, 0.95).strokePoints(pts, true);
  }
}
