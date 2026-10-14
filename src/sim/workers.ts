import { dist, speed, stepToward, TICK_MS } from './units';
import type { World } from './world';
import type { BuildingCore, CommandResult, UnitState, WorkerInfo } from './types';

// Gatherers (docs/systems/nodes.md section 2): town workers hired at the town hall. A gatherer
// the player sends walks to a freed node, gathers, carries Ambrosia home and repeats until it is
// recalled or the node is dry. It does not fight: a hit sends it home at a run.

const hall = (world: World): BuildingCore | undefined =>
  world.buildings.find((b) => b.type === 'townhall');

const living = (world: World): UnitState[] =>
  world.units.filter((u) => u.kind === 'worker' && u.hp > 0);

// How many gatherers the town hall may keep: by its tier.
export function gathererCap(world: World): number {
  const t = world.tuning.nodes;
  if (!t.enabled) return 0;
  const tier = Math.max(1, hall(world)?.tier ?? 1);
  return t.gathererCap[Math.min(tier, t.gathererCap.length) - 1] ?? 0;
}

export function hireGatherer(world: World): CommandResult {
  const t = world.tuning.nodes;
  const h = hall(world);
  if (!t.enabled || !h) return { ok: false, reason: 'no gatherers' };
  if (living(world).length >= gathererCap(world)) return { ok: false, reason: 'gatherer cap' };
  if (world.gold < t.gathererCost) return { ok: false, reason: 'not enough gold' };
  world.gold -= t.gathererCost;
  const id = world.nextId++;
  world.units.push({
    id,
    kind: 'worker',
    type: 'gatherer',
    tier: 1,
    god: null,
    path: null,
    pos: { x: h.pos.x, y: h.pos.y + 40 },
    facing: { x: 0, y: 1 },
    hp: t.gathererHp,
    maxHp: t.gathererHp,
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
    worker: {
      node: null,
      phase: 'idle',
      untilMs: 0,
      carry: 0,
      hpSeen: t.gathererHp,
      fleeing: false,
    },
  });
  world.events.push({ kind: 'gathererHired', unit: id });
  return { ok: true, id };
}

// Sends an idle gatherer (one at the hall, nearest the node first) to a freed node. Sending again
// to a busy node adds another.
export function sendGatherer(world: World, nodeId: number): CommandResult {
  const node = world.nodes.find((n) => n.id === nodeId);
  if (!node || node.state !== 'freed') return { ok: false, reason: 'node not free' };
  if (node.pool <= 0) return { ok: false, reason: 'node dry' };
  let best: { u: UnitState; d: number } | undefined;
  for (const u of living(world)) {
    const w = world.unitRuntime.get(u.id)?.worker;
    if (!w || w.node !== null || w.fleeing || w.carry > 0) continue;
    const d = dist(u.pos, node.pos);
    if (!best || d < best.d) best = { u, d };
  }
  if (!best) return { ok: false, reason: 'no idle gatherer' };
  const w = world.unitRuntime.get(best.u.id)?.worker;
  if (!w) return { ok: false, reason: 'no idle gatherer' };
  w.node = node.id;
  w.phase = 'out';
  return { ok: true, id: best.u.id };
}

// Brings the gatherers of one node (or all) home; what they carry still comes in.
export function recallGatherers(world: World, nodeId?: number): CommandResult {
  let n = 0;
  for (const u of living(world)) {
    const w = world.unitRuntime.get(u.id)?.worker;
    if (!w || w.node === null || (nodeId !== undefined && w.node !== nodeId)) continue;
    w.node = null;
    w.phase = 'back';
    n++;
  }
  return n > 0 ? { ok: true, id: n } : { ok: false, reason: 'nobody to recall' };
}

export function workerInfos(world: World): WorkerInfo[] {
  const out: WorkerInfo[] = [];
  for (const u of living(world)) {
    const w = world.unitRuntime.get(u.id)?.worker;
    if (w)
      out.push({ unit: u.id, node: w.node, phase: w.phase, carry: w.carry, fleeing: w.fleeing });
  }
  return out;
}

// A gatherer fell: what it carried is lost for now (slice 3 drops it as a jar).
export function workerFell(world: World, unit: UnitState): void {
  const carried = world.unitRuntime.get(unit.id)?.worker?.carry ?? 0;
  world.events.push({ kind: 'workerFell', unit: unit.id, pos: { ...unit.pos }, carried });
}

export function runWorkers(world: World): void {
  const t = world.tuning.nodes;
  if (!t.enabled) return;
  const h = hall(world);
  const cls = world.data.classes?.[0];
  const base = ((cls ? speed(cls.attrs) : 80) * t.speedMult * TICK_MS) / 1000;
  for (const u of living(world)) {
    const w = world.unitRuntime.get(u.id)?.worker;
    if (!w) continue;
    const walk = (to: { x: number; y: number }, mult = 1): boolean => {
      const dir = stepToward(u.pos, to, base * mult);
      if (dir.x !== 0 || dir.y !== 0) u.facing = dir;
      return dist(u.pos, to) <= t.reach;
    };
    // Hit: drops the trip and runs home.
    if (u.hp < w.hpSeen) {
      w.fleeing = true;
      w.phase = 'back';
      world.events.push({ kind: 'workerHit', unit: u.id });
    }
    w.hpSeen = u.hp;
    if (!h) continue;
    // Hurt gatherers heal while they stand at the town hall.
    if (u.hp < u.maxHp && dist(u.pos, h.pos) <= t.reach + 40) {
      u.hp = Math.min(u.maxHp, u.hp + (u.maxHp * t.healPerS * TICK_MS) / 1000);
      w.hpSeen = u.hp;
    }
    const home = { x: h.pos.x, y: h.pos.y + 40 };
    const node = w.node === null ? undefined : world.nodes.find((n) => n.id === w.node);
    if (w.phase === 'back') {
      if (!walk(home, w.fleeing ? t.fleeMult : 1)) continue;
      if (w.carry > 0) {
        world.ambrosia += w.carry;
        world.events.push({
          kind: 'jarHome',
          unit: u.id,
          node: w.node,
          amount: w.carry,
          total: world.ambrosia,
        });
        w.carry = 0;
      }
      w.fleeing = false;
      // Hurt below returnAtHp: waits at the hall to heal first.
      if (node && u.hp < u.maxHp * t.returnAtHp) continue;
      // Carry on with the trip unless it was called off or the node is gone or dry.
      w.phase = node && node.state === 'freed' && node.pool > 0 ? 'out' : 'idle';
      if (w.phase === 'idle') w.node = null;
      continue;
    }
    if (w.phase === 'idle') {
      if (dist(u.pos, home) > t.reach) walk(home);
      continue;
    }
    if (!node || node.state !== 'freed') {
      w.node = null;
      w.phase = 'back';
      continue;
    }
    if (w.phase === 'out') {
      if (walk(node.pos)) {
        w.phase = 'gather';
        w.untilMs = world.timeMs + t.gatherMs;
      }
      continue;
    }
    // Gathering: takes its load when the time is up.
    if (world.timeMs < w.untilMs) continue;
    const take = Math.min(t.carry, node.pool);
    node.pool -= take;
    w.carry += take;
    w.phase = 'back';
    if (node.pool <= 0) w.node = null;
  }
}
