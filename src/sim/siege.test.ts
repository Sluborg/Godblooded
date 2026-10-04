import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, type GameData } from './api';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const base: GameData = {
  buildings: [
    { id: 'market', cost: 50 },
    { id: 'shrine', cost: 50 },
  ],
  plots: [
    { x: 700, y: 500 },
    { x: 800, y: 500 },
  ],
  startGold: 500,
  map: { width: 2000, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 12, sta: 12 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 50,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 6, sta: 3 },
      weapon: { baseAttackS: 1, range: 40 },
      bounty: 12,
      xp: 10,
    },
  ],
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1000, maxAlive: 1, hp: 60 }],
  lairSites: [{ lair: 'barrow', pos: { x: 1000, y: 500 } }],
  upgrades: [{ id: 'a', name: 'A', text: 'a', effect: { attr: { str: 1 } } }],
};

const heroOf = (w: ReturnType<typeof createWorld>, id: number) => {
  const h = w.units.find((u) => u.id === id);
  if (!h) throw new Error('missing hero');
  return h;
};

describe('lairs', () => {
  it('heroes storm a lair, it pays out, and the last lair falling wins the run', () => {
    const w = createWorld(1, base);
    const id = spawnHero(w, 'warrior', { x: 900, y: 500 });
    const gold = heroOf(w, id).gold;
    step(w, 20_000);
    const s = snapshot(w);
    expect(s.lairs).toHaveLength(0);
    expect(s.events.some((e) => e.kind === 'lairDestroyed')).toBe(true);
    expect(s.events.some((e) => e.kind === 'won')).toBe(true);
    expect(s.status).toBe('won');
    expect(s.stats.lairsDestroyed).toBe(1);
    expect(heroOf(w, id).gold).toBeGreaterThanOrEqual(gold + 60);
    expect(command(w, { kind: 'build', type: 'market', plot: 0 })).toEqual({
      ok: false,
      reason: 'run over',
    });
    const t = w.timeMs;
    step(w, 5_000);
    expect(w.timeMs).toBe(t);
  });

  it('a run with two lairs is not won until both fall', () => {
    const w = createWorld(1, {
      ...base,
      lairSites: [
        { lair: 'barrow', pos: { x: 1000, y: 500 } },
        { lair: 'barrow', pos: { x: 1900, y: 1100 } },
      ],
    });
    spawnHero(w, 'warrior', { x: 900, y: 500 });
    step(w, 8_000);
    expect(w.lairs.length).toBe(1);
    expect(w.status).toBe('running');
  });

  it('a lair that is out of reach is left alone', () => {
    const w = createWorld(1, base);
    const id = spawnHero(w, 'warrior', { x: 100, y: 100 });
    heroOf(w, id).mode = 'rest';
    step(w, 3_000);
    expect(w.lairs[0].hp).toBe(60);
  });
});

