import { describe, expect, it } from 'vitest';
import { rowsShown, runningTotal, tallyRows } from './essenceTally';

describe('essenceTally', () => {
  const lines = [
    { what: 'lairs', count: 3, each: 10, total: 30 },
    { what: 'tier3', count: 0, each: 5, total: 0 },
    { what: 'minutes', count: 12, each: 1, total: 12 },
    { what: 'boss', count: 1, each: 30, total: 30 },
  ] as const;
  it('shows only the sources that paid', () => {
    const rows = tallyRows(lines);
    expect(rows.map((r) => r.label)).toEqual(['Lairs cleared', 'Minutes survived', 'The boss']);
    expect(rows[0].detail).toBe('3 x 10');
    expect(rows[2].detail).toBe('');
  });
  it('reveals a row every 300 ms from the first', () => {
    expect(rowsShown(3, 0)).toBe(1);
    expect(rowsShown(3, 300)).toBe(2);
    expect(rowsShown(3, 5000)).toBe(3);
    expect(rowsShown(0, 100)).toBe(0);
  });
  it('counts the total up and ends on the sum', () => {
    const rows = tallyRows(lines);
    expect(runningTotal(rows, 0)).toBe(0);
    expect(runningTotal(rows, 150)).toBe(15);
    expect(runningTotal(rows, 5000)).toBe(72);
  });
});
