// Constants of the unit picture on the map. How each class and monster type looks (size,
// footprint, colour, fallback strike) is data: src/data/looks.ts.

// A standard hero is this tall on the map, in world units.
export const UNIT_HEIGHT = 120;
// Art ships about 256 px tall at nominal size, so this is the scale of a picture.
export const ART_NOMINAL_PX = 256;

// Manifest id of a unit's picture. Front view only (decisions 2026-10-05): the picture faces
// right and is mirrored by direction, so facing up or down never picks another picture.
export function unitArtId(kind: 'hero' | 'monster', type: string, tier: number): string {
  return `${kind === 'hero' ? 'hero' : 'mon'}_${type}_t${tier}_front`;
}

// Skin variants of one unit share its look: `draugr-v2` is a draugr. Strips a trailing `-v<n>`.
export function baseType(name: string): string {
  return name.replace(/-v\d+$/, '');
}

// Placeholder body (no art for the id): same motion, a simple capsule that faces right.
export const PLACEHOLDER = { w: 56, h: 84, weaponX: 0.9, weaponY: 0.45 };
