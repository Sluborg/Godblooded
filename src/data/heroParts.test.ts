import { describe, expect, it } from 'vitest';
import { GRAYBOX } from './graybox';
import { GOD_PARTS, PATH_PARTS, heroPartsId, heroPartsRow } from './heroParts';

describe('hero parts rows', () => {
  it('every parts row belongs to a real god or path', () => {
    for (const id of Object.keys(GOD_PARTS))
      expect(GRAYBOX.gods?.some((g) => g.id === id)).toBe(true);
    for (const id of Object.keys(PATH_PARTS))
      expect(GRAYBOX.paths?.some((p) => p.id === id)).toBe(true);
  });
  it('a path keeps its god face and palette and adds its gear', () => {
    const base = heroPartsRow('thor', null, 1);
    const path = heroPartsRow('thor', 'thor-hammerborn', 2);
    expect(path?.skin).toBe(base?.skin);
    expect(path?.hairCol).toBe(base?.hairCol);
    expect(path?.beard).toBe(base?.beard);
    expect(path?.plate).toBe(true);
    expect(base?.plate).toBeUndefined();
  });
  it('tier 3 is tier 2 with more on top', () => {
    const t2 = heroPartsRow('odin', 'odin-seer', 2);
    const t3 = heroPartsRow('odin', 'odin-seer', 3);
    expect(t3?.head).toBe(t2?.head);
    expect(t3?.scale).toBeGreaterThan(1);
  });
  it('has no row for a god or path the data does not cover', () => {
    expect(heroPartsRow('ares', null, 1)).toBeUndefined();
    expect(heroPartsRow('thor', 'thor-nope', 2)).toBeUndefined();
    expect(heroPartsRow(null, null, 1)).toBeUndefined();
  });
  it('ids are stable per look', () => {
    expect(heroPartsId('thor', null, 1)).toBe('thor_t1');
    expect(heroPartsId('thor', 'thor-hammerborn', 3)).toBe('thor-hammerborn_t3');
  });
});
