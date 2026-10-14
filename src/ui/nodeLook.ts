// How the celestial nodes look and read (docs/systems/nodes.md): a locked node glows cold under its
// lair, a freed one is a column of golden light that is brighter the more Ambrosia its pool holds,
// a defiled one burns red. Pure rules; NodeViews draws them.
export type NodeKind = 'locked' | 'freed' | 'defiled';

export const NODE_STYLE = {
  locked: 0x7f93b8,
  freed: 0xffd877,
  defiled: 0xd0302a,
} as const;

// How full a pool is, 0 to 1.
export function poolShare(pool: number, max: number): number {
  return max > 0 ? Math.min(1, Math.max(0, pool / max)) : 0;
}

// The brightness of a freed node's light: never fully out (an empty pool still marks the node),
// full at a full pool.
export function glowStrength(state: NodeKind, pool: number, max: number): number {
  if (state === 'locked') return 0.18;
  if (state === 'defiled') return 0.85;
  return 0.3 + 0.7 * poolShare(pool, max);
}

// The line of the node card: what the pool holds.
export function poolLine(pool: number, max: number): string {
  return `Ambrosia ${Math.floor(pool)} / ${Math.floor(max)}`;
}

// Gatherers working a node by the workers list.
export function gatherersAt(workers: readonly { node: number | null }[], node: number): number {
  return workers.filter((w) => w.node === node).length;
}
