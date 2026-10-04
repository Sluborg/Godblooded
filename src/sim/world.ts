import { attackBuilding, attackLair, nearestBuilding, pickLair, runRaids } from './town';
import { resolveTuning } from './tuning';
import { makeRng, type Rng } from './rng';
import {
  runParties,
  hasPendingPick,
  effectiveAttrs,
  pickUpgrade,
  shareXp,
  xpNext,
  type Party,
} from './parties';
import {
  heroKnockedOut,
  heroMove,
  payBounty,
  runBounties,
  runHeroes,
  runTemples,
  type HeroRuntime,
} from './heroes';
import {
  aggroRange,
  attackMs,
  damage,
  dist,
  dodgeChance,
  monsterHp,
  speed,
  stepToward,
  TICK_MS,
  type Stats,
} from './units';
import type {
  BountyState,
  BuildingState,
  Command,
  CommandResult,
  GameData,
  LairState,
  RunStats,
  SimEvent,
  Snapshot,
  Tuning,
  UnitState,
  Vec2,
} from './types';

export { TICK_MS };
// Guard against a stalled tab handing us minutes of dt at once.
const MAX_TICKS_PER_STEP = 400;
// Monsters idle near their lair and wander inside this radius.

// Server-side bookkeeping per lair and unit, not part of the snapshot.
interface LairRuntime {
  nextSpawnMs: number;
}
export interface UnitRuntime {
  // The lair a monster belongs to; null for heroes.
  lair: number | null;
  // Raiders march on the town instead of wandering near their lair.
  raid?: boolean;
  cooldownMs: number;
  target: Vec2 | null;
  idleMs: number;
}

export interface World {
  readonly data: GameData;
  readonly rng: Rng;
  timeMs: number;
  tick: number;
  accumulatorMs: number;
  gold: number;
  status: Snapshot['status'];
  nextId: number;
  buildings: BuildingState[];
  lairs: LairState[];
  units: UnitState[];
  lairRuntime: Map<number, LairRuntime>;
  unitRuntime: Map<number, UnitRuntime>;
  heroRuntime: Map<number, HeroRuntime>;
  templeNextMs: Map<number, number>;
  tuning: Tuning;
  parties: Map<number, Party>;
  bonds: Map<string, number>;
  pendingDeaths: { victim: number; by: number }[];
  nextRaidMs: number;
  stats: RunStats;
  bounties: BountyState[];
  events: SimEvent[];
}

export function createWorld(seed: number, data: GameData): World {
  const world: World = {
    data,
    rng: makeRng(seed),
    timeMs: 0,
    tick: 0,
    accumulatorMs: 0,
    gold: data.startGold,
    status: 'running',
    nextId: 1,
    buildings: [],
    lairs: [],
    units: [],
    lairRuntime: new Map(),
    unitRuntime: new Map(),
    heroRuntime: new Map(),
    templeNextMs: new Map(),
    tuning: resolveTuning(data),
    parties: new Map(),
    bonds: new Map(),
    pendingDeaths: [],
    nextRaidMs: 0,
    stats: {
      monstersKilled: 0,
      lairsDestroyed: 0,
      heroesArrived: 0,
      knockouts: 0,
      buildingsLost: 0,
      taxCollected: 0,
    },
    bounties: [],
    events: [],
  };
  world.buildings.push({
    id: world.nextId++,
    type: 'townhall',
    tier: 1,
    pos: { ...data.townHall },
    plot: null,
    hp: world.tuning.town.townHallHp,
    maxHp: world.tuning.town.townHallHp,
  });
  world.nextRaidMs = world.tuning.town.raidFirstMs;
  for (const site of data.lairSites ?? []) {
    const def = data.lairs?.find((l) => l.id === site.lair);
    if (!def) throw new Error(`lair site names unknown lair: ${site.lair}`);
    const id = world.nextId++;
    world.lairs.push({
      id,
      type: def.id,
      tier: 1,
      pos: { ...site.pos },
      hp: def.hp,
      maxHp: def.hp,
    });
    world.lairRuntime.set(id, { nextSpawnMs: def.spawnS * 1000 });
  }
  return world;
}

export function step(world: World, dtMs: number): void {
  if (world.status !== 'running' || dtMs <= 0) return;
  world.accumulatorMs += dtMs;
  let ticks = 0;
  // The run waits while a party has a level-up pick pending.
  while (world.accumulatorMs >= TICK_MS && ticks < MAX_TICKS_PER_STEP) {
    if (hasPendingPick(world)) {
      world.accumulatorMs = 0;
      return;
    }
    world.accumulatorMs -= TICK_MS;
    runTick(world);
    ticks++;
  }
  if (world.accumulatorMs >= TICK_MS) world.accumulatorMs = 0;
}

function runTick(world: World): void {
  world.tick++;
  world.timeMs += TICK_MS;
  runTemples(world);
  runLairs(world);
  runRaids(world);
  runHeroes(world);
  runBounties(world);
  runParties(world);
  runUnits(world);
  // Combat, heroes and the economy hook in here (Sim backlog 30 and up).
}

