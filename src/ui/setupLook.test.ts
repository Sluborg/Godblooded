import { describe, expect, it } from 'vitest';
import { GRAYBOX } from '../data/graybox';
import { emptyMeta } from '../sim/api';
import { chosenLean, portentLine, toggled, trialBonus, trialRows } from './setupLook';

describe('setupLook', () => {
  it('leans on the chosen open pantheon, else the first open one', () => {
    expect(chosenLean(GRAYBOX, emptyMeta())).toBe('aesir');
    expect(chosenLean(GRAYBOX, { ...emptyMeta(), unlocks: ['greek'], lean: 'greek' })).toBe(
      'greek',
    );
    // A chosen pantheon that is still locked is ignored.
    expect(chosenLean(GRAYBOX, { ...emptyMeta(), lean: 'egyptian' })).toBe('aesir');
    expect(portentLine('aesir')).toBe('The north stirs');
  });
  it('offers Trials only once they are unlocked', () => {
    expect(trialRows(GRAYBOX, emptyMeta())).toEqual([]);
    const open = trialRows(GRAYBOX, {
      ...emptyMeta(),
      unlocks: ['trials'],
      trialsWon: ['blood-moon'],
    });
    expect(open.length).toBeGreaterThan(0);
    expect(open.find((t) => t.id === 'blood-moon')?.won).toBe(true);
  });
  it('pays the Trial bonus and toggles ids', () => {
    expect(trialBonus(GRAYBOX, 3)).toBe(30);
    expect(toggled(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggled(['a', 'b'], 'a')).toEqual(['b']);
  });
});
