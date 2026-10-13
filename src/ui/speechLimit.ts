// Barks follow docs/systems/barks.md section 2: real time (so 4x speed is no chatter), at least
// GLOBAL_GAP_MS between two bubbles starting, at most MAX_ON_SCREEN at once, and each hero at
// most one per UNIT_GAP_MS. High priority barks ignore the per-hero gap, never the global one.
export const GLOBAL_GAP_MS = 5000;
export const UNIT_GAP_MS = 30000;
export const MAX_ON_SCREEN = 2;

export type BarkPriority = 'high' | 'mid' | 'low';

export class SpeechLimit {
  private lastAny = -Infinity;
  private lastBy = new Map<number, number>();

  // `live` is how many bubbles are on screen right now; `nowMs` is real time. A clock that runs
  // backwards (a new page or run) clears the memory.
  allow(unit: number, nowMs: number, live: number, priority: BarkPriority = 'mid'): boolean {
    if (nowMs < this.lastAny) this.reset();
    if (live >= MAX_ON_SCREEN) return false;
    if (nowMs - this.lastAny < GLOBAL_GAP_MS) return false;
    const mine = this.lastBy.get(unit);
    if (priority !== 'high' && mine !== undefined && nowMs - mine < UNIT_GAP_MS) return false;
    this.lastAny = nowMs;
    this.lastBy.set(unit, nowMs);
    return true;
  }

  reset(): void {
    this.lastAny = -Infinity;
    this.lastBy.clear();
  }
}
