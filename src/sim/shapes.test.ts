import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { newParty } from './parties';
import { buildingDamageMult, raidBuilding } from './roles';
import { maxHp } from './units';
import { statsOf, spawnHero } from './world';
import type { MonsterDef, MonsterRole, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };
const mon = (id: string, role: MonsterRole, over: Partial<MonsterDef> = {}): MonsterDef => ({
  id,
  attrs: { ...none, str: 10, sta: 20, dex: 5, per: 5 },
  weapon,
  bounty: 1,
  xp: 1,
  role,
  ...over,
});

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 2000, y: 2000 },
  classes: [{ id: 'knight', attrs: { ...none, str: 10, sta: 60 }, weapon, startGold: 0 }],
  gods: [{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' }],
  monsters: [
    mon('harpy', 'harrier'),
    mon('bull', 'charger', { attrs: { ...none, str: 10, sta: 200, per: 5, dex: 5 } }),
    mon('jackal', 'pack'),
    mon('scarab', 'swarm'),
    mon('troll', 'brute', { quirk: undefined }),
    mon('jackal2', 'pack', { quirk: { healOnKo: 0.5 } }),
  ],
  lairs: [{ id: 'pit', monster: 'scarab', spawnS: 100_000, maxAlive: 0, hp: 1000 }],
  lairSites: [{ lair: 'pit', pos: { x: 500, y: 500 } }],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000, raidSize: 2, townHallHp: 1e9 },
    lair: { tierUpEveryMs: 0 },
  },
};

type W = ReturnType<typeof createWorld>;

function monster(w: W, type: string, x: number, y = 500, hp = 100): UnitState {
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
  w.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  return u;
}

function hero(w: W, x: number, y = 500): UnitState {
  const id = spawnHero(w, 'thor', { x, y });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.party = newParty(w, id);
  return u;
}

function building(w: W, type: string, x: number, y: number, hp = 200) {
  w.buildings.push({ id: w.nextId++, type, tier: 1, pos: { x, y }, plot: null, hp, maxHp: 200 });
}

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

describe('swarm halves', () => {
  it('halve the damage but keep speed, sight and dodge', () => {
    const w = createWorld(1, data);
    const h = hero(w, 520);
    const swarm = monster(w, 'scarab', 560);
    const full = statsOf(w, swarm)!.attrs;
    swarm.hp = 0;
    w.pendingDeaths.push({ victim: swarm.id, by: h.id });
    const [split] = run(w, 50).filter((e) => e.kind === 'split') as { into: number[] }[];
    const half = statsOf(
      w,
      w.units.find((u) => u.id === split.into[0])!,
    )!.attrs;
    expect(half.str).toBeCloseTo(full.str / 2);
    expect(half.dex).toBe(full.dex);
    expect(half.per).toBe(full.per);
    expect(half.sta).toBe(full.sta);
  });
});

