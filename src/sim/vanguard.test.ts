import { describe, expect, it } from 'vitest';
import {
  createWorld,
  loadWorld,
  saveWorld,
  snapshot,
  step,
  TICK_MS,
  type GameData,
  type SimEvent,
} from './api';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 2, range: 60 };
const data = (boss: Partial<NonNullable<GameData['tuning']>['boss']> = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [{ id: 'knight', attrs: { ...none, sta: 20 }, weapon, startGold: 0 }],
  monsters: [
    {
      id: 'wyrm',
      attrs: { ...none, str: 10, sta: 5 },
      weapon,
      bounty: 77,
      xp: 55,
      boss: {},
      hp: 500,
    },
    { id: 'imp', attrs: { ...none, str: 1, sta: 1 }, weapon, bounty: 1, xp: 1 },
  ],
  lairs: [
    { id: 'wyrm-nest', monster: 'wyrm', spawnS: 100_000, maxAlive: 3, hp: 1000, escort: 'imp' },
  ],
  lairSites: [{ lair: 'wyrm-nest', pos: { x: 500, y: 500 } }],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    lair: { tierUpEveryMs: 0 },
    boss: { sealUntilMs: 10_000, vanguardSize: 4, ...boss },
  },
});

function run(w: ReturnType<typeof createWorld>, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

describe('vanguard', () => {
  it('is off by default', () => {
    const d = data({ vanguardSize: 0 });
    const ev = run(createWorld(1, d), 120_000);
    expect(ev.some((e) => e.kind === 'raidWarning')).toBe(false);
  });

  it('warns and launches the escort once the boss lair is unsealed, then half every interval', () => {
    const ev = run(createWorld(1, data()), 200_000);
    const warns = ev.filter((e) => e.kind === 'raidWarning');
    const raids = ev.filter((e) => e.kind === 'raid');
    expect(warns.map((e) => (e.kind === 'raidWarning' ? e.size : 0))).toEqual([4, 2, 2]);
    expect(raids.length).toBeGreaterThanOrEqual(2);
    expect(warns[0].kind === 'raidWarning' && warns[0].inMs).toBe(15_000);
  });

  it('stops once the boss is out', () => {
    const w = createWorld(1, data());
    run(w, 12_000);
    const lair = w.lairs[0];
    lair.hp = 1;
    const ev = run(w, 200_000);
    const late = ev.filter((e) => e.kind === 'raidWarning');
    expect(late.length).toBeLessThanOrEqual(1);
  });

  it('sends none for a boss lair without an escort', () => {
    const d = data();
    d.lairs = [{ id: 'wyrm-nest', monster: 'wyrm', spawnS: 100_000, maxAlive: 3, hp: 1000 }];
    const ev = run(createWorld(1, d), 120_000);
    expect(ev.some((e) => e.kind === 'raidWarning')).toBe(false);
  });

  it('keeps its clock through a save and load', () => {
    const w = createWorld(1, data());
    run(w, 30_000);
    expect(w.vanguard).toMatchObject({ count: 1, started: true });
    const loaded = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data());
    expect(loaded.vanguard).toEqual(w.vanguard);
    const ev = run(loaded, 30_000);
    expect(ev.some((e) => e.kind === 'raidWarning')).toBe(false);
  });
});
