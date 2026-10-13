// The palette grade of the part-based units as named parameters (Stefan's taste test,
// docs/decisions.md 2026-10-14: warm earthy, only slightly muted). Outlines, unit size and effect
// levels come from the prototype itself (scripts/port-proto.mjs); the prototype grades the whole
// scene, here the baked frames get the same slight grade.
export const PARTS_STYLE = {
  // Saturation (1 keeps it) and warmth (red up, blue down by this share).
  saturation: 0.93,
  warmth: 0.035,
} as const;

// Grades one colour (0..255 channels), clamped.
export function gradeRgb(
  r: number,
  g: number,
  b: number,
  saturation: number = PARTS_STYLE.saturation,
  warmth: number = PARTS_STYLE.warmth,
): [number, number, number] {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const clamp = (v: number): number => Math.min(255, Math.max(0, Math.round(v)));
  return [
    clamp((lum + (r - lum) * saturation) * (1 + warmth)),
    clamp(lum + (g - lum) * saturation),
    clamp((lum + (b - lum) * saturation) * (1 - warmth)),
  ];
}

// Grades RGBA pixels in place. Transparent pixels are left alone.
export function gradePixels(
  data: Uint8ClampedArray,
  saturation: number = PARTS_STYLE.saturation,
  warmth: number = PARTS_STYLE.warmth,
): void {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = gradeRgb(data[i], data[i + 1], data[i + 2], saturation, warmth);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}