function runLairs(world: World): void {
  for (const lair of world.lairs) {
    const rt = world.lairRuntime.get(lair.id);
    const def = world.data.lairs?.find((l) => l.id === lair.type);
    if (!rt || !def || world.timeMs < rt.nextSpawnMs) continue;
    rt.nextSpawnMs = world.timeMs + def.spawnS * 1000;
    const alive = world.units.filter((u) => {
      const r = world.unitRuntime.get(u.id);
      return r?.lair === lair.id && !r.raid;
    }).length;
    if (alive >= def.maxAlive) continue;
    const mon = world.data.monsters?.find((m) => m.id === def.monster);
    if (!mon) continue;
    const id = world.nextId++;
    const hp = monsterHp(mon);
    world.units.push({
      id,
      kind: 'monster',
      type: mon.id,
      tier: lair.tier,
      pos: { ...lair.pos },
      facing: { x: 0, y: 1 },
      hp,
      maxHp: hp,
      target: null,
      ko: false,
      mode: 'wander',
      party: 0,
      trait: null,
      gold: 0,
    });
    world.unitRuntime.set(id, { lair: lair.id, cooldownMs: 0, target: null, idleMs: 0 });
    world.events.push({ kind: 'spawned', unit: id, type: mon.id, lair: lair.id });
  }
}

function statsOf(world: World, unit: UnitState): Stats | undefined {
  if (unit.kind === 'hero') {
    const cls = world.data.classes?.find((c) => c.id === unit.type);
    return cls && { weapon: cls.weapon, attrs: effectiveAttrs(world, unit, cls.attrs) };
  }
  return world.data.monsters?.find((m) => m.id === unit.type);
}

function runUnits(world: World): void {
  for (const unit of world.units) {
    const rt = world.unitRuntime.get(unit.id);
    const stats = statsOf(world, unit);
    if (!rt || !stats || unit.ko) continue;
    rt.cooldownMs = Math.max(0, rt.cooldownMs - TICK_MS);
    // Raiders have no lair leash: they march on the town.
    const home = rt.raid ? undefined : world.lairs.find((l) => l.id === rt.lair);
    // Heroes that are fleeing, resting or shopping do not pick fights.
    const busy = unit.kind === 'hero' && unit.mode !== 'explore';
    const foe = busy ? null : pickTarget(world, unit, stats, home?.pos);
    unit.target = foe ? foe.id : null;
    if (foe) {
      fight(world, unit, rt, stats, foe);
    } else if (unit.kind === 'hero') {
      const lair = busy ? null : pickLair(world, unit);
      if (lair) attackLair(world, unit, rt, stats, lair);
      else heroMove(world, unit);
    } else if (rt.raid) {
      const b = nearestBuilding(world, unit.pos);
      if (b) attackBuilding(world, unit, rt, stats, b);
    } else if (home) {
      wander(world, unit, rt, stats, home.pos);
    }
  }
  settleDeaths(world);
}

// Nearest living enemy inside aggro range (and the leash, for monsters).
function pickTarget(world: World, unit: UnitState, stats: Stats, home?: Vec2): UnitState | null {
  const reach = aggroRange(stats.attrs);
  let best: UnitState | null = null;
  let bestD = Infinity;
  for (const other of world.units) {
    if (other.kind === unit.kind || other.ko || other.hp <= 0) continue;
    const d = dist(unit.pos, other.pos);
    if (d > reach || d >= bestD) continue;
    if (home && dist(home, other.pos) > world.tuning.monster.leash) continue;
    best = other;
    bestD = d;
  }
  return best;
}

function fight(world: World, unit: UnitState, rt: UnitRuntime, stats: Stats, foe: UnitState): void {
  const d = dist(unit.pos, foe.pos);
  if (d > stats.weapon.range) {
    const dir = stepToward(unit.pos, foe.pos, (speed(stats.attrs) * TICK_MS) / 1000);
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
    return;
  }
  if (d > 0) unit.facing = { x: (foe.pos.x - unit.pos.x) / d, y: (foe.pos.y - unit.pos.y) / d };
  if (rt.cooldownMs > 0) return;
  rt.cooldownMs = attackMs(stats);
  const foeStats = statsOf(world, foe);
  const dodged = !!foeStats && world.rng() < dodgeChance(foeStats.attrs);
  const dmg = dodged ? 0 : damage(stats.attrs);
  foe.hp -= dmg;
  world.events.push({ kind: 'hit', attacker: unit.id, target: foe.id, damage: dmg, dodged });
  if (foe.hp <= 0) {
    foe.hp = 0;
    world.pendingDeaths.push({ victim: foe.id, by: unit.id });
  }
}

