// The look of the part-based units as named parameters (Stefan's taste test, docs/decisions.md
// 2026-10-14): thin outlines in a darker shade of the fill, and a slightly muted, warm grade.
export const PARTS_STYLE = {
  // Outline width as a share of the prototype's, and how far the outline colour goes from the
  // fill toward ink (0: the fill, 1: ink).
  outlineScale: 0.55,
  outlineDarken: 0.6,
  // Palette grade applied to every baked frame: saturation (1 keeps it), warmth (red up, blue
  // down by this share). Slight: most of the saturation stays.
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
