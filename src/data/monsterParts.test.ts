import { describe, expect, it } from 'vitest';
import { kitFor } from './heroKits';
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
  it('draws the minotaur from its painted kit, which names its look kit', () => {
    expect(MONSTER_RIG.has('minotaur')).toBe(true);
    const look = monsterPartsLook('minotaur', 2);
    expect(look?.id).toBe('mon_minotaur_t2');
    expect(look?.def.kit).toBe('mon_minotaur');
    expect(kitFor('mon_minotaur')?.parts.weapon).toBe('weapon_doubleaxe');
  });
  it('has no look for a type without a row', () => {
    expect(monsterPartsLook('no-such-monster', 1)).toBeUndefined();
  });
});
