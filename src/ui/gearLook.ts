import type { HeroItems, ItemSlot } from '../sim/api';
import { TYPE_COLORS } from './damageLook';

// How carried gear shows on the map (docs/systems/items-and-shops.md section 5): weapon level 2 a
// steel shimmer at the weapon point, level 3 a glow in the hero's damage type colour; armour
// level as an outline colour (none, iron grey, bronze, gold); one flask pip per potion over the
// health bar. Pure, so it is unit-tested; the drawing is in unitViews.ts.

export const ARMOUR_OUTLINE = [null, 0x9aa0a8, 0xb08a4a, 0xf2c14e] as const;
export const STEEL = 0xdfe8f0;
export const MAX_PIPS = 5;

export function armourOutline(level: number): number | null {
  return ARMOUR_OUTLINE[Math.min(3, Math.max(0, Math.round(level)))];
}

export type WeaponGlow =
  { kind: 'none' } | { kind: 'shimmer'; color: number } | { kind: 'glow'; color: number };

// Level 0 and 1: nothing. 2: a steel shimmer. 3: a glow in the damage type's colour.
export function weaponGlow(level: number, damageType = 'physical'): WeaponGlow {
  if (level >= 3) {
    const hex = TYPE_COLORS[damageType] ?? TYPE_COLORS.physical;
    return { kind: 'glow', color: parseInt(hex.slice(1), 16) };
  }
  if (level === 2) return { kind: 'shimmer', color: STEEL };
  return { kind: 'none' };
}

// Flask pips shown: one per potion carried, at most MAX_PIPS (the rest are not drawn).
export function potionPips(items: HeroItems | undefined): number {
  return Math.min(MAX_PIPS, Math.max(0, items?.potions ?? 0));
}

// Whether anything about the gear shows (so an empty hero costs nothing to draw).
export function hasGear(items: HeroItems | undefined): boolean {
  return !!items && (items.weapon >= 2 || items.armour >= 1 || items.potions > 0);
}

// The gear glyph a purchase raises over a hero: sword, shield, flask or charm star.
export type Glyph = 'sword' | 'shield' | 'flask' | 'charm';
export function glyphOf(slot: ItemSlot | undefined): Glyph {
  switch (slot) {
    case 'weapon':
      return 'sword';
    case 'armour':
      return 'shield';
    case 'charm':
      return 'charm';
    default:
      return 'flask';
  }
}
