import { describe, expect, it } from 'vitest';
import { createWorld, runReport, snapshot, step as stepOnce, type GameData } from './api';
import { spawnHero } from './world';

const strong = { str: 9, dex: 3, sta: 9, cha: 1, per: 3, int: 1, wp: 3 };
const weak = { str: 1, dex: 1, sta: 1, cha: 1, per: 1, int: 1, wp: 1 };
const data: GameData = {
  buildings: [],
  startGold: 100,
  map: { width: 2000, height: 1200 },
  townHall: { x: 1800, y: 1100 },
  classes: [
    { id: 'warrior', attrs: strong, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 },
    {
      id: 'healer',
      attrs: { ...strong, int: 6, wp: 4 },
      weapon: { baseAttackS: 1.5, range: 200 },
      startGold: 0,
      heals: true,
    },
  ],
  monsters: [{ id: 'imp', attrs: weak, weapon: { baseAttackS: 3, range: 40 }, bounty: 7, xp: 2 }],
  lairs: [{ id: 'nest', monster: 'imp', spawnS: 4, maxAlive: 2, hp: 300 }],
  lairSites: [{ lair: 'nest', pos: { x: 500, y: 500 } }],
  tuning: {
    town: { raidFirstMs: 10_000_000 },
    hero: { firstRecruitMs: 10_000_000 },
    lair: { tierUpEveryMs: 0 },
  },
};

type W = ReturnType<typeof createWorld>;

// step() runs at most 400 ticks per call, so spans go in chunks.
function run(w: W, ms: number) {
  for (let left = ms; left > 0 && w.status === 'running'; left -= 5_000) {
    stepOnce(w, Math.min(5_000, left));
  }
}

// A world where one warrior clears the only lair.
function cleared() {
  const w = createWorld(1, data);
  const id = spawnHero(w, 'warrior', { x: 470, y: 470 });
  run(w, 120_000);
  return { w, id };
}

