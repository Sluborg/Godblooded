import { describe, expect, it } from 'vitest';
import {
  groundScale,
  pipRow,
  plateColor,
  ringCountdown,
  ringFill,
  ringStage,
} from './lairRingLook';

describe('growth ring', () => {
  it('fills from the last tier-up to the next', () => {
    expect(ringFill(90_000, 120_000)).toBeCloseTo(0.25);
    expect(ringFill(0, 120_000)).toBe(1);
  });

  it('has no ring without a clock', () => {
    expect(ringFill(null, 120_000)).toBeNull();
    expect(ringFill(10_000, undefined)).toBeNull();
    expect(ringFill(10_000, 0)).toBeNull();
  });

  it('goes dim, amber at 60 s, pulsing at 15 s', () => {
    expect(ringStage(61_000)).toBe('dim');
    expect(ringStage(60_000)).toBe('amber');
    expect(ringStage(15_000)).toBe('pulse');
  });

  it('counts down in the last 60 s only', () => {
    expect(ringCountdown(61_000)).toBeNull();
    expect(ringCountdown(59_100)).toBe(60);
    expect(ringCountdown(0)).toBe(0);
  });

  it('colours the plate and grows the ground by tier', () => {
    expect(plateColor(1)).not.toBe(plateColor(2));
    expect(plateColor(2)).not.toBe(plateColor(3));
    expect([1, 2, 3].map(groundScale)).toEqual([1, 1.15, 1.3]);
  });
});

describe('guard pips', () => {
  it('fills the living, then one filling slot, then empties', () => {
    const row = pipRow(2, 5, 0.4);
    expect(row.map((p) => p.kind)).toEqual(['alive', 'alive', 'filling', 'empty', 'empty']);
    expect(row[2].fill).toBeCloseTo(0.4);
  });

  it('is full without a filling slot', () => {
    expect(pipRow(3, 3, 0).every((p) => p.kind === 'alive')).toBe(true);
  });
});
