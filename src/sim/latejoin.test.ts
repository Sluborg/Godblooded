import { describe, expect, it } from 'vitest';
import { createWorld, step, TICK_MS, type GameData } from './api';
import { newParty } from './parties';
import { spawnHero } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const data = (party: NonNullable<GameData['tuning']>['party'] = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 5, sta: 30 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  upgrades: [{ id: 'tough', name: 'Tough', text: 't', effect: { attr: { sta: 5 } } }],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    party: { mergeEveryTicks: 1, ...party },
  },
});

// A party of `size` heroes at the given level holding one card, plus one new hero nearby.
function scene(level: number, size = 1, party = {}) {
  const w = createWorld(1, data(party));
  const ids = Array.from({ length: size }, (_, i) =>
    spawnHero(w, 'knight', { x: 500 + i * 10, y: 500 }),
  );
  const pid = newParty(w, ids[0]);
  const p = w.parties.get(pid)!;
  for (const id of ids) {
    const u = w.units.find((x) => x.id === id) as UnitState;
    u.party = pid;
    u.mode = 'explore';
    if (id !== ids[0]) p.members.push(id);
  }
  p.level = level;
  p.upgrades.push('tough');
  const nid = spawnHero(w, 'knight', { x: 540, y: 500 });
  const newcomer = w.units.find((x) => x.id === nid) as UnitState;
  newcomer.mode = 'explore';
  return { w, p, newcomer, base: newcomer.maxHp };
}

const run = (w: ReturnType<typeof createWorld>, ms: number) => {
  for (let t = 0; t < ms; t += TICK_MS) step(w, TICK_MS);
};

describe('late recruits', () => {
  it('a new hero joins a party of level 2 and takes its cards at once', () => {
    const s = scene(2);
    run(s.w, 20_000);
    expect(s.newcomer.party).toBe(s.p.id);
    expect(s.p.members).toContain(s.newcomer.id);
    expect(s.newcomer.maxHp).toBeGreaterThan(s.base);
  });

  it('not a party of level 3, a full party, or with joinBelowLevel 1', () => {
    for (const s of [scene(3), scene(2, 4), scene(2, 1, { joinBelowLevel: 1 })]) {
      run(s.w, 20_000);
      expect(s.newcomer.party).not.toBe(s.p.id);
    }
  });

  it('a raised joinBelowLevel lets a level 3 party take one', () => {
    const s = scene(3, 1, { joinBelowLevel: 5 });
    run(s.w, 20_000);
    expect(s.newcomer.party).toBe(s.p.id);
  });
});
