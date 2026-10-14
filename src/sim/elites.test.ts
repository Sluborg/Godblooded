import { describe, expect, it } from 'vitest';
import { createWorld, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnMonster } from './boss';
import { statsOf } from './world';
import { snapshot } from './api';

const attrs = { str: 10, dex: 3, sta: 10, cha: 1, per: 3, int: 1, wp: 3 };
const data = (lair: object = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 2000 },
  townHall: { x: 3800, y: 1900 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  monsters: [
    { id: 'draugr', attrs, weapon: { baseAttackS: 1, range: 40 }, bounty: 10, xp: 10 },
    {
      id: 'wyrm',
      attrs,
      weapon: { baseAttackS: 1, range: 40 },
      bounty: 1,
      xp: 1,
      boss: {},
      hp: 500,
    },
  ],
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1000, maxAlive: 4, hp: 1000 }],
  lairSites: [{ lair: 'barrow', pos: { x: 1000, y: 1000 } }],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    lair: { statMult: [1, 1, 1], hpMult: [1, 1, 1], rewardMult: [1, 1, 1], ...lair },
  },
});

describe('elites', () => {
  it('are none by default', () => {
    const w = createWorld(1, data());
    w.lairs[0].tier = 2;
    const mon = w.data.monsters?.[0];
    if (!mon) throw new Error('no monster');
    for (let i = 0; i < 20; i++) expect(spawnMonster(w, w.lairs[0], mon).elite).toBeUndefined();
  });

  it('come from lair tier 2 by the share, with 1.5x hp, 1.2x Str and double reward', () => {
    const w = createWorld(1, data({ eliteShare: [0, 1, 1] }));
    const mon = w.data.monsters?.[0];
    if (!mon) throw new Error('no monster');
    const plain = spawnMonster(w, w.lairs[0], mon);
    expect(plain.elite).toBeUndefined();
    w.lairs[0].tier = 2;
    const e = spawnMonster(w, w.lairs[0], mon);
    expect(e.elite).toBe(true);
    expect(e.maxHp).toBe(Math.round(plain.maxHp * 1.5));
    expect(statsOf(w, e)?.attrs.str).toBe(12);
    expect(statsOf(w, plain)?.attrs.str).toBe(10);
    // double bounty and xp when it dies
    for (const u of [plain, e]) {
      w.pendingDeaths.push({ victim: u.id, by: 0 });
      u.hp = 0;
    }
    const events: SimEvent[] = [];
    for (let t = 0; t < 100; t += TICK_MS) {
      step(w, TICK_MS);
      events.push(...snapshot(w).events);
    }
    const died = events.filter((x) => x.kind === 'died');
    const bounty = (id: number) => died.find((x) => x.kind === 'died' && x.unit === id);
    expect(bounty(plain.id)).toMatchObject({ bounty: 10, xp: 10 });
    expect(bounty(e.id)).toMatchObject({ bounty: 20, xp: 20 });
  });

  it('a boss is never an elite, and a spawned event says so', () => {
    const w = createWorld(1, data({ eliteShare: [1, 1, 1] }));
    const wyrm = w.data.monsters?.[1];
    const draugr = w.data.monsters?.[0];
    if (!wyrm || !draugr) throw new Error('no monster');
    expect(spawnMonster(w, w.lairs[0], wyrm).elite).toBeUndefined();
    spawnMonster(w, w.lairs[0], draugr);
    const spawned = snapshot(w).events.filter((e) => e.kind === 'spawned');
    expect(spawned.some((e) => e.kind === 'spawned' && e.elite)).toBe(true);
  });

  it('a forced elite (an omen champion) ignores the share', () => {
    const w = createWorld(1, data());
    const mon = w.data.monsters?.[0];
    if (!mon) throw new Error('no monster');
    expect(spawnMonster(w, w.lairs[0], mon, true).elite).toBe(true);
  });
});
