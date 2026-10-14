import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings';
import { PARTY_COLORS, PARTY_COLORS_CB, partyColor } from './partyLook';

describe('parseSettings', () => {
  it('falls back to defaults on junk', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('{oops')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(42)).toEqual(DEFAULT_SETTINGS);
  });
  it('keeps valid fields and drops invalid ones', () => {
    expect(parseSettings('{"speed":4,"reducedMotion":true,"palette":"colourblind"}')).toEqual({
      speed: 4,
      reducedMotion: true,
      palette: 'colourblind',
      musicVolume: DEFAULT_SETTINGS.musicVolume,
      musicMuted: false,
      heroNames: false,
      hintsOn: true,
    });
    expect(parseSettings({ speed: 3, reducedMotion: 'yes', palette: 'neon' })).toEqual(
      DEFAULT_SETTINGS,
    );
  });
});

describe('music settings', () => {
  it('defaults to 60% and snaps to 5% steps', () => {
    expect(DEFAULT_SETTINGS.musicVolume).toBe(0.6);
    expect(parseSettings({ musicVolume: 0.73 }).musicVolume).toBe(0.75);
    expect(parseSettings({ musicVolume: 7 }).musicVolume).toBe(1);
    expect(parseSettings({ musicVolume: 'loud' }).musicVolume).toBe(0.6);
    expect(parseSettings({ musicMuted: true }).musicMuted).toBe(true);
    expect(DEFAULT_SETTINGS.heroNames).toBe(false);
    expect(DEFAULT_SETTINGS.hintsOn).toBe(true);
    expect(parseSettings({ hintsOn: false }).hintsOn).toBe(false);
    expect(parseSettings({ heroNames: true }).heroNames).toBe(true);
  });
});

describe('palette', () => {
  it('has eight colours in both palettes', () => {
    expect(PARTY_COLORS_CB).toHaveLength(PARTY_COLORS.length);
    expect(partyColor(1, 'colourblind')).toBe(PARTY_COLORS_CB[0]);
    expect(partyColor(1)).toBe(PARTY_COLORS[0]);
  });
});
