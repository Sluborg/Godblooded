import { describe, expect, it } from 'vitest';
import { GLOBAL_GAP_MS, SpeechLimit, UNIT_GAP_MS } from './speechLimit';

describe('SpeechLimit', () => {
  it('allows one bark per global gap, whoever speaks', () => {
    const l = new SpeechLimit();
    expect(l.allow(1, 1000)).toBe(true);
    expect(l.allow(2, 1000 + GLOBAL_GAP_MS - 1)).toBe(false);
    expect(l.allow(2, 1000 + GLOBAL_GAP_MS)).toBe(true);
  });
  it('gives each hero a long personal cooldown', () => {
    const l = new SpeechLimit();
    expect(l.allow(1, 0)).toBe(true);
    expect(l.allow(1, GLOBAL_GAP_MS * 2)).toBe(false);
    expect(l.allow(1, UNIT_GAP_MS)).toBe(true);
  });
  it('a refused bark does not use up the slot', () => {
    const l = new SpeechLimit();
    l.allow(1, 0);
    expect(l.allow(1, 1000)).toBe(false);
    expect(l.allow(2, GLOBAL_GAP_MS)).toBe(true);
  });
  it('forgets everything when the clock runs backwards', () => {
    const l = new SpeechLimit();
    l.allow(1, 50000);
    expect(l.allow(1, 100)).toBe(true);
  });
});
