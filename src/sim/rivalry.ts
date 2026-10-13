import { bond, type Party } from './parties';
import { dist } from './units';
import type { World } from './world';
import type { UnitState } from './types';

// Rivalries and revenge (Sim 170), simplified and logged in docs/decisions.md. Bonds already
// grow with shared kills and fall when a hero flees on its party; a bond at or below
// tuning.party.rivalBelow makes two heroes rivals. Rivals never join one party and, when they
// are close, argue. Arguing is a flavour event only: splitting a party up made lone heroes die
// far too often in the balance sim. A vengeful hero whose friend is knocked out swears to hunt
// the monster that did it.

const tune = (world: World) => world.tuning.party;
const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

export const isRival = (world: World, a: number, b: number): boolean =>
  bond(world, a, b) <= tune(world).rivalBelow;

// Any rival across two parties: they refuse to merge.
export function partiesHaveRivals(world: World, a: Party, b: Party): boolean {
  return a.members.some((x) => b.members.some((y) => isRival(world, x, y)));
}

// Pairs of living heroes who are rivals now, lower id first.
export function rivalPairs(world: World): [number, number][] {
  const heroes = world.units.filter((u) => u.kind === 'hero' && !u.ko).sort((a, b) => a.id - b.id);
  const out: [number, number][] = [];
  for (let i = 0; i < heroes.length; i++) {
    for (let j = i + 1; j < heroes.length; j++) {
      if (isRival(world, heroes[i].id, heroes[j].id)) out.push([heroes[i].id, heroes[j].id]);
    }
  }
  return out;
}

// Once a second: rivals in range argue (the pair at most once per argueEveryMs). Also drops oaths that ran out or whose monster is gone.
export function runRivalries(world: World): void {
  const t = tune(world);
  for (const [a, b] of rivalPairs(world)) {
    const ua = world.units.find((u) => u.id === a);
    const ub = world.units.find((u) => u.id === b);
    if (!ua || !ub || dist(ua.pos, ub.pos) > t.argueRange) continue;
    const key = pairKey(a, b);
    if (world.timeMs < (world.argueNextMs.get(key) ?? 0)) continue;
    world.argueNextMs.set(key, world.timeMs + t.argueEveryMs);
    world.events.push({ kind: 'argue', a, b });
  }
  for (const rt of world.heroRuntime.values()) {
    if (rt.revenge && (world.timeMs >= rt.revenge.untilMs || !isAlive(world, rt.revenge.target))) {
      rt.revenge = undefined;
    }
  }
}

const isAlive = (world: World, id: number) =>
  world.units.some((u) => u.id === id && u.kind === 'monster' && u.hp > 0);

// A hero is knocked out by a monster: its vengeful friends swear to hunt that monster.
export function vowRevenge(world: World, victim: UnitState, by: number): void {
  if (!isAlive(world, by)) return;
  for (const hero of world.units) {
    const rt = world.heroRuntime.get(hero.id);
    if (hero.kind !== 'hero' || !rt || hero.ko || hero.id === victim.id) continue;
    if (hero.trait !== 'vengeful' || rt.revenge) continue;
    if (bond(world, hero.id, victim.id) < tune(world).friendBond) continue;
    rt.revenge = { target: by, untilMs: world.timeMs + tune(world).revengeMs };
    world.events.push({ kind: 'revenge', hero: hero.id, target: by, victim: victim.id });
  }
}

// A monster died: whoever swore to hunt it is avenged.
export function avenge(world: World, monster: number): void {
  for (const [id, rt] of world.heroRuntime) {
    if (rt.revenge?.target !== monster || world.timeMs >= rt.revenge.untilMs) continue;
    rt.revenge = undefined;
    world.events.push({ kind: 'avenged', hero: id, target: monster });
  }
}

// The living monster a hero has sworn to hunt, if any.
export function revengeTarget(world: World, hero: UnitState): UnitState | undefined {
  const oath = world.heroRuntime.get(hero.id)?.revenge;
  // Expiry is checked here, every time, not only when the party scan runs.
  if (!oath || world.timeMs >= oath.untilMs) return undefined;
  const target = oath.target;
  return world.units.find((u) => u.id === target && u.kind === 'monster' && u.hp > 0);
}
