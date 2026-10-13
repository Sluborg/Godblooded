// Pure helpers for the end screen: the run clock text, the gold curve and the hero rows.

export function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface Pt {
  x: number;
  y: number;
}

// Gold-over-time samples as points inside a w x h box: x by time over the whole run (0..timeMs),
// y by gold with 0 at the bottom. Returns the top of the scale too, for the axis label. Fewer than
// two samples give a flat line.
export function sparkline(
  history: readonly { timeMs: number; gold: number }[],
  w: number,
  h: number,
): { points: Pt[]; maxGold: number } {
  const maxGold = Math.max(1, ...history.map((s) => s.gold));
  const tEnd = Math.max(1, ...history.map((s) => s.timeMs));
  const points = history.map((s) => ({
    x: (s.timeMs / tEnd) * w,
    y: h - (s.gold / maxGold) * h,
  }));
  if (points.length < 2)
    return {
      points: [
        { x: 0, y: h },
        { x: w, y: h },
      ],
      maxGold,
    };
  return { points, maxGold };
}

// The heroes to list (best first, as the sim sorts them) and how many were left out.
export function visibleHeroes<T>(
  heroes: readonly T[],
  max: number,
): { shown: T[]; hidden: number } {
  return { shown: heroes.slice(0, max), hidden: Math.max(0, heroes.length - max) };
}
