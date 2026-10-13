// The palette grade of the part-based units as named parameters (Stefan's taste test,
// docs/decisions.md 2026-10-14: warm earthy, only slightly muted). Outlines, unit size and effect
// levels come from the prototype itself (scripts/port-proto.mjs); the prototype grades the whole
// scene, here the baked frames get the same slight grade.
export const PARTS_STYLE = {
  // Saturation (1 keeps it) and warmth (red up, blue down by this share).
  saturation: 0.93,
  warmth: 0.035,
} as const;

// Grades RGBA pixels in place. Transparent pixels are left alone.
export function gradePixels(
  data: Uint8ClampedArray,
  saturation: number = PARTS_STYLE.saturation,
  warmth: number = PARTS_STYLE.warmth,
): void {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = (lum + (r - lum) * saturation) * (1 + warmth);
    data[i + 1] = lum + (g - lum) * saturation;
    data[i + 2] = (lum + (b - lum) * saturation) * (1 - warmth);
  }
}
