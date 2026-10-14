import { describe, expect, it } from 'vitest';
import { collectorInfo, popText, sackSize, tillShown } from './taxLook';

describe('tax look', () => {
  it('shows a till from minTill', () => {
    expect(tillShown(undefined, 10)).toBe(false);
    expect(tillShown(9, 10)).toBe(false);
    expect(tillShown(10, 10)).toBe(true);
  });

  it('sizes the sack: empty, under half, half or more', () => {
    expect(sackSize(0, 150)).toBe(0);
    expect(sackSize(40, 150)).toBe(1);
    expect(sackSize(74, 150)).toBe(1);
    expect(sackSize(75, 150)).toBe(2);
    expect(sackSize(150, 150)).toBe(2);
  });

  it('writes a +N pop', () => {
    expect(popText(45)).toBe('+45');
    expect(popText(12.4)).toBe('+12');
  });

  it('words the info strip', () => {
    expect(collectorInfo(45)).toBe('Tax collector: carrying 45 gold');
    expect(collectorInfo(0)).toContain('nothing carried');
  });
});
