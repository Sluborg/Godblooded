import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnMonster } from './boss';
import { spawnHero } from './world';
import type { SkillDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const breath: SkillDef = {
  id: 'grave-breath',
  path: '',
  owner: 'monster',
  monster: 'draugr',
  name: 'Grave Breath',
  trigger: { kind: 'crowd', n: 2, radius: 100, angle: 90 },
  cooldownS: 12,
  target: 'foe',
  shape: { kind: 'cone', radius: 100, angle: 90 },
  effects: [{ kind: 'damage', mult: 1, type: 'frost', rider: 'chill' }],
  visual: ['cone'],
};
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 3, sta: 60 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...none, str: 12, sta: 40 },
      weapon: { baseAttackS: 2, range: 40 },
      bounty: 5,
      xp: 5,
    },
  ],
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 100_000, maxAlive: 1, hp: 500 }],
  lairSites: [{ lair: 'barrow', pos: { x: 500, y: 500 } }],
  skills: [breath],
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
};

function fight(elite: boolean): SimEvent[] {
  const w = createWorld(1, data);
  const lair = w.lairs[0];
  const mon = spawnMonster(w, lair, data.monsters![0]);
  if (elite) mon.elite = true;
  for (const dx of [0, 10]) {
    const id = spawnHero(w, 'knight', { x: 530 + dx, y: 500 + dx });
    const h = w.units.find((u) => u.id === id) as UnitState;
    h.mode = 'explore';
  }
  const out: SimEvent[] = [];
  for (let t = 0; t < 8_000; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

describe('monster skills', () => {
  it('an elite casts its skill through the skill engine, and it hits the heroes', () => {
    const ev = fight(true);
    const cast = ev.find((e) => e.kind === 'cast' && e.skill === 'grave-breath');
    expect(cast).toBeTruthy();
    const done = ev.find((e) => e.kind === 'skill' && e.skill === 'grave-breath');
    expect(done && done.kind === 'skill' && done.hits.length).toBeGreaterThanOrEqual(1);
    expect(ev.some((e) => e.kind === 'hit' && e.type === 'frost')).toBe(true);
  });

  it('a plain monster does not', () => {
    expect(fight(false).some((e) => e.kind === 'cast')).toBe(false);
  });
});
