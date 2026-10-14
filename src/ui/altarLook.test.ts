import { describe, expect, it } from 'vitest';
import { GRAYBOX } from '../data/graybox';
import { buyRank, emptyMeta, metaRules, refundAltar } from '../sim/api';
import {
  altarRows,
  canAfford,
  conditionText,
  holdFraction,
  needLine,
  pantheonName,
} from './altarLook';

const meta = (over: Partial<ReturnType<typeof emptyMeta>> = {}) => ({ ...emptyMeta(), ...over });

describe('altarLook', () => {
  it('lists every upgrade in rule order, Favoured once per pantheon', () => {
    const rows = altarRows(GRAYBOX, meta());
    const rules = metaRules(GRAYBOX).altar;
    const perP = rules.filter((r) => r.perPantheon).length;
    const pantheons = new Set((GRAYBOX.gods ?? []).map((g) => g.pantheon)).size;
    expect(rows.length).toBe(rules.length - perP + perP * pantheons);
    expect(rows[0].id).toBe(rules[0].id);
  });
  it('marks a row poor with the missing Essence, buyable with enough', () => {
    const first = altarRows(GRAYBOX, meta({ essence: 0 }))[0];
    expect(first.state).toBe('poor');
    expect(first.need).toBe(first.cost);
    expect(needLine(40)).toBe('Need 40 more Essence');
    const rich = altarRows(GRAYBOX, meta({ essence: 1000 }))[0];
    expect(rich.state).toBe('buy');
    expect(canAfford(GRAYBOX, meta({ essence: 1000 }))).toBe(true);
    expect(canAfford(GRAYBOX, meta({ essence: 0 }))).toBe(false);
  });
  it('shows a full row after the last rank', () => {
    let m = meta({ essence: 100000 });
    const id = metaRules(GRAYBOX).altar[0].id;
    for (;;) {
      const r = buyRank(GRAYBOX, m, id);
      if (!r.ok) break;
      m = r.meta;
    }
    const row = altarRows(GRAYBOX, m)[0];
    expect(row.state).toBe('full');
    expect(row.rank).toBe(row.ranks);
    expect(row.cost).toBeNull();
  });
  it('locks a Favoured row of a pantheon that is not open and names the goal', () => {
    const rows = altarRows(GRAYBOX, meta()).filter((r) => r.pantheon);
    const greek = rows.find((r) => r.pantheon === 'greek')!;
    expect(greek.state).toBe('locked');
    expect(greek.goal.length).toBeGreaterThan(0);
    expect(rows.find((r) => r.pantheon === 'aesir')!.state).not.toBe('locked');
  });
  it('refunding gives every rank back (the sim rule the screen relies on)', () => {
    const r = buyRank(GRAYBOX, meta({ essence: 500 }), metaRules(GRAYBOX).altar[0].id);
    expect(r.ok).toBe(true);
    if (r.ok) expect(refundAltar(GRAYBOX, r.meta).essence).toBe(500);
  });
  it('words and ring', () => {
    expect(conditionText({ kind: 'win' })).toBe('Win a run');
    expect(conditionText({ kind: 'winWithPantheon', pantheon: 'greek' })).toBe(
      'Win with the Greek gods',
    );
    expect(pantheonName('aesir')).toBe('Aesir');
    expect(holdFraction(300, 600)).toBe(0.5);
    expect(holdFraction(9000, 600)).toBe(1);
  });
});
