import { describe, expect, it } from 'vitest';
import { lookOf } from '../data/looks';
import { baseType } from './unitLook';

describe('skin variants', () => {
  it('strips a trailing -v<n> so a variant shares its unit look', () => {
    expect(baseType('draugr-v2')).toBe('draugr');
    expect(baseType('jackal-man-v10')).toBe('jackal-man');
    expect(baseType('draugr')).toBe('draugr');
    expect(baseType('v2')).toBe('v2');
    expect(lookOf(baseType('troll-v3')).strike).toBe(lookOf('troll').strike);
  });
});
