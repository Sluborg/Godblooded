// Variation on the one grass tile (Stefan 2026-10-18, "texture variations on the ground"): soft
// large patches of lusher, drier and yellowed grass, and a few worn dirt patches by the town hall
// and along the paths to the plots. Pure and seeded from the run seed, so the same map always looks
// the same. It costs no extra fill: the patches are per-corner tints on the ground's own images
// (the tint multiplies the tile, the GPU interpolates it across each image), the dirt patches are
// a few small baked images.
import { blobPoints, hash, type Pt } from './organic';

// Spacing of the tint nodes in world units: one ground image per cell, so a tone changes smoothly
// over at least this far, and a patch of one tone is two to four cells across.
export const CELL = 256;
// Wavelength of the biggest tone patches, in world units.
const WAVE = 900;

// A smooth value noise in [0, 1]: random heights on a lattice, smoothstep between them.
function valueNoise(seed: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const h = (i: number, j: number) => hash(seed + i * 57.31 + j * 131.77);
  const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx;
  const b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * sx;
  return a + (b - a) * sy;
}

// Two layers of noise (one big, one half the size) in [0, 1].
function fbm(seed: number, x: number, y: number): number {
  return (
    (valueNoise(seed, x / WAVE, y / WAVE) * 2 +
      valueNoise(seed + 9, x / (WAVE / 2.1), y / (WAVE / 2.1))) /
    3
  );
}

export interface Tone {
  // How dry or yellowed (0 = none, 1 = most) and how lush (0 = none, 1 = most) the grass is here.
  dry: number;
  lush: number;
}

// The grass tone at a world point. Only the ends of each noise count, so most of the map stays the
// plain green and the patches have an edge to them, softly.
export function toneAt(seed: number, x: number, y: number): Tone {
  const edge = (v: number, lo: number, hi: number) =>
    Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  return {
    dry: edge(fbm(seed * 3 + 1, x, y), 0.52, 0.78),
    lush: edge(fbm(seed * 5 + 2, x + 4000, y - 3000), 0.55, 0.8),
  };
}

// The tint (0xRRGGBB, multiplied over the tile) for a tone. The shifts are small: yellowed grass
// loses blue, dry grass loses a little green, lush grass loses red.
export function tintFor(t: Tone): number {
  const r = 255 - Math.round(t.lush * 34 + t.dry * 4);
  const g = 255 - Math.round(t.dry * 14);
  const b = 255 - Math.round(t.dry * 62 + t.lush * 30);
  return (r << 16) | (g << 8) | b;
}

export interface TintGrid {
  cols: number;
  rows: number;
  // The tint at each node of the (cols + 1) x (rows + 1) corner grid, row by row.
  nodes: number[];
}

// The corner tints for a map of width x height, one node per CELL.
export function tintGrid(seed: number, width: number, height: number): TintGrid {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const nodes: number[] = [];
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i <= cols; i++) nodes.push(tintFor(toneAt(seed, i * CELL, j * CELL)));
  return { cols, rows, nodes };
}

export interface DirtPatch {
  x: number;
  y: number;
  // Radii and tilt of the patch, and which baked variant it shows.
  rx: number;
  ry: number;
  rot: number;
  variant: number;
  alpha: number;
}

export const DIRT_VARIANTS = 3;

// Worn bare earth: ragged patches round the town hall and a few along the way to each plot, where
// feet and carts would have trodden it. `spots` are the plot positions.
export function dirtPlan(seed: number, hall: Pt, spots: readonly Pt[]): DirtPatch[] {
  const out: DirtPatch[] = [];
  const r = (n: number) => hash(seed * 7 + n);
  let k = 0;
  // Round the hall: a ring of patches that the plaza and the grass overlap.
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r(k++) * 0.8;
    const d = 170 + r(k++) * 110;
    out.push({
      x: hall.x + Math.cos(a) * d * 1.25,
      y: hall.y + Math.sin(a) * d * 0.85,
      rx: 38 + r(k++) * 40,
      ry: 18 + r(k++) * 20,
      rot: (r(k++) - 0.5) * 0.7,
      variant: Math.floor(r(k++) * DIRT_VARIANTS),
      alpha: 0.5 + r(k++) * 0.25,
    });
  }
  // Paths: small patches spaced along the line hall to plot, thinner towards the plot.
  for (const s of spots) {
    const n = 2 + Math.floor(r(k++) * 2);
    for (let i = 0; i < n; i++) {
      const u = 0.3 + ((i + r(k++) * 0.6) / n) * 0.5;
      out.push({
        x: hall.x + (s.x - hall.x) * u + (r(k++) - 0.5) * 24,
        y: hall.y + (s.y - hall.y) * u + (r(k++) - 0.5) * 18,
        rx: 24 + r(k++) * 26,
        ry: 11 + r(k++) * 11,
        rot: Math.atan2(s.y - hall.y, s.x - hall.x) * 0.5 + (r(k++) - 0.5) * 0.4,
        variant: Math.floor(r(k++) * DIRT_VARIANTS),
        alpha: 0.38 + r(k++) * 0.22,
      });
    }
  }
  return out;
}

// The outline of a dirt patch variant, around (0, 0) in a unit-radius frame (scaled by rx, ry).
export function dirtOutline(variant: number): Pt[] {
  return blobPoints(0, 0, 1, 1, 300 + variant * 17, 0.28, 26);
}