describe('run report', () => {
  it('is null while the run goes on', () => {
    const w = createWorld(1, data);
    spawnHero(w, 'warrior', { x: 1700, y: 1000 });
    run(w, 2_000);
    expect(snapshot(w).status).toBe('running');
    expect(snapshot(w).report).toBeNull();
  });

  it('runReport gives a running world a report marked abandoned, without touching the world', () => {
    const w = createWorld(1, data);
    const id = spawnHero(w, 'warrior', { x: 470, y: 470 });
    run(w, 6_000);
    expect(w.status).toBe('running');
    const report = runReport(w);
    expect(report.outcome).toBe('abandoned');
    expect(report.timeMs).toBe(w.timeMs);
    expect(report.heroes.map((h) => h.unit)).toContain(id);
    expect(report.goldHistory.length).toBeGreaterThan(0);
    // the world is unchanged and the snapshot still has no report
    expect(w.status).toBe('running');
    expect(snapshot(w).report).toBeNull();
  });

  it('a won run reports per hero numbers, the cleared lair and the MVP', () => {
    const { w, id } = cleared();
    const snap = snapshot(w);
    expect(snap.status).toBe('won');
    const report = snap.report;
    if (!report) throw new Error('no report');
    expect(report.outcome).toBe('won');
    expect(report.timeMs).toBe(snap.timeMs);
    expect(report.mvp).toBe(id);
    expect(report.heroes).toHaveLength(1);
    const h = report.heroes[0];
    expect(h).toMatchObject({ unit: id, type: 'warrior', mvp: true, lairKills: 1, knockouts: 0 });
    expect(h.kills).toBe(snap.stats.monstersKilled);
    expect(h.damage).toBeGreaterThan(0);
    // 7 gold per imp plus the lair bounty (60 by default)
    expect(h.goldEarned).toBe(h.kills * 7 + 60);
    expect(report.lairsCleared).toHaveLength(1);
    expect(report.lairsCleared[0]).toMatchObject({ type: 'nest', by: id });
    expect(report.lairsCleared[0].timeMs).toBeLessThanOrEqual(report.timeMs);
  });

  it('samples town gold over time and ends on the final value', () => {
    const { w } = cleared();
    const report = snapshot(w).report;
    if (!report) throw new Error('no report');
    const hist = report.goldHistory;
    expect(hist.length).toBeGreaterThanOrEqual(2);
    expect(hist[0]).toEqual({ timeMs: 0, gold: 100 });
    expect(hist[hist.length - 1]).toEqual({ timeMs: report.timeMs, gold: w.gold });
    for (let i = 1; i < hist.length; i++) {
      expect(hist[i].timeMs).toBeGreaterThan(hist[i - 1].timeMs);
    }
  });

  it('a lost run has a report too, and heroes are sorted best first', () => {
    const w = createWorld(1, data);
    const a = spawnHero(w, 'warrior', { x: 100, y: 100 });
    const b = spawnHero(w, 'warrior', { x: 100, y: 100 });
    const rec = w.heroRecords.get(b);
    if (!rec) throw new Error('record');
    rec.kills = 4;
    w.status = 'lost';
    const report = snapshot(w).report;
    expect(report?.outcome).toBe('lost');
    expect(report?.heroes.map((h) => h.unit)).toEqual([b, a]);
    expect(report?.mvp).toBe(b);
  });

  it('damage only breaks ties: one more kill beats any amount of damage', () => {
    const w = createWorld(1, data);
    const a = spawnHero(w, 'warrior', { x: 100, y: 100 });
    const b = spawnHero(w, 'warrior', { x: 100, y: 100 });
    const ra = w.heroRecords.get(a);
    const rb = w.heroRecords.get(b);
    if (!ra || !rb) throw new Error('records');
    ra.kills = 3;
    ra.damage = 10;
    rb.kills = 2;
    rb.damage = 100_000;
    w.status = 'lost';
    expect(snapshot(w).report?.heroes.map((h) => h.unit)).toEqual([a, b]);
    // equal score: damage decides, then gold
    rb.kills = 3;
    expect(snapshot(w).report?.heroes.map((h) => h.unit)).toEqual([b, a]);
    ra.damage = rb.damage;
    ra.goldEarned = 5;
    expect(snapshot(w).report?.heroes.map((h) => h.unit)).toEqual([a, b]);
  });

  it('a run ending on a sampling instant keeps one point for that time', () => {
    const w = createWorld(1, {
      ...data,
      tuning: { ...data.tuning, stats: { goldSampleMs: 1_000 } },
    });
    stepOnce(w, 1_000);
    expect(w.timeMs).toBe(1_000);
    w.gold = 777;
    w.status = 'lost';
    const hist = snapshot(w).report?.goldHistory ?? [];
    expect(hist.filter((p) => p.timeMs === 1_000)).toEqual([{ timeMs: 1_000, gold: 777 }]);
    for (let i = 1; i < hist.length; i++) {
      expect(hist[i].timeMs).toBeGreaterThan(hist[i - 1].timeMs);
    }
  });

  it('nobody is MVP when nobody did anything', () => {
    const w = createWorld(1, data);
    spawnHero(w, 'warrior', { x: 100, y: 100 });
    w.status = 'lost';
    expect(snapshot(w).report?.mvp).toBeNull();
  });

  it('counts knockouts and healing', () => {
    const w = createWorld(1, { ...data, lairs: [], lairSites: [] });
    const healer = spawnHero(w, 'healer', { x: 400, y: 400 });
    const warrior = spawnHero(w, 'warrior', { x: 460, y: 400 });
    const h = w.units.find((u) => u.id === healer);
    const m = w.units.find((u) => u.id === warrior);
    if (!h || !m) throw new Error('setup');
    const party = w.parties.get(h.party);
    if (!party) throw new Error('party');
    w.parties.delete(m.party);
    party.members.push(warrior);
    m.party = party.id;
    m.hp = Math.floor(m.maxHp * 0.4);
    run(w, 5_000);
    expect(w.heroRecords.get(healer)?.healing).toBeGreaterThan(0);
    w.pendingDeaths.push({ victim: warrior, by: 999 });
    run(w, 100);
    expect(w.heroRecords.get(warrior)?.knockouts).toBe(1);
    w.status = 'lost';
    const report = snapshot(w).report;
    expect(report?.heroes.find((x) => x.unit === warrior)?.knockouts).toBe(1);
    expect(report?.heroes.find((x) => x.unit === healer)?.healing).toBeGreaterThan(0);
  });

  it('flag bounties count as earned gold', () => {
    const w = createWorld(1, { ...data, lairs: [], lairSites: [] });
    const id = spawnHero(w, 'warrior', { x: 400, y: 400 });
    w.bounties.push({ id: 900, pos: { x: 400, y: 400 }, gold: 25 });
    run(w, 1_000);
    expect(w.heroRecords.get(id)?.goldEarned).toBe(25);
  });

  it('is deterministic', () => {
    const go = () => JSON.stringify(snapshot(cleared().w).report);
    expect(go()).toBe(go());
  });
});
