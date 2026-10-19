import { afterEach, describe, expect, it, vi } from 'vitest';
import { THORBLOOD_HEADS, kitFor, thorbloodCombo, thorbloodHead } from './heroKits';

const withSwitch = (on: boolean) =>
  vi.stubGlobal('location', { search: on ? '?heroes=thorbloods' : '' });

afterEach(() => vi.unstubAllGlobals());

describe('Thorbloods test switch', () => {
  it('is off without ?heroes=thorbloods', () => {
    withSwitch(false);
    expect(thorbloodCombo('thor_t1')).toBeUndefined();
    expect(kitFor('thor_t1')?.parts.torso).not.toBe('body_thorblood');
  });
  it('gives Thor looks the kit: hammer by tier, thunderstaff for the Stormcaller, a head by suffix', () => {
    withSwitch(true);
    expect(kitFor('thor_t1')?.parts.weapon).toBe('hammer_t1');
    expect(kitFor('thor-hammerborn_t2~f1')?.parts).toMatchObject({
      torso: 'body_thorblood',
      head: 'head_thorblood_f1',
      weapon: 'hammer_t2',
      cloak: 'cape_neutral',
      collar: 'collar_thorblood',
    });
    expect(kitFor('thor-stormcaller_t3~m2')?.parts.weapon).toBe('thunderstaff_t3');
    expect(kitFor('thor_t1')?.codeBalls).toBeDefined();
    expect(kitFor('thor_t1')?.tint?.cloak).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('leaves other gods alone and cycles the four heads by unit id', () => {
    withSwitch(true);
    expect(thorbloodCombo('odin_t1')).toBeUndefined();
    expect(new Set([1, 2, 3, 4].map(thorbloodHead)).size).toBe(THORBLOOD_HEADS.length);
    expect(thorbloodHead(5)).toBe(thorbloodHead(1));
  });
});
