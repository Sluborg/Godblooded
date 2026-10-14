import { describe, expect, it } from 'vitest';
import { GRAYBOX } from '../data/graybox';
import { emptyMeta } from '../sim/api';
import { sagaRows, sagaTitle, unlockRows } from './hallLook';

describe('hallLook', () => {
  it('names a Saga hero after its god and path', () => {
    expect(
      sagaTitle({
        god: 'thor',
        path: 'thor-hammerborn',
        type: 'x',
        kills: 3,
        ending: 'won',
        slain: false,
        runs: 2,
      }),
    ).toBe('Thor-born Hammerborn');
    expect(
      sagaTitle({
        god: null,
        path: null,
        type: 'x',
        kills: 0,
        ending: 'lost',
        slain: true,
        runs: 1,
        name: 'Eirik',
      }),
    ).toBe('Eirik');
  });
  it('lists the Saga newest first', () => {
    const e = (runs: number) => ({
      god: 'thor',
      path: null,
      type: 'x',
      kills: runs,
      ending: 'won' as const,
      slain: false,
      runs,
    });
    const rows = sagaRows(GRAYBOX, { ...emptyMeta(), saga: [e(1), e(2)] });
    expect(rows.map((r) => r.note)).toEqual(['2 kills', '1 kills']);
  });
  it('lists owned unlocks first and greys the rest with their goal', () => {
    const rows = unlockRows(GRAYBOX, { ...emptyMeta(), unlocks: ['greek'] });
    expect(rows[0].title).toBe('The Greek gods');
    expect(rows[0].dim).toBe(false);
    expect(rows.slice(1).every((r) => r.dim)).toBe(true);
    expect(rows[1].sub.length).toBeGreaterThan(0);
  });
});
