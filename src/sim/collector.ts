import { speed, dist, stepToward, TICK_MS } from './units';
import type { World } from './world';
import type { BuildingCore, PileState, UnitState } from './types';

// Town income, Majesty style (docs/systems/tax-collector.md): shop tax and the heroes' tithe pile
// up in the till of a building; a tax collector walks from the town hall to the buildings with
// gold, empties their tills and carries the gold home. Foes can kill it: what it carried drops
// as a pile that a collector picks up. With tuning.collector.enabled off, everything goes
// straight to the town as before.

const TOWNHALL = 'townhall';

export const collectors = (world: World): UnitState[] =>
  world.units.filter((u) => u.kind === 'collector' && u.hp > 0);
export const collectorOf = (world: World): UnitState | undefined => collectors(world)[0];

const hall = (world: World): BuildingCore | undefined =>
  world.buildings.find((b) => b.type === TOWNHALL);

// Gold a shop collected as tax. Off: straight to the treasury. On: into the till of that
// building (the town hall's if it is gone), which the collector empties.
export function payIntoTill(world: World, buildingId: number | undefined, gold: number): void {
  if (gold <= 0) return;
  const b = world.tuning.collector.enabled
    ? (world.buildings.find((x) => x.id === buildingId) ?? hall(world))
    : undefined;
  if (!b) {
    world.gold += gold;
    world.stats.taxCollected += gold;
    return;
  }
  if (b.type === TOWNHALL) {
    // The hall's own till is banked at once.
    world.gold += gold;
    world.stats.taxCollected += gold;
    return;
  }
  b.till = (b.till ?? 0) + gold;
  world.events.push({ kind: 'till', building: b.id, gold, total: b.till });
}

// The temple a hero pays its tithe at: the nearest built temple of its god's pantheon.
function homeTemple(world: World, hero: UnitState): BuildingCore | undefined {
  const pantheon = world.data.gods?.find((g) => g.id === hero.god)?.pantheon;
  let best: BuildingCore | undefined;
  for (const b of world.buildings) {
    const def = world.data.buildings.find((d) => d.id === b.type);
    if (!def || b.type === TOWNHALL) continue;
    const p = def.pantheon ?? (b.type.startsWith('temple_') ? b.type.slice(7) : undefined);
    if (p === undefined || p !== pantheon) continue;
    if (!best || dist(hero.pos, b.pos) < dist(hero.pos, best.pos)) best = b;
  }
  return best;
}

// A hero starts to rest: what it owes the town goes into the till of its home temple (the town
// hall, banked at once, when none stands).
export function payTithe(world: World, hero: UnitState, owed: number): void {
  if (owed <= 0) return;
  const temple = homeTemple(world, hero);
  const target = temple ?? hall(world);
  if (temple && world.tuning.collector.enabled) {
    temple.till = (temple.till ?? 0) + owed;
    world.events.push({ kind: 'till', building: temple.id, gold: owed, total: temple.till });
  } else {
    world.gold += owed;
    world.stats.taxCollected += owed;
  }
  world.events.push({ kind: 'tithe', unit: hero.id, building: target?.id ?? 0, gold: owed });
}

// Anything with gold the collector may take: a till of at least minTill, or a pile.
interface Stop {
  kind: 'till' | 'pile';
  id: number;
  pos: { x: number; y: number };
  gold: number;
}

function stopsFor(world: World): Stop[] {
  const min = world.tuning.collector.minTill;
  const out: Stop[] = [];
  for (const b of world.buildings) {
    if (b.type !== TOWNHALL && (b.till ?? 0) >= min) {
      out.push({ kind: 'till', id: b.id, pos: b.pos, gold: b.till ?? 0 });
    }
  }
  for (const p of world.piles) out.push({ kind: 'pile', id: p.id, pos: p.pos, gold: p.gold });
  return out;
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
  world.unitRuntime.set(id, {
    lair: null,
    cooldownMs: 0,
    target: null,
    idleMs: 0,
    collector: { hpSeen: t.hp, fleeing: false },
  });
  world.events.push({ kind: 'collectorOut', unit: id });
}

// How many collectors the town has: one per hall tier, and a second once enough buildings stand
// besides the hall (until the hall has tiers).
// TODO: when hall tiers ship, drop the secondAtBuildings extra: it would stack with the tier count.
function wanted(world: World): number {
  const t = world.tuning.collector;
  const h = hall(world);
  const others = world.buildings.filter((b) => b.type !== TOWNHALL).length;
  return (h?.tier ?? 1) * t.perHallTier + (others >= t.secondAtBuildings ? 1 : 0);
}

// Walking speed: speedMult of a level-1 hero's walk (the first class's).
function walkOf(world: World): number {
  const cls = world.data.classes?.[0];
  return (cls ? speed(cls.attrs) : 80) * world.tuning.collector.speedMult;
}

export function runCollector(world: World): void {
  const t = world.tuning.collector;
  if (!t.enabled) return;
  const h = hall(world);
  if (!h) return;
  // New collectors: replacements whose time has come, and more when the town has grown.
  const due = world.collectorQueue.filter((at) => world.timeMs >= at).length;
  if (due > 0) world.collectorQueue = world.collectorQueue.filter((at) => world.timeMs < at);
  for (let i = 0; i < due; i++) spawnCollector(world);
  while (collectors(world).length + world.collectorQueue.length < wanted(world)) {
    const before = world.units.length;
    spawnCollector(world);
    if (world.units.length === before) break;
  }
  const mine = collectors(world);
  for (const c of mine) runOne(world, c, h, mine);
}

