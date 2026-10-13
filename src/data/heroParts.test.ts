import { describe, expect, it } from 'vitest';
import { GRAYBOX } from './graybox';
import { heroPartsLook, partsGods } from './heroParts';

describe('hero parts looks', () => {
  it('every parts god and path exists in the game data', () => {
    for (const { god, paths } of partsGods()) {
      expect(GRAYBOX.gods?.some((g) => g.id === god)).toBe(true);
      for (const id of paths) expect(GRAYBOX.paths?.some((p) => p.id === id)).toBe(true);
    }
  });
  it('a path keeps its god face and palette and adds its gear', () => {
    const base = heroPartsLook('thor', null, 1)?.def;
    const path = heroPartsLook('thor', 'thor-hammerborn', 2)?.def;
    expect(path?.skin).toBe(base?.skin);
    expect(path?.hairCol).toBe(base?.hairCol);
    expect(path?.beard).toBe(base?.beard);
    expect(path?.plate).toBeTruthy();
    expect(base?.plate).toBeUndefined();
  });
  it('tier 3 is tier 2 with more on top, and the attack is merged not replaced', () => {
    const t2 = heroPartsLook('odin', 'odin-wanderer', 2)?.def;
    const t3 = heroPartsLook('odin', 'odin-wanderer', 3)?.def;
    expect(t3?.weapon).toBe(t2?.weapon);
    expect(t3?.aura).toBeTruthy();
    expect(t2?.aura).toBeUndefined();
    expect(t2?.atk.style).toBe('thrust');
    expect(t3?.atk.style).toBe('thrust');
  });
  it('has no look for a god or path the data does not cover', () => {
    expect(heroPartsLook('ares', null, 1)).toBeUndefined();
    expect(heroPartsLook('thor', 'thor-nope', 2)).toBeUndefined();
    expect(heroPartsLook(null, null, 1)).toBeUndefined();
  });
  it('ids are stable per look', () => {
    expect(heroPartsLook('thor', null, 1)?.id).toBe('thor_t1');
    expect(heroPartsLook('thor', 'thor-hammerborn', 3)?.id).toBe('thor-hammerborn_t3');
  });
});
