import { describe, expect, it } from 'vitest';
import { VIEW_MAX, viewFor } from './view';

describe('viewFor', () => {
  it('keeps 16:9 at 1280', () => expect(viewFor(16 / 9)).toBe(1280));
  it('a 20:9 phone gets 1600', () => expect(viewFor(2400 / 1080)).toBe(1600));
  it('never narrower than 1280 (4:3 tablets letterbox)', () => expect(viewFor(4 / 3)).toBe(1280));
  it('never wider than 21:9 (1680)', () => expect(viewFor(3)).toBe(VIEW_MAX));
  it('falls back to 1280 for nonsense', () => {
    expect(viewFor(0)).toBe(1280);
    expect(viewFor(NaN)).toBe(1280);
  });
  it('steps of 8 so a sliding bar does not relayout', () => {
    expect(viewFor(2.2) % 8).toBe(0);
  });
});