function settleDeaths(world: World): void {
  const settled = new Set<number>();
  for (const { victim, by } of world.pendingDeaths) {
    const unit = world.units.find((u) => u.id === victim);
    if (!unit || unit.ko || settled.has(victim)) continue;
    settled.add(victim);
    if (unit.kind === 'hero') {
      unit.ko = true;
      unit.target = null;
      heroKnockedOut(world, unit);
      world.stats.knockouts++;
      world.events.push({ kind: 'knockout', unit: unit.id, by });
    } else {
      const mon = world.data.monsters?.find((m) => m.id === unit.type);
      world.events.push({
        kind: 'died',
        unit: unit.id,
        type: unit.type,
        by,
        bounty: mon?.bounty ?? 0,
        xp: mon?.xp ?? 0,
      });
      world.stats.monstersKilled++;
      payBounty(world, by, mon?.bounty ?? 0);
      shareXp(world, by, mon?.xp ?? 0);
    }
  }
  world.pendingDeaths = [];
  world.units = world.units.filter((u) => {
    const gone = u.kind === 'monster' && u.hp <= 0;
    if (gone) world.unitRuntime.delete(u.id);
    return !gone;
  });
}

function wander(world: World, unit: UnitState, rt: UnitRuntime, stats: Stats, home: Vec2): void {
  if (!rt.target) {
    rt.idleMs -= TICK_MS;
    if (rt.idleMs > 0) return;
    rt.target = wanderPoint(world, home);
  }
  const dir = stepToward(unit.pos, rt.target, (speed(stats.attrs) * TICK_MS) / 1000);
  if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
  if (unit.pos.x === rt.target.x && unit.pos.y === rt.target.y) {
    const tm = world.tuning.monster;
    rt.target = null;
    rt.idleMs = tm.idleMinMs + world.rng() * (tm.idleMaxMs - tm.idleMinMs);
  }
}

function wanderPoint(world: World, center: Vec2): Vec2 {
  const { width, height } = world.data.map;
  const angle = world.rng() * Math.PI * 2;
  const r = Math.sqrt(world.rng()) * world.tuning.monster.wanderRadius;
  return {
    x: Math.min(width, Math.max(0, center.x + Math.cos(angle) * r)),
    y: Math.min(height, Math.max(0, center.y + Math.sin(angle) * r)),
  };
}

export { spawnHero } from './heroes';

export function command(world: World, cmd: Command): CommandResult {
  if (world.status !== 'running') return { ok: false, reason: 'run over' };
  switch (cmd.kind) {
    case 'build': {
      const def = world.data.buildings.find((b) => b.id === cmd.type);
      if (!def) return { ok: false, reason: 'unknown building' };
      const at = Number.isInteger(cmd.plot) ? world.data.plots?.[cmd.plot] : undefined;
      if (!at) return { ok: false, reason: 'unknown plot' };
      if (world.buildings.some((b) => b.plot === cmd.plot)) {
        return { ok: false, reason: 'plot taken' };
      }
      if (world.gold < def.cost) return { ok: false, reason: 'not enough gold' };
      world.gold -= def.cost;
      const id = world.nextId++;
      world.buildings.push({
        id,
        type: def.id,
        tier: 1,
        pos: { ...at },
        plot: cmd.plot,
        hp: world.tuning.town.buildingHp,
        maxHp: world.tuning.town.buildingHp,
      });
      world.events.push({ kind: 'built', building: id, type: def.id });
      return { ok: true, id };
    }
    case 'pickUpgrade':
      return pickUpgrade(world, cmd.party, cmd.upgrade);
    case 'placeBounty': {
      if (!inMap(world, cmd.pos)) return { ok: false, reason: 'off map' };
      if (!Number.isInteger(cmd.gold) || cmd.gold <= 0) return { ok: false, reason: 'bad amount' };
      if (world.gold < cmd.gold) return { ok: false, reason: 'not enough gold' };
      world.gold -= cmd.gold;
      const id = world.nextId++;
      world.bounties.push({ id, pos: { ...cmd.pos }, gold: cmd.gold });
      world.events.push({ kind: 'bountyPlaced', bounty: id, gold: cmd.gold });
      return { ok: true, id };
    }
  }
}

function inMap(world: World, p: { x: number; y: number }): boolean {
  const { width, height } = world.data.map;
  return p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height;
}

// Copies out the state; the returned object never aliases the live world. Drains events.
export function snapshot(world: World): Snapshot {
  const events = world.events;
  world.events = [];
  return {
    timeMs: world.timeMs,
    tick: world.tick,
    gold: world.gold,
    status: world.status,
    stats: { ...world.stats },
    plots: (world.data.plots ?? []).map((pos, id) => {
      const b = world.buildings.find((x) => x.plot === id);
      return { id, pos: { ...pos }, occupied: !!b, building: b ? b.id : null };
    }),
    buildings: world.buildings.map((b) => ({ ...b, pos: { ...b.pos } })),
    parties: [...world.parties.values()].map((p) => ({
      id: p.id,
      members: [...p.members],
      level: p.level,
      xp: p.xp,
      xpNext: xpNext(world, p.level),
      upgrades: [...p.upgrades],
      offer: p.offer ? [...p.offer] : null,
    })),
    lairs: world.lairs.map((l) => ({ ...l, pos: { ...l.pos } })),
    units: world.units.map((u) => ({ ...u, pos: { ...u.pos }, facing: { ...u.facing } })),
    bounties: world.bounties.map((b) => ({ ...b, pos: { ...b.pos } })),
    events,
  };
}
