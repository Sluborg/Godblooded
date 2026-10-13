import { describe, expect, it } from 'vitest';
import { lookOf } from '../data/looks';
import {
  artCandidates,
  baseType,
  buildingArtCandidates,
  buildingScale,
  unitArtId,
} from './unitLook';

describe('skin variants', () => {
  it('strips a trailing -v<n> so a variant shares its unit look', () => {
    expect(baseType('draugr-v2')).toBe('draugr');
    expect(baseType('jackal-man-v10')).toBe('jackal-man');
    expect(baseType('draugr')).toBe('draugr');
    expect(baseType('v2')).toBe('v2');
    expect(lookOf(baseType('troll-v3')).strike).toBe(lookOf('troll').strike);
  });
});

describe('unit picture ids', () => {
  it('always names the front picture, for heroes and monsters, whatever the tier', () => {
    expect(unitArtId('hero', 'warrior', 1)).toBe('hero_warrior_t1_front');
    expect(unitArtId('monster', 'draugr', 3)).toBe('mon_draugr_t3_front');
    expect(unitArtId('monster', 'jackal-man', 2)).toBe('mon_jackal-man_t2_front');
  });
});

describe('artCandidates', () => {
  it('a tier 1 hero tries its god, then the template', () => {
    expect(artCandidates('hero', 'warrior', 1, null, 'thor')).toEqual([
      'hero_thor_t1_front',
      'hero_warrior_t1_front',
    ]);
    expect(artCandidates('hero', 'warrior', 1)).toEqual(['hero_warrior_t1_front']);
  });
  it('a hero on a path tries path, god tier 1, template tier 1', () => {
    expect(artCandidates('hero', 'paladin', 2, 'thor-hammerborn', 'thor')).toEqual([
      'hero_thor-hammerborn_t2_front',
      'hero_thor_t1_front',
      'hero_paladin_t1_front',
    ]);
    expect(artCandidates('hero', 'paladin', 3, 'thor-hammerborn', 'thor')[0]).toBe(
      'hero_thor-hammerborn_t3_front',
    );
  });
  it('a tier 3 path hero falls back to its tier 2 picture, then god, then template', () => {
    expect(artCandidates('hero', 'paladin', 3, 'thor-hammerborn', 'thor')).toEqual([
      'hero_thor-hammerborn_t3_front',
      'hero_thor-hammerborn_t2_front',
      'hero_thor_t1_front',
      'hero_paladin_t1_front',
    ]);
  });
  it('a path is ignored at tier 1; monsters ignore god and path', () => {
    expect(artCandidates('hero', 'paladin', 1, 'thor-hammerborn', 'thor')).toEqual([
      'hero_thor_t1_front',
      'hero_paladin_t1_front',
    ]);
    expect(artCandidates('monster', 'troll', 2, 'x-y', 'thor')).toEqual([
      'mon_troll_t2_front',
      'mon_troll_t1_front',
    ]);
  });
});

describe('building art', () => {
  it('tries the tier, then tier 1', () => {
    expect(buildingArtCandidates('tower', 1)).toEqual(['bld_tower_t1']);
    expect(buildingArtCandidates('tower', 3)).toEqual(['bld_tower_t3', 'bld_tower_t1']);
  });
  it('fits wide pictures by width and tall ones by height', () => {
    expect(buildingScale(380, 300) * 380).toBeCloseTo(190);
    expect(buildingScale(346, 583) * 583).toBeCloseTo(280);
  });
});

describe('building art', () => {
  it('tries the tier, then tier 1', () => {
    expect(buildingArtCandidates('tower', 1)).toEqual(['bld_tower_t1']);
    expect(buildingArtCandidates('tower', 3)).toEqual(['bld_tower_t3', 'bld_tower_t1']);
  });
  it('fits wide pictures by width and tall ones by height', () => {
    expect(buildingScale(380, 300) * 380).toBeCloseTo(190);
    expect(buildingScale(346, 583) * 583).toBeCloseTo(280);
  });
});
