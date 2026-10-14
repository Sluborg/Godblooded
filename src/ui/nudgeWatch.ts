// The h-nudge condition (hint-texts.md row 137): from 3:00, no bounty flag placed in the last 120 s
// and a lair below its top tier that nobody has hurt for 120 s. Pure: the hint director feeds it
// the snapshot's lairs each check and the time of each placed flag.
export const NUDGE_FROM_MS = 180_000;
export const NUDGE_IDLE_MS = 120_000;

export interface NudgeLair {
  id: number;
  tier: number;
  hp: number;
  // Time to the next tier-up, when the sim says (lair snapshot nextTierMs).
  nextTierMs?: number;
}

export class NudgeWatch {
  private lastFlagMs = -Infinity;
  private hp = new Map<number, { hp: number; sinceMs: number }>();

  flagPlaced(timeMs: number): void {
    this.lastFlagMs = timeMs;
  }

  // The lair to point at (the untouched one nearest its tier-up), or null while the nudge is not due.
  update(lairs: readonly NudgeLair[], timeMs: number, maxTier: number): number | null {
    const alive = new Set<number>();
    for (const l of lairs) {
      alive.add(l.id);
      const seen = this.hp.get(l.id);
      if (!seen || seen.hp !== l.hp) this.hp.set(l.id, { hp: l.hp, sinceMs: timeMs });
    }
    for (const id of [...this.hp.keys()]) if (!alive.has(id)) this.hp.delete(id);
    if (timeMs < NUDGE_FROM_MS || timeMs - this.lastFlagMs < NUDGE_IDLE_MS) return null;
    const idle = lairs.filter(
      (l) => l.tier < maxTier && timeMs - (this.hp.get(l.id)?.sinceMs ?? timeMs) >= NUDGE_IDLE_MS,
    );
    if (idle.length === 0) return null;
    // Nearest its tier-up: the smallest nextTierMs, else the highest tier, then the lowest id.
    idle.sort(
      (a, b) =>
        (a.nextTierMs ?? Infinity) - (b.nextTierMs ?? Infinity) || b.tier - a.tier || a.id - b.id,
    );
    return idle[0].id;
  }
}
