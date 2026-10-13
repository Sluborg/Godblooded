import { describe, expect, it } from 'vitest';
import { isSplashAsset, pickLogoId } from './assetPriority';

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
