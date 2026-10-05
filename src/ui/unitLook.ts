import type { Strike } from './motionPose';

// Per-type look that is not in the picture: size, footprint, placeholder colour and the strike
// used when a picture's manifest row has none. Scene-side defaults until these become data rows
// in src/data (Lead owns that).
export interface UnitLook {
  // Picture height relative to a standard hero (art is scaled by the canvas, not the object).
  scale: number;
  // Footprint radius as a fraction of a standard hero height: the ground shadow, and how much
  // room the unit takes up so big units do not hide the ones next to them.
  footprint: number;
  color: number;
  strike: Strike;
}

const DEFAULT: UnitLook = { scale: 1, footprint: 0.4, color: 0x999999, strike: 'chop' };

const LOOKS: Record<string, Partial<UnitLook>> = {
  warrior: { color: 0x3a6ea5, strike: 'chop' },
  ranger: { color: 0x4f9d69, strike: 'shot' },
  wizard: { color: 0x8a5fc0, strike: 'bolt' },
  draugr: { color: 0x7a8c8f, strike: 'thrust' },
  troll: { color: 0x6b4a2f, scale: 1.45, footprint: 0.95, strike: 'smash' },
};

export function lookOf(type: string): UnitLook {
  return { ...DEFAULT, ...LOOKS[type] };
}

// A standard hero is this tall on the map, in world units.
export const UNIT_HEIGHT = 120;
// Art ships about 256 px tall at nominal size, so this is the scale of a picture.
export const ART_NOMINAL_PX = 256;

// Placeholder body (no art for the id): same motion, a simple capsule that faces right.
export const PLACEHOLDER = { w: 56, h: 84, weaponX: 0.9, weaponY: 0.45 };
