import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step as stepOnce, type GameData } from './api';
import { generateMap } from './mapgen';
import { spawnHero } from './world';

const attrs = { str: 9, dex: 3, sta: 9, cha: 1, per: 3, int: 1, wp: 3 };
const weak = { str: 1, dex: 1, sta: 1, cha: 1, per: 1, int: 1, wp: 1 };
const mon = (id: string) => ({
  id,
  attrs: weak,
  weapon: { baseAttackS: 3, range: 40 },
  bounty: 5,
  xp: 2,
});
const lair = (id: string, monster: string, hp = 200) => ({
  id,
  monster,
  spawnS: 6,
  maxAlive: 2,
  hp,
});

// Six monster types over three pantheons, plus a wyrm boss.
const types = ['draugr', 'troll', 'harpy', 'minotaur', 'jackal', 'scarab'];
const pantheons = ['aesir', 'aesir', 'greek', 'greek', 'egyptian', 'egyptian'];
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 3000, height: 2000 },
  townHall: { x: 1500, y: 1000 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  monsters: [...types.map(mon), mon('wyrm')],
  lairs: [...types.map((t) => lair(`${t}-den`, t)), lair('wyrm-nest', 'wyrm', 500)],
  mapRules: {
    lairs: [4, 6],
    pool: types.map((t, i) => ({ lair: `${t}-den`, pantheon: pantheons[i] })),
    boss: 'wyrm-nest',
    leanCount: 1,
    leanWeight: 4,
    margin: 150,
    minTownDist: 400,
    minLairDist: 300,
  },
  tuning: {
    town: { raidFirstMs: 10_000_000 },
    hero: { firstRecruitMs: 10_000_000 },
    lair: { tierUpEveryMs: 0 },
  },
};

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('seeded map', () => {
  it('the same seed gives the same map, other seeds give other maps', () => {
    const a = JSON.stringify(generateMap(7, data));
    expect(JSON.stringify(generateMap(7, data))).toBe(a);
    const maps = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => JSON.stringify(generateMap(s, data))));
    expect(maps.size).toBeGreaterThan(5);
    const snap = (seed: number) => JSON.stringify(snapshot(createWorld(seed, data)).lairs);
    expect(snap(3)).toBe(snap(3));
    expect(snap(3)).not.toBe(snap(4));
  });

  it('has 4 to 6 lairs with the boss lair last and flagged', () => {
    const counts = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const snap = snapshot(createWorld(seed, data));
      expect(snap.lairs.length).toBeGreaterThanOrEqual(4);
      expect(snap.lairs.length).toBeLessThanOrEqual(6);
      counts.add(snap.lairs.length);
      const boss = snap.lairs[snap.lairs.length - 1];
      expect(boss).toMatchObject({ type: 'wyrm-nest', boss: true });
      expect(snap.lairs.filter((l) => l.boss)).toHaveLength(1);
      expect(snap.map.boss).toBe(boss.id);
    }
    expect([...counts].sort()).toEqual([4, 5, 6]);
  });

  it('keeps lairs inside the map, away from the town and from each other', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { sites } = generateMap(seed, data);
      for (const [i, s] of sites.entries()) {
        expect(s.pos.x).toBeGreaterThanOrEqual(150);
        expect(s.pos.x).toBeLessThanOrEqual(3000 - 150);
        expect(s.pos.y).toBeGreaterThanOrEqual(150);
        expect(s.pos.y).toBeLessThanOrEqual(2000 - 150);
        expect(dist(s.pos, data.townHall)).toBeGreaterThanOrEqual(400);
        for (const o of sites.slice(i + 1)) expect(dist(s.pos, o.pos)).toBeGreaterThanOrEqual(300);
      }
    }
  });

  it('puts the boss far out: farther from the town than most lairs', () => {
    let farthest = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const { sites, bossIndex } = generateMap(seed, data);
      const d = sites.map((s) => dist(s.pos, data.townHall));
      if (d[bossIndex] === Math.max(...d)) farthest++;
    }
    expect(farthest).toBeGreaterThan(40);
  });

  it('draws the other lairs from the pool without repeats, and every type shows up', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const others = generateMap(seed, data).sites.slice(0, -1);
      const ids = others.map((s) => s.lair);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) seen.add(id);
    }
    expect([...seen].sort()).toEqual(types.map((t) => `${t}-den`).sort());
  });

  it('refills the pool when a run has more lairs than the pool holds', () => {
    const small: GameData = {
      ...data,
      mapRules: {
        ...(data.mapRules as NonNullable<GameData['mapRules']>),
        lairs: [6, 6],
        pool: types.slice(0, 2).map((t, i) => ({ lair: `${t}-den`, pantheon: pantheons[i] })),
      },
    };
    const { sites } = generateMap(1, small);
    expect(sites).toHaveLength(6);
    expect(sites.slice(0, -1).every((s) => s.lair === 'draugr-den' || s.lair === 'troll-den')).toBe(
      true,
    );
  });

  it('leans on a pantheon: its lairs turn up more often than with no lean', () => {
    const share = (leanWeight: number) => {
      let leaned = 0;
      let total = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const w = createWorld(seed, {
          ...data,
          mapRules: { ...(data.mapRules as NonNullable<GameData['mapRules']>), leanWeight },
        });
        const snap = snapshot(w);
        expect(snap.map.lean).toHaveLength(1);
        for (const l of snap.lairs.slice(0, -1)) {
          const p = pantheons[types.indexOf(l.type.replace('-den', ''))];
          if (snap.map.lean.includes(p)) leaned++;
          total++;
        }
      }
      return leaned / total;
    };
    // a third of the pool is leaned on; with weight 1 that is the share, with weight 4 more
    expect(share(1)).toBeLessThan(0.4);
    expect(share(4)).toBeGreaterThan(share(1) + 0.08);
  });

  it('a fixed lairSites list wins over the rules', () => {
    const w = createWorld(1, {
      ...data,
      lairSites: [{ lair: 'draugr-den', pos: { x: 100, y: 100 } }],
    });
    const snap = snapshot(w);
    expect(snap.lairs).toHaveLength(1);
    expect(snap.map).toEqual({ lean: [], boss: null });
  });

  it('keeps the boss beyond minTownDist even when only the corners are that far', () => {
    // 1000 x 1000 map, hall in the middle, margin 100: corners are ~566 away, 550 is feasible
    const tight: GameData = {
      ...data,
      map: { width: 1000, height: 1000 },
      townHall: { x: 500, y: 500 },
      mapRules: {
        ...(data.mapRules as NonNullable<GameData['mapRules']>),
        lairs: [2, 2],
        margin: 100,
        minTownDist: 550,
        minLairDist: 100,
      },
    };
    for (let seed = 1; seed <= 30; seed++) {
      const { sites, bossIndex } = generateMap(seed, tight);
      expect(dist(sites[bossIndex].pos, tight.townHall)).toBeGreaterThanOrEqual(550);
    }
    // infeasible: relaxes to the farthest spot instead of failing
    const impossible = {
      ...tight,
      mapRules: { ...(tight.mapRules as NonNullable<GameData['mapRules']>), minTownDist: 900 },
    };
    const { sites, bossIndex } = generateMap(1, impossible);
    expect(dist(sites[bossIndex].pos, tight.townHall)).toBeGreaterThan(450);
  });

  it('rejects a pool lair whose monster has no row', () => {
    const bad = { ...data, lairs: [...(data.lairs ?? []), lair('ghost-den', 'ghost')] };
    const rules = data.mapRules as NonNullable<GameData['mapRules']>;
    expect(() =>
      createWorld(1, {
        ...bad,
        mapRules: { ...rules, pool: [...rules.pool, { lair: 'ghost-den', pantheon: 'greek' }] },
      }),
    ).toThrow(/unknown monster: ghost/);
  });

  it('rejects rows that name an unknown lair', () => {
    const bad = {
      ...data,
      mapRules: { ...(data.mapRules as NonNullable<GameData['mapRules']>), boss: 'nope' },
    };
    expect(() => createWorld(1, bad)).toThrow(/unknown lair/);
  });
});

