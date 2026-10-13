import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { noteFight } from './engage';
import { attackMs } from './units';
import { spawnHero } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 2, range: 40 };
const make = (combat = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'quick',
      attrs: { ...none, str: 1, sta: 90, dex: 10, per: 10 },
      weapon,
      startGold: 0,
    },
  ],
  monsters: [
    { id: 'slow', attrs: { ...none, str: 1, sta: 90 }, weapon, bounty: 1, xp: 1 },
    {
      id: 'quickmon',
      attrs: { ...none, str: 1, sta: 90, dex: 10, per: 10 },
      weapon,
      bounty: 1,
      xp: 1,
    },
  ],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9, ...combat },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
});

type W = ReturnType<typeof createWorld>;

function add(w: W, type: string, x: number, y: number): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type,
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp: 5000,
    maxHp: 5000,
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

// A quick hero next to a slow monster: the windup times of each.
function duel(combat = {}, monType = 'slow') {
  const w = createWorld(1, make(combat));
  const hid = spawnHero(w, 'quick', { x: 500, y: 500 });
  const mon = add(w, monType, 520, 500);
  const winds: { who: number; at: number }[] = [];
  for (let t = 0; t < 12_000; t += TICK_MS) {
    step(w, TICK_MS);
    for (const e of snapshot(w).events as readonly SimEvent[]) {
      if (e.kind === 'windup') winds.push({ who: e.attacker, at: w.timeMs });
    }
  }
  return { w, hid, mon, winds };
}

describe('first strike', () => {
  it('the side with the lower Dex + Per waits half a cycle for its first strike', () => {
    const { hid, mon, winds } = duel();
    const first = (id: number) => winds.find((x) => x.who === id)?.at ?? Infinity;
    const cycle = attackMs({ attrs: none, weapon }, 15);
    // the quick hero swings at once, the slow monster half its 2 s cycle later
    expect(first(hid)).toBeLessThan(200);
    expect(first(mon.id) - first(hid)).toBeGreaterThanOrEqual(cycle * 0.5 - TICK_MS);
    expect(first(mon.id) - first(hid)).toBeLessThanOrEqual(cycle * 0.5 + 300);
  });

  it('firstStrikeDelay 0 removes it', () => {
    const { hid, mon, winds } = duel({ firstStrikeDelay: 0 });
    const first = (id: number) => winds.find((x) => x.who === id)?.at ?? Infinity;
    expect(Math.abs(first(mon.id) - first(hid))).toBeLessThanOrEqual(TICK_MS);
  });

  it('equal Dex + Per: nobody waits', () => {
    const { hid, mon, winds } = duel({}, 'quickmon');
    const first = (id: number) => winds.find((x) => x.who === id)?.at ?? Infinity;
    expect(Math.abs(first(mon.id) - first(hid))).toBeLessThanOrEqual(TICK_MS);
  });

  it('is an opening only: later swings of the slow side are a plain cycle apart', () => {
    const { mon, winds } = duel();
    const times = winds.filter((x) => x.who === mon.id).map((x) => x.at);
    expect(times.length).toBeGreaterThan(3);
    for (let i = 2; i < times.length; i++) {
      expect(times[i] - times[i - 1]).toBe(times[2] - times[1]);
    }
    expect(times[1] - times[0]).toBe(times[2] - times[1]);
  });
});

describe('fights', () => {
  it('a fight ends after fightGapMs with no foe, and the next meeting is fresh again', () => {
    const w = createWorld(1, make());
    const hid = spawnHero(w, 'quick', { x: 500, y: 500 });
    const mon = add(w, 'slow', 520, 500);
    const hrt = w.unitRuntime.get(hid);
    const mrt = w.unitRuntime.get(mon.id);
    if (!hrt || !mrt) throw new Error('runtime');
    const hero = w.units.find((u) => u.id === hid) as UnitState;
    const stats = { attrs: { ...none, dex: 10, per: 10 }, weapon };
    const foeStats = { attrs: none, weapon };
    noteFight(w, hero, hrt, stats, mon, mrt, foeStats);
    const until = hrt.fightUntilMs ?? 0;
    expect(until).toBe(w.timeMs + 5_000);
    expect(mrt.cooldownMs).toBeGreaterThan(0);
    // still the same fight 3 s later: no new delay
    w.timeMs += 3_000;
    mrt.cooldownMs = 0;
    noteFight(w, hero, hrt, stats, mon, mrt, foeStats);
    expect(mrt.cooldownMs).toBe(0);
    // 6 s of no foe, then they meet again: fresh
    w.timeMs += 9_000;
    noteFight(w, hero, hrt, stats, mon, mrt, foeStats);
    expect(mrt.cooldownMs).toBeGreaterThan(0);
  });

  it('a unit joining a running fight keeps its tempo', () => {
    const w = createWorld(1, make());
    const hid = spawnHero(w, 'quick', { x: 500, y: 500 });
    const a = add(w, 'slow', 520, 500);
    const b = add(w, 'slow', 540, 500);
    const hrt = w.unitRuntime.get(hid);
    const art = w.unitRuntime.get(a.id);
    const brt = w.unitRuntime.get(b.id);
    if (!hrt || !art || !brt) throw new Error('runtime');
    const stats = { attrs: { ...none, dex: 10, per: 10 }, weapon };
    const foeStats = { attrs: none, weapon };
    const hero = w.units.find((u) => u.id === hid) as UnitState;
    noteFight(w, hero, hrt, stats, a, art, foeStats);
    // b, fresh, meets the hero who is already fighting: no first-strike wait for b
    noteFight(w, b, brt, foeStats, hero, hrt, stats);
    expect(brt.cooldownMs).toBe(0);
  });
});
