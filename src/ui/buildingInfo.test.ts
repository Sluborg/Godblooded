import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../sim/api';
import { buildingEffect, buildingName, nextTierEffect } from './buildingInfo';

describe('buildingInfo', () => {
  it('names buildings', () => {
    expect(buildingName('temple_aesir')).toBe('Aesir temple');
    expect(buildingName('market')).toBe('Market');
    expect(buildingName('war_camp')).toBe('War camp');
  });
  it('reads the tuning table per tier', () => {
    const t = DEFAULT_TUNING.building;
    expect(buildingEffect('tower', 1)).toContain(`Range ${t.towerRange[0]}`);
    expect(buildingEffect('tower', 3)).toContain(`Range ${t.towerRange[2]}`);
    expect(buildingEffect('market', 2)).toContain(`x${t.marketTaxMult[1]}`);
    expect(buildingEffect('temple_greek', 1)).toContain('100%');
  });
  it('previews the next tier and nothing at the top', () => {
    expect(nextTierEffect('tower', 1)).toMatch(/^Next tier: Range/);
    expect(nextTierEffect('tower', DEFAULT_TUNING.building.maxTier)).toBe('');
  });
});
