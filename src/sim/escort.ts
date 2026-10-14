import { dist } from './units';
import { earn } from './runstats';
import type { World } from './world';
import type { BountyState, CommandResult, UnitState } from './types';
import { rescoreForFlag } from './heroes';

// Escort bounty (docs/systems/nodes.md section 3): a flag that follows a gatherer. Heroes score it
// like any flag; the first party to reach the gatherer takes it and walks with it until it is
// home, and is paid when the gatherer gets back with a jar. If the gatherer falls, or its trip
// ends unpaid, half the gold comes back.

const worker = (world: World, id: number | undefined): UnitState | undefined =>
  world.units.find((u) => u.id === id && u.kind === 'worker' && u.hp > 0);

const sameParty = (a: UnitState, b: UnitState): boolean =>
  a.id === b.id || (a.party !== 0 && a.party === b.party);

// Is this flag open to the hero? Ordinary flags always are; a taken escort only to its party.
export function escortOpenTo(world: World, unit: UnitState, flag: BountyState): boolean {
  if (flag.escort === undefined || flag.escortBy === undefined) return true;
  const taker = world.units.find((u) => u.id === flag.escortBy);
  return !!taker && sameParty(unit, taker);
}

// Has this hero's party taken the escort?
export function escortHeldBy(world: World, unit: UnitState, flag: BountyState): boolean {
  if (flag.escort === undefined || flag.escortBy === undefined) return false;
  const taker = world.units.find((u) => u.id === flag.escortBy);
  return !!taker && sameParty(unit, taker);
}

export function placeEscort(world: World, gathererId: number, gold: number): CommandResult {
  const t = world.tuning.nodes;
  const g = worker(world, gathererId);
  if (!t.enabled || !g) return { ok: false, reason: 'no such gatherer' };
  if (!t.escortGold.includes(gold)) return { ok: false, reason: 'bad amount' };
  if (world.bounties.some((b) => b.escort === gathererId)) {
    return { ok: false, reason: 'already escorted' };
  }
  if (world.gold < gold) return { ok: false, reason: 'not enough gold' };
  world.gold -= gold;
  const id = world.nextId++;
  world.bounties.push({
    id,
    pos: { ...g.pos },
    gold,
    placedMs: world.timeMs,
    escort: gathererId,
  });
  world.events.push({ kind: 'bountyPlaced', bounty: id, gold, escort: gathererId });
  rescoreForFlag(world);
  return { ok: true, id };
}

function cancel(world: World, flag: BountyState): void {
  world.bounties = world.bounties.filter((b) => b.id !== flag.id);
  const refund = Math.floor(flag.gold * world.tuning.bounty.cancelRefund);
  world.gold += refund;
  world.events.push({ kind: 'bountyCancelled', bounty: flag.id, gold: flag.gold, refund });
}

// A gatherer got home with its jar: its taken escort is paid to the hero who took it.
export function payEscort(world: World, gathererId: number): void {
  const flag = world.bounties.find((b) => b.escort === gathererId && b.escortBy !== undefined);
  if (!flag) return;
  const hero = world.units.find((u) => u.id === flag.escortBy && u.kind === 'hero');
  world.bounties = world.bounties.filter((b) => b.id !== flag.id);
  if (!hero) {
    world.gold += Math.floor(flag.gold * world.tuning.bounty.cancelRefund);
    return;
  }
  earn(world, hero, flag.gold);
  world.events.push({
    kind: 'bountyClaimed',
    bounty: flag.id,
    unit: hero.id,
    gold: flag.gold,
    escort: true,
  });
}

export function runEscorts(world: World): void {
  if (!world.tuning.nodes.enabled) return;
  for (const flag of [...world.bounties]) {
    if (flag.escort === undefined) continue;
    const g = worker(world, flag.escort);
    const w = g && world.unitRuntime.get(g.id)?.worker;
    // The gatherer fell, or its trip is over and nobody earned the flag: half comes back.
    if (!g || !w || (w.node === null && w.phase === 'idle')) {
      cancel(world, flag);
      continue;
    }
    flag.pos = { ...g.pos };
    if (flag.escortBy !== undefined) {
      const taker = world.units.find((u) => u.id === flag.escortBy);
      if (taker && !taker.ko && taker.hp > 0) continue;
      delete flag.escortBy;
    }
    const hero = world.units.find(
      (u) => u.kind === 'hero' && !u.ko && dist(u.pos, g.pos) <= world.tuning.bounty.claimRadius,
    );
    if (!hero) continue;
    flag.escortBy = hero.id;
    world.events.push({ kind: 'escortTaken', bounty: flag.id, unit: hero.id, gatherer: g.id });
  }
}
