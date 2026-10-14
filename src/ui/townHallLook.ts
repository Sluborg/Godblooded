import Phaser from 'phaser';

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

// A stone plaza disc with paving joints and a gold trim ring, on the ground layer.
export function plazaDecal(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const { w, h, stone, light, joint, trim } = HALL_STYLE.plaza;
  const g = scene.add.graphics();
  g.fillStyle(0x24140a, 0.28).fillEllipse(8, 0, w + 24, h + 14);
  g.fillStyle(stone, 1).fillEllipse(0, -6, w, h);
  g.fillStyle(light, 0.55).fillEllipse(0, -10, w * 0.72, h * 0.66);
  // Paving: radial joints and one inner ring.
  g.lineStyle(2, joint, 0.55).strokeEllipse(0, -6, w * 0.74, h * 0.74);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    g.lineBetween(
      Math.cos(a) * w * 0.37,
      -6 + Math.sin(a) * h * 0.37,
      Math.cos(a) * w * 0.5,
      -6 + Math.sin(a) * h * 0.5,
    );
  }
  g.lineStyle(6, trim, 0.95).strokeEllipse(0, -6, w, h);
  g.lineStyle(2, 0x3b2a10, 0.8).strokeEllipse(0, -6, w + 8, h + 6);
  return g;
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
