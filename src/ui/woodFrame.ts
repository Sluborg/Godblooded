import Phaser from 'phaser';
import { UI_STYLE, WOOD, type WoodPalette } from './uiStyle';

// Cheap deterministic wobble for the grain lines, so a frame looks the same every time.
function hsh(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// A rounded wood slab centred on (0, 0): outline, three bands (light top, mid, dark bottom),
// grain lines and a light edge on top. Graphics has no gradients, so the bands stand in.
export function drawWoodSlab(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  pal: WoodPalette = WOOD,
): void {
  const r = Math.min(10, h / 2);
  const x = -w / 2;
  const y = -h / 2;
  g.fillStyle(pal.outline, 1).fillRoundedRect(x - 1, y - 1, w + 2, h + 2, r + 1);
  g.fillStyle(pal.mid, 1).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(pal.top, 0.9).fillRoundedRect(x + 1, y + 1, w - 2, h * 0.42, {
    tl: r - 1,
    tr: r - 1,
    bl: 2,
    br: 2,
  });
  g.fillStyle(pal.bottom, 0.85).fillRoundedRect(x + 1, y + h * 0.62, w - 2, h * 0.38 - 1, {
    tl: 2,
    tr: 2,
    bl: r - 1,
    br: r - 1,
  });
  g.lineStyle(1, pal.grain, 0.3);
  const lines = Math.max(3, Math.round(h / 14));
  for (let i = 0; i < lines; i++) {
    const yy = y + 3 + i * ((h - 6) / lines);
    const wob = hsh(i + w) * 2.5;
    g.beginPath();
    g.moveTo(x + r * 0.6, yy);
    g.lineTo(x + w * 0.5, yy + wob);
    g.lineTo(x + w - r * 0.6, yy - 1);
    g.strokePath();
  }
  g.lineStyle(1, pal.highlight, 0.35).lineBetween(x + r, y + 2, x + w - r, y + 2);
}

// Frame width for a panel of this size: `UI_STYLE.border` for small ones, wider for big ones.
export function panelBorder(w: number, h: number): number {
  return Math.round(
    Math.min(UI_STYLE.borderMax, Math.max(UI_STYLE.border, Math.min(w, h) * 0.022)),
  );
}

// A wood frame with a dark-parchment centre, centred on (0, 0): a panel. The centre is a few
// nested rounded rects, lighter toward the middle (stands in for the prototype's radial gradient),
// with a thin ink line round it and nails in the four corners.
export function drawWoodPanel(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
  const b = panelBorder(w, h);
  drawWoodSlab(g, w, h);
  const r = Math.max(3, Math.min(10, h / 2) - b);
  const x = -w / 2 + b;
  const y = -h / 2 + b;
  const iw = w - 2 * b;
  const ih = h - 2 * b;
  g.fillStyle(UI_STYLE.centreOuter, 1).fillRoundedRect(x, y, iw, ih, r);
  const steps = 5;
  const maxGrow = Math.min(iw, ih) * 0.3;
  for (let i = 1; i <= steps; i++) {
    const grow = (maxGrow * i) / steps;
    g.fillStyle(UI_STYLE.centreInner, 0.22).fillRoundedRect(
      x + grow * 0.6,
      y + grow * 0.6,
      iw - grow * 1.2,
      ih - grow * 1.2,
      Math.max(2, r + grow * 0.4),
    );
  }
  g.lineStyle(1, UI_STYLE.centreEdge, 0.7).strokeRoundedRect(x, y, iw, ih, r);
  if (UI_STYLE.nails) {
    const n = b / 2 + 0.5;
    for (const [nx, ny] of [
      [-w / 2 + n, -h / 2 + n],
      [w / 2 - n, -h / 2 + n],
      [-w / 2 + n, h / 2 - n],
      [w / 2 - n, h / 2 - n],
    ])
      g.fillStyle(UI_STYLE.nail, 1).fillCircle(nx, ny, Math.min(3, b * 0.32));
  }
}
