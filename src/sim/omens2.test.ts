import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';
import type { OmenDef, UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };

const data = (omen: OmenDef): GameData => ({
  buildings: [],
  plots: [
    { x: 3000, y: 1500 },
    { x: 3100, y: 1600 },
  ],
  startGold: 0,
  map: { width: 4000, height: 2000 },
  townHall: { x: 3800, y: 1900 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 12, sta: 30 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    { id: 'draugr', attrs, weapon: { baseAttackS: 1, range: 40 }, bounty: 1, xp: 1 },
    {
      id: 'troll',
      attrs: { ...attrs, str: 12, sta: 20 },
      weapon: { baseAttackS: 2, range: 40 },
      bounty: 5,
      xp: 5,
    },
    { id: 'scarab', attrs, weapon: { baseAttackS: 1, range: 40 }, bounty: 1, xp: 1, role: 'swarm' },
  ],
  upgrades: [{ id: 'a', name: 'A', text: 'a', effect: { attr: { str: 1 } } }],
  omens: [omen],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    events: { omenFirstMs: 1_000, omenLeadMs: 500, omenEveryMs: [1_000_000, 1_000_000] },
  },
});

type W = ReturnType<typeof createWorld>;

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const get = (w: W, id: number) => {
  const u = w.units.find((x) => x.id === id);
  if (!u) throw new Error('gone');
  return u;
};

describe('Wandering Champion', () => {
  const champion: OmenDef = {
    id: 'champion',
    name: 'Wandering Champion',
    text: 'x',
    weight: 1,
    durationMs: 600_000,
    untilKilled: true,
    spawn: { monster: 'strongest', count: 1, at: 'town', elite: true, bounty: 150 },
  };

  it('an elite of the strongest monster with a free 150 gold hunt flag; it ends when it dies', () => {
    const w = createWorld(1, data(champion));
    const gold = w.gold;
    const ev = run(w, 3_000);
    const spawned = ev.find((e) => e.kind === 'omenSpawn');
    expect(spawned).toBeTruthy();
    const id = spawned?.kind === 'omenSpawn' ? spawned.units[0] : -1;
    const u = get(w, id);
    expect(u).toMatchObject({ type: 'troll', elite: true });
    expect(w.bounties).toHaveLength(1);
    expect(w.bounties[0]).toMatchObject({ gold: 150, target: id });
    expect(w.gold).toBe(gold);
    // roams near the town, not far
    expect(Math.hypot(u.pos.x - 3800, u.pos.y - 1900)).toBeLessThan(700);
    expect(snapshot(w).omen).toMatchObject({ phase: 'active' });
    w.pendingDeaths.push({ victim: id, by: 0 });
    u.hp = 0;
    const after = run(w, 500);
    expect(after.some((e) => e.kind === 'omenEnd')).toBe(true);
  });
});

describe('Plague of Scarabs', () => {
  it('a swarm bursts out at a plot and marches on the town as a raid', () => {
    const w = createWorld(
      1,
      data({
        id: 'plague',
        name: 'Plague',
        text: 'x',
        weight: 1,
        durationMs: 45_000,
        spawn: { monster: 'scarab', count: 4, at: 'plot', raid: true },
      }),
    );
    const ev = run(w, 3_000);
    const sp = ev.find((e) => e.kind === 'omenSpawn');
    const ids = sp?.kind === 'omenSpawn' ? sp.units : [];
    expect(ids).toHaveLength(4);
    for (const id of ids) {
      expect(w.unitRuntime.get(id)?.raid).toBe(true);
      const u = get(w, id);
      expect(Math.abs(u.pos.x - 3000) < 400 || Math.abs(u.pos.x - 3100) < 400).toBe(true);
    }
    expect(w.raidActive.length).toBeGreaterThan(0);
  });
});

describe('Fallen Star', () => {
  const star: OmenDef = {
    id: 'star',
    name: 'Fallen Star',
    text: 'x',
    weight: 1,
    durationMs: 60_000,
    star: { xp: 60 },
  };

  it('the first party to reach it gets the xp, once', () => {
    const w = createWorld(1, data(star));
    const ev = run(w, 2_000);
    const fell = ev.find((e) => e.kind === 'starFallen');
    expect(fell).toBeTruthy();
    const pos = fell?.kind === 'starFallen' ? fell.pos : { x: 0, y: 0 };
    const a = spawnHero(w, 'warrior', { x: pos.x + 20, y: pos.y });
    const b = spawnHero(w, 'warrior', { x: pos.x - 20, y: pos.y });
    const found = run(w, 200).filter((e) => e.kind === 'starFound');
    expect(found).toHaveLength(1);
    const party = get(w, a).party;
    expect(found[0]).toMatchObject({ party, xp: 60 });
    expect(w.parties.get(party)?.xp).toBeGreaterThan(0);
    expect(get(w, b)).toBeTruthy();
    expect(run(w, 2_000).some((e) => e.kind === 'starFound')).toBe(false);
  });
});

describe('Games of Olympia', () => {
  it('the party with the most kills while it lasts gets a bonus card', () => {
    const w = createWorld(
      1,
      data({ id: 'games', name: 'Games', text: 'x', weight: 1, durationMs: 5_000, contest: true }),
    );
    const a: UnitState = get(w, spawnHero(w, 'warrior', { x: 100, y: 100 }));
    const b: UnitState = get(w, spawnHero(w, 'warrior', { x: 300, y: 100 }));
    run(w, 1_500);
    const ra = w.heroRecords.get(a.id);
    const rb = w.heroRecords.get(b.id);
    if (!ra || !rb) throw new Error('no record');
    ra.kills += 1;
    rb.kills += 3;
    const ev = run(w, 6_000);
    const card = ev.find((e) => e.kind === 'bonusCard');
    expect(card).toMatchObject({ party: b.party });
    expect(command(w, { kind: 'build', type: 'x', plot: 0 }).ok).toBe(false);
  });
});
