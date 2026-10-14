import { describe, expect, it } from 'vitest';
import { HINTS } from '../data/hints';
import {
  GAP_BEAT_MS,
  GAP_FIRST_MS,
  HintEngine,
  MAX_LINE,
  SHOW_MS,
  hintLines,
  hintsFromEvent,
  type HintDef,
} from './hints';

const def = (o: Partial<HintDef> & { id: string }): HintDef => ({
  order: 10,
  group: 'first',
  trigger: o.id,
  milestone: 2,
  line1: 'x',
  target: { kind: 'none' },
  ...o,
});

describe('the hint rows', () => {
  it('have at most 2 lines of at most 40 characters, no long dashes or exclamation marks', () => {
    for (const h of HINTS) {
      const lines = hintLines(h);
      expect(lines.length, h.id).toBeLessThanOrEqual(2);
      for (const l of lines) {
        expect(l.length, `${h.id}: ${l}`).toBeLessThanOrEqual(MAX_LINE);
        expect(l).not.toMatch(/[!—]/);
      }
    }
  });
  it('have unique ids, and "after" rows point at a real hint', () => {
    const ids = new Set(HINTS.map((h) => h.id));
    expect(ids.size).toBe(HINTS.length);
    for (const h of HINTS) if (h.after) expect(ids.has(h.after.hint), h.id).toBe(true);
  });
});

describe('HintEngine', () => {
  it('shows a fired hint once, for 8 s or until tapped, and never again', () => {
    const e = new HintEngine([def({ id: 'a' })], new Set());
    expect(e.update(0)).toBeNull();
    e.fire('a');
    expect(e.update(100)?.def.id).toBe('a');
    expect(e.update(100 + SHOW_MS - 1)?.def.id).toBe('a');
    expect(e.update(100 + SHOW_MS)).toBeNull();
    e.fire('a');
    expect(e.update(100 + SHOW_MS + 60000)).toBeNull();
  });
  it('a tap dismisses it', () => {
    const e = new HintEngine([def({ id: 'a' })], new Set());
    e.fire('a');
    e.update(0);
    expect(e.dismiss(500)).toBe(true);
    expect(e.update(501)).toBeNull();
    expect(e.dismiss(600)).toBe(false);
  });
  it('one at a time, a new one waits 20 s (8 s for beats), beats before first-time hints', () => {
    const defs = [
      def({ id: 'f1', order: 10 }),
      def({ id: 'f2', order: 20 }),
      def({ id: 'b1', group: 'beat', order: 90 }),
    ];
    const e = new HintEngine(defs, new Set());
    e.fire('f1');
    e.fire('f2');
    e.fire('b1');
    expect(e.update(0)?.def.id).toBe('b1');
    e.dismiss(1000);
    expect(e.update(1000 + GAP_BEAT_MS - 1)).toBeNull(); // f1 is a first-time hint: waits 20 s
    expect(e.update(1000 + GAP_FIRST_MS - 1)).toBeNull();
    expect(e.update(1000 + GAP_FIRST_MS)?.def.id).toBe('f1');
  });
  it('a hint named in "after" fires that long after the other was shown', () => {
    const defs = [
      def({ id: 'b-arrive', group: 'beat' }),
      def({
        id: 'b-gold',
        group: 'beat',
        trigger: 'after',
        after: { hint: 'b-arrive', ms: 10000 },
      }),
    ];
    const e = new HintEngine(defs, new Set());
    e.fire('b-arrive');
    e.update(0);
    e.dismiss(2000);
    expect(e.update(9999)).toBeNull();
    expect(e.update(10000)?.def.id).toBe('b-gold');
  });
  it('skip marks hints seen so they never show; the seen set is shared', () => {
    const seen = new Set<string>();
    const e = new HintEngine([def({ id: 'a' }), def({ id: 'b', order: 20 })], seen);
    e.fire('a');
    e.skip('a');
    e.fire('a');
    expect(e.update(0)).toBeNull();
    e.fire('b');
    e.update(0);
    e.dismiss(10);
    expect(seen.has('b')).toBe(true);
  });
  it('off: nothing shows, and turning it off hides the one showing', () => {
    const e = new HintEngine([def({ id: 'a' })], new Set(), false);
    e.fire('a');
    expect(e.update(0)).toBeNull();
    e.setOn(true);
    expect(e.update(1)?.def.id).toBe('a');
    e.setOn(false);
    expect(e.showing).toBeNull();
  });
  it('rows above the game milestone never show', () => {
    const e = new HintEngine([def({ id: 'a', milestone: 3 })], new Set());
    e.fire('a');
    expect(e.update(0)).toBeNull();
  });
  it('the unit of the event is kept for the pulse', () => {
    const e = new HintEngine([def({ id: 'a' })], new Set());
    e.fire('a', 42);
    expect(e.update(0)?.unit).toBe(42);
  });
});

