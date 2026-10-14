import { dist, tierValue, TICK_MS } from './units';
import type { World } from './world';
import type { NodeState, UnitState } from './types';

// Losing a node and winning it back (docs/systems/nodes.md section 1b). Raiders that pass a freed
// node stop and, after a countdown, defile it and leave two of their number as defilers; a hero
// or guard standing on it with no foe near cleanses it. Late in the run a lair may sprout on a
// free node. Everything here runs only with tuning.nodes.enabled.

const raidersNear = (world: World, node: NodeState, r: number): UnitState[] =>
  world.units.filter(
    (u) =>
      u.kind === 'monster' &&
      u.hp > 0 &&
      world.unitRuntime.get(u.id)?.raid &&
      dist(u.pos, node.pos) <= r,
  );

// Is this raider held at a freed node that is under threat (it waits there)?
export function raiderHeld(world: World, unit: UnitState): boolean {
  if (!world.tuning.nodes.enabled) return false;
  const r = world.tuning.nodes.defileRange;
  return world.nodes.some(
    (n) => n.state === 'freed' && n.threatSinceMs !== undefined && dist(unit.pos, n.pos) <= r,
  );
}

export function runCorruption(world: World): void {
  for (const n of world.nodes) {
    if (n.state === 'freed') threaten(world, n);
    else if (n.state === 'defiled') cleanse(world, n);
  }
  sprout(world);
}

function threaten(world: World, n: NodeState): void {
  const t = world.tuning.nodes;
  const near = raidersNear(world, n, t.defileRange);
  if (near.length === 0) {
    delete n.threatSinceMs;
    return;
  }
  if (n.threatSinceMs === undefined) {
    n.threatSinceMs = world.timeMs;
    world.events.push({ kind: 'nodeThreat', node: n.id, inMs: t.defileCountdownMs });
    return;
  }
  if (world.timeMs - n.threatSinceMs < t.defileCountdownMs) return;
  // Defiled: the pool keeps what it holds, nothing gathers; some raiders stay on as defilers.
  delete n.threatSinceMs;
  delete n.sproutAtMs;
  n.state = 'defiled';
  n.cleanseMs = 0;
  const stay = [...near]
    .sort((a, b) => dist(a.pos, n.pos) - dist(b.pos, n.pos))
    .slice(0, t.defilers);
  n.defilers = stay.map((u) => u.id);
  for (const u of stay) {
    const rt = world.unitRuntime.get(u.id);
    if (!rt) continue;
    rt.raid = false;
    delete rt.raidId;
    rt.lair = null;
    rt.defiler = n.id;
  }
  world.events.push({ kind: 'nodeDefiled', node: n.id, defilers: [...n.defilers] });
}

// A hero or guard on the node with no foe near, long enough: it is free again as it was.
function cleanse(world: World, n: NodeState): void {
  const t = world.tuning.nodes;
  const foe = world.units.some(
    (u) =>
      u.kind === 'monster' &&
      u.hp > 0 &&
      (world.unitRuntime.get(u.id)?.defiler === n.id || dist(u.pos, n.pos) <= t.cleanseFoeRange),
  );
  const holder = world.units.some(
    (u) =>
      (u.kind === 'hero' || u.kind === 'guard') &&
      !u.ko &&
      u.hp > 0 &&
      dist(u.pos, n.pos) <= t.cleanseRange,
  );
  if (foe || !holder) {
    n.cleanseMs = 0;
    return;
  }
  n.cleanseMs = (n.cleanseMs ?? 0) + TICK_MS;
  if (n.cleanseMs < t.cleanseMs) return;
  n.state = 'freed';
  delete n.cleanseMs;
  delete n.defilers;
  world.events.push({
    kind: 'nodeFreed',
    node: n.id,
    lair: n.lair,
    pos: { ...n.pos },
    pool: n.pool,
  });
}

// From sproutFromMs a lair may grow on a free node nobody is gathering at (never the one nearest
// the town), warned sproutWarnMs ahead; at most sproutMax a run, one per sproutEveryMs.
function sprout(world: World): void {
  const t = world.tuning.nodes;
  const pending = world.nodes.find((n) => n.sproutAtMs !== undefined);
  if (pending && pending.sproutAtMs !== undefined) {
    if (world.timeMs < pending.sproutAtMs) return;
    delete pending.sproutAtMs;
    if (pending.state !== 'freed') return;
    growLair(world, pending);
    return;
  }
  if (world.timeMs < t.sproutFromMs || world.timeMs < world.nextSproutMs) return;
  if (world.sprouts >= t.sproutMax) return;
  const from = world.buildings.find((b) => b.type === 'townhall')?.pos ?? world.data.townHall;
  const nearest = [...world.nodes].sort((a, b) => dist(a.pos, from) - dist(b.pos, from))[0];
  const busy = new Set<number>();
  for (const u of world.units) {
    const node = u.kind === 'worker' ? world.unitRuntime.get(u.id)?.worker?.node : undefined;
    if (node !== undefined && node !== null) busy.add(node);
  }
  const open = world.nodes.filter((n) => n.state === 'freed' && n !== nearest && !busy.has(n.id));
  if (open.length === 0) return;
  const node = open[Math.floor(world.rng() * open.length)];
  node.sproutAtMs = world.timeMs + t.sproutWarnMs;
  world.events.push({ kind: 'lairSprouting', node: node.id, inMs: t.sproutWarnMs });
}

function growLair(world: World, node: NodeState): void {
  const defs = (world.data.lairs ?? []).filter((d) => {
    const mon = world.data.monsters?.find((m) => m.id === d.monster);
    return !d.escort && !mon?.tags?.includes('boss');
  });
  if (defs.length === 0) return;
  const def = defs[Math.floor(world.rng() * defs.length)];
  const lt = world.tuning.lair;
  const hp = Math.round(def.hp * tierValue(lt.hpMult, 1, 1));
  const id = world.nextId++;
  world.lairs.push({
    id,
    type: def.id,
    boss: false,
    tier: 1,
    pos: { ...node.pos },
    hp,
    maxHp: hp,
    sprouted: true,
  });
  const every = lt.tierUpEveryMs;
  world.lairRuntime.set(id, {
    nextSpawnMs: world.timeMs + def.spawnS * 1000 * tierValue(lt.spawnMult, 1, 1),
    nextTierMs: every > 0 && lt.maxTier > 1 ? world.timeMs + every : Infinity,
    tierFromMs: world.timeMs,
  });
  node.state = 'locked';
  node.lair = id;
  world.sprouts++;
  world.nextSproutMs = world.timeMs + world.tuning.nodes.sproutEveryMs;
  world.events.push({ kind: 'lairSprouted', node: node.id, lair: id });
}
