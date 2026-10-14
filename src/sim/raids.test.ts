import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step as stepOnce, type GameData, type SimEvent } from './api';

const weak = { str: 1, dex: 1, sta: 1, cha: 1, per: 1, int: 1, wp: 1 };
const types = ['draugr', 'troll', 'harpy', 'minotaur'];
const base: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 6000, height: 6000 },
  townHall: { x: 3000, y: 3000 },
  classes: [{ id: 'warrior', attrs: weak, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  monsters: [...types, 'wyrm'].map((id) => ({
    id,
    attrs: weak,
    weapon: { baseAttackS: 3, range: 40 },
    bounty: 1,
    xp: 1,
  })),
  lairs: [
    ...types.map((t) => ({ id: `${t}-den`, monster: t, spawnS: 100_000, maxAlive: 0, hp: 9_999 })),
    { id: 'wyrm-nest', monster: 'wyrm', spawnS: 100_000, maxAlive: 0, hp: 9_999 },
  ],
  mapRules: {
    lairs: [5, 5],
    pool: types.map((t) => ({ lair: `${t}-den`, pantheon: 'aesir' })),
    boss: 'wyrm-nest',
    leanCount: 1,
    leanWeight: 1,
    margin: 200,
    minTownDist: 500,
    minLairDist: 300,
  },
  tuning: {
    town: {
      raidFirstMs: 1_000,
      raidEveryMs: 5_000,
      raidSize: 1,
      hallTiers: false,
      ruins: false,
      raidGrowEveryMs: 10_000_000,
      townHallHp: 1_000_000_000,
    },
    hero: { firstRecruitMs: 10_000_000 },
    lair: { tierUpEveryMs: 0 },
  },
};

type W = ReturnType<typeof createWorld>;

// step() runs at most 400 ticks per call, so spans go in chunks; events are collected.
function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let left = ms; left > 0; left -= 5_000) {
    stepOnce(w, Math.min(5_000, left));
    out.push(...snapshot(w).events);
  }
  return out;
}

const raids = (ev: readonly SimEvent[]) => ev.filter((e) => e.kind === 'raid');

describe('raids', () => {
  it('the boss lair never raids', () => {
    const w = createWorld(1, base);
    const boss = w.lairs.find((l) => l.boss);
    const ev = run(w, 120_000);
    expect(raids(ev).length).toBeGreaterThan(10);
    expect(raids(ev).some((e) => e.kind === 'raid' && e.lair === boss?.id)).toBe(false);
    expect(w.units.some((u) => w.unitRuntime.get(u.id)?.lair === boss?.id)).toBe(false);
  });

  it('one lair raids at a time by default, picked at random among the others', () => {
    const w = createWorld(1, base);
    const ev = run(w, 200_000);
    const lairs = new Set<number>();
    for (const e of raids(ev)) {
      if (e.kind !== 'raid') continue;
      lairs.add(e.lair);
    }
    // 1000, 6000, 11000, ... every 5 s: 40 raids, one lair each
    expect(raids(ev)).toHaveLength(40);
    // every non-boss lair gets picked over 40 raids, and no other
    expect([...lairs].sort()).toEqual(
      w.lairs
        .filter((l) => !l.boss)
        .map((l) => l.id)
        .sort(),
    );
  });

  it('tuning.town.raidLairs sets how many lairs raid, capped by the lairs standing', () => {
    const per = (raidLairs: number) => {
      const w = createWorld(1, {
        ...base,
        tuning: { ...base.tuning, town: { ...base.tuning?.town, raidLairs } },
      });
      stepOnce(w, 1_100);
      return raids(snapshot(w).events).map((e) => (e.kind === 'raid' ? e.lair : -1));
    };
    expect(per(1)).toHaveLength(1);
    expect(per(2)).toHaveLength(2);
    expect(new Set(per(2)).size).toBe(2);
    // 5 lairs, one of them the boss: at most 4 can raid
    expect(per(9)).toHaveLength(4);
  });

  it('a destroyed lair no longer raids; with no lair but the boss left nothing raids', () => {
    const w = createWorld(1, base);
    const boss = w.lairs.find((l) => l.boss);
    w.lairs = w.lairs.filter((l) => l.boss);
    expect(w.lairs[0]).toBe(boss);
    expect(raids(run(w, 30_000))).toHaveLength(0);
  });

  it('a fixed map has no boss: every lair can raid', () => {
    const fixed: GameData = {
      ...base,
      mapRules: undefined,
      lairSites: [
        { lair: 'draugr-den', pos: { x: 500, y: 500 } },
        { lair: 'troll-den', pos: { x: 5000, y: 500 } },
      ],
    };
    const w = createWorld(1, fixed);
    const seen = new Set<number>();
    for (const e of raids(run(w, 120_000))) if (e.kind === 'raid') seen.add(e.lair);
    expect(seen.size).toBe(2);
    const both = createWorld(1, {
      ...fixed,
      tuning: { ...fixed.tuning, town: { ...fixed.tuning?.town, raidLairs: 2 } },
    });
    stepOnce(both, 1_100);
    expect(raids(snapshot(both).events)).toHaveLength(2);
  });

  it('is deterministic', () => {
    const go = () => JSON.stringify(run(createWorld(3, base), 60_000));
    expect(go()).toBe(go());
  });
});
