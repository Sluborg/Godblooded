import { makeRng, type Rng } from './rng';
import { monsterHp, speed, stepToward } from './units';
import type {
  BountyState,
  BuildingState,
  Command,
  CommandResult,
  GameData,
  LairState,
  SimEvent,
  Snapshot,
  UnitState,
  Vec2,
} from './types';

// Fixed simulation step. Scene passes frame time (times game speed); the world runs whole
// ticks, so results never depend on the frame rate.
export const TICK_MS = 50;
// Guard against a stalled tab handing us minutes of dt at once.
const MAX_TICKS_PER_STEP = 400;
// Monsters idle near their lair and wander inside this radius.
const WANDER_RADIUS = 160;
const IDLE_MS = [1000, 4000] as const;

// Server-side bookkeeping per lair and unit, not part of the snapshot.
interface LairRuntime {
  nextSpawnMs: number;
}
interface UnitRuntime {
  lair: number;
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
    bounties: [],
    events: [],
  };
  world.buildings.push({
    id: world.nextId++,
    type: 'townhall',
    tier: 1,
    pos: { ...data.townHall },
    hp: 1,
  });
  for (const site of data.lairSites ?? []) {
    const def = data.lairs?.find((l) => l.id === site.lair);
    if (!def) throw new Error(`lair site names unknown lair: ${site.lair}`);
    const id = world.nextId++;
    world.lairs.push({ id, type: def.id, tier: 1, pos: { ...site.pos }, hp: def.hp });
    world.lairRuntime.set(id, { nextSpawnMs: def.spawnS * 1000 });
  }
  return world;
}

export function step(world: World, dtMs: number): void {
  if (world.status !== 'running' || dtMs <= 0) return;
  world.accumulatorMs += dtMs;
  let ticks = 0;
  while (world.accumulatorMs >= TICK_MS && ticks < MAX_TICKS_PER_STEP) {
    world.accumulatorMs -= TICK_MS;
    runTick(world);
    ticks++;
  }
  if (world.accumulatorMs >= TICK_MS) world.accumulatorMs = 0;
}

function runTick(world: World): void {
  world.tick++;
  world.timeMs += TICK_MS;
  runLairs(world);
  runUnits(world);
  // Combat, heroes and the economy hook in here (Sim backlog 30 and up).
}

function runLairs(world: World): void {
  for (const lair of world.lairs) {
    const rt = world.lairRuntime.get(lair.id);
    const def = world.data.lairs?.find((l) => l.id === lair.type);
    if (!rt || !def || world.timeMs < rt.nextSpawnMs) continue;
    rt.nextSpawnMs = world.timeMs + def.spawnS * 1000;
    const alive = world.units.filter((u) => world.unitRuntime.get(u.id)?.lair === lair.id).length;
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
    });
    world.unitRuntime.set(id, { lair: lair.id, target: null, idleMs: 0 });
    world.events.push({ kind: 'spawned', unit: id, type: mon.id, lair: lair.id });
  }
}

function runUnits(world: World): void {
  for (const unit of world.units) {
    const rt = world.unitRuntime.get(unit.id);
    const mon = world.data.monsters?.find((m) => m.id === unit.type);
    const lair = world.lairs.find((l) => l.id === rt?.lair);
    if (!rt || !mon || !lair) continue;
    if (!rt.target) {
      rt.idleMs -= TICK_MS;
      if (rt.idleMs > 0) continue;
      rt.target = wanderPoint(world, lair.pos);
    }
    const dir = stepToward(unit.pos, rt.target, (speed(mon.attrs) * TICK_MS) / 1000);
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
    if (unit.pos.x === rt.target.x && unit.pos.y === rt.target.y) {
      rt.target = null;
      rt.idleMs = IDLE_MS[0] + world.rng() * (IDLE_MS[1] - IDLE_MS[0]);
    }
  }
}

function wanderPoint(world: World, center: Vec2): Vec2 {
  const { width, height } = world.data.map;
  const angle = world.rng() * Math.PI * 2;
  const r = Math.sqrt(world.rng()) * WANDER_RADIUS;
  return {
    x: Math.min(width, Math.max(0, center.x + Math.cos(angle) * r)),
    y: Math.min(height, Math.max(0, center.y + Math.sin(angle) * r)),
  };
}

export function command(world: World, cmd: Command): CommandResult {
  if (world.status !== 'running') return { ok: false, reason: 'run over' };
  switch (cmd.kind) {
    case 'build': {
      const def = world.data.buildings.find((b) => b.id === cmd.type);
      if (!def) return { ok: false, reason: 'unknown building' };
      if (!inMap(world, cmd.pos)) return { ok: false, reason: 'off map' };
      if (world.gold < def.cost) return { ok: false, reason: 'not enough gold' };
      world.gold -= def.cost;
      const id = world.nextId++;
      world.buildings.push({ id, type: def.id, tier: 1, pos: { ...cmd.pos }, hp: 1 });
      world.events.push({ kind: 'built', building: id, type: def.id });
      return { ok: true, id };
    }
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
    buildings: world.buildings.map((b) => ({ ...b, pos: { ...b.pos } })),
    lairs: world.lairs.map((l) => ({ ...l, pos: { ...l.pos } })),
    units: world.units.map((u) => ({ ...u, pos: { ...u.pos }, facing: { ...u.facing } })),
    bounties: world.bounties.map((b) => ({ ...b, pos: { ...b.pos } })),
    events,
  };
}
