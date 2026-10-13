import Phaser from 'phaser';
import { gradeRgb } from './parts/partsStyle';

// Plain grass ground (Stefan's taste test, docs/decisions.md 2026-10-14): one flat green with
// small tufts and a few flowers, from the style prototype (docs/reference/style-test.html,
// buildGround). A small tile is painted once (512 px, about 1 MB) and shown by a grid of plain
// images that share it, so the ground costs the same however big the map is. (A map-size
// TileSprite would allocate a map-size canvas in Phaser 3.90: about 15 MB.)

export const GROUND = {
  // Base grass and tuft colours (the prototype's), before the slight warm grade.
  grass: '#7f9450',
  tuftDark: '#5d7434',
  tuftLight: '#a6b86a',
  flowers: ['#f3efe0', '#f1cf55', '#c99be0', '#e98a6e'],
  tileSize: 512,
  // Per 1000x1000 px: the prototype has 620 tufts and 80 flowers on 1280x720.
  tuftsPerMegapx: 670,
  flowersPerMegapx: 87,
  darkShare: 0.7,
} as const;

export interface Tuft {
  x: number;
  y: number;
  s: number;
  light: boolean;
}
export interface Flower {
  x: number;
  y: number;
  color: string;
}

function rng(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Where the tufts and flowers of one square tile go. Seeded, so every run looks the same.
export function groundPlan(
  size: number = GROUND.tileSize,
  seed = 90713,
): { tufts: Tuft[]; flowers: Flower[] } {
  const r = rng(seed);
  const area = (size * size) / 1_000_000;
  const tufts: Tuft[] = [];
  for (let i = 0; i < Math.round(area * GROUND.tuftsPerMegapx); i++)
    tufts.push({
      x: r() * size,
      y: r() * size,
      s: 0.8 + r() * 0.5,
      light: r() >= GROUND.darkShare,
    });
  const flowers: Flower[] = [];
  for (let i = 0; i < Math.round(area * GROUND.flowersPerMegapx); i++)
    flowers.push({
      x: r() * size,
      y: r() * size,
      color: GROUND.flowers[i % GROUND.flowers.length],
    });
  return { tufts, flowers };
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// "#rrggbb" with the palette grade applied (the grass sits in the same warm light as the heroes).
export function gradedHex(hex: string): string {
  const [r, g, b] = gradeRgb(...hexRgb(hex));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const TILE_KEY = 'ground_tile';

function drawTuft(c: CanvasRenderingContext2D, t: Tuft, ox: number, oy: number, col: string): void {
  const x = t.x + ox;
  const y = t.y + oy;
  const s = t.s;
  c.beginPath();
  c.moveTo(x - 2.5 * s, y - 3 * s);
  c.quadraticCurveTo(x - 1.2 * s, y - 1 * s, x - 0.6 * s, y);
  c.moveTo(x + 0.3 * s, y - 4 * s);
  c.lineTo(x, y);
  c.moveTo(x + 2.5 * s, y - 3 * s);
  c.quadraticCurveTo(x + 1.2 * s, y - 1 * s, x + 0.6 * s, y);
  c.strokeStyle = col;
  c.lineWidth = 1.1;
  c.lineCap = 'round';
  c.stroke();
}

// Paints the tile once and lays a grid of images sharing it over the map (depth -1). The tile
// wraps at its edges, so there are no seams. Release it with `releaseGround` on shutdown.
export function makeGround(
  scene: Phaser.Scene,
  width: number,
  height: number,
): Phaser.GameObjects.Image[] {
  const size = GROUND.tileSize;
  if (scene.textures.exists(TILE_KEY)) scene.textures.remove(TILE_KEY);
  const tex = scene.textures.createCanvas(TILE_KEY, size, size);
  const c = tex?.getContext();
  if (tex && c) {
    c.fillStyle = gradedHex(GROUND.grass);
    c.fillRect(0, 0, size, size);
    const dark = gradedHex(GROUND.tuftDark);
    const light = gradedHex(GROUND.tuftLight);
    const { tufts, flowers } = groundPlan();
    const wraps = [-size, 0, size];
    for (const t of tufts)
      for (const ox of wraps)
        for (const oy of wraps) {
          const x = t.x + ox;
          const y = t.y + oy;
          if (x < -6 || x > size + 6 || y < -6 || y > size + 6) continue;
          drawTuft(c, t, ox, oy, t.light ? light : dark);
        }
    for (const f of flowers)
      for (const ox of wraps)
        for (const oy of wraps) {
          const x = f.x + ox;
          const y = f.y + oy;
          if (x < -3 || x > size + 3 || y < -3 || y > size + 3) continue;
          c.fillStyle = gradedHex(f.color);
          c.beginPath();
          c.arc(x, y, 1.7, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = 'rgba(255,255,255,0.6)';
          c.beginPath();
          c.arc(x - 0.5, y - 0.5, 0.6, 0, Math.PI * 2);
          c.fill();
        }
    tex.refresh();
  }
  const images: Phaser.GameObjects.Image[] = [];
  for (let y = 0; y < height; y += size)
    for (let x = 0; x < width; x += size)
      images.push(scene.add.image(x, y, TILE_KEY).setOrigin(0, 0).setDepth(-1));
  return images;
}

export function releaseGround(scene: Phaser.Scene): void {
  if (scene.textures.exists(TILE_KEY)) scene.textures.remove(TILE_KEY);
}
