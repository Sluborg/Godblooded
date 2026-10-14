// The rules of the lair growth ring and guard pips, pure (the drawing is in lairRings.ts).
// Growth ring and guard pips of the lairs (docs/systems/monsters-and-bosses.md section 4, a look
// only). The ring fills clockwise to the lair's next tier-up and turns amber in the last 60 s with
// a countdown, pulses in the last 15 s; the pips under the plate show how many guards are alive
// and how the refill is going.
export const RING_AMBER_MS = 60_000;
export const RING_PULSE_MS = 15_000;
// Pips show while a hero is near and this long after.
export const PIPS_HOLD_MS = 10_000;

export type RingStage = 'dim' | 'amber' | 'pulse';

// How full the ring is, 0 to 1; null when there is no ring (top tier, no tier clock).
export function ringFill(next: number | null | undefined, span: number | null | undefined) {
  if (next == null || span == null || span <= 0) return null;
  return Math.min(1, Math.max(0, 1 - next / span));
}

export function ringStage(nextMs: number): RingStage {
  return nextMs <= RING_PULSE_MS ? 'pulse' : nextMs <= RING_AMBER_MS ? 'amber' : 'dim';
}

// The countdown beside the plate: whole seconds in the last 60, else null.
export function ringCountdown(nextMs: number): number | null {
  return nextMs <= RING_AMBER_MS ? Math.max(0, Math.ceil(nextMs / 1000)) : null;
}

// The plate colour by lair tier (tier 1 as it always was, 2 yellow, 3 red).
export function plateColor(tier: number): string {
  return tier >= 3 ? '#d02a2a' : tier === 2 ? '#b8861a' : '#8a1c2b';
}

// The corrupted ground grows with the tier (x1, x1.15, x1.3).
export function groundScale(tier: number): number {
  return tier >= 3 ? 1.3 : tier === 2 ? 1.15 : 1;
}

export interface PipState {
  // One entry per guard slot: 'alive', 'empty', or 'filling' with its share (0 to 1).
  kind: 'alive' | 'empty' | 'filling';
  fill: number;
}

// The pip row: `alive` filled; the next empty one fills over the spawn wait; the rest empty.
export function pipRow(alive: number, maxAlive: number, spawnShare: number): PipState[] {
  const row: PipState[] = [];
  for (let i = 0; i < maxAlive; i++) {
    if (i < alive) row.push({ kind: 'alive', fill: 1 });
    else if (i === alive) row.push({ kind: 'filling', fill: Math.min(1, Math.max(0, spawnShare)) });
    else row.push({ kind: 'empty', fill: 0 });
  }
  return row;
}
