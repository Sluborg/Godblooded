import type { EssenceLine } from '../sim/api';

// The Essence tally of the end screen (docs/systems/meta-ui.md section 2): one line per source,
// counting up one after another, then the total and the new balance.

const LABEL: Record<EssenceLine['what'], string> = {
  lairs: 'Lairs cleared',
  tier3: 'Tier 3 heroes',
  minutes: 'Minutes survived',
  boss: 'The boss',
  trials: 'Trials',
};

export interface TallyRow {
  label: string;
  // "3 x 10" for a counted source, '' for a flat one (the boss).
  detail: string;
  amount: number;
}

// The rows to show: sources that paid nothing are left out.
export function tallyRows(lines: readonly EssenceLine[]): TallyRow[] {
  return lines
    .filter((l) => l.total > 0)
    .map((l) => ({
      label: LABEL[l.what],
      detail: l.what === 'boss' ? '' : `${l.count} x ${l.each}`,
      amount: l.total,
    }));
}

// How many rows are visible `elapsedMs` after the tally starts: one more every `stepMs`.
export function rowsShown(total: number, elapsedMs: number, stepMs = 300): number {
  return Math.max(0, Math.min(total, 1 + Math.floor(elapsedMs / stepMs)));
}

// The running Essence total at `elapsedMs`: the rows so far (tween each row's own amount in).
export function runningTotal(rows: readonly TallyRow[], elapsedMs: number, stepMs = 300): number {
  let sum = 0;
  rows.forEach((r, i) => {
    const t = Math.max(0, Math.min(1, (elapsedMs - i * stepMs) / stepMs));
    sum += Math.round(r.amount * t);
  });
  return sum;
}
