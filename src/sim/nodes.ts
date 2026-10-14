import { dist, tierValue, TICK_MS } from './units';
import type { World } from './world';
import type { LairState, NodeState } from './types';

// Celestial nodes (docs/systems/nodes.md): one under every non-boss lair, locked while it stands,
// freed when it falls. A freed node is a pool of Ambrosia that refills slowly; far nodes and
// nodes of harder lairs hold more. With tuning.nodes.enabled off, none exist.

const hall = (world: World) => world.buildings.find((b) => b.type === 'townhall');

// The most a node holds: base max scaled by distance from the town hall and by lair tier.
function capacity(world: World, lair: LairState): { start: number; max: number } {
  const t = world.tuning.nodes;
  const from = hall(world)?.pos ?? world.data.townHall;
  const steps = Math.max(0, Math.floor((dist(lair.pos, from) - t.distFrom) / t.distStep));
  const mult = (1 + t.distBonus * steps) * tierValue(t.tierMult, lair.tier, 1);
  return { start: t.start * mult, max: t.max * mult };
}

const lockedNode = (world: World, lair: LairState): NodeState => ({
  id: world.nextId++,
  lair: lair.id,
  pos: { ...lair.pos },
  state: 'locked',
  pool: 0,
  max: 0,
});

// Gives every standing non-boss lair a locked node (done each tick, so lairs added later get one).
function seedNodes(world: World): void {
  for (const lair of world.lairs) {
    if (!lair.boss && !world.nodes.some((n) => n.lair === lair.id)) {
      world.nodes.push(lockedNode(world, lair));
    }
  }
}

// The lair fell: its node is freed with its opening pool. `lair` is the state it had, already
// gone from world.lairs.
export function freeNode(world: World, lair: LairState): void {
  if (!world.tuning.nodes.enabled || lair.boss) return;
  let node = world.nodes.find((n) => n.lair === lair.id);
  if (!node) {
    node = lockedNode(world, lair);
    world.nodes.push(node);
  }
  if (node.state !== 'locked') return;
  const cap = capacity(world, lair);
  node.state = 'freed';
  node.pool = cap.start;
  node.max = cap.max;
  world.events.push({
    kind: 'nodeFreed',
    node: node.id,
    lair: lair.id,
    pos: { ...node.pos },
    pool: node.pool,
  });
}

export function runNodes(world: World): void {
  const t = world.tuning.nodes;
  if (!t.enabled) return;
  seedNodes(world);
  const per = (t.regenPerMin * TICK_MS) / 60_000;
  for (const n of world.nodes) {
    if (n.state === 'freed' && n.pool < n.max) n.pool = Math.min(n.max, n.pool + per);
  }
}

export type { NodeState };
