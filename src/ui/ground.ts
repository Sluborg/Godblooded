import Phaser from 'phaser';
import { gradeRgb } from './parts/partsStyle';
import { bake, textureScale } from './bake';
import {
  CELL,
  DECAL_KINDS,
  DECAL_VARIANTS,
  decalPlan,
  dirtOutline,
  dirtPlan,
  tintGrid,
  type DecalKind,
} from './groundVariation';
import type { Pt } from './organic';

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
const DECAL_KEY = 'ground_decals';
// One atlas of the small details, drawn at 2 px per world unit: a row of DECAL_VARIANTS per kind.
const hexA = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const DW = 64;
const DH = 44;

function drawDecal(
  c: CanvasRenderingContext2D,
  kind: DecalKind,
  variant: number,
  ox: number,
  oy: number,
): void {
  const r = rng(kind.length * 977 + variant * 131 + kind.charCodeAt(kind.length - 1) * 17);
  const cx = ox + DW / 2;
  const base = oy + DH - 8;
  c.lineCap = 'round';
  if (kind === 'clumpD' || kind === 'clumpL') {
    const col = gradedHex(kind === 'clumpD' ? '#4d672a' : '#b3c775');
    const mid = gradedHex(kind === 'clumpD' ? '#62803a' : '#92ab58');
    const n = 7 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 1.5 + (r() - 0.5) * 0.25;
      const len = 11 + r() * 12;
      const bx = cx + (r() - 0.5) * 6;
      c.beginPath();
      c.moveTo(bx, base);
      c.quadraticCurveTo(
        bx + Math.sin(a) * len * 0.35,
        base - len * 0.6,
        bx + Math.sin(a) * len * 0.9,
        base - Math.cos(a) * len,
      );
      c.strokeStyle = i % 3 === 0 ? mid : col;
      c.lineWidth = 2.1;
      c.stroke();
    }
  } else if (kind === 'clover') {
    const leaf = [gradedHex('#6f9a43'), gradedHex('#82ad52'), gradedHex('#5c8638')];
    const n = 6 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const lx = cx + (r() - 0.5) * 38;
      const ly = base - 6 - r() * 12;
      c.fillStyle = leaf[i % 3];
      for (let k = 0; k < 3; k++) {
        c.beginPath();
        c.arc(
          lx + Math.cos(k * 2.1 + 0.5) * 2.3,
          ly + Math.sin(k * 2.1 + 0.5) * 1.7,
          2.3,
          0,
          Math.PI * 2,
        );
        c.fill();
      }
    }
    for (let i = 0; i < 2; i++) {
      c.fillStyle = gradedHex('#f3efe0');
      c.beginPath();
      c.arc(cx + (r() - 0.5) * 30, base - 10 - r() * 8, 1.8, 0, Math.PI * 2);
      c.fill();
    }
  } else if (kind === 'moss') {
    // A soft dark-green mossy patch: layered ragged blobs, darker in the middle.
    for (const [k, col, a] of [
      [1, '#4a6a2c', 0.3],
      [0.72, '#3d5a24', 0.34],
      [0.42, '#33501f', 0.36],
    ] as const) {
      c.beginPath();
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const rr = k * (1 + (r() - 0.5) * 0.5);
        const px = cx + Math.cos(ang) * 24 * rr;
        const py = base - 8 + Math.sin(ang) * 9 * rr;
        if (i) c.lineTo(px, py);
        else c.moveTo(px, py);
      }
      c.closePath();
      c.fillStyle = hexA(gradedHex(col), a);
      c.fill();
    }
  } else if (kind === 'bare') {
    const pts = 11;
    c.beginPath();
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const rr = 1 + (r() - 0.5) * 0.45;
      const px = cx + Math.cos(a) * 21 * rr;
      const py = base - 8 + Math.sin(a) * 8.5 * rr;
      if (i) c.lineTo(px, py);
      else c.moveTo(px, py);
    }
    c.closePath();
    c.fillStyle = 'rgba(128,102,66,0.34)';
    c.fill();
    c.fillStyle = 'rgba(96,74,46,0.4)';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.arc(cx + (r() - 0.5) * 30, base - 8 + (r() - 0.5) * 9, 0.9 + r() * 1.1, 0, Math.PI * 2);
      c.fill();
    }
  } else {
    const color = {
      flowerW: '#f3efe0',
      flowerY: '#f1cf55',
      flowerP: '#c99be0',
      flowerR: '#e98a6e',
    }[kind];
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const fx = cx + (r() - 0.5) * 30;
      const fy = base - 10 - r() * 12;
      c.beginPath();
      c.moveTo(fx, base - 2 - r() * 4);
      c.lineTo(fx, fy);
      c.strokeStyle = gradedHex('#5d7434');
      c.lineWidth = 1.2;
      c.stroke();
      c.fillStyle = gradedHex(color);
      for (let k = 0; k < 5; k++) {
        c.beginPath();
        c.arc(fx + Math.cos(k * 1.256) * 2.1, fy + Math.sin(k * 1.256) * 2.1, 1.7, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = gradedHex('#e8b94a');
      c.beginPath();
      c.arc(fx, fy, 1.3, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// Sparse pebbles on the tile (a few per 512 px), pale stones with a dark underside.
const PEBBLES = 7;
export function pebblePlan(
  size: number = GROUND.tileSize,
  seed = 4417,
): { x: number; y: number; s: number }[] {
  const r = rng(seed);
  return Array.from({ length: PEBBLES }, () => ({
    x: r() * size,
    y: r() * size,
    s: 0.8 + r() * 0.9,
  }));
}

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
  seed: number,
  hall: Pt,
  spots: readonly Pt[],
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
    for (const p of pebblePlan(size)) {
      c.fillStyle = 'rgba(40,34,24,0.5)';
      c.beginPath();
      c.ellipse(p.x + 0.4, p.y + 0.9, 2.2 * p.s, 1.2 * p.s, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = gradedHex('#a9a493');
      c.beginPath();
      c.ellipse(p.x, p.y, 2 * p.s, 1.3 * p.s, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,255,240,0.45)';
      c.beginPath();
      c.ellipse(p.x - 0.5, p.y - 0.4, 0.8 * p.s, 0.4 * p.s, 0, 0, Math.PI * 2);
      c.fill();
    }
    // The tile is shown in CELL-sized pieces, so each can take its own corner tints.
    const per = size / CELL;
    for (let i = 0; i < per; i++)
      for (let j = 0; j < per; j++) tex.add(`c${i}_${j}`, 0, i * CELL, j * CELL, CELL, CELL);
    tex.refresh();
  }
  // One image per CELL; the tint of each corner comes from the seeded tone map, so grass patches
  // drift from plain green to lusher, drier or yellowed over a few cells, with no extra drawing.
  const images: Phaser.GameObjects.Image[] = [];
  const grid = tintGrid(seed, width, height);
  const per = size / CELL;
  for (let j = 0; j < grid.rows; j++)
    for (let i = 0; i < grid.cols; i++) {
      const at = (a: number, b: number) => grid.nodes[(j + b) * (grid.cols + 1) + i + a];
      images.push(
        scene.add
          .image(i * CELL, j * CELL, TILE_KEY, `c${i % per}_${j % per}`)
          .setOrigin(0, 0)
          .setDepth(-1)
          .setTint(at(0, 0), at(1, 0), at(0, 1), at(1, 1)),
      );
    }
  // Worn bare earth, baked once per variant and placed by the seeded plan.
  for (const d of dirtPlan(seed, hall, spots)) {
    const img = bake(scene, `dirt:${d.variant}`, 64, 64, (g) => {
      const pts = dirtOutline(d.variant);
      for (const [k, col, a] of [
        [60, 0xa08558, 0.3],
        [47, 0x8e7549, 0.32],
        [32, 0x7d663f, 0.26],
      ] as const)
        g.fillStyle(col, a).fillPoints(
          pts.map((p) => ({ x: p.x * k, y: p.y * k })),
          true,
        );
    });
    const k = 1 / textureScale(img.texture.key);
    img
      .setPosition(d.x, d.y)
      .setRotation(d.rot)
      .setScale((d.rx / 64) * k, (d.ry / 64) * k)
      .setAlpha(d.alpha)
      .setDepth(-0.9);
  }
  // Small details: clumps, clover, flower clusters, bare spots, a few every few tiles.
  if (scene.textures.exists(DECAL_KEY)) scene.textures.remove(DECAL_KEY);
  const atlas = scene.textures.createCanvas(
    DECAL_KEY,
    DW * DECAL_VARIANTS,
    DH * DECAL_KINDS.length,
  );
  const ac = atlas?.getContext();
  if (atlas && ac) {
    DECAL_KINDS.forEach((kind, row) => {
      for (let v = 0; v < DECAL_VARIANTS; v++) {
        drawDecal(ac, kind, v, v * DW, row * DH);
        atlas.add(`${kind}${v}`, 0, v * DW, row * DH, DW, DH);
      }
    });
    atlas.refresh();
    const keep = [
      { x: hall.x, y: hall.y, rx: 240, ry: 120 },
      ...spots.map((p) => ({ x: p.x, y: p.y, rx: 80, ry: 55 })),
    ];
    for (const d of decalPlan(seed, width, height, keep))
      images.push(
        scene.add
          .image(d.x, d.y, DECAL_KEY, `${d.kind}${d.variant}`)
          .setOrigin(0.5, (DH - 8) / DH)
          .setScale(0.5 * d.s * (d.flip ? -1 : 1), 0.5 * d.s)
          .setDepth(-0.97),
      );
  }
  return images;
}

export function releaseGround(scene: Phaser.Scene): void {
  if (scene.textures.exists(TILE_KEY)) scene.textures.remove(TILE_KEY);
  if (scene.textures.exists(DECAL_KEY)) scene.textures.remove(DECAL_KEY);
}
