import { leaderOf } from './cards';
import { itemsOf } from './items';
import type { World } from './world';
import type { ItemDef, UnitState } from './types';

// The lair relic (Sim 310, docs/systems/items-and-shops.md section 3, rule 7): when a party
// destroys a lair, its leader gets a free charm, the dearest one it lacks. Never a downgrade: a
// leader already holding the dearest charm gets nothing.
export function grantLairRelic(world: World, by: UnitState, lairId: number): void {
  const party = world.parties.get(by.party);
  const leader = party ? leaderOf(world, party) : by;
  if (!leader || leader.kind !== 'hero' || leader.ko || leader.hp <= 0) return;
  const charms = (world.data.items ?? []).filter((i) => i.slot === 'charm');
  const held = itemsOf(leader).charm;
  const heldPrice = charms.find((i) => i.id === held)?.price ?? -1;
  let best: ItemDef | undefined;
  for (const c of charms) {
    if (c.price > heldPrice && (!best || c.price > best.price)) best = c;
  }
  if (!best) return;
  const items = (leader.items ??= { weapon: 0, armour: 0, potions: 0, charm: null });
  items.charm = best.id;
  world.events.push({ kind: 'relic', unit: leader.id, item: best.id, lair: lairId });
}