describe('boss lair as the win goal', () => {
  function bossWorld() {
    const w = createWorld(2, data);
    const boss = w.lairs.find((l) => l.boss);
    if (!boss) throw new Error('no boss');
    return { w, boss };
  }
  function run(w: ReturnType<typeof createWorld>, ms: number) {
    for (let left = ms; left > 0 && w.status === 'running'; left -= 5_000) {
      stepOnce(w, Math.min(5_000, left));
    }
  }

  it('destroying the boss wins the run while other lairs still stand', () => {
    const { w, boss } = bossWorld();
    spawnHero(w, 'warrior', { x: boss.pos.x - 20, y: boss.pos.y });
    run(w, 60_000);
    expect(w.status).toBe('won');
    expect(w.lairs.some((l) => !l.boss)).toBe(true);
    expect(snapshot(w).events.some((e) => e.kind === 'won')).toBe(true);
  });

  it('destroying another lair does not win', () => {
    const { w } = bossWorld();
    const other = w.lairs.find((l) => !l.boss);
    if (!other) throw new Error('no lair');
    spawnHero(w, 'warrior', { x: other.pos.x - 20, y: other.pos.y });
    run(w, 40_000);
    expect(w.lairs.some((l) => l.id === other.id)).toBe(false);
    expect(w.status).toBe('running');
  });
});
