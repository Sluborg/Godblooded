import { describe, expect, it } from 'vitest';
import { lookOf } from '../data/looks';
import { baseType, unitArtId } from './unitLook';

describe('skin variants', () => {
  it('strips a trailing -v<n> so a variant shares its unit look', () => {
    expect(baseType('draugr-v2')).toBe('draugr');
    expect(baseType('jackal-man-v10')).toBe('jackal-man');
    expect(baseType('draugr')).toBe('draugr');
    expect(baseType('v2')).toBe('v2');
    expect(lookOf(baseType('troll-v3')).strike).toBe(lookOf('troll').strike);
  });
});

describe('unit picture ids', () => {
  it('always names the front picture, for heroes and monsters, whatever the tier', () => {
    expect(unitArtId('hero', 'warrior', 1)).toBe('hero_warrior_t1_front');
    expect(unitArtId('monster', 'draugr', 3)).toBe('mon_draugr_t3_front');
    expect(unitArtId('monster', 'jackal-man', 2)).toBe('mon_jackal-man_t2_front');
  });
});
