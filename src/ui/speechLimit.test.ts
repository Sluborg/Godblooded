import { describe, expect, it } from 'vitest';
import { GLOBAL_GAP_MS, MAX_ON_SCREEN, SpeechLimit, UNIT_GAP_MS } from './speechLimit';

describe('SpeechLimit', () => {
  it('allows one bark per global gap, whoever speaks', () => {
    const l = new SpeechLimit();
    expect(l.allow(1, 1000, 0)).toBe(true);
    expect(l.allow(2, 1000 + GLOBAL_GAP_MS - 1, 0)).toBe(false);
    expect(l.allow(2, 1000 + GLOBAL_GAP_MS, 0)).toBe(true);
  });
  it('caps the bubbles on screen', () => {
    const l = new SpeechLimit();
    expect(l.allow(1, 0, MAX_ON_SCREEN)).toBe(false);
    expect(l.allow(1, 0, MAX_ON_SCREEN - 1)).toBe(true);
  });
  it('gives each hero a long personal cooldown, which high priority ignores', () => {
    const l = new SpeechLimit();
    expect(l.allow(1, 0, 0)).toBe(true);
    expect(l.allow(1, GLOBAL_GAP_MS * 2, 0)).toBe(false);
    expect(l.allow(1, GLOBAL_GAP_MS * 2, 0, 'high')).toBe(true);
    expect(l.allow(1, GLOBAL_GAP_MS * 2 + UNIT_GAP_MS, 0)).toBe(true);
  });
  it('high priority never ignores the global gap', () => {
    const l = new SpeechLimit();
    l.allow(1, 0, 0);
    expect(l.allow(2, 1000, 0, 'high')).toBe(false);
  });
  it('a refused bark does not use up the slot', () => {
    const l = new SpeechLimit();
    l.allow(1, 0, 0);
    expect(l.allow(1, 1000, 0)).toBe(false);
    expect(l.allow(2, GLOBAL_GAP_MS, 0)).toBe(true);
  });
  it('forgets everything when the clock runs backwards', () => {
    const l = new SpeechLimit();
    l.allow(1, 50000, 0);
    expect(l.allow(1, 100, 0)).toBe(true);
  });
});
