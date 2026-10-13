import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../sim/api';
import type { ItemDef } from '../sim/types';
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
  describe('shops read the item rows', () => {
    const t = DEFAULT_TUNING.building;
    const items: ItemDef[] = [
      { id: 'w1', slot: 'weapon', level: 1, price: 60, shop: 'smithy', shopTier: 1, effects: {} },
      { id: 'w2', slot: 'weapon', level: 2, price: 150, shop: 'smithy', shopTier: 2, effects: {} },
      { id: 'a1', slot: 'armour', level: 1, price: 50, shop: 'smithy', shopTier: 1, effects: {} },
      { id: 'a2', slot: 'armour', level: 2, price: 130, shop: 'smithy', shopTier: 2, effects: {} },
      {
        id: 'healing',
        slot: 'potion',
        name: 'Healing potion',
        price: 20,
        shop: 'market',
        shopTier: 1,
        effects: {},
      },
      {
        id: 'greater',
        slot: 'potion',
        name: 'Greater potion',
        price: 40,
        shop: 'market',
        shopTier: 2,
        effects: {},
      },
    ];
    it('the smithy sells up to its tier', () => {
      expect(buildingEffect('smithy', 1, t, items)).toBe(
        'Sells weapon level 1 for 60, armour level 1 for 50 gold',
      );
      expect(buildingEffect('smithy', 2, t, items)).toBe(
        'Sells weapon level 2 for 150, armour level 2 for 130 gold',
      );
    });
    it('the market names the potion it sells, not a gold cap', () => {
      expect(buildingEffect('market', 1, t, items)).toBe(
        'Tax x1. Sells Healing potion for 20 gold',
      );
      expect(buildingEffect('market', 2, t, items)).toContain('Greater potion for 40');
      expect(buildingEffect('market', 2, t, items)).not.toContain('per visit');
    });
    it('falls back to the tax and stock line without item rows', () => {
      expect(buildingEffect('market', 1, t, [])).toContain('gold per visit');
      expect(buildingEffect('smithy', 1, t, [])).toBe('');
    });
    it('previews the next tier of a shop', () => {
      expect(nextTierEffect('smithy', 1, t, items)).toContain('weapon level 2');
    });
  });
});
