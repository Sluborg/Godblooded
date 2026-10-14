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

// Defaults of tuning.nodes (defileCountdownMs, cleanseMs, sproutWarnMs); the views get the world's.
export const THREAT_MS = 10_000;
export const CLEANSE_MS = 10_000;
export const SPROUT_WARN_MS = 30_000;

// Share of the 10 s defile countdown still left (1 = just started, 0 = defiled), or null.
export function threatLeft(
  threatSinceMs: number | undefined,
  timeMs: number,
  countdownMs = THREAT_MS,
): number | null {
  if (threatSinceMs === undefined) return null;
  return Math.min(1, Math.max(0, 1 - (timeMs - threatSinceMs) / countdownMs));
}

// Share of the cleanse done, 0 to 1, or null when none runs.
export function cleanseDone(cleanseMs: number | undefined, needMs = CLEANSE_MS): number | null {
  if (!cleanseMs || cleanseMs <= 0) return null;
  return Math.min(1, cleanseMs / needMs);
}

// How far the red cracks of a sprouting lair have spread, 0 to 1 (30 s from the warning), or null.
export function sproutProgress(
  sproutAtMs: number | undefined,
  timeMs: number,
  warnMs = SPROUT_WARN_MS,
): number | null {
  if (sproutAtMs === undefined) return null;
  return Math.min(1, Math.max(0, 1 - (sproutAtMs - timeMs) / warnMs));
}
