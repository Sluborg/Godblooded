// Barks are rationed until there are many more lines: one on screen per GLOBAL_GAP_MS across the
// whole town, and one per hero per UNIT_GAP_MS. Times are sim ms; a clock that runs backwards
// (a new run) clears the memory.
export const GLOBAL_GAP_MS = 6000;
export const UNIT_GAP_MS = 30000;

export class SpeechLimit {
  private lastAny = -Infinity;
  private lastBy = new Map<number, number>();

  allow(unit: number, nowMs: number): boolean {
    if (nowMs < this.lastAny) this.reset();
    if (nowMs - this.lastAny < GLOBAL_GAP_MS) return false;
    const mine = this.lastBy.get(unit);
    if (mine !== undefined && nowMs - mine < UNIT_GAP_MS) return false;
    this.lastAny = nowMs;
    this.lastBy.set(unit, nowMs);
    return true;
  }

  reset(): void {
    this.lastAny = -Infinity;
    this.lastBy.clear();
  }
}