describe('hintsFromEvent', () => {
  const slot = (i: string) => (i === 'sword' ? 'weapon' : 'potion');
  it('maps events to triggers and the unit to point at', () => {
    expect(hintsFromEvent({ kind: 'arrived', unit: 5 }).fire).toEqual([
      { trigger: 'arrived', unit: 5 },
    ]);
    expect(hintsFromEvent({ kind: 'partyFormed', members: [7, 8] }).fire[0].unit).toBe(7);
    expect(hintsFromEvent({ kind: 'slain', unit: 3, pos: { x: 4, y: 5 } }).fire).toEqual([
      { trigger: 'slain', unit: 3, at: { x: 4, y: 5 } },
    ]);
    expect(hintsFromEvent({ kind: 'raidWarning', from: { x: 1, y: 2 } }).fire[0].at).toEqual({
      x: 1,
      y: 2,
    });
    expect(
      hintsFromEvent({ kind: 'bountyPlaced', bounty: 1, gold: 5, target: 9 }).fire.map(
        (f) => f.trigger,
      ),
    ).toEqual(['bountyPlaced', 'huntFlag']);
    expect(
      hintsFromEvent({ kind: 'bountyPlaced', bounty: 1, gold: 5 }).fire.map((f) => f.trigger),
    ).toEqual(['bountyPlaced']);
    expect(
      hintsFromEvent({ kind: 'collectorFell', unit: 1, pos: { x: 7, y: 8 }, gold: 30 }).fire,
    ).toEqual([{ trigger: 'collectorFell', unit: null, at: { x: 7, y: 8 } }]);
    expect(hintsFromEvent({ kind: 'raidWarning' }).fire[0].trigger).toBe('raidWarning');
    expect(hintsFromEvent({ kind: 'nothing' })).toEqual({ fire: [], skip: [] });
  });
  it('tier-up hints are for tier 2 only; gear hints only for a weapon or armour purchase', () => {
    expect(hintsFromEvent({ kind: 'tierUp', unit: 1, tier: 2 }).fire).toHaveLength(1);
    expect(hintsFromEvent({ kind: 'tierUp', unit: 1, tier: 3 }).fire).toHaveLength(0);
    expect(hintsFromEvent({ kind: 'shopped', unit: 1, item: 'sword' }, slot).fire[0].trigger).toBe(
      'shoppedGear',
    );
    expect(hintsFromEvent({ kind: 'shopped', unit: 1, item: 'flask' }, slot).fire).toHaveLength(0);
    expect(hintsFromEvent({ kind: 'shopped', unit: 1 }, slot).fire).toHaveLength(0);
  });
  it('building a temple or market first skips the hints that teach it', () => {
    expect(hintsFromEvent({ kind: 'built', type: 'temple_aesir' }).skip).toEqual([
      'b-temple',
      'b-aesir',
    ]);
    expect(hintsFromEvent({ kind: 'built', type: 'market' }).skip).toEqual(['b-market']);
    expect(hintsFromEvent({ kind: 'built', type: 'tower' }).skip).toEqual([]);
  });
});
