import type { World } from './world';
import type { HeroItems, ItemDef, ItemEffects, ItemSlot, UnitState } from './types';

// Hero gear (Sim 280, docs/systems/items-and-shops.md section 1). Weapon and armour are levels
// 0 to 3; the item rows say what each level is worth. Level 0 is what a hero arrives with.

export const emptyItems = (): HeroItems => ({
  weapon: 0,
  armour: 0,
  headgear: 0,
  offhand: 0,
  potions: 0,
  charm: null,
});

export function itemsOf(unit: UnitState): HeroItems {
  return unit.items ?? emptyItems();
}

// The row for a weapon or armour level.
export function itemAt(world: World, slot: ItemSlot, level: number): ItemDef | undefined {
  return level > 0
    ? world.data.items?.find((i) => i.slot === slot && i.level === level)
    : undefined;
}

// Added to a hero's power by its weapon, and by a focus in its off-hand (0 with no level or row).
export function weaponPower(world: World, unit: UnitState): number {
  const have = itemsOf(unit);
  return (
    (itemAt(world, 'weapon', have.weapon)?.effects.power ?? 0) +
    (itemAt(world, 'offhand', have.offhand ?? 0)?.effects.power ?? 0)
  );
}

// Armour and Willpower from a hero's armour, headgear and off-hand (a shield) levels, by the kit of
// its template.
export function armourBonus(world: World, unit: UnitState): { armour: number; wp: number } {
  const have = itemsOf(unit);
  const kit = world.data.classes?.find((c) => c.id === unit.type)?.kit ?? 'heavy';
  const out = { armour: 0, wp: 0 };
  for (const row of [
    itemAt(world, 'armour', have.armour),
    itemAt(world, 'headgear', have.headgear ?? 0),
    itemAt(world, 'offhand', have.offhand ?? 0),
  ]) {
    const k = row?.effects.kits?.[kit];
    if (k) {
      out.armour += k.armour;
      out.wp += k.wp;
    }
  }
  return out;
}

// Crit and dodge chance from worn headgear and off-hand (a second blade's crit).
export function wornBuff(world: World, unit: UnitState, stat: 'crit' | 'dodge'): number {
  const have = itemsOf(unit);
  return (
    (itemAt(world, 'headgear', have.headgear ?? 0)?.effects[stat] ?? 0) +
    (itemAt(world, 'offhand', have.offhand ?? 0)?.effects[stat] ?? 0)
  );
}

const NO_CHARM: ItemEffects = {};

// The charm a hero carries, if its row exists.
export const charmDef = (world: World, unit: UnitState): ItemDef | undefined => {
  const id = unit.items?.charm;
  return id ? world.data.items?.find((i) => i.id === id && i.slot === 'charm') : undefined;
};

// What the hero's charm does (nothing without one).
export const charmEffects = (world: World, unit: UnitState): ItemEffects =>
  charmDef(world, unit)?.effects ?? NO_CHARM;
