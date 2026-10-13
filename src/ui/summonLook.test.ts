import { describe, expect, it } from 'vitest';
import { summonName } from './summonLook';

describe('summonName', () => {
  it('names a summon by its definition', () => {
    const u = {
      kind: 'summon' as const,
      type: 'wolf',
      summon: { owner: 1, def: 'stone-thrall', until: null, src: 'x' },
    };
    expect(summonName(u)).toBe('Stone thrall');
  });
  it('falls back to the type', () => {
    expect(summonName({ kind: 'summon', type: 'decoy' })).toBe('Decoy');
    expect(summonName({ kind: 'monster', type: 'draugr' })).toBe('Draugr');
  });
});
