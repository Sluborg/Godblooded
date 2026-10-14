import { dist } from './units';
import type { HeroRuntime } from './heroes';
import type { World } from './world';
import type { BuildingCore, UnitState, Vec2 } from './types';

// The Hearth Hall (docs/systems/buildings.md section 1): heroes rest at it x hallRestMult, parties
// merge within hallMergeRange while one stands, from tier 2 bonds grow x hallBondMult, and at tier 3
// a party that rests there gets hallHpBuff more max hp until it next rests. A building def with
// `hall: true`, or the id `hearth_hall`, is one.

const isHearth = (world: World, b: BuildingCore): boolean =>
  b.type === 'hearth_hall' || !!world.data.buildings.find((d) => d.id === b.type)?.hall;

// The Hearth Hall (the nearest to `from`, else the highest tier), if one stands.
export function hearthOf(world: World, from?: Vec2): BuildingCore | undefined {
  let best: BuildingCore | undefined;
  for (const b of world.buildings) {
    if (!isHearth(world, b)) continue;
    if (!best || (from ? dist(from, b.pos) < dist(from, best.pos) : b.tier > best.tier)) {
      best = b;
    }
  }
  return best;
}

// A party below half its hp goes to the shrine, not the hall.
export function partyHurt(world: World, unit: UnitState): boolean {
  const ids = world.parties.get(unit.party)?.members ?? [unit.id];
  let hp = 0;
  let max = 0;
  for (const id of ids) {
    const m = world.units.find((u) => u.id === id);
    if (m) {
      hp += m.hp;
      max += m.maxHp;
    }
  }
  return max > 0 && hp < max / 2;
}

// A hero starts to rest: a Hearth Hall tier 3 gives it more max hp until it next rests; any older
// bonus ends first.
export function hearthBuff(
  world: World,
  unit: UnitState,
  rt: HeroRuntime,
  atHearth: boolean,
): void {
  const old = rt.hearthHp ?? 0;
  if (old > 0) {
    unit.maxHp -= old;
    unit.hp = Math.min(unit.hp, unit.maxHp);
    rt.hearthHp = 0;
  }
  const hearth = atHearth ? hearthOf(world, unit.pos) : undefined;
  if (!hearth || hearth.tier < 3) return;
  const bonus = Math.round(unit.maxHp * world.tuning.building.hallHpBuff);
  unit.maxHp += bonus;
  unit.hp += bonus;
  rt.hearthHp = bonus;
}
