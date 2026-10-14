import { describe, expect, it } from 'vitest';
import { command, createWorld, runReport, snapshot, step, TICK_MS, type GameData } from './api';
import { funStats } from './funstats';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [{ id: 'market', cost: 10 }],
  plots: [{ x: 700, y: 500 }],
  startGold: 100,
  map: { width: 4000, height: 2000 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 12, sta: 12 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 1, sta: 20 },
      weapon: { baseAttackS: 3, range: 40 },
      bounty: 1,
      xp: 1,
    },
  ],
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
};

type W = ReturnType<typeof createWorld>;

const run = (w: W, ms: number) => {
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    snapshot(w);
  }
};

function monster(w: W, x: number, y: number): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type: 'draugr',
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp: 300,
    maxHp: 300,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  };
  w.units.push(u);
  w.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  return u;
}

describe('fun-check stats', () => {
  it('records a fight with its damage types, and closes it after the gap', () => {
    const w = createWorld(1, data);
    const h = spawnHero(w, 'warrior', { x: 1000, y: 1000 });
    monster(w, 1030, 1000);
    run(w, 3_000);
    expect(w.fights).toHaveLength(1);
    const f = w.fights[0];
    expect(f.open).toBe(true);
    expect(f.types).toEqual(['physical']);
    expect(f.party).toBe(w.units.find((u) => u.id === h)?.party);
    // the monster dies; 5 s later the fight is over
    w.units = w.units.filter((u) => u.kind !== 'monster');
    run(w, 7_000);
    expect(w.fights[0].open).toBeUndefined();
    expect(w.fights[0].endMs).toBeGreaterThan(w.fights[0].startMs);
  });

  it('marks a fight where a skill was cast', () => {
    const w = createWorld(1, data);
    const h = spawnHero(w, 'warrior', { x: 1000, y: 1000 });
    monster(w, 1030, 1000);
    run(w, 1_000);
    w.events.push({ kind: 'skill', skill: 'x', caster: h, hits: [], point: { x: 0, y: 0 } });
    run(w, 100);
    expect(w.fights[0].cast).toBe(true);
  });

  it('counts the commands that took effect as decisions, one per minute at best', () => {
    const w = createWorld(1, data);
    expect(command(w, { kind: 'build', type: 'nope', plot: 0 }).ok).toBe(false);
    expect(command(w, { kind: 'build', type: 'market', plot: 0 }).ok).toBe(true);
    run(w, 61_000);
    const fun = funStats(w);
    expect(fun.decisions).toBe(1);
    expect(fun.decisionMinuteShare).toBe(1);
    run(w, 60_000);
    expect(funStats(w).decisionMinuteShare).toBe(0.5);
  });

  it('measures the longest quiet stretch from the first hero on', () => {
    const w = createWorld(1, data);
    run(w, 30_000);
    expect(w.quiet.longestMs).toBe(0);
    const hero = spawnHero(w, 'warrior', { x: 1000, y: 1000 });
    run(w, 40_000);
    expect(w.quiet.longestMs).toBeGreaterThanOrEqual(39_000);
    expect(runReport(w).fun.longestQuietMs).toBe(w.quiet.longestMs);
    // a fight breaks it
    const at = w.units.find((u) => u.id === hero)?.pos ?? { x: 0, y: 0 };
    monster(w, at.x + 30, at.y);
    run(w, 3_000);
    expect(w.fights.length).toBeGreaterThan(0);
  });

  it('shares are null when nothing qualifies', () => {
    const w = createWorld(1, data);
    const fun = funStats(w);
    expect(fun.castShareAfter6).toBeNull();
    expect(fun.typesShareTier2).toBeNull();
    expect(fun.decisionMinuteShare).toBeNull();
  });
});
