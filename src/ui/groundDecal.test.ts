import { describe, expect, it } from 'vitest';
import { lairTitle } from './groundDecal';

describe('lairTitle', () => {
  it('capitalises each word of a lair id', () => {
    expect(lairTitle('wyrm-nest')).toBe('Wyrm Nest');
    expect(lairTitle('barrow')).toBe('Barrow');
    expect(lairTitle('harpy_roost')).toBe('Harpy Roost');
  });
});
