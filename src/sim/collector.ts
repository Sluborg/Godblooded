import { dist, speed, stepToward, TICK_MS } from './units';
import type { World } from './world';
import type { BuildingCore, UnitState } from './types';

// Town income, Majesty style (docs/decisions.md 2026-10-14): shop tax and the heroes' tithe
// pile up in the till of a building; a tax collector walks from the town hall to the buildings
// with gold, empties their tills and carries the gold home. Foes can kill it, and the gold it
// carries then drops on the ground for a hero to pick up. With tuning.collector.enabled off,
// everything goes straight to the town as before.

const TOWNHALL = 'townhall';

export const collectorOf = (world: World): UnitState | undefined =>
  world.units.find((u) => u.kind === 'collector' && u.hp > 0);

// Gold a building collected for the town (a shop's tax, a temple's tithe). Off: straight to the
// treasury. On: into the till of `buildingId` (the town hall's if it is gone or unknown).
export function payIntoTill(world: World, buildingId: number | undefined, gold: number): void {
  if (gold <= 0) return;
  if (!world.tuning.collector.enabled) {
    world.gold += gold;
    world.stats.taxCollected += gold;
    return;
  }
  const b =
    world.buildings.find((x) => x.id === buildingId) ??
    world.buildings.find((x) => x.type === TOWNHALL);
  if (!b) {
    world.gold += gold;
    world.stats.taxCollected += gold;
    return;
  }
  b.till = (b.till ?? 0) + gold;
  world.events.push({ kind: 'till', building: b.id, gold, total: b.till });
}

const hall = (world: World): BuildingCore | undefined =>
  world.buildings.find((b) => b.type === TOWNHALL);

// Buildings with at least minTill in the till, the town hall's own till excluded (that gold is
// already home: it is added to the treasury when the collector next passes, see below).
function fullTills(world: World): BuildingCore[] {
  const min = world.tuning.collector.minTill;
  return world.buildings.filter((b) => b.type !== TOWNHALL && (b.till ?? 0) >= min);
}

function spawnCollector(world: World): void {
  const h = hall(world);
  if (!h) return;
  const t = world.tuning.collector;
  const id = world.nextId++;
  world.units.push({
    id,
    kind: 'collector',
    type: 'collector',
    tier: 1,
    god: null,
    path: null,
    pos: { x: h.pos.x, y: h.pos.y + 40 },
    facing: { x: 0, y: 1 },
    hp: t.hp,
    maxHp: t.hp,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  });
  world.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  world.events.push({ kind: 'collectorOut', unit: id });
}

// Every tick: the collector appears when there is gold to collect, walks to the fullest-by-
// distance till, empties it, and brings the gold home when it is full or nothing is left.
export function runCollector(world: World): void {
  const t = world.tuning.collector;
  if (!t.enabled) return;
  const h = hall(world);
  if (!h) return;
  // The town hall's own till goes straight to the treasury.
  if ((h.till ?? 0) > 0) {
    world.gold += h.till ?? 0;
    world.stats.taxCollected += h.till ?? 0;
    h.till = 0;
  }
  let c = collectorOf(world);
  if (!c) {
    if (world.timeMs >= world.collectorNextMs && fullTills(world).length > 0) spawnCollector(world);
    c = collectorOf(world);
    if (!c) return;
  }
  const step = (to: { x: number; y: number }): boolean => {
    const dir = stepToward(
      c.pos,
      to,
      (speed({ str: 0, dex: t.dex, sta: 0, cha: 0, per: 0, int: 0, wp: 0 }) * TICK_MS) / 1000,
    );
    if (dir.x !== 0 || dir.y !== 0) c.facing = dir;
    return dist(c.pos, to) <= t.reach;
  };
  const tills = fullTills(world);
  const afraid = world.units.some(
    (u) => u.kind === 'monster' && u.hp > 0 && dist(u.pos, c.pos) <= t.fearRange,
  );
  const goHome = afraid || c.gold >= t.capacity || (tills.length === 0 && c.gold > 0);
  if (goHome) {
    if (step(h.pos) && c.gold > 0) {
      world.gold += c.gold;
      world.stats.taxCollected += c.gold;
      world.events.push({ kind: 'taxDelivered', unit: c.id, gold: c.gold });
      c.gold = 0;
    }
    return;
  }
  if (tills.length === 0) {
    // Nothing to do: wait by the town hall.
    step({ x: h.pos.x, y: h.pos.y + 40 });
    return;
  }
  const next = tills.reduce((a, b) => (dist(c.pos, b.pos) < dist(c.pos, a.pos) ? b : a));
  if (step(next.pos)) {
    const gold = next.till ?? 0;
    next.till = 0;
    c.gold += gold;
    world.events.push({
      kind: 'tillEmptied',
      unit: c.id,
      building: next.id,
      gold,
      carried: c.gold,
    });
  }
}

// The collector fell: what it carried drops where it died and the town sends another later.
export function collectorFell(world: World, unit: UnitState): void {
  const t = world.tuning.collector;
  world.collectorNextMs = world.timeMs + t.respawnMs;
  const gold = unit.gold;
  unit.gold = 0;
  if (gold > 0) {
    const id = world.nextId++;
    world.drops.push({ id, pos: { ...unit.pos }, gold });
  }
  world.events.push({ kind: 'collectorDown', unit: unit.id, gold, pos: { ...unit.pos } });
}

// A hero standing on dropped gold with no monster close picks it up.
export function claimDrops(world: World, claim: (heroId: number, gold: number) => void): void {
  const t = world.tuning.bounty;
  for (const d of [...world.drops]) {
    const hero = world.units.find(
      (u) => u.kind === 'hero' && !u.ko && dist(u.pos, d.pos) <= t.claimRadius,
    );
    if (!hero) continue;
    if (
      world.units.some(
        (u) => u.kind === 'monster' && u.hp > 0 && dist(u.pos, d.pos) <= t.claimClearRadius,
      )
    ) {
      continue;
    }
    world.drops = world.drops.filter((x) => x.id !== d.id);
    claim(hero.id, d.gold);
    world.events.push({ kind: 'dropClaimed', drop: d.id, unit: hero.id, gold: d.gold });
  }
}
