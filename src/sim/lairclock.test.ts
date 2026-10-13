import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step as stepOnce, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 4, dex: 2, sta: 6, cha: 1, per: 2, int: 1, wp: 2 };
const sites = [
  { lair: 'barrow', pos: { x: 2000, y: 100 } },
  { lair: 'barrow', pos: { x: 400, y: 100 } },
  { lair: 'barrow', pos: { x: 1200, y: 100 } },
];

function mk(
  lair: Partial<NonNullable<NonNullable<GameData['tuning']>['lair']>>,
  s = sites,
): GameData {
  return {
    buildings: [],
    plots: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 100, y: 100 },
    classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1.5, range: 40 }, startGold: 0 }],
    monsters: [{ id: 'draugr', attrs, weapon: { baseAttackS: 2, range: 40 }, bounty: 10, xp: 8 }],
    lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1000, maxAlive: 1, hp: 1000 }],
    lairSites: s,
    tuning: {
      town: { raidFirstMs: 10_000_000 },
      hero: { firstRecruitMs: 10_000_000 },
      lair: { tierUpEveryMs: 60_000, maxTier: 3, ...lair },
    },
  };
}

const firsts = (w: ReturnType<typeof createWorld>) =>
  w.lairs.map((l) => w.lairRuntime.get(l.id)?.nextTierMs);

function run(w: ReturnType<typeof createWorld>, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let left = ms; left > 0; left -= 10_000) {
    stepOnce(w, Math.min(10_000, left));
    out.push(...snapshot(w).events);
  }
  return out;
}

describe('lair clock', () => {
  it('by default every lair goes up at tierUpEveryMs, as before', () => {
    expect(firsts(createWorld(1, mk({})))).toEqual([60_000, 60_000, 60_000]);
  });

  it('staggers the first tier-up by distance from the town', () => {
    const w = createWorld(1, mk({ firstTierUpMs: 30_000, tierUpStaggerMs: 20_000 }));
    // sites in data order: far (rank 2), near (rank 0), middle (rank 1)
    expect(firsts(w)).toEqual([70_000, 30_000, 50_000]);
    const ev = run(w, 80_000).filter((e) => e.kind === 'lairTierUp');
    // near at 30 s, then every 60 s (next at 90 s), middle at 50 s, far at 70 s
    expect(ev.map((e) => (e.kind === 'lairTierUp' ? e.lair : 0))).toEqual([
      w.lairs[1].id,
      w.lairs[2].id,
      w.lairs[0].id,
    ]);
    expect(firsts(w)).toEqual([130_000, 90_000, 110_000]);
  });

  it('a site can carry its own first tier-up', () => {
    const s = [{ ...sites[0], firstTierUpMs: 5_000 }, sites[1], sites[2]];
    const w = createWorld(1, mk({ firstTierUpMs: 30_000, tierUpStaggerMs: 20_000 }, s));
    expect(firsts(w)).toEqual([5_000, 30_000, 50_000]);
  });

  describe('pressure', () => {
    // A hero knocked out by a monster of lair 0.
    function knock(w: ReturnType<typeof createWorld>, lairIndex: number) {
      const lairId = w.lairs[lairIndex].id;
      const mid = w.nextId++;
      const m: UnitState = {
        id: mid,
        kind: 'monster',
        type: 'draugr',
        tier: 1,
        god: null,
        path: null,
        pos: { x: 2000, y: 100 },
        facing: { x: 0, y: 1 },
        hp: 50,
        maxHp: 50,
        target: null,
        ko: false,
        mode: 'wander',
        party: 0,
        trait: null,
        gold: 0,
        bounty: null,
      };
      w.units.push(m);
      w.unitRuntime.set(mid, { lair: lairId, cooldownMs: 0, target: null, idleMs: 0 });
      const hid = spawnHero(w, 'warrior', { x: 3000, y: 3000 });
      const h = w.units.find((u) => u.id === hid)!;
      h.hp = 0;
      w.pendingDeaths.push({ victim: hid, by: mid });
      stepOnce(w, 50);
    }

    it('a lair that knocks out pressureKos heroes grows early and restarts its clock', () => {
      const w = createWorld(1, mk({ pressureKos: 2 }));
      knock(w, 0);
      expect(w.lairs[0].tier).toBe(1);
      knock(w, 0);
      stepOnce(w, 100);
      expect(w.lairs[0].tier).toBe(2);
      expect(w.lairs[1].tier).toBe(1);
      const ev = snapshot(w).events.filter((e) => e.kind === 'lairTierUp');
      expect(ev.some((e) => e.kind === 'lairTierUp' && e.pressure)).toBe(true);
      // The clock restarts from now, and the count too.
      expect(w.lairRuntime.get(w.lairs[0].id)?.nextTierMs).toBeGreaterThan(60_000);
      expect(w.lairRuntime.get(w.lairs[0].id)?.kos).toBe(0);
    });

    it('is off by default', () => {
      const w = createWorld(1, mk({}));
      for (let i = 0; i < 8; i++) knock(w, 0);
      stepOnce(w, 100);
      expect(w.lairs[0].tier).toBe(1);
    });
  });
});
