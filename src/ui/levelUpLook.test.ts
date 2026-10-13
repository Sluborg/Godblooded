import { describe, expect, it } from 'vitest';
import {
  partyHeader,
  partySubtitle,
  pathHeader,
  pickToast,
  readableOn,
  autoPickToast,
  cardColor,
} from './levelUpLook';

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

describe('auto pick', () => {
  it('names the level and the card', () => {
    expect(autoPickToast('Thor-born', 3, 'Iron Will')).toBe(
      'Party of Thor-born reached level 3: Iron Will',
    );
  });
  it('colours the glow by what the card gives', () => {
    expect(cardColor({ attr: { str: 2 } })).toBe(0xff5a4a);
    expect(cardColor({ attr: { dex: 2 } })).toBe(0x7ad7ff);
    expect(cardColor({ attr: { sta: 2 } })).toBe(0x6fcf6f);
    expect(cardColor({ healPct: 20 })).toBe(0x6fcf6f);
    expect(cardColor({ attr: { cha: 1 } })).toBe(0xffd75a);
    expect(cardColor(undefined)).toBe(0xffd75a);
  });
});
