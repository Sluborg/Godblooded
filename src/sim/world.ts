import { makeRng, type Rng } from './rng';
import type {
  BountyState,
  BuildingState,
  Command,
  CommandResult,
  GameData,
  SimEvent,
  Snapshot,
} from './types';

// Fixed simulation step. Scene passes frame time (times game speed); the world runs whole
// ticks, so results never depend on the frame rate.
export const TICK_MS = 50;
// Guard against a stalled tab handing us minutes of dt at once.
const MAX_TICKS_PER_STEP = 400;

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
    bounties: [],
    events: [],
  };
  world.buildings.push({
    id: world.nextId++,
    type: 'townHall',
    tier: 1,
    pos: { ...data.townHall },
    hp: 1,
  });
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
  // Units, lairs, combat and the economy hook in here (Sim backlog 20 and up).
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
    bounties: world.bounties.map((b) => ({ ...b, pos: { ...b.pos } })),
    events,
  };
}