describe('raids and the town', () => {
  const raided: GameData = {
    ...base,
    tuning: { town: { raidFirstMs: 1_000, raidEveryMs: 100_000, raidSize: 2 } },
  };

  it('raiders march on the town, destroy buildings and free their plot', () => {
    const w = createWorld(1, raided);
    command(w, { kind: 'build', type: 'market', plot: 0 });
    step(w, 1_100);
    const s = snapshot(w);
    expect(s.events.some((e) => e.kind === 'raid')).toBe(true);
    let destroyed = false;
    for (let i = 0; i < 4000 && !destroyed; i++) {
      step(w, 50);
      destroyed = w.events.some((e) => e.kind === 'buildingDestroyed');
    }
    expect(destroyed).toBe(true);
    const after = snapshot(w);
    expect(after.stats.buildingsLost).toBeGreaterThan(0);
    if (!after.buildings.some((b) => b.type === 'market')) {
      expect(after.plots[0].occupied).toBe(false);
    }
  });

  it('losing the town hall loses the run', () => {
    const w = createWorld(2, raided);
    let lost = false;
    for (let i = 0; i < 20000 && !lost; i++) {
      step(w, 50);
      lost = w.status === 'lost';
    }
    expect(lost).toBe(true);
    expect(w.events.some((e) => e.kind === 'lost')).toBe(true);
    expect(w.buildings.some((b) => b.type === 'townhall')).toBe(false);
    expect(command(w, { kind: 'placeBounty', pos: { x: 5, y: 5 }, gold: 5 })).toEqual({
      ok: false,
      reason: 'run over',
    });
  });

  it('a rested hero rejoins the fight when raiders come close', () => {
    const w = createWorld(1, raided);
    const id = spawnHero(w, 'warrior', { x: 600, y: 500 });
    const hero = heroOf(w, id);
    hero.mode = 'rest';
    step(w, 1_100);
    let rejoined = false;
    for (let i = 0; i < 600 && !rejoined; i++) {
      step(w, 50);
      rejoined = hero.mode !== 'rest';
    }
    expect(rejoined).toBe(true);
  });

  it('raids grow over time', () => {
    const w = createWorld(1, {
      ...base,
      tuning: {
        town: { raidFirstMs: 1_000, raidEveryMs: 1_000, raidSize: 1, raidGrowEveryMs: 2_000 },
      },
    });
    step(w, 1_100);
    const first = snapshot(w).events.find((e) => e.kind === 'raid');
    step(w, 4_000);
    const sizes = snapshot(w)
      .events.filter((e) => e.kind === 'raid')
      .map((e) => (e.kind === 'raid' ? e.size : 0));
    expect(first?.kind === 'raid' ? first.size : 0).toBe(1);
    expect(Math.max(...sizes)).toBeGreaterThan(1);
  });
});

describe('bounty flags', () => {
  const quiet: GameData = {
    ...base,
    lairs: [],
    lairSites: [],
    tuning: { town: { raidFirstMs: 10_000_000 } },
  };

  it('a hero walks to a flag on empty ground and claims it', () => {
    const w = createWorld(1, quiet);
    const id = spawnHero(w, 'warrior', { x: 700, y: 500 });
    const hero = heroOf(w, id);
    hero.trait = 'greedy';
    command(w, { kind: 'placeBounty', pos: { x: 1100, y: 700 }, gold: 100 });
    const before = hero.gold;
    for (let i = 0; i < 1200 && w.bounties.length > 0; i++) step(w, 50);
    expect(w.bounties).toHaveLength(0);
    expect(hero.gold).toBe(before + 100);
    expect(snapshot(w).events.some((e) => e.kind === 'bountyClaimed')).toBe(true);
  });

  it('proud heroes ignore small flags, and a flag stays until someone wants it', () => {
    const w = createWorld(1, quiet);
    const id = spawnHero(w, 'warrior', { x: 700, y: 500 });
    heroOf(w, id).trait = 'proud';
    command(w, { kind: 'placeBounty', pos: { x: 1100, y: 700 }, gold: 10 });
    step(w, 3_000);
    expect(w.heroRuntime.get(id)?.bounty).toBeUndefined();
  });

  it('cowards refuse a dangerous flag that brave heroes take', () => {
    const run = (trait: 'brave' | 'coward') => {
      const w = createWorld(1, {
        ...quiet,
        lairs: base.lairs,
        lairSites: [{ lair: 'barrow', pos: { x: 1100, y: 700 } }],
      });
      const id = spawnHero(w, 'warrior', { x: 700, y: 500 });
      heroOf(w, id).trait = trait;
      command(w, { kind: 'placeBounty', pos: { x: 1100, y: 700 }, gold: 60 });
      step(w, 1_100);
      return w.heroRuntime.get(id)?.bounty;
    };
    expect(run('brave')).toBeDefined();
    expect(run('coward')).toBeUndefined();
  });

  it('a flag next to a live lair is not claimed until the lair falls', () => {
    const w = createWorld(1, {
      ...quiet,
      lairs: base.lairs,
      lairSites: [{ lair: 'barrow', pos: { x: 1100, y: 700 } }],
    });
    const id = spawnHero(w, 'warrior', { x: 1100, y: 700 });
    heroOf(w, id).trait = 'brave';
    command(w, { kind: 'placeBounty', pos: { x: 1100, y: 700 }, gold: 60 });
    step(w, 100);
    expect(w.bounties).toHaveLength(1);
    for (let i = 0; i < 1000 && w.lairs.length > 0; i++) step(w, 50);
    expect(w.lairs).toHaveLength(0);
  });
});

