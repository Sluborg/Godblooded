import { describe, expect, it } from 'vitest';
import { armourOutline, glyphOf, hasGear, potionPips, weaponGlow } from './gearLook';

const items = (weapon: number, armour: number, potions: number) =>
  ({ weapon, armour, potions, charm: null }) as never;

describe('gear look', () => {
  it('outlines armour: none, iron, bronze, gold', () => {
    expect(armourOutline(0)).toBeNull();
    expect(armourOutline(1)).toBe(0x9aa0a8);
    expect(armourOutline(3)).toBe(0xf2c14e);
    expect(armourOutline(9)).toBe(0xf2c14e);
  });
  it('weapon: nothing, shimmer, then a glow in the damage colour', () => {
    expect(weaponGlow(1).kind).toBe('none');
    expect(weaponGlow(2).kind).toBe('shimmer');
    expect(weaponGlow(3, 'fire')).toEqual({ kind: 'glow', color: 0xff9a4d });
    expect(weaponGlow(3, 'nonsense')).toEqual({ kind: 'glow', color: 0xffd9d9 });
  });
  it('pips follow the potions carried, capped', () => {
    expect(potionPips(undefined)).toBe(0);
    expect(potionPips(items(0, 0, 2))).toBe(2);
    expect(potionPips(items(0, 0, 9))).toBe(5);
  });
  it('hasGear is false for a bare hero', () => {
    expect(hasGear(undefined)).toBe(false);
    expect(hasGear(items(1, 0, 0))).toBe(false);
    expect(hasGear(items(2, 0, 0))).toBe(true);
    expect(hasGear(items(0, 1, 0))).toBe(true);
    expect(hasGear(items(0, 0, 1))).toBe(true);
  });
  it('glyphs by slot', () => {
    expect(glyphOf('weapon')).toBe('sword');
    expect(glyphOf('armour')).toBe('shield');
    expect(glyphOf('potion')).toBe('flask');
    expect(glyphOf('charm')).toBe('charm');
    expect(glyphOf(undefined)).toBe('flask');
  });
});
