import { describe, expect, it } from 'vitest';
import { partyHeader, partySubtitle, pathHeader, pickToast, readableOn } from './levelUpLook';

describe('levelUpLook', () => {
  it('picks dark text on light fills and white on dark ones', () => {
    expect(readableOn(0xffffff)).toBe('#1a1410');
    expect(readableOn(0xe6b422)).toBe('#1a1410');
    expect(readableOn(0x3d6fe0)).toBe('#ffffff');
    expect(readableOn(0x0072b2)).toBe('#ffffff');
  });
  it('names the party and the hero', () => {
    expect(partyHeader('Thor-born', 3)).toBe('Party of Thor-born reached level 3');
    expect(pathHeader('Thor-born')).toBe('Thor-born chooses a path');
    expect(partySubtitle(4, 1)).toContain('1 hero grew');
    expect(partySubtitle(4, 3)).toContain('3 heroes grew');
    expect(pickToast('Thor-born', 'Iron Will')).toBe('Party of Thor-born: Iron Will');
  });
});
