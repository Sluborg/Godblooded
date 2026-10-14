import type { BountyState, Vec2 } from '../sim/api';

// The bounty flag card (docs/systems/ui-flows.md sections 3 and 4): tap a flag to see how much it
// holds and how many heroes are heading for it, raise it or take it down (half back). Pure
// rules, unit-tested; HudScene draws the card.

export const FLAG_TAP_RADIUS = 60;
export const RAISE_STEPS = [25, 50] as const;

// The flag nearest to a world point within the tap radius, or null.
export function flagAt(
  bounties: readonly Pick<BountyState, 'id' | 'pos'>[],
  p: Vec2,
  radius = FLAG_TAP_RADIUS,
): number | null {
  let best: number | null = null;
  let bestD = radius;
  for (const b of bounties) {
    const d = Math.hypot(b.pos.x - p.x, b.pos.y - p.y);
    if (d <= bestD) {
      bestD = d;
      best = b.id;
    }
  }
  return best;
}

// Gold a cancel gives back (the sim rounds it down).
export function refundFor(gold: number, rate: number): number {
  return Math.floor(gold * rate);
}

// `target`: what a hunt flag follows (a monster or lair type), if it is one.
export function flagLines(gold: number, heading: number, rate: number, target?: string): string[] {
  const who =
    heading === 0
      ? 'No hero is heading for it yet'
      : heading === 1
        ? '1 hero is heading for it'
        : `${heading} heroes are heading for it`;
  const hunt = target ? [`Follows the ${target}; the hero who kills it gets the gold`] : [];
  return [...hunt, who, `Cancel takes it down and gives ${refundFor(gold, rate)} gold back`];
}
