import { describe, expect, it } from 'vitest';
import { command, createWorld, DEFAULT_TUNING, snapshot, step, type GameData } from './api';
import { resolveTuning } from './tuning';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const base: GameData = {
  buildings: [{ id: 'temple_aesir', cost: 100 }],
  plots: [{ x: 700, y: 500 }],
  startGold: 500,
  map: { width: 2000, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs,
      weapon: { baseAttackS: 1.5, range: 40 },
      startGold: 50,
    },
  ],
  upgrades: [{ id: 'a', name: 'A', text: 'a', effect: { attr: { str: 1 } } }],
};

describe('tuning', () => {
  it('missing tuning means the defaults', () => {
    expect(resolveTuning(base)).toEqual(DEFAULT_TUNING);
  });

  it('a partial override keeps the other defaults', () => {
    const t = resolveTuning({ ...base, tuning: { hero: { maxPerTemple: 1 } } });
    expect(t.hero.maxPerTemple).toBe(1);
    expect(t.hero.recruitMs).toBe(DEFAULT_TUNING.hero.recruitMs);
    expect(t.party).toEqual(DEFAULT_TUNING.party);
  });

  it('recruiting follows the data: faster timer and a bigger cap', () => {
    const count = (tuning: GameData['tuning']) => {
      const w = createWorld(1, { ...base, tuning });
      command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
      step(w, 40_000);
      return snapshot(w).units.filter((u) => u.kind === 'hero').length;
    };
    const slow = count(undefined);
    const fast = count({ hero: { firstRecruitMs: 1_000, recruitMs: 2_000, maxPerTemple: 8 } });
    expect(fast).toBeGreaterThan(slow);
    expect(count({ hero: { maxPerTemple: 1 } })).toBe(1);
  });

  it('party xp per level follows the data', () => {
    const w = createWorld(1, { ...base, tuning: { party: { xpPerLevel: 100 } } });
    spawnHero(w, 'warrior', { x: 300, y: 300 });
    expect(snapshot(w).parties[0].xpNext).toBe(100);
  });
});
