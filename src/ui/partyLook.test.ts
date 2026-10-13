import { GRAYBOX } from '../data/graybox';
import { describe, expect, it } from 'vitest';
import { PARTY_COLORS, partyColor, partyRole, godName, heroLabel } from './partyLook';

const parties = [
  { id: 1, members: [10, 11, 12] },
  { id: 2, members: [20] },
];

describe('partyRole', () => {
  it('first member leads, the rest are members', () => {
    expect(partyRole(10, 1, parties)).toBe('leader');
    expect(partyRole(11, 1, parties)).toBe('member');
  });
  it('party 0, a party of one or an unknown party is solo', () => {
    expect(partyRole(5, 0, parties)).toBe('solo');
    expect(partyRole(20, 2, parties)).toBe('solo');
    expect(partyRole(30, 9, parties)).toBe('solo');
  });
});

describe('partyColor', () => {
  it('is stable per id and wraps the palette', () => {
    expect(partyColor(1)).toBe(partyColor(1));
    expect(partyColor(1)).not.toBe(partyColor(2));
    expect(partyColor(1 + PARTY_COLORS.length)).toBe(partyColor(1));
  });
});

describe('heroLabel', () => {
  it('is "<God>-born" at tier 1 and the path name from tier 2', () => {
    expect(heroLabel({ god: 'thor', path: null, tier: 1 })).toBe('Thor-born');
    expect(heroLabel({ god: 'thor', path: 'thor-hammerborn', tier: 2 })).toBe('Hammerborn');
    expect(heroLabel({ god: 'thor', path: 'thor-hammerborn', tier: 1 })).toBe('Thor-born');
  });
  it('has no class word when the god is unknown', () => {
    expect(heroLabel({ god: null, path: null, tier: 1 })).toBe('Godborn');
  });
  it('names every god and path in the data', () => {
    for (const g of GRAYBOX.gods ?? []) expect(godName(g.id)).toBe(g.name);
    for (const p of GRAYBOX.paths ?? [])
      expect(heroLabel({ god: p.god, path: p.id, tier: 2 })).toBe(p.name);
  });
});
