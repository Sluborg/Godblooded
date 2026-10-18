import { describe, expect, it } from 'vitest';
import { isDeferredAsset, isSplashAsset, isUiAsset, missingIds, pickLogoId } from './assetPriority';

describe('splash assets', () => {
  it('recognises the key art and the logos', () => {
    expect(isSplashAsset('art_splash')).toBe(true);
    expect(isSplashAsset('ui_logo')).toBe(true);
    expect(isSplashAsset('ui_logo_b')).toBe(true);
    expect(isSplashAsset('ui_button')).toBe(false);
    expect(isSplashAsset('hero_thor_t1_front')).toBe(false);
  });
  it('picks the first logo, or none', () => {
    expect(pickLogoId(['x', 'ui_logo_b', 'ui_logo_a'])).toBe('ui_logo_a');
    expect(pickLogoId(['x'])).toBeNull();
  });
});

describe('isUiAsset', () => {
  it('is the interface kit, which loads before the title opens', () => {
    expect(isUiAsset('ui_button')).toBe(true);
    expect(isUiAsset('ui_panel')).toBe(true);
    expect(isUiAsset('bld_market_t1')).toBe(false);
    expect(isUiAsset('kit_heads_a')).toBe(false);
  });
});

describe('isDeferredAsset', () => {
  it('defers building tiers 2 and up and every lair', () => {
    expect(isDeferredAsset('bld_market_t2')).toBe(true);
    expect(isDeferredAsset('bld_temple_aesir_t3')).toBe(true);
    expect(isDeferredAsset('bld_lair_barrow_t1')).toBe(true);
    expect(isDeferredAsset('bld_lair_wyrm-nest_t2')).toBe(true);
  });
  it('keeps tier 1 buildings, the plot, units and the interface at start-up', () => {
    expect(isDeferredAsset('bld_market_t1')).toBe(false);
    expect(isDeferredAsset('bld_townhall_t1')).toBe(false);
    expect(isDeferredAsset('bld_plot')).toBe(false);
    expect(isDeferredAsset('hero_thor_t2_front')).toBe(false);
    expect(isDeferredAsset('ui_button')).toBe(false);
  });
});

describe('missingIds', () => {
  const known = (id: string) => id !== 'bld_ghost_t2';
  it('asks only for known pictures that are not loaded or requested yet', () => {
    const loaded = new Set(['a']);
    const requested = new Set(['b']);
    expect(
      missingIds(['a', 'b', 'c', 'c', 'bld_ghost_t2'], known, (id) => loaded.has(id), requested),
    ).toEqual(['c']);
  });
});
