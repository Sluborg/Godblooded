import { describe, expect, it } from 'vitest';
import { faceOf } from '../data/heroKits';

describe('portraits', () => {
  it('names the face after the head part', () => {
    expect(faceOf('head_grim')).toBe('grim');
    expect(faceOf('head_hooded_beard')).toBe('hooded_beard');
    expect(faceOf('grim')).toBe('grim');
  });
});
