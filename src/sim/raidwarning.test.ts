import { describe, expect, it } from 'vitest';
import { planTierRaid } from './town';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';

const attrs = { str: 1, dex: 1, sta: 1, cha: 1, per: 1, int: 1, wp: 1 };

function mk(town: object = {}, lair: object = {}): GameData {
  return {
    buildings: [],
    plots: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 100, y: 100 },
    classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1.5, range: 40 }, startGold: 0 }],
    monsters: [{ id: 'draugr', attrs, weapon: { baseAttackS: 2, range: 40 }, bounty: 1, xp: 1 }],
    lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1000, maxAlive: 0, hp: 1000 }],
    lairSites: [{ lair: 'barrow', pos: { x: 1100, y: 100 } }],
    tuning: {
      town: { raidFirstMs: 60_000, raidEveryMs: 60_000, raidSize: 2, townHallHp: 1e9, ...town },
      hero: { firstRecruitMs: 10_000_000 },
      lair: { tierUpEveryMs: 0, ...lair },
    },
  };
}

type W = ReturnType<typeof createWorld>;

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const of = <K extends SimEvent['kind']>(ev: SimEvent[], kind: K) =>
  ev.filter((e): e is Extract<SimEvent, { kind: K }> => e.kind === kind);

describe('raid warning', () => {
  it('announces a raid 15 s ahead with its lair, direction and size, and it arrives on time', () => {
    const w = createWorld(1, mk());
    const early = run(w, 44_000);
    expect(of(early, 'raidWarning')).toHaveLength(0);
    const ev = run(w, 2_000);
    const [warn] = of(ev, 'raidWarning');
    expect(warn).toMatchObject({ size: 2, from: { x: 1100, y: 100 }, dir: { x: 1, y: 0 } });
    expect(warn.inMs).toBeGreaterThan(13_000);
    expect(warn.inMs).toBeLessThanOrEqual(15_000);
    expect(of(ev, 'raid')).toHaveLength(0);
    const later = run(w, 15_000);
    const [raid] = of(later, 'raid');
    expect(raid.raid).toBe(warn.raid);
    expect(raid.size).toBe(2);
  });

  it('a tower of tier 2 gives the warning 5 s earlier', () => {
    const w = createWorld(1, mk());
    w.buildings.push({
      id: w.nextId++,
      type: 'tower',
      tier: 2,
      pos: { x: 300, y: 300 },
      plot: null,
      hp: 100,
      maxHp: 100,
    });
    run(w, 38_000);
    const ev = run(w, 4_000);
    const [warn] = of(ev, 'raidWarning');
    expect(warn).toBeDefined();
    expect(warn.early).toBe(true);
    expect(warn.inMs).toBeGreaterThan(18_000);
  });
});

describe('raid after a lair tier-up', () => {
  it('a lair that tiers up sends one raid of its own, announced first', () => {
    const w = createWorld(
      1,
      mk({ raidFirstMs: 10_000_000, raidOnTierUp: true }, { tierUpEveryMs: 20_000, maxTier: 2 }),
    );
    const ev = run(w, 40_000);
    expect(of(ev, 'lairTierUp')).toHaveLength(1);
    const [warn] = of(ev, 'raidWarning');
    expect(warn).toBeDefined();
    const [raid] = of(ev, 'raid');
    expect(raid.raid).toBe(warn.raid);
    expect(w.units.filter((u) => w.unitRuntime.get(u.id)?.raidId === warn.raid)).toHaveLength(2);
  });

  it('can be switched off', () => {
    const w = createWorld(
      1,
      mk({ raidFirstMs: 10_000_000, raidOnTierUp: false }, { tierUpEveryMs: 20_000, maxTier: 2 }),
    );
    expect(of(run(w, 40_000), 'raid')).toHaveLength(0);
  });
});

describe('the town cheers', () => {
  it('pays raidBeatenGold once every raider of a raid is dead', () => {
    const w = createWorld(1, mk());
    run(w, 62_000);
    const raiders = w.units.filter((u) => w.unitRuntime.get(u.id)?.raid);
    expect(raiders).toHaveLength(2);
    const gold = w.gold;
    raiders[0].hp = 0;
    w.pendingDeaths.push({ victim: raiders[0].id, by: 0 });
    expect(of(run(w, 200), 'raidBeaten')).toHaveLength(0);
    raiders[1].hp = 0;
    w.pendingDeaths.push({ victim: raiders[1].id, by: 0 });
    const ev = run(w, 200);
    expect(of(ev, 'raidBeaten')).toEqual([
      { kind: 'raidBeaten', raid: expect.any(Number), gold: 20 },
    ]);
    expect(w.gold).toBe(gold + 20);
  });
});

describe('a raid whose lair falls', () => {
  it('is cancelled with an event instead of arriving', () => {
    const w = createWorld(1, mk());
    run(w, 46_000);
    const lair = w.lairs[0];
    w.lairs = [];
    w.lairRuntime.delete(lair.id);
    const ev = run(w, 16_000);
    expect(of(ev, 'raidCancelled')).toHaveLength(1);
    expect(of(ev, 'raid')).toHaveLength(0);
  });

  it('a pressure tier-up sends no raid even with the option on', () => {
    const w = createWorld(1, mk({ raidFirstMs: 10_000_000, raidOnTierUp: true }));
    planTierRaid(w, w.lairs[0], true);
    expect(w.raidPlans).toHaveLength(0);
    planTierRaid(w, w.lairs[0]);
    expect(w.raidPlans).toHaveLength(1);
  });
});
