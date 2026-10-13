import type { ManifestAsset } from './assets';

// The four slice sizes of a 9-slice manifest row, in the order Phaser's NineSlice takes them
// (left, right, top, bottom), or null when the row is missing or has no complete, sane slice set.
export function nineSliceArgs(
  row: Pick<ManifestAsset, 'sliceLeft' | 'sliceRight' | 'sliceTop' | 'sliceBottom'> | undefined,
): [number, number, number, number] | null {
  if (!row) return null;
  const { sliceLeft: l, sliceRight: r, sliceTop: t, sliceBottom: b } = row;
  if (l === undefined || r === undefined || t === undefined || b === undefined) return null;
  if (![l, r, t, b].every((n) => Number.isFinite(n) && n >= 0)) return null;
  return [l, r, t, b];
}
