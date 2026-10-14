// Organic outlines for ground patches (pure): a ragged blob instead of an ellipse, so a patch of
// dead ground or a flagstone yard has no circle silhouette. Deterministic: the same seed draws the
// same patch every time.

export interface Pt {
  x: number;
  y: number;
}

// A repeatable pseudo-random number in [0, 1) for an integer-ish input.
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// The points of a blob around (cx, cy) with radii rx, ry: the edge wobbles by `amp` (0.2 is a ragged
// patch) with three layers of waves; `seed` picks the shape. `steps` points, closed implicitly.
export function blobPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
  amp = 0.2,
  steps = 36,
): Pt[] {
  const p1 = hash(seed + 1) * 6.28;
  const p2 = hash(seed + 2) * 6.28;
  const p3 = hash(seed + 3) * 6.28;
  const p4 = hash(seed + 4) * 6.28;
  const out: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r =
      1 +
      amp *
        (0.5 * Math.sin(2 * a + p1) +
          0.32 * Math.sin(3 * a + p2) +
          0.22 * Math.sin(5 * a + p3) +
          0.14 * Math.sin(8 * a + p4)) +
      amp * 0.35 * (hash(seed * 13 + i) - 0.5);
    out.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r });
  }
  return out;
}

// True when (x, y) lies inside the polygon.
export function insidePoly(pts: readonly Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