describe('flag interest in the snapshot', () => {
  const quiet: GameData = {
    ...base,
    lairs: [],
    lairSites: [],
    tuning: { town: { raidFirstMs: 10_000_000 } },
  };

  it("shows the flag a hero is heading for, followers show their leader's, null otherwise", () => {
    const w = createWorld(1, quiet);
    const a = spawnHero(w, 'warrior', { x: 700, y: 500 });
    const b = spawnHero(w, 'warrior', { x: 700, y: 500 });
    const ua = heroOf(w, a);
    const ub = heroOf(w, b);
    const party = w.parties.get(ua.party);
    if (!party) throw new Error('setup');
    w.parties.delete(ub.party);
    ub.party = ua.party;
    party.members.push(b);
    ua.trait = 'greedy';
    ub.trait = 'coward';
    const placed = command(w, { kind: 'placeBounty', pos: { x: 1500, y: 900 }, gold: 100 });
    if (!placed.ok) throw new Error('setup');
    step(w, 1_200);
    const s = snapshot(w);
    const byId = (id: number) => s.units.find((u) => u.id === id);
    expect(w.heroRuntime.get(a)?.dest).toEqual({ x: 1500, y: 900 });
    expect(w.heroRuntime.get(b)?.dest).toEqual({ x: 1500, y: 900 });
    expect(byId(a)?.bounty).toBe(placed.id);
    expect(byId(b)?.bounty).toBe(placed.id);
    for (let i = 0; i < 2000 && w.bounties.length > 0; i++) step(w, 50);
    expect(w.bounties).toHaveLength(0);
    step(w, 100);
    expect(snapshot(w).units.every((u) => u.bounty === null)).toBe(true);
  });

  it('a hero knocked out or merged mid-tick never shows a stale flag', () => {
    const w = createWorld(1, quiet);
    const id = spawnHero(w, 'warrior', { x: 700, y: 500 });
    const hero = heroOf(w, id);
    hero.trait = 'greedy';
    command(w, { kind: 'placeBounty', pos: { x: 1500, y: 900 }, gold: 100 });
    step(w, 1_200);
    expect(snapshot(w).units.find((u) => u.id === id)?.bounty).not.toBeNull();
    hero.ko = true;
    hero.mode = 'ko';
    expect(snapshot(w).units.find((u) => u.id === id)?.bounty).toBeNull();
  });

  it('a resting hero and monsters show no flag', () => {
    const w = createWorld(1, base);
    const id = spawnHero(w, 'warrior', { x: 700, y: 500 });
    const hero = heroOf(w, id);
    hero.mode = 'rest';
    hero.hp = 1;
    command(w, { kind: 'placeBounty', pos: { x: 1100, y: 700 }, gold: 100 });
    step(w, 1_200);
    expect(snapshot(w).units.every((u) => u.bounty === null)).toBe(true);
  });
});

describe('run stats and determinism', () => {
  it('counts what happened', () => {
    const w = createWorld(1, base);
    spawnHero(w, 'warrior', { x: 900, y: 500 });
    step(w, 20_000);
    const s = snapshot(w).stats;
    expect(s.heroesArrived).toBe(1);
    expect(s.lairsDestroyed).toBe(1);
  });

  it('a raided town replays identically for a seed', () => {
    const run = (seed: number) => {
      const w = createWorld(seed, {
        ...base,
        tuning: { town: { raidFirstMs: 1_000, raidEveryMs: 20_000 } },
      });
      command(w, { kind: 'build', type: 'market', plot: 0 });
      spawnHero(w, 'warrior', { x: 650, y: 500 });
      step(w, 90_000);
      return JSON.stringify(snapshot(w));
    };
    expect(run(4)).toBe(run(4));
  });
});
