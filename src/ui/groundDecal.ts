import Phaser from 'phaser';
import { bake, bakeTexture } from './bake';
import { blobPoints, hash } from './organic';

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

export function lairDecal(scene: Phaser.Scene, boss: boolean): Phaser.GameObjects.Image {
  const w = boss ? 440 : 300;
  const h = w * 0.42;
  const cy = -6;
  // Dead ground with no circle silhouette (Stefan): ragged blobs of ash and scorched earth fading
  // out into the grass, darker towards the middle, blotches scattered over it, cracks running out
  // past the edge, a few bones. Everything is deterministic and baked once.
  return bake(scene, `lair3:${boss}`, Math.ceil(w * 0.9), Math.ceil(h * 0.9) + 12, (g) => {
    const layers: [number, number, number, number][] = [
      [1.3, 0x3a2a22, 0.07, 0.26],
      [1.12, 0x2c1f1b, 0.1, 0.24],
      [0.95, 0x1f1514, 0.16, 0.22],
      [0.78, 0x150d10, 0.26, 0.2],
      [0.56, 0x0c0609, 0.34, 0.18],
    ];
    layers.forEach(([k, c, a, amp], i) => {
      g.fillStyle(c, a).fillPoints(
        blobPoints(0, cy + (i - 2) * 2, (w / 2) * k, (h / 2) * k, boss ? 20 + i : 10 + i, amp, 44),
        true,
      );
    });
    // Blotches of darker and paler dirt.
    for (let i = 0; i < 16; i++) {
      const ang = hash(i * 3 + 1) * Math.PI * 2;
      const rad = Math.sqrt(hash(i * 3 + 2)) * 0.82;
      const bx = Math.cos(ang) * rad * (w / 2);
      const by = cy + Math.sin(ang) * rad * (h / 2);
      const size = 8 + hash(i * 3 + 3) * (boss ? 30 : 20);
      g.fillStyle(i % 3 === 0 ? 0x4a3a30 : 0x080406, i % 3 === 0 ? 0.18 : 0.3).fillPoints(
        blobPoints(bx, by, size, size * 0.45, 100 + i, 0.3, 14),
        true,
      );
    }
    // Cracks running out of the patch: a main line with a branch.
    g.lineStyle(2, 0x050205, 0.75);
    const cracks = boss ? 9 : 7;
    for (let i = 0; i < cracks; i++) {
      const a0 = (i / cracks) * Math.PI * 2 + hash(i + 50) * 0.5;
      let x = Math.cos(a0) * w * 0.08;
      let y = cy + Math.sin(a0) * h * 0.08;
      const len = (0.55 + hash(i + 60) * 0.35) * (w / 2) * 1.5;
      g.beginPath().moveTo(x, y);
      const segs = 5;
      for (let k = 1; k <= segs; k++) {
        const a = a0 + (hash(i * 7 + k) - 0.5) * 0.7;
        x += Math.cos(a) * (len / segs);
        y += Math.sin(a) * (len / segs) * (h / w) * 1.3;
        g.lineTo(x, y);
        if (k === 3) {
          g.strokePath().beginPath().moveTo(x, y);
          g.lineTo(x + Math.cos(a + 0.9) * len * 0.18, y + Math.sin(a + 0.9) * len * 0.1);
          g.strokePath().beginPath().moveTo(x, y);
        }
      }
      g.strokePath();
    }
    // Bones in the ash.
    g.lineStyle(3, 0xd9ceb4, 0.55);
    for (let i = 0; i < 5; i++) {
      const ang = hash(i + 80) * Math.PI * 2;
      const rad = 0.25 + hash(i + 90) * 0.5;
      const bx = Math.cos(ang) * rad * (w / 2);
      const by = cy + Math.sin(ang) * rad * (h / 2);
      const a = (hash(i + 70) - 0.5) * 2;
      g.lineBetween(
        bx - Math.cos(a) * 7,
        by - Math.sin(a) * 4,
        bx + Math.cos(a) * 7,
        by + Math.sin(a) * 4,
      );
    }
  });
}

// A skull on a pole beside a lair, standing on its foot at (0, 0): baked once.
export function skullPike(scene: Phaser.Scene): Phaser.GameObjects.Image {
  return bake(scene, 'skull-pike-hero', 40, 124, (g) => {
    g.scaleCanvas(1.75, 1.75);
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
