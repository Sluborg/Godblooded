import { describe, expect, it } from 'vitest';
import { buildInfo, buildTap } from './buildMenu';

describe('buildTap', () => {
  it('never builds on a first tap', () => {
    expect(buildTap(null, 'market', 999, 60)).toEqual({ action: 'select', selected: 'market' });
  });
  it('another item switches the selection', () => {
    expect(buildTap('market', 'smithy', 999, 90)).toEqual({ action: 'select', selected: 'smithy' });
  });
  it('a second tap on the same item builds when affordable', () => {
    expect(buildTap('market', 'market', 60, 60)).toEqual({ action: 'build', selected: 'market' });
  });
  it('a second tap that cannot be afforded says how much is missing and builds nothing', () => {
    expect(buildTap('market', 'market', 20, 60)).toEqual({
      action: 'need',
      selected: 'market',
      need: 40,
    });
    expect(buildTap('market', 'market', 20.5, 60)).toMatchObject({ need: 40 });
  });
});

describe('buildInfo', () => {
  const base = { name: 'Market', cost: 60, gold: 100, effect: 'Tax x1.2', next: 'Tier 2: x1.5' };
  it('uses text as the role line and keeps the effect below it', () => {
    const i = buildInfo({ ...base, text: 'Heroes shop here' });
    expect(i.title).toBe('Market  ·  60 gold');
    expect(i.lines).toEqual(['Heroes shop here', 'Tax x1.2', 'Tier 2: x1.5']);
    expect(i.affordable).toBe(true);
  });
  it('falls back to the effect line when the row has no text, and flags a poor town', () => {
    const i = buildInfo({ ...base, gold: 10 });
    expect(i.lines).toEqual(['Tax x1.2', 'Tier 2: x1.5']);
    expect(i.affordable).toBe(false);
  });
  it('drops an empty next-tier line', () => {
    expect(buildInfo({ ...base, next: '' }).lines).toEqual(['Tax x1.2']);
  });
});
