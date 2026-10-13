import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step as stepOnce, type GameData } from './api';
import { maxHp } from './units';
import { spawnHero } from './world';

const attrs = { str: 4, dex: 2, sta: 6, cha: 1, per: 2, int: 1, wp: 2 };
const base: GameData = {
  buildings: [],
  plots: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 100, y: 100 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1.5, range: 40 }, startGold: 0 }],
  monsters: [{ id: 'draugr', attrs, weapon: { baseAttackS: 2, range: 40 }, bounty: 10, xp: 8 }],
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 10, maxAlive: 2, hp: 1000 }],
  lairSites: [{ lair: 'barrow', pos: { x: 3500, y: 3500 } }],
  tuning: {
    town: { raidFirstMs: 10_000_000 },
    hero: { firstRecruitMs: 10_000_000 },
    lair: {
      tierUpEveryMs: 60_000,
      maxTier: 3,
      spawnMult: [1, 0.5, 0.25],
      maxAliveAdd: [0, 1, 3],
      statMult: [1, 2, 3],
      hpMult: [1, 1.5, 2],
      rewardMult: [1, 2, 3],
    },
  },
};

// step() runs at most 400 ticks (20 s) per call, so long spans go in chunks.
function step(w: ReturnType<typeof createWorld>, ms: number) {
  for (let left = ms; left > 0; left -= 10_000) stepOnce(w, Math.min(10_000, left));
}

const lair = (w: ReturnType<typeof createWorld>) => snapshot(w).lairs[0];

describe('lair growth', () => {
  it('a lair goes up a tier every tierUpEveryMs, up to maxTier, with an event', () => {
    const w = createWorld(1, base);
    step(w, 59_000);
    expect(lair(w).tier).toBe(1);
    step(w, 2_000);
    expect(lair(w).tier).toBe(2);
    step(w, 60_000);
    expect(lair(w).tier).toBe(3);
    step(w, 300_000);
    expect(lair(w).tier).toBe(3);
  });

  it('emits lairTierUp once per tier', () => {
    const w = createWorld(1, base);
    step(w, 200_000);
    const ups = snapshot(w).events.filter((e) => e.kind === 'lairTierUp');
    expect(ups.map((e) => (e.kind === 'lairTierUp' ? e.tier : 0))).toEqual([2, 3]);
  });

  it('tier up raises the lair hp and keeps the damage it has taken', () => {
    const w = createWorld(1, base);
    w.lairs[0].hp = 400;
    step(w, 61_000);
    expect(lair(w)).toMatchObject({ maxHp: 1500, hp: 900 });
    step(w, 60_000);
    expect(lair(w)).toMatchObject({ maxHp: 2000, hp: 1400 });
  });

  it('growth off: tierUpEveryMs 0 keeps tier 1', () => {
    const w = createWorld(1, { ...base, tuning: { ...base.tuning, lair: { tierUpEveryMs: 0 } } });
    step(w, 600_000);
    expect(lair(w)).toMatchObject({ tier: 1, maxHp: 1000 });
  });

  it('spawns come faster and in greater numbers at a higher tier', () => {
    const count = (ms: number, tier: number) => {
      const w = createWorld(1, base);
      w.lairs[0].tier = tier;
      w.lairRuntime.get(w.lairs[0].id)!.nextTierMs = Infinity;
      step(w, ms);
      return snapshot(w).units.filter((u) => u.kind === 'monster').length;
    };
    // tier 1: cap 2; tier 2: cap 3 at 5 s intervals; tier 3: cap 5 at 2.5 s intervals
    expect(count(60_000, 1)).toBe(2);
    expect(count(60_000, 2)).toBe(3);
    expect(count(60_000, 3)).toBe(5);
    // after the first spawn at 10 s, tier 3 spawns every 2.5 s and tier 1 every 10 s
    expect(count(13_000, 3)).toBe(2);
    expect(count(13_000, 1)).toBe(1);
  });

  it('monsters keep the tier they spawned at, with scaled attributes', () => {
    const w = createWorld(1, { ...base, lairs: [{ ...base.lairs![0], maxAlive: 1 }] });
    step(w, 15_000);
    const first = snapshot(w).units.find((u) => u.kind === 'monster');
    expect(first).toMatchObject({ tier: 1, maxHp: maxHp(attrs) });
    step(w, 61_000);
    // the tier 1 monster still lives (nothing hunts it); tier 2 allows a second one
    const tiers = snapshot(w)
      .units.filter((u) => u.kind === 'monster')
      .map((u) => [u.tier, u.maxHp]);
    expect(tiers).toContainEqual([1, maxHp(attrs)]);
    const scaled = maxHp({ ...attrs, str: 8, sta: 12 });
    expect(tiers).toContainEqual([2, scaled]);
  });

  it('bounty and xp scale with the tier of the monster', () => {
    const w = createWorld(1, base);
    w.lairs[0].tier = 3;
    w.lairRuntime.get(w.lairs[0].id)!.nextTierMs = Infinity;
    step(w, 15_000);
    const hero = spawnHero(w, 'warrior', { x: 0, y: 0 });
    const mon = w.units.find((u) => u.kind === 'monster');
    if (!mon) throw new Error('no monster');
    snapshot(w);
    w.pendingDeaths.push({ victim: mon.id, by: hero });
    step(w, 100);
    const died = snapshot(w).events.find((e) => e.kind === 'died');
    expect(died).toMatchObject({ bounty: 30, xp: 24 });
  });

  it('raiders use the lair tier', () => {
    const w = createWorld(1, {
      ...base,
      tuning: {
        ...base.tuning,
        town: { raidFirstMs: 130_000, raidSize: 1, raidEveryMs: 10_000_000 },
      },
    });
    step(w, 131_000);
    const raiders = w.units.filter((u) => w.unitRuntime.get(u.id)?.raid);
    expect(raiders.length).toBeGreaterThan(0);
    expect(raiders.every((u) => u.tier === 3)).toBe(true);
  });

  it('the tier 1 entries of hpMult and spawnMult apply from the start', () => {
    const w = createWorld(1, {
      ...base,
      tuning: { ...base.tuning, lair: { ...base.tuning?.lair, hpMult: [2], spawnMult: [0.5] } },
    });
    expect(lair(w)).toMatchObject({ tier: 1, hp: 2000, maxHp: 2000 });
    step(w, 6_000);
    // the first spawn comes at spawnS 10 s times 0.5
    expect(snapshot(w).units.filter((u) => u.kind === 'monster')).toHaveLength(1);
  });

  it('is deterministic', () => {
    const run = () => {
      const w = createWorld(7, base);
      step(w, 200_000);
      return JSON.stringify([snapshot(w).lairs, snapshot(w).units.map((u) => [u.id, u.tier])]);
    };
    expect(run()).toBe(run());
  });
});
