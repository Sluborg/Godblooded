import { describe, expect, it } from 'vitest';
import { isSplashAsset, isUiAsset, pickLogoId } from './assetPriority';

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
