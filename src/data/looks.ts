// How each class and monster type looks on the map, beyond its picture (decisions 2026-10-05).
// The picture's own manifest row (strike, weapon points) wins; `strike` here is the fallback when
// a picture has none or there is no art yet.

export type Strike = 'chop' | 'double' | 'sweep' | 'upward' | 'thrust' | 'smash' | 'bolt' | 'shot';

export interface UnitLook {
  // Picture height relative to a standard hero.
  scale: number;
  // Footprint radius as a fraction of a standard hero height: shadow size and personal space.
  footprint: number;
  // Placeholder colour while there is no art.
  color: number;
  strike: Strike;
}

export const DEFAULT_LOOK: UnitLook = { scale: 1, footprint: 0.4, color: 0x999999, strike: 'chop' };

export const LOOKS: Record<string, Partial<UnitLook>> = {
  // heroes
  warrior: { color: 0x3a6ea5, strike: 'chop' },
  ranger: { color: 0x4f9d69, strike: 'shot' },
  wizard: { color: 0x8a5fc0, strike: 'bolt' },
  paladin: { color: 0xb03a2e, strike: 'smash' },
  rogue: { color: 0xd2782a, scale: 0.92, strike: 'double' },
  // monsters
  draugr: { color: 0x7a8c8f, strike: 'chop' },
  troll: { color: 0x6b4a2f, scale: 1.45, footprint: 0.95, strike: 'smash' },
  harpy: { color: 0x9c7b4f, strike: 'upward' },
  minotaur: { color: 0x7b4b2a, scale: 1.3, footprint: 0.7, strike: 'chop' },
  'jackal-man': { color: 0x3b3b3b, strike: 'sweep' },
  wyrm: { color: 0x2f6f6a, scale: 1.6, footprint: 1.1, strike: 'thrust' },
};

export function lookOf(type: string): UnitLook {
  return { ...DEFAULT_LOOK, ...LOOKS[type] };
}
