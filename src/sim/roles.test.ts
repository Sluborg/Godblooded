import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { newParty } from './parties';
import { spawnHero, statsOf } from './world';
import { packMult } from './roles';
import type { MonsterRole, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const mon = (id: string, role: MonsterRole, over: object = {}) => ({
  id,
  attrs: { ...none, str: 10, sta: 20, dex: 5, per: 5 },
  weapon,
  bounty: 10,
  xp: 10,
  role,
  ...over,
});

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [{ id: 'knight', attrs: { ...none, str: 10, sta: 60 }, weapon, startGold: 0 }],
  gods: [{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' }],
  monsters: [
    mon('harpy', 'harrier'),
    mon('minotaur', 'charger'),
    mon('jackal', 'pack'),
    mon('scarab', 'swarm', { attrs: { ...none, str: 4, sta: 6 } }),
    mon('draugr', 'brute'),
  ],
  lairs: [
    { id: 'nest', monster: 'harpy', spawnS: 1000, maxAlive: 0, hp: 1000 },
    { id: 'pit', monster: 'scarab', spawnS: 1, maxAlive: 2, hp: 1000 },
  ],
  lairSites: [
    { lair: 'nest', pos: { x: 1000, y: 500 } },
    { lair: 'pit', pos: { x: 3000, y: 3000 } },
  ],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    lair: { tierUpEveryMs: 0 },
  },
};

type W = ReturnType<typeof createWorld>;

function hero(w: W, x: number, y = 500): UnitState {
  const id = spawnHero(w, 'thor', { x, y });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.party = newParty(w, id);
  return u;
}

function monster(w: W, type: string, x: number, y = 500, lair: number | null = null): UnitState {
  const id = w.nextId++;
  const hp = 120;
  const u: UnitState = {
    id,
    kind: 'monster',
    type,
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp,
    maxHp: hp,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  };
  w.units.push(u);
  w.unitRuntime.set(id, { lair, cooldownMs: 0, target: null, idleMs: 0 });
  return u;
}

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

describe('harrier', () => {
  it('goes for the hero with the least hp, not the nearest', () => {
    const w = createWorld(1, data);
    const near = hero(w, 520);
    const weak = hero(w, 560);
    weak.hp = 20;
    const harpy = monster(w, 'harpy', 500);
    run(w, 200);
    expect(harpy.target).toBe(weak.id);
    expect(harpy.target).not.toBe(near.id);
  });

  it('flees to its lair below 30%, heals there and returns', () => {
    const w = createWorld(1, data);
    const lair = w.lairs.find((l) => l.type === 'nest')!;
    const harpy = monster(w, 'harpy', lair.pos.x + 150, lair.pos.y, lair.id);
    harpy.hp = 30;
    run(w, 1000);
    expect(w.unitRuntime.get(harpy.id)?.retreat).toBe(true);
    expect(dist(harpy.pos, lair.pos)).toBeLessThan(150);
    run(w, 12_000);
    expect(w.unitRuntime.get(harpy.id)?.retreat).toBe(false);
    expect(harpy.hp).toBeGreaterThanOrEqual(0.95 * harpy.maxHp);
  });
});

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('charger', () => {
  it('charges from 150 to 300 away: a double first strike and a knockback of 60', () => {
    const w = createWorld(1, data);
    const h = hero(w, 700);
    const bull = monster(w, 'minotaur', 500);
    let ev: SimEvent[] = [];
    let gap = 0;
    for (let i = 0; i < 40 && !ev.some((e) => e.kind === 'hit' && e.attacker === bull.id); i++) {
      ev = ev.concat(run(w, TICK_MS));
      gap = Math.abs(h.pos.x - bull.pos.x);
    }
    expect(ev.some((e) => e.kind === 'charge' && e.unit === bull.id)).toBe(true);
    const hits = ev.filter((e) => e.kind === 'hit' && e.attacker === bull.id && e.target === h.id);
    expect(hits).toHaveLength(1);
    // str 10 plain; the charge doubles it
    expect((hits[0] as { damage: number }).damage).toBe(20);
    // the target stood within 40 of the bull and was thrown 60 back
    expect(gap).toBeGreaterThan(80);
  });

  it('does not charge from point blank range', () => {
    const w = createWorld(1, data);
    hero(w, 520);
    monster(w, 'minotaur', 500);
    expect(run(w, 1000).some((e) => e.kind === 'charge')).toBe(false);
  });
});

describe('pack', () => {
  it('hits 10% harder per pack mate within 100, up to 30%', () => {
    const w = createWorld(1, data);
    const a = monster(w, 'jackal', 500);
    expect(packMult(w, a)).toBe(1);
    monster(w, 'jackal', 540);
    expect(packMult(w, a)).toBeCloseTo(1.1);
    monster(w, 'jackal', 560);
    monster(w, 'jackal', 520);
    monster(w, 'jackal', 530);
    expect(packMult(w, a)).toBeCloseTo(1.3);
    monster(w, 'jackal', 900);
    expect(packMult(w, a)).toBeCloseTo(1.3);
    expect(packMult(w, monster(w, 'draugr', 505))).toBe(1);
  });
});

describe('swarm', () => {
  it('its lair keeps twice as many alive', () => {
    const w = createWorld(1, data);
    run(w, 12_000);
    const alive = w.units.filter((u) => u.type === 'scarab' && w.unitRuntime.get(u.id)?.lair);
    expect(alive).toHaveLength(4);
  });

  it('splits once into two halves of half the hp and damage, worth half the reward', () => {
    const w = createWorld(1, data);
    const h = hero(w, 520);
    const swarm = monster(w, 'scarab', 560);
    const full = statsOf(w, swarm)!.attrs.str;
    swarm.hp = 0;
    w.pendingDeaths.push({ victim: swarm.id, by: h.id });
    const gold = h.gold;
    const ev = run(w, 50);
    const [split] = ev.filter((e) => e.kind === 'split') as { into: number[] }[];
    expect(split.into).toHaveLength(2);
    const halves = split.into.map((id) => w.units.find((u) => u.id === id)!);
    expect(halves.every((u) => u.maxHp === 60)).toBe(true);
    expect(statsOf(w, halves[0])!.attrs.str).toBeCloseTo(full / 2);
    expect(h.gold).toBeGreaterThan(gold);
    // a half dies for good, and pays half
    const before = h.gold;
    halves[0].hp = 0;
    w.pendingDeaths.push({ victim: halves[0].id, by: h.id });
    const ev2 = run(w, 50);
    expect(ev2.some((e) => e.kind === 'split')).toBe(false);
    expect(h.gold - before).toBeLessThanOrEqual(5);
  });
});

describe('review fixes', () => {
  it('a rooted charger does not start a charge', () => {
    const w = createWorld(1, data);
    hero(w, 700);
    const bull = monster(w, 'minotaur', 500);
    // bound: speed 0
    w.unitRuntime.get(bull.id)!.fx = { bind: { until: w.timeMs + 60_000, half: false } } as never;
    const ev = run(w, 1_000);
    expect(ev.some((e) => e.kind === 'charge')).toBe(false);
    expect(w.unitRuntime.get(bull.id)?.charge).toBeUndefined();
  });

  it('a harrier heals only at its lair, in whole hp', () => {
    const w = createWorld(1, data);
    const lair = w.lairs.find((l) => l.type === 'nest')!;
    const harpy = monster(w, 'harpy', lair.pos.x + 400, lair.pos.y, lair.id);
    harpy.hp = 30;
    run(w, 1_000);
    // still walking home: no healing on the way
    expect(harpy.hp).toBe(30);
    run(w, 15_000);
    expect(Number.isInteger(harpy.hp)).toBe(true);
    expect(harpy.hp).toBeGreaterThan(30);
  });

  it('a harrier raider keeps fighting instead of healing in place', () => {
    const w = createWorld(1, data);
    const harpy = monster(w, 'harpy', 2000, 2000);
    w.unitRuntime.get(harpy.id)!.raid = true;
    harpy.hp = 10;
    run(w, 3_000);
    expect(harpy.hp).toBe(10);
    expect(w.unitRuntime.get(harpy.id)?.retreat).toBeFalsy();
  });

  it('swarm halves keep the raid of their parent', () => {
    const w = createWorld(1, data);
    const h = hero(w, 520);
    const swarm = monster(w, 'scarab', 560);
    const rt = w.unitRuntime.get(swarm.id)!;
    rt.raid = true;
    rt.raidId = 77;
    swarm.hp = 0;
    w.pendingDeaths.push({ victim: swarm.id, by: h.id });
    const ev = run(w, 50);
    const [split] = ev.filter((e) => e.kind === 'split') as { into: number[] }[];
    for (const id of split.into) expect(w.unitRuntime.get(id)?.raidId).toBe(77);
  });
});