describe('harrier targeting', () => {
  it('scores heroes and summons on one scale: a near summon with more hp loses to a weak hero', () => {
    const w = createWorld(1, data);
    const weak = hero(w, 560);
    weak.hp = 10;
    const harpy = monster(w, 'harpy', 500);
    const sid = w.nextId++;
    w.units.push({
      ...monster(w, 'bull', 0),
      id: sid,
      kind: 'summon',
      type: 'decoy',
      pos: { x: 510, y: 500 },
      hp: 500,
      maxHp: 500,
      party: weak.party,
    });
    w.unitRuntime.set(sid, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
    w.units = w.units.filter((u) => !(u.kind === 'monster' && u.type === 'bull'));
    run(w, 100);
    expect(harpy.target).toBe(weak.id);
  });
});

describe('charger', () => {
  it('charges once per fight, after a windup', () => {
    const w = createWorld(1, data);
    const h = hero(w, 700);
    h.mode = 'explore';
    h.maxHp = 1e9;
    h.hp = 1e9;
    monster(w, 'bull', 500, 500, 1e9);
    const ev = run(w, 12_000);
    expect(ev.filter((e) => e.kind === 'charge')).toHaveLength(1);
    const windup = ev.findIndex((e) => e.kind === 'windup' && e.inMs === 600);
    expect(windup).toBeGreaterThanOrEqual(0);
  });

  it('the windup holds the charge back 0.6 s', () => {
    const w = createWorld(1, data);
    const h = hero(w, 700);
    h.mode = 'explore';
    h.maxHp = 1e9;
    h.hp = 1e9;
    const bull = monster(w, 'bull', 500, 500, 1e9);
    run(w, 250);
    const x0 = bull.pos.x;
    run(w, 250);
    // still within the windup after 0.5 s: has not moved
    expect(bull.pos.x).toBe(x0);
    run(w, 400);
    expect(bull.pos.x).toBeGreaterThan(x0);
  });
});

describe('scavenger', () => {
  it('a kill by another monster heals nobody', () => {
    const w = createWorld(1, data);
    const h = hero(w, 520);
    const troll = monster(w, 'troll', 540);
    const jackal = monster(w, 'jackal2', 560, 500, 100);
    jackal.hp = 50;
    h.hp = 0;
    w.pendingDeaths.push({ victim: h.id, by: troll.id });
    run(w, 50);
    expect(jackal.hp).toBe(50);
  });
});

describe('raid shapes', () => {
  it('a swarm raid has twice the units at half the hp; a charger hits buildings twice as hard', () => {
    const w = createWorld(1, data);
    building(w, 'market', 2000, 2000);
    w.nextRaidMs = 1_000;
    w.raidPlannedFor = -1;
    run(w, 17_000);
    const raiders = w.units.filter((u) => w.unitRuntime.get(u.id)?.raid);
    expect(raiders).toHaveLength(4);
    const full = maxHp(data.monsters!.find((m) => m.id === 'scarab')!.attrs);
    expect(raiders[0].maxHp).toBe(Math.round(full * 0.5));
    expect(buildingDamageMult(w, monster(w, 'bull', 0))).toBe(2);
    expect(buildingDamageMult(w, monster(w, 'troll', 0))).toBe(1);
  });

  it('pick their buildings by role', () => {
    const w = createWorld(1, data);
    building(w, 'tower', 1000, 1000, 50);
    building(w, 'market', 3000, 3000);
    building(w, 'smithy', 1900, 1900);
    const at = (type: string) => monster(w, type, 1200, 1200);
    expect(raidBuilding(w, at('troll'))?.type).toBe('tower');
    expect(raidBuilding(w, at('jackal'))?.type).toBe('tower');
    expect(raidBuilding(w, at('harpy'))?.type).toBe('market');
    expect(raidBuilding(w, at('bull'))?.type).toBe('smithy');
    const picks = new Set<string>();
    for (let i = 0; i < 6; i++) picks.add(raidBuilding(w, at('scarab'))?.type ?? '');
    expect(picks.size).toBe(2);
  });
});

describe('packs move together', () => {
  it('a straggler walks back to its mates', () => {
    const w = createWorld(1, data);
    monster(w, 'jackal', 1000, 1000);
    monster(w, 'jackal', 1020, 1000);
    const straggler = monster(w, 'jackal', 1500, 1000);
    const d0 = Math.hypot(straggler.pos.x - 1010, straggler.pos.y - 1000);
    run(w, 2_000);
    const d1 = Math.hypot(straggler.pos.x - 1010, straggler.pos.y - 1000);
    expect(d1).toBeLessThan(d0 - 50);
  });
});

describe('discovered', () => {
  it('fires once per monster and lair kind the first time a hero sees it', () => {
    const w = createWorld(1, data);
    const h = hero(w, 520);
    h.mode = 'explore';
    h.maxHp = 1e9;
    h.hp = 1e9;
    monster(w, 'troll', 560, 500, 1e9);
    monster(w, 'troll', 570, 500, 1e9);
    const ev = run(w, 2_000);
    const seen = ev.filter((e) => e.kind === 'discovered');
    expect(seen.filter((e) => e.what === 'monster' && e.type === 'troll')).toHaveLength(1);
    expect(w.seen).toContain('monster:troll');
    // no repeat
    expect(run(w, 2_000).some((e) => e.kind === 'discovered' && e.type === 'troll')).toBe(false);
  });
});
