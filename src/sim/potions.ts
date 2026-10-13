import { fleeThreshold } from './parties';
import { TICK_MS } from './units';
import type { UnitRuntime, World } from './world';
import type { UnitState } from './types';

// Potions (Sim 300, docs/systems/items-and-shops.md section 2). A hero in a fight drinks one when
// its hp falls below its flee threshold plus a margin, stands still for drinkMs, and fights on.
// Without a potion it flees as before (runHeroes).

// The share of max hp below which a hero drinks.
export function drinkThreshold(world: World, unit: UnitState): number {
  const t = world.tuning.hero;
  const flee = fleeThreshold(world, unit);
  if (flee <= 0) return t.neverFleeDrink;
  return flee + (unit.trait === 'coward' ? t.cowardDrinkAdd : t.potionDrinkAdd);
}

export function cancelDrink(rt: UnitRuntime): void {
  rt.drink = undefined;
}

// Advances a drink for this tick. True when the hero is drinking and should not strike or move.
// `foe` is the hero's picked target: heroes only drink in a fight.
export function runDrink(
  world: World,
  unit: UnitState,
  rt: UnitRuntime,
  foe: UnitState | null,
): boolean {
  if (rt.drink) {
    rt.drink.ms -= TICK_MS;
    if (rt.drink.ms <= 0) {
      rt.drink = undefined;
      drink(world, unit);
    }
    return true;
  }
  const items = unit.items;
  if (!foe || !items || items.potions <= 0) return false;
  if (unit.hp >= unit.maxHp * drinkThreshold(world, unit)) return false;
  rt.drink = { ms: world.tuning.hero.drinkMs };
  rt.swing = undefined;
  return true;
}

// The strongest potion the hero carries (the heal share and the flask to use up).
function strongestFlask(world: World, flasks: string[]): { index: number; pct: number } {
  let best = { index: -1, pct: 0.4 };
  flasks.forEach((id, index) => {
    const pct = (world.data.items?.find((i) => i.id === id)?.effects.healPct ?? 40) / 100;
    if (best.index === -1 || pct > best.pct) best = { index, pct };
  });
  return best;
}

function drink(world: World, unit: UnitState): void {
  const items = unit.items;
  if (!items || items.potions <= 0 || unit.ko || unit.hp <= 0) return;
  const pick = strongestFlask(world, items.flasks ?? []);
  const amount = Math.min(Math.round(unit.maxHp * pick.pct), unit.maxHp - unit.hp);
  items.potions--;
  if (pick.index >= 0) items.flasks?.splice(pick.index, 1);
  unit.hp += amount;
  world.events.push({ kind: 'drank', unit: unit.id, amount, left: items.potions });
}
