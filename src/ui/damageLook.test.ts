import { describe, expect, it } from 'vitest';
import { damageLook, MAX_FLOATS, RESIST_COLOR, TYPE_COLORS, typeTint } from './damageLook';

describe('damageLook', () => {
  it('colours a number by its damage type', () => {
    expect(damageLook(7, false, { type: 'fire' })?.color).toBe(TYPE_COLORS.fire);
    expect(damageLook(7, false)?.color).toBe(TYPE_COLORS.physical);
    expect(damageLook(7, false, { type: 'mystery' })?.color).toBe(TYPE_COLORS.physical);
  });
  it('makes a crit bigger with an exclamation mark', () => {
    const n = damageLook(7, false, { type: 'physical' });
    const c = damageLook(7, false, { type: 'physical', crit: true });
    expect(c?.text).toBe('7!');
    expect(c!.fontSize).toBeGreaterThan(n!.fontSize);
  });
  it('shows the word miss on a dodge, whatever the damage', () => {
    expect(damageLook(0, true)?.text).toBe('miss');
    expect(damageLook(9, true, { type: 'fire' })?.text).toBe('miss');
  });
  it('tags a weak hit and greys a resisted one', () => {
    expect(damageLook(7, false, { type: 'frost', weak: true })?.tag).toBe('weak');
    expect(damageLook(2, false, { type: 'frost', resist: true })?.color).toBe(RESIST_COLOR);
  });
  it('shows a burn tick as a small number', () => {
    const t = damageLook(3, false, { type: 'fire', tick: true });
    expect(t?.fontSize).toBe(18);
    expect(t?.color).toBe(TYPE_COLORS.fire);
  });
  it('shows nothing for a zero-damage hit', () => {
    expect(damageLook(0, false, { type: 'physical' })).toBeNull();
  });
  it('tints bolts by type, plain for physical', () => {
    expect(typeTint('physical')).toBeNull();
    expect(typeTint(undefined)).toBeNull();
    expect(typeTint('fire')).toBe(0xff9a4d);
  });
  it('caps floating numbers at six', () => {
    expect(MAX_FLOATS).toBe(6);
  });
});
