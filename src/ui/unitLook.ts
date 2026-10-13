// Constants of the unit picture on the map. How each template and monster type looks (size,
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

// Pictures to try for a unit, best first (docs/asset-spec.md, Gods and paths). A hero on a path
// from tier 2 wears `hero_<path>_t<tier>_front` (tier 3 falls back to tier 2) (path ids carry the god: `thor-hammerborn`); then
// its god's tier 1 picture; then the tier 1 picture of the hidden template (`type`, the shipped
// class art); then the placeholder. A missing picture never drops a unit past an earlier look.
export function artCandidates(
  kind: 'hero' | 'monster',
  type: string,
  tier: number,
  path: string | null = null,
  god: string | null = null,
): string[] {
  if (kind !== 'hero') {
    const out = [unitArtId(kind, type, tier)];
    if (tier > 1) out.push(unitArtId(kind, type, 1));
    return out;
  }
  const out: string[] = [];
  // A tier 3 path hero falls back to its tier 2 picture before the god's tier 1 one.
  if (path) for (let t = tier; t >= 2; t--) out.push(unitArtId(kind, path, t));
  if (god) out.push(unitArtId(kind, god, 1));
  out.push(unitArtId(kind, type, 1));
  return out;
}

// Pictures to try for a building, best first: its tier, then tier 1, then the placeholder square.
export function buildingArtCandidates(type: string, tier: number): string[] {
  const out = [`bld_${type}_t${tier}`];
  if (tier > 1) out.push(`bld_${type}_t1`);
  return out;
}

// Pictures to try for a lair (Art ships `bld_lair_<id>_t1`; higher tiers fall back to tier 1).
export function lairArtCandidates(type: string, tier: number): string[] {
  const out = [`bld_lair_${type}_t${tier}`];
  if (tier > 1) out.push(`bld_lair_${type}_t1`);
  return out;
}

// A building picture is scaled to fit a footprint this wide and this tall, in world units (a plot
// is about 220 apart), so a tall tower and a wide hall both sit on their plot.
export const BUILDING_FIT = { w: 190, h: 280 };

export function buildingScale(picW: number, picH: number): number {
  return Math.min(BUILDING_FIT.w / picW, BUILDING_FIT.h / picH);
}

// Skin variants of one unit share its look: `draugr-v2` is a draugr. Strips a trailing `-v<n>`.
export function baseType(name: string): string {
  return name.replace(/-v\d+$/, '');
}

// Placeholder body (no art for the id): same motion, a simple capsule that faces right.
export const PLACEHOLDER = { w: 56, h: 84, weaponX: 0.9, weaponY: 0.45 };
