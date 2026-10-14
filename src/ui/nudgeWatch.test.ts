import { describe, expect, it } from 'vitest';
import { NUDGE_FROM_MS, NUDGE_IDLE_MS, NudgeWatch } from './nudgeWatch';

const lair = (id: number, tier = 1, hp = 100, nextTierMs?: number) => ({
  id,
  tier,
  hp,
  nextTierMs,
});

describe('NudgeWatch', () => {
  it('never nudges a boss lair', () => {
    const w = new NudgeWatch();
    const lairs = [{ ...lair(1, 1), boss: true }];
    w.update(lairs, 0, 3);
    expect(w.update(lairs, NUDGE_FROM_MS, 3)).toBeNull();
  });

  it('waits for 3:00 and for 120 s without a flag', () => {
    const w = new NudgeWatch();
    const lairs = [lair(1)];
    w.update(lairs, 0, 3);
    expect(w.update(lairs, NUDGE_FROM_MS - 1, 3)).toBeNull();
    expect(w.update(lairs, NUDGE_FROM_MS, 3)).toBe(1);
    w.flagPlaced(NUDGE_FROM_MS + 1000);
    expect(w.update(lairs, NUDGE_FROM_MS + 2000, 3)).toBeNull();
    expect(w.update(lairs, NUDGE_FROM_MS + 1000 + NUDGE_IDLE_MS, 3)).toBe(1);
  });

  it('needs a lair untouched for 120 s and below the top tier', () => {
    const w = new NudgeWatch();
    w.update([lair(1, 1, 100), lair(2, 3, 100)], 100_000, 3);
    // Lair 1 was hurt at 200 s; lair 2 is at the top tier.
    expect(w.update([lair(1, 1, 90), lair(2, 3, 100)], 200_000, 3)).toBeNull();
    expect(w.update([lair(1, 1, 90), lair(2, 3, 100)], 200_000 + NUDGE_IDLE_MS, 3)).toBe(1);
  });

  it('picks the lair nearest its tier-up', () => {
    const w = new NudgeWatch();
    const lairs = [lair(1, 1, 100, 90_000), lair(2, 2, 100, 30_000), lair(3, 2, 100, 60_000)];
    w.update(lairs, 0, 3);
    expect(w.update(lairs, NUDGE_FROM_MS, 3)).toBe(2);
  });

  it('falls back on the highest tier without nextTierMs', () => {
    const w = new NudgeWatch();
    const lairs = [lair(1, 1), lair(2, 2)];
    w.update(lairs, 0, 3);
    expect(w.update(lairs, NUDGE_FROM_MS, 3)).toBe(2);
  });
});
