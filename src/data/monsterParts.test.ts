import { describe, expect, it } from 'vitest';
import { MONSTER_RIG, monsterPartsLook, monsterPartsTypes } from './monsterParts';

describe('monster parts looks', () => {
  it('has the prototype rows', () => {
    expect(monsterPartsTypes()).toEqual(expect.arrayContaining(['draugr', 'troll']));
  });
  it('keeps every monster on its picture until a type is switched on', () => {
    for (const t of monsterPartsTypes()) {
      if (!MONSTER_RIG.has(t)) expect(monsterPartsLook(t, 1)).toBeUndefined();
    }
  });
  it('has no look for a type without a row', () => {
    expect(monsterPartsLook('no-such-monster', 1)).toBeUndefined();
  });
});
