import { addFavour, miracleOf } from './favour';
import { godPantheon, pantheonOf } from './parties';
import { spawnHero } from './heroes';
import { raiseTier, upgradeCost, upgradeGate } from './town';
import { maxHp } from './units';
import type { World } from './world';
import type { BuildingCore, CommandResult } from './types';

// What Ambrosia buys in the run (docs/systems/nodes.md section 4): a temple's next tier, an
// Offering that fills the pantheon's favour bar, the Recall of a slain hero. All at a temple,
// all behind tuning.nodes.enabled. Ambrosia left at the end of the run is lost.

function temple(world: World, id: number): BuildingCore | undefined {
  const b = world.buildings.find((x) => x.id === id);
  return b && b.type.startsWith('temple') ? b : undefined;
}

const pay = (
  world: World,
  what: 'temple' | 'offering' | 'recall',
  b: BuildingCore,
  cost: number,
): void => {
  world.ambrosia -= cost;
  world.events.push({ kind: 'ambrosiaSpent', what, building: b.id, cost });
};

export function upgradeWithAmbrosia(world: World, id: number): CommandResult {
  const t = world.tuning.nodes;
  const b = temple(world, id);
  if (!t.enabled || !b) return { ok: false, reason: 'no such temple' };
  if (upgradeCost(world, b) === null) return { ok: false, reason: 'already at the top tier' };
  const gate = upgradeGate(world, b);
  if (gate !== null) return { ok: false, reason: `needs town hall tier ${gate}` };
  const cost = t.templeCost[b.tier - 1];
  if (cost === undefined) return { ok: false, reason: 'already at the top tier' };
  if (world.ambrosia < cost) return { ok: false, reason: 'not enough ambrosia' };
  pay(world, 'temple', b, cost);
  raiseTier(world, b);
  return { ok: true, id: b.id };
}

export function offering(world: World, id: number): CommandResult {
  const t = world.tuning.nodes;
  const b = temple(world, id);
  const pantheon = b && pantheonOf(world, b.type);
  if (!t.enabled || !b || !pantheon || !miracleOf(world, pantheon)) {
    return { ok: false, reason: 'no god to ask' };
  }
  if (world.ambrosia < t.offeringCost) return { ok: false, reason: 'not enough ambrosia' };
  pay(world, 'offering', b, t.offeringCost);
  addFavour(world, pantheon, world.tuning.favour.max);
  return { ok: true, id: b.id };
}

// A slain hero of the temple's pantheon comes back at the temple at its level and path, with no
// gear and a new purse; once each.
export function recallFallen(world: World, id: number, graveId: number): CommandResult {
  const t = world.tuning.nodes;
  const b = temple(world, id);
  const grave = world.graves.find((g) => g.id === graveId);
  if (!t.enabled || !b) return { ok: false, reason: 'no such temple' };
  if (!grave) return { ok: false, reason: 'no such grave' };
  if (grave.recalled) return { ok: false, reason: 'already recalled' };
  const pantheon = pantheonOf(world, b.type);
  if (pantheon === undefined || !grave.god || godPantheon(world, grave.god) !== pantheon) {
    return { ok: false, reason: 'not this temple' };
  }
  if (world.ambrosia < t.recallCost) return { ok: false, reason: 'not enough ambrosia' };
  pay(world, 'recall', b, t.recallCost);
  grave.recalled = true;
  const newId = spawnHero(world, grave.god, b.pos, b.id);
  const unit = world.units.find((u) => u.id === newId);
  if (!unit) return { ok: false, reason: 'no such grave' };
  const cls = world.data.classes?.find((c) => c.id === grave.type);
  if (cls) {
    unit.type = cls.id;
    unit.maxHp = maxHp(cls.attrs);
    unit.hp = unit.maxHp;
  }
  unit.tier = grave.tier;
  unit.path = grave.path;
  const party = world.parties.get(unit.party);
  if (party) party.level = Math.max(party.level, grave.level ?? 1);
  world.events.push({ kind: 'recalled', unit: unit.id, grave: grave.id, building: b.id });
  return { ok: true, id: unit.id };
}