function runOne(world: World, c: UnitState, h: BuildingCore, all: UnitState[]): void {
  const t = world.tuning.collector;
  const crt = world.unitRuntime.get(c.id)?.collector;
  if (!crt) return;
  const walk = (to: { x: number; y: number }): boolean => {
    const dir = stepToward(c.pos, to, (walkOf(world) * TICK_MS) / 1000);
    if (dir.x !== 0 || dir.y !== 0) c.facing = dir;
    return dist(c.pos, to) <= t.reach;
  };
  const bank = (): void => {
    if (c.gold <= 0) return;
    world.gold += c.gold;
    world.stats.taxCollected += c.gold;
    world.events.push({ kind: 'collected', unit: c.id, gold: c.gold });
    c.gold = 0;
  };
  // Hit: drops the route and walks home.
  if (c.hp < crt.hpSeen) {
    crt.fleeing = true;
    crt.stop = undefined;
    crt.waitUntilMs = undefined;
    world.events.push({ kind: 'collectorHit', unit: c.id });
  }
  crt.hpSeen = c.hp;
  const afraid = world.units.some(
    (u) => u.kind === 'monster' && u.hp > 0 && dist(u.pos, c.pos) <= t.fearRange,
  );
  if (crt.fleeing || afraid) {
    crt.stop = undefined;
    crt.waitUntilMs = undefined;
    if (walk(h.pos)) {
      bank();
      if (!afraid) crt.fleeing = false;
    }
    return;
  }
  // Collecting at a stop: takes the whole till (or pile) after collectMs.
  if (crt.waitUntilMs !== undefined) {
    if (world.timeMs < crt.waitUntilMs) return;
    crt.waitUntilMs = undefined;
    const stop = crt.stop;
    crt.stop = undefined;
    if (!stop) return;
    let gold: number;
    if (stop.kind === 'till') {
      const b = world.buildings.find((x) => x.id === stop.id);
      gold = b?.till ?? 0;
      if (b) b.till = 0;
    } else {
      const p = world.piles.find((x) => x.id === stop.id);
      gold = p?.gold ?? 0;
      // Gold a fallen collector dropped and a collector brought home is not lost after all.
      if (p?.fell) world.stats.taxLost = Math.max(0, world.stats.taxLost - gold);
      world.piles = world.piles.filter((x) => x.id !== stop.id);
    }
    if (gold > 0) {
      c.gold += gold;
      world.events.push({
        kind: 'tillEmptied',
        unit: c.id,
        source: stop.kind,
        id: stop.id,
        gold,
        carried: c.gold,
      });
    }
    return;
  }
  // The next stop: with an empty sack the best of till minus distance from here; with gold
  // aboard, one close by; never one another collector is on its way to.
  const taken = new Set(
    all
      .filter((o) => o.id !== c.id)
      .map((o) => world.unitRuntime.get(o.id)?.collector?.stop)
      .filter((s): s is Stop => !!s)
      .map((s) => `${s.kind}:${s.id}`),
  );
  const options = stopsFor(world).filter((s) => !taken.has(`${s.kind}:${s.id}`));
  const full = c.gold >= t.carryCap;
  const pool = full
    ? []
    : c.gold > 0
      ? options.filter((s) => dist(c.pos, s.pos) <= t.chainRange)
      : options;
  const score = (s: Stop) => s.gold - dist(c.pos, s.pos) * t.distanceCost;
  if (crt.stop && !pool.some((s) => s.kind === crt.stop?.kind && s.id === crt.stop.id)) {
    // Its target is gone (taken, or a pile picked up): choose again below.
    crt.stop = undefined;
  }
  if (!crt.stop && pool.length > 0) {
    crt.stop = pool.reduce((a, b) => (score(b) > score(a) ? b : a));
  }
  if (crt.stop) {
    if (walk(crt.stop.pos)) crt.waitUntilMs = world.timeMs + t.collectMs;
    return;
  }
  // Nothing to fetch: home with what it carries, then wait by the hall.
  if (walk(c.gold > 0 ? h.pos : { x: h.pos.x, y: h.pos.y + 40 }) && c.gold > 0) bank();
}

// The collector fell: what it carried drops where it died (a collector picks it up) and the
// town sends another later.
export function collectorFell(world: World, unit: UnitState): void {
  const t = world.tuning.collector;
  world.collectorQueue.push(world.timeMs + t.respawnMs);
  const gold = unit.gold;
  unit.gold = 0;
  if (gold > 0) {
    world.piles.push({ id: world.nextId++, pos: { ...unit.pos }, gold, fell: true });
    world.stats.taxLost += gold;
  }
  world.events.push({ kind: 'collectorFell', unit: unit.id, pos: { ...unit.pos }, gold });
}

// A building went down with gold in its till: the gold lies where it stood.
export function dropTill(world: World, b: BuildingCore): void {
  const gold = b.till ?? 0;
  if (gold <= 0) return;
  b.till = 0;
  world.piles.push({ id: world.nextId++, pos: { ...b.pos }, gold });
}

// Gold still in tills, piles and sacks (lost at the end of the run).
export function uncollected(world: World): number {
  return (
    world.buildings.reduce((a, b) => a + (b.till ?? 0), 0) +
    world.piles.reduce((a, p) => a + p.gold, 0) +
    collectors(world).reduce((a, c) => a + c.gold, 0)
  );
}

export type { PileState };
