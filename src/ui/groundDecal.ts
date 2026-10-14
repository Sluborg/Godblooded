import Phaser from 'phaser';
import { bake, bakeTexture } from './bake';

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
  // Dead ground, no ring: a faint red glow, then an uneven patch of ash and scorched earth made of
  // overlapping blobs, cracks and a few scattered bones.
  return bake(scene, `lair2:${boss}`, (w * 1.5) / 2 + 2, (h * 1.6) / 2 + 8, (g) => {
    g.fillStyle(0xff3020, 0.05).fillEllipse(0, -6, w * 1.5, h * 1.6);
    g.fillStyle(0xff3020, 0.06).fillEllipse(0, -6, w * 1.2, h * 1.3);
    const blobs: [number, number, number, number, number, number][] = [
      [0, 0, 1, 1, 0x140a10, 0.62],
      [-0.28, 0.08, 0.6, 0.8, 0x0c0609, 0.5],
      [0.3, -0.06, 0.55, 0.7, 0x1a0d12, 0.5],
      [0.05, 0.22, 0.7, 0.45, 0x0c0609, 0.45],
      [-0.4, -0.12, 0.35, 0.5, 0x1a0d12, 0.4],
      [0.45, 0.18, 0.3, 0.4, 0x0c0609, 0.4],
    ];
    for (const [x, y, bw, bh, c, a] of blobs)
      g.fillStyle(c, a).fillEllipse((x * w) / 2, -6 + (y * h) / 2, w * bw, h * bh);
    g.lineStyle(2, 0x050205, 0.8);
    for (const [x1, y1, x2, y2, x3, y3] of CRACKS) {
      g.beginPath()
        .moveTo((x1 * w) / 2, -6 + (y1 * h) / 2)
        .lineTo((x2 * w) / 2, -6 + (y2 * h) / 2)
        .lineTo((x3 * w) / 2, -6 + (y3 * h) / 2)
        .strokePath();
    }
    // Bones in the ash.
    g.lineStyle(3, 0xd9ceb4, 0.55);
    const bones: [number, number, number][] = [
      [-0.55, 0.15, 0.4],
      [0.6, -0.1, -0.3],
      [-0.15, 0.32, 0.9],
      [0.25, 0.3, -0.7],
    ];
    for (const [x, y, a] of bones) {
      const cx = (x * w) / 2;
      const cy = -6 + (y * h) / 2;
      g.lineBetween(
        cx - Math.cos(a) * 7,
        cy - Math.sin(a) * 4,
        cx + Math.cos(a) * 7,
        cy + Math.sin(a) * 4,
      );
    }
  });
}

// A skull on a pole beside a lair, standing on its foot at (0, 0): baked once.
export function skullPike(scene: Phaser.Scene): Phaser.GameObjects.Image {
  return bake(scene, 'skull-pike', 26, 60, (g) => {
    g.fillStyle(0x000000, 0.28).fillEllipse(6, 0, 30, 9);
    g.fillStyle(0x3a2616, 1).fillRect(-2, -46, 4, 46);
    g.lineStyle(1.5, 0x120a05, 0.9).strokeRect(-2, -46, 4, 46);
    g.fillStyle(0x3a2616, 1).fillRect(-9, -30, 18, 3);
    g.fillStyle(0xe8dfc6, 1).fillCircle(0, -52, 9);
    g.fillRect(-5.5, -48, 11, 8);
    g.lineStyle(1.5, 0x3a3226, 0.9).strokeCircle(0, -52, 9);
    g.fillStyle(0x140d10, 1).fillCircle(-3.6, -52, 2.7).fillCircle(3.6, -52, 2.7);
    g.fillRect(-1, -49, 2, 4);
    g.fillRect(-3.5, -42, 1.5, 3).fillRect(0.5, -42, 1.5, 3).fillRect(3.5, -42, 1.5, 3);
  });
}

// A small glowing ember (one soft dot, drawn once): the embers rise from a lair in lairFx.ts.
export function emberDot(scene: Phaser.Scene): string {
  return bakeTexture(scene, 'ember', 6, 6, (g) => {
    g.fillStyle(0xff7a28, 0.25).fillCircle(0, 0, 5.5);
    g.fillStyle(0xffb04a, 0.6).fillCircle(0, 0, 3.2);
    g.fillStyle(0xfff0c0, 1).fillCircle(0, 0, 1.5);
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

// What a destroyed building leaves on its plot (tuning.town.ruins): a scorched patch, a heap of
// broken stone and two charred posts. Baked once (bake.ts), shown in place of the empty plot square.
export function ruinMark(scene: Phaser.Scene): Phaser.GameObjects.Image {
  return bake(scene, 'ruin', 70, 64, (g) => {
    g.fillStyle(0x140a08, 0.45).fillEllipse(0, -6, 120, 46);
    const rocks: [number, number, number, number, number][] = [
      [-30, -6, 26, 16, 0x6f6a60],
      [-6, -2, 32, 20, 0x857f72],
      [22, -8, 24, 15, 0x5d584f],
      [4, -14, 20, 12, 0x77716a],
      [-20, -16, 16, 10, 0x4f4a43],
    ];
    for (const [x, y, w, h, c] of rocks) {
      g.fillStyle(c, 1).fillEllipse(x, y, w, h);
      g.lineStyle(2, 0x1a140f, 0.7).strokeEllipse(x, y, w, h);
    }
    g.fillStyle(0x2a1a10, 1).fillRect(-36, -40, 6, 30).fillRect(30, -34, 6, 24);
    g.lineStyle(2, 0x0e0806, 0.8).strokeRect(-36, -40, 6, 30).strokeRect(30, -34, 6, 24);
  });
}
