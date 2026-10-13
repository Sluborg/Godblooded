import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { drinkThreshold } from './potions';
import { spawnHero } from './world';
import type { ItemDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };
const potion = (id: string, pct: number, tier: number): ItemDef => ({
  id,
  slot: 'potion',
  price: 20,
  shop: 'market',
  shopTier: tier,
  effects: { healPct: pct },
});

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [{ id: 'knight', attrs: { ...none, str: 10, sta: 60 }, weapon, startGold: 0 }],
  items: [potion('healing', 40, 1), potion('greater', 70, 2)],
  monsters: [{ id: 'rat', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1 }],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;

function setup(frac: number, trait: UnitState['trait'] = null, potions = 1, potionId = 'healing') {
  const w = createWorld(1, data);
  const id = spawnHero(w, 'knight', { x: 500, y: 500 });
  const h = w.units.find((u) => u.id === id) as UnitState;
  h.trait = trait;
  h.hp = Math.floor(h.maxHp * frac);
  h.items = { weapon: 0, armour: 0, potions, charm: null, potionId };
  const rid = w.nextId++;
  const rat: UnitState = {
    id: rid,
    kind: 'monster',
    type: 'rat',
    tier: 1,
    god: null,
    path: null,
    pos: { x: 520, y: 500 },
    facing: { x: 0, y: 1 },
    hp: 100000,
    maxHp: 100000,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  };
  w.units.push(rat);
  w.unitRuntime.set(rid, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  return { w, h, rat };
}

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const drank = (ev: SimEvent[]) =>
  ev.filter((e): e is Extract<SimEvent, { kind: 'drank' }> => e.kind === 'drank');

describe('potions', () => {
  it('a hero in a fight below flee plus 10 points drinks, after 0.5 s, and fights on', () => {
    const { w, h } = setup(0.35);
    const start = h.hp;
    const ev = run(w, 400);
    expect(drank(ev)).toHaveLength(0);
    const later = run(w, 300);
    const d = drank(later);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ unit: h.id, left: 0 });
    expect(d[0].amount).toBe(Math.round(h.maxHp * 0.4));
    expect(h.hp).toBeGreaterThan(start);
    expect(h.items?.potions).toBe(0);
    expect(h.mode).toBe('explore');
  });

  it('a greater potion heals 70%, capped at the room left (a hero below flee runs instead)', () => {
    const near = setup(0.35, null, 1, 'greater');
    const d2 = drank(run(near.w, 1000));
    expect(d2[0].amount).toBeLessThan(Math.round(near.h.maxHp * 0.7));
    expect(near.h.hp).toBeLessThanOrEqual(near.h.maxHp);
    // Below the flee threshold the hero runs rather than drinks.
    const fleeing = setup(0.1);
    expect(drank(run(fleeing.w, 1000))).toHaveLength(0);
    expect(fleeing.h.mode).not.toBe('explore');
  });

  it('does not drink above the threshold, with no potion, or out of a fight', () => {
    expect(drank(run(setup(0.6).w, 1500))).toHaveLength(0);
    expect(drank(run(setup(0.35, null, 0).w, 1500))).toHaveLength(0);
    const quiet = setup(0.35);
    quiet.rat.pos = { x: 3000, y: 3000 };
    expect(drank(run(quiet.w, 1500))).toHaveLength(0);
  });

  it('cowards drink earlier, at flee plus 25 points', () => {
    const calm = setup(0.5, null);
    const coward = setup(0.5, 'coward');
    expect(drinkThreshold(calm.w, calm.h)).toBeCloseTo(0.4);
    expect(drinkThreshold(coward.w, coward.h)).toBeCloseTo(0.3 * 1.5 + 0.25);
    expect(drank(run(calm.w, 1000))).toHaveLength(0);
    expect(drank(run(coward.w, 1000))).toHaveLength(1);
  });

  it('a hero that never flees drinks at 30%', () => {
    const w = createWorld(1, { ...data, tuning: { ...data.tuning, party: { baseFlee: 0 } } });
    const id = spawnHero(w, 'knight', { x: 500, y: 500 });
    const h = w.units.find((u) => u.id === id) as UnitState;
    expect(drinkThreshold(w, h)).toBeCloseTo(0.3);
  });

  it('does not strike while drinking', () => {
    const { w, h } = setup(0.35);
    const ev = run(w, 450);
    expect(ev.filter((e) => e.kind === 'windup' && e.attacker === h.id)).toHaveLength(0);
  });
});
