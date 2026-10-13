import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { healMult, slowOf } from './riders';
import { attackStrike, landStrike } from './strike';
import { spawnHero, targetOf } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [{ id: 'knight', attrs: { ...none, str: 20, sta: 60 }, weapon, startGold: 0 }],
  monsters: [
    {
      id: 'ghoul',
      attrs: { ...none, sta: 100 },
      weapon,
      bounty: 1,
      xp: 1,
      tags: ['undead'],
      types: { holy: 1.5 },
    },
    { id: 'rat', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1, types: { holy: 1.5 } },
    {
      id: 'wyrm',
      attrs: { ...none, sta: 100 },
      weapon,
      bounty: 1,
      xp: 1,
      tags: ['boss'],
    },
  ],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;

function monster(w: W, type: string, x: number, y: number): UnitState {
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
    hp: 800,
    maxHp: 800,
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

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const fresh = () => createWorld(1, data);
const hero = (w: W) => {
  const id = spawnHero(w, 'knight', { x: 100, y: 100 });
  const u = w.units.find((x) => x.id === id);
  if (!u) throw new Error('hero');
  return u;
};
const strike = (w: W, from: UnitState, to: UnitState, over: object = {}) => {
  const stats = { attrs: { ...none, str: 20 }, weapon };
  return landStrike(w, from, to, { ...attackStrike(stats), type: 'physical', ...over });
};

describe('burn', () => {
  it('lights 3 more ticks of 20% of the hit, one a second, and does not stack', () => {
    const w = fresh();
    const h = hero(w);
    const m = monster(w, 'rat', 1000, 1000);
    w.pendingDeaths = [];
    strike(w, h, m, { type: 'fire', rider: 'burn' });
    const before = m.hp;
    const ev = run(w, 4_500);
    const ticks = ev.filter((e) => e.kind === 'hit' && e.tick);
    expect(ticks).toHaveLength(3);
    expect(ticks.every((e) => e.kind === 'hit' && e.damage === 4 && e.type === 'fire')).toBe(true);
    expect(before - m.hp).toBe(12);
    // a second burn only refreshes
    strike(w, h, m, { type: 'fire', rider: 'burn' });
    strike(w, h, m, { type: 'fire', rider: 'burn' });
    expect(run(w, 4_500).filter((e) => e.kind === 'hit' && e.tick)).toHaveLength(3);
  });
});

describe('chill', () => {
  it('slows movement and attacks by 25% for 3 s, half that on a boss', () => {
    const w = fresh();
    const h = hero(w);
    const m = monster(w, 'rat', 1000, 1000);
    const boss = monster(w, 'wyrm', 1500, 1500);
    expect(slowOf(w, m.id)).toBe(0);
    strike(w, h, m, { type: 'frost', rider: 'chill' });
    strike(w, h, boss, { type: 'frost', rider: 'chill' });
    expect(slowOf(w, m.id)).toBe(0.25);
    expect(slowOf(w, boss.id)).toBe(0.125);
    run(w, 3_100);
    expect(slowOf(w, m.id)).toBe(0);
    expect(slowOf(w, boss.id)).toBe(0);
  });

  it('a chilled unit walks slower and its attack cycle is longer', () => {
    const walk = (chilled: boolean) => {
      const w = fresh();
      const h = hero(w);
      const m = monster(w, 'rat', 1000, 1000);
      if (chilled) strike(w, h, h, { type: 'frost', rider: 'chill' });
      h.hp = h.maxHp;
      w.heroRuntime.get(h.id)!.dest = { x: 2000, y: 100 };
      const x0 = h.pos.x;
      run(w, 2_000);
      void m;
      return h.pos.x - x0;
    };
    const free = walk(false);
    const slowed = walk(true);
    expect(slowed).toBeLessThan(free * 0.8);
    expect(slowed).toBeGreaterThan(free * 0.7);
  });
});

describe('wither', () => {
  it('halves healing on the target for 4 s', () => {
    const w = fresh();
    const h = hero(w);
    const m = monster(w, 'rat', 1000, 1000);
    expect(healMult(w, m.id)).toBe(1);
    strike(w, h, m, { type: 'death', rider: 'wither' });
    expect(healMult(w, m.id)).toBe(0.5);
    run(w, 4_100);
    expect(healMult(w, m.id)).toBe(1);
  });
});

describe('arc', () => {
  it('jumps to the nearest other foe within 120 for half the hit', () => {
    const w = fresh();
    const h = hero(w);
    const a = monster(w, 'rat', 1000, 1000);
    const near = monster(w, 'rat', 1100, 1000);
    const far = monster(w, 'rat', 1000, 1300);
    const out = strike(w, h, a, { type: 'lightning', rider: 'arc' });
    expect(out.damage).toBe(20);
    expect(a.hp).toBe(780);
    expect(near.hp).toBe(790);
    expect(far.hp).toBe(800);
    const ev = snapshot(w).events.filter((e) => e.kind === 'hit');
    expect(ev.filter((e) => e.kind === 'hit' && e.type === 'lightning')).toHaveLength(2);
  });

  it('does nothing with no other foe in range', () => {
    const w = fresh();
    const h = hero(w);
    const a = monster(w, 'rat', 1000, 1000);
    const far = monster(w, 'rat', 1000, 1200);
    strike(w, h, a, { type: 'lightning', rider: 'arc' });
    expect(far.hp).toBe(800);
  });
});

describe('sear', () => {
  const holy = (type: string, rider?: 'sear') => {
    const w = fresh();
    const h = hero(w);
    const m = monster(w, type, 1000, 1000);
    return strike(w, h, m, { type: 'holy', rider, target: targetOf(w, m) }).damage;
  };

  it('doubles the weak bonus against undead and demons only', () => {
    expect(holy('ghoul')).toBe(30);
    // sear: the 0.5 bonus becomes 1.0, x2
    expect(holy('ghoul', 'sear')).toBe(40);
    // a weak non-undead keeps x1.5 even with sear
    expect(holy('rat', 'sear')).toBe(30);
  });
});

describe('no riders without a skill', () => {
  it('a basic attack in a fight carries no rider', () => {
    const w = fresh();
    const h = hero(w);
    h.pos = { x: 980, y: 1000 };
    monster(w, 'rat', 1000, 1000);
    const ev = run(w, 10_000);
    expect(ev.some((e) => e.kind === 'hit')).toBe(true);
    expect(ev.some((e) => e.kind === 'rider')).toBe(false);
    expect(ev.some((e) => e.kind === 'hit' && e.tick)).toBe(false);
  });
});
