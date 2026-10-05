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

// Pictures to try for a unit, best first (decisions 2026-10-05). A hero past tier 1 on a favor
// path wears `hero_<path>_t<tier>_front` (path ids like `warrior-thor` are the art ids); the
// class picture of its tier and then the tier 1 picture are the fallbacks, so a missing tier or
// path picture never drops a unit back to a placeholder while an earlier look exists.
export function artCandidates(
  kind: 'hero' | 'monster',
  type: string,
  tier: number,
  path: string | null = null,
): string[] {
  const out: string[] = [];
  if (kind === 'hero' && path && tier > 1) out.push(unitArtId(kind, path, tier));
  out.push(unitArtId(kind, type, tier));
  if (tier > 1) out.push(unitArtId(kind, type, 1));
  return out;
}

// Skin variants of one unit share its look: `draugr-v2` is a draugr. Strips a trailing `-v<n>`.
export function baseType(name: string): string {
  return name.replace(/-v\d+$/, '');
}

// Placeholder body (no art for the id): same motion, a simple capsule that faces right.
export const PLACEHOLDER = { w: 56, h: 84, weaponX: 0.9, weaponY: 0.45 };
