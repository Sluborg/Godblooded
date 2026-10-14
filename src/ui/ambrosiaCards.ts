import { GRAYBOX } from '../data/graybox';
import type { Snapshot } from '../sim/api';

type Grave = Snapshot['graves'][number];

// The pantheon of a god id (a hero's `god`), or null.
export function godPantheonOf(god: string | null): string | null {
  if (!god) return null;
  return (GRAYBOX.gods ?? []).find((g) => g.id === god)?.pantheon ?? null;
}

// The Ambrosia price of the temple upgrade from its current tier (the last price holds above).
export function templeAmbrosiaCost(costs: readonly number[], tier: number): number {
  return costs[Math.min(costs.length - 1, Math.max(0, tier - 1))] ?? 0;
}

// Graves a temple of `pantheon` can recall: not recalled yet, of a god of that pantheon.
export function recallable(
  graves: readonly Grave[],
  pantheon: string,
  pantheonOf: (god: string | null) => string | null = godPantheonOf,
): Grave[] {
  return graves.filter((g) => !g.recalled && pantheonOf(g.god) === pantheon);
}

// A line for a grave button: the god's name when known, else the hero type.
export function graveLabel(g: Pick<Grave, 'god' | 'type'>): string {
  const god = (GRAYBOX.gods ?? []).find((x) => x.id === g.god);
  return god?.name ?? g.type;
}
