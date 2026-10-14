import { describe, expect, it } from 'vitest';
import { INTENT_LOOK, isIntentKind } from './intentIcon';

describe('intent icons', () => {
  it('has a look for each of the 8 sim intents and the M3 escort, and only resting is dim', () => {
    const kinds = [
      'flag',
      'lair',
      'revenge',
      'explore',
      'retreat',
      'shop',
      'rest',
      'defend',
      'escort',
    ];
    expect(Object.keys(INTENT_LOOK).sort()).toEqual([...kinds].sort());
    for (const k of kinds) expect(isIntentKind(k)).toBe(true);
    expect(isIntentKind('dance')).toBe(false);
    expect(
      Object.entries(INTENT_LOOK)
        .filter(([, v]) => v.dim)
        .map(([k]) => k),
    ).toEqual(['rest']);
  });
});
