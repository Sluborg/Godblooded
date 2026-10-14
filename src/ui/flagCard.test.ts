import { describe, expect, it } from 'vitest';
import { flagAt, flagLines, refundFor } from './flagCard';

describe('flagAt', () => {
  const flags = [
    { id: 1, pos: { x: 100, y: 100 } },
    { id: 2, pos: { x: 140, y: 100 } },
  ];
  it('picks the nearest flag within 60 and none beyond', () => {
    expect(flagAt(flags, { x: 130, y: 100 })).toBe(2);
    expect(flagAt(flags, { x: 100, y: 150 })).toBe(1);
    expect(flagAt(flags, { x: 100, y: 161 })).toBeNull();
    expect(flagAt([], { x: 0, y: 0 })).toBeNull();
  });
});

describe('flag card text', () => {
  it('refund rounds down', () => {
    expect(refundFor(25, 0.5)).toBe(12);
    expect(refundFor(100, 0.5)).toBe(50);
  });
  it('says who is heading for the flag', () => {
    expect(flagLines(50, 0, 0.5)[0]).toBe('No hero is heading for it yet');
    expect(flagLines(50, 1, 0.5)[0]).toBe('1 hero is heading for it');
    expect(flagLines(50, 0, 0.5, 'wolf')[0]).toBe(
      'Follows the wolf; the hero who kills it gets the gold',
    );
    expect(flagLines(50, 3, 0.5)).toEqual([
      '3 heroes are heading for it',
      'Cancel takes it down and gives 25 gold back',
    ]);
  });
});
