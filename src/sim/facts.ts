import { godPantheon, pantheonOf } from './parties';
import type { World } from './world';
import type { Party } from './parties';

// Run facts for the meta unlock conditions (meta.ts): plain bookkeeping, nothing reads it in a run.

const add = (list: string[], v: string | undefined) => {
  if (v && !list.includes(v)) list.push(v);
};

export function noteHeroArrived(world: World, pantheon: string | undefined): void {
  add(world.facts.heroPantheons, pantheon);
}

export function noteTemple(world: World, type: string): void {
  if (type.startsWith('temple')) add(world.facts.templePantheons, pantheonOf(world, type));
}

// A party reached a level: it counts for the pantheon of every hero in it.
export function noteLevel(world: World, party: Party): void {
  for (const id of party.members) {
    const god = world.units.find((u) => u.id === id)?.god;
    const pantheon = god ? godPantheon(world, god) : undefined;
    if (!pantheon) continue;
    const peak = world.facts.peakLevel;
    peak[pantheon] = Math.max(peak[pantheon] ?? 0, party.level);
  }
}
