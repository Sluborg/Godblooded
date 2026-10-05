// How one monster differs from its siblings (decisions 2026-10-05): tier by colour and size,
// variants by picture, and a tiny size jitter, all stable per unit id so a monster never changes
// look mid-life. Pure, so it is unit-tested.

// Stable pseudo-random in [0, 1) from a unit id (integer hash, no Math.random).
export function unitRoll(id: number, salt = 0): number {
  let h = (Math.imul(id | 0, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export interface TierStyle {
  // Size on top of the type's own scale.
  scale: number;
  // Hue rotation in degrees (Phaser ColorMatrix `hue` takes degrees); 0 keeps the base colours.
  hue: number;
}

// Tier 1 is the base picture; tiers 2 and 3 shift hue and grow 10% and 20%.
const TIER_STYLES: readonly TierStyle[] = [
  { scale: 1, hue: 0 },
  { scale: 1.1, hue: 60 },
  { scale: 1.2, hue: 150 },
];

export function tierStyle(tier: number): TierStyle {
  const i = Math.min(Math.max(Math.round(tier), 1), TIER_STYLES.length) - 1;
  return TIER_STYLES[i];
}

export const JITTER = 0.05;

// Per-unit size factor, 0.95 to 1.05.
export function sizeJitter(id: number): number {
  return 1 + (unitRoll(id, 1) * 2 - 1) * JITTER;
}

// Chooses among `<type>`, `<type>-v2`, `<type>-v3` the ones `has` accepts, stable per id. A type
// that already names a variant (sent by the sim) is kept as is.
export function pickVariant(type: string, id: number, has: (type: string) => boolean): string {
  if (/-v\d+$/.test(type)) return type;
  const found = [type, `${type}-v2`, `${type}-v3`].filter(has);
  if (found.length === 0) return type;
  return found[Math.floor(unitRoll(id, 2) * found.length)];
}

// Hue rotation of an 0xRRGGBB colour, for the placeholder shape that has no ColorMatrix.
export function rotateHue(color: number, deg: number): number {
  if (deg === 0) return color;
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  // the standard hue-rotation matrix
  const m = [
    0.213 + c * 0.787 - s * 0.213,
    0.715 - c * 0.715 - s * 0.715,
    0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143,
    0.715 + c * 0.285 + s * 0.14,
    0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787,
    0.715 - c * 0.715 + s * 0.715,
    0.072 + c * 0.928 + s * 0.072,
  ];
  const q = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const nr = q(m[0] * r + m[1] * g + m[2] * b);
  const ng = q(m[3] * r + m[4] * g + m[5] * b);
  const nb = q(m[6] * r + m[7] * g + m[8] * b);
  return (nr << 16) | (ng << 8) | nb;
}
