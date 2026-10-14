import Phaser from 'phaser';
import { bake } from './bake';

// What stands on the ground tells friend from foe at a glance: a town building sits on a warm,
// trodden patch; a monster lair on dark cracked earth with a blood-red ring, a faint red glow and
// a red name plate with a skull. Drawn with shapes, so it needs no art.

// "wyrm-nest" -> "Wyrm Nest".
export function lairTitle(type: string): string {
  return type
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// Fixed crack lines (unit coordinates, half-width 1) so every lair has the same cracked look.
const CRACKS: [number, number, number, number, number, number][] = [
  [-0.95, 0.05, -0.55, -0.2, -0.3, 0.1],
  [0.95, -0.05, 0.6, 0.25, 0.35, 0.05],
  [-0.2, 0.55, 0.05, 0.25, 0.3, 0.5],
  [-0.5, -0.55, -0.25, -0.25, 0.0, -0.4],
  [0.45, -0.5, 0.25, -0.3, 0.1, -0.15],
];

export function lairDecal(scene: Phaser.Scene, boss: boolean): Phaser.GameObjects.Image {
  const w = boss ? 440 : 300;
  const h = w * 0.42;
  return bake(scene, `lair:${boss}`, (w * 1.35) / 2 + 2, (h * 1.45) / 2 + 8, (g) => {
    g.fillStyle(0xff3020, 0.07).fillEllipse(0, -6, w * 1.35, h * 1.45);
    g.fillStyle(0x140a10, 0.6).fillEllipse(0, -6, w, h);
    g.lineStyle(boss ? 7 : 5, 0x8a1c2b, 0.75).strokeEllipse(0, -6, w, h);
    g.lineStyle(2, 0x050205, 0.8);
    for (const [x1, y1, x2, y2, x3, y3] of CRACKS) {
      g.beginPath()
        .moveTo((x1 * w) / 2, -6 + (y1 * h) / 2)
        .lineTo((x2 * w) / 2, -6 + (y2 * h) / 2)
        .lineTo((x3 * w) / 2, -6 + (y3 * h) / 2)
        .strokePath();
    }
  });
}

// The light comes from the upper left: every shadow falls to the lower right.
export const SHADOW_DIR = { x: 0.07, y: 0.03 };

// A soft, warm-dark ground shadow for a building or lair `w` world units wide: stacked ellipses
// fading outwards, slightly offset along the light direction. Centred on the footprint centre.
export function groundShadow(scene: Phaser.Scene, w: number): Phaser.GameObjects.Image {
  const cx = w * SHADOW_DIR.x;
  const cy = -6 + w * SHADOW_DIR.y;
  const steps = 5;
  const rw = Math.round(w);
  return bake(
    scene,
    `shadow:${rw}`,
    Math.abs(cx) + w * 0.475 + 2,
    Math.abs(cy) + w * 0.21 + 2,
    (g) => {
      for (let i = 0; i < steps; i++) {
        const t = 1 - i / steps;
        g.fillStyle(0x24140a, 0.1).fillEllipse(cx, cy, w * (0.55 + 0.4 * t), w * (0.22 + 0.2 * t));
      }
    },
  );
}

// What a building stands on: trodden earth shaped like its footprint (a rounded diamond, the
// ground plan of an isometric building), `w` world units wide, with no rim. The tap and placement
// ring is separate (footprintRing).
export function footprintPoints(w: number, n = 2.6, steps = 28): { x: number; y: number }[] {
  const hw = w / 2;
  const hd = hw * 0.46;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const k = Math.pow(Math.abs(c) ** n + Math.abs(s) ** n, -1 / n);
    pts.push({ x: c * k * hw, y: -6 + s * k * hd });
  }
  return pts;
}

export function townPatch(scene: Phaser.Scene, w = 250): Phaser.GameObjects.Image {
  const rw = Math.round(w);
  return bake(scene, `patch:${rw}`, rw / 2 + 4, rw * 0.23 + 12, (g) => {
    g.fillStyle(0x6b5434, 0.34).fillPoints(footprintPoints(rw), true);
    g.fillStyle(0x8a7048, 0.22).fillPoints(footprintPoints(rw * 0.7), true);
    g.lineStyle(2, 0x3b2a10, 0.22).strokePoints(footprintPoints(rw), true, true);
  });
}

// The thin ring shown under a tapped building (or one being placed), the footprint's outline.
export function footprintRing(scene: Phaser.Scene, w: number): Phaser.GameObjects.Image {
  const rw = Math.round(w);
  return bake(scene, `fring:${rw}`, rw / 2 + 6, rw * 0.23 + 14, (g) => {
    g.lineStyle(3, 0xf2c14e, 0.95).strokePoints(footprintPoints(rw + 8), true, true);
  });
}

// The red plate under a lair: a drawn skull and its name.
export function lairPlate(scene: Phaser.Scene, type: string): Phaser.GameObjects.Container {
  const text = scene.add
    .text(14, 0, lairTitle(type), {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffe3dc',
      backgroundColor: '#8a1c2bee',
      padding: { x: 10, y: 3 },
    })
    .setOrigin(0.5, 0.5);
  const skull = scene.add.graphics();
  const sx = -text.width / 2 - 2;
  skull
    .fillStyle(0xf4ead5, 1)
    .fillCircle(sx, -3, 9)
    .fillRect(sx - 5, 2, 10, 7);
  skull
    .fillStyle(0x1a0f14, 1)
    .fillCircle(sx - 3.5, -3, 2.6)
    .fillCircle(sx + 3.5, -3, 2.6);
  skull.fillRect(sx - 1, 3, 2, 5);
  text.x = 0;
  const plate = scene.add.container(0, 46, [text, skull]);
  return plate;
}
