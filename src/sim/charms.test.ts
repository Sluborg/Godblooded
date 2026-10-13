import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, type GameData } from './api';
import { applyRider } from './riders';
import { grantLairRelic } from './relic';
import { buyItem, planShopping } from './shopping';
import { landStrike } from './strike';
import { buffOf } from './effects';
import { spawnHero, statsOf } from './world';
import type { ItemDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const charm = (
  id: string,
  price: number,
  shopTier: number,
  effects: ItemDef['effects'],
): ItemDef => ({
  id,
  slot: 'charm',
  price,
  shop: 'market',
  shopTier,
  effects,
});
const items: ItemDef[] = [
  {
    id: 'healing',
    slot: 'potion',
    price: 20,
    shop: 'market',
    shopTier: 1,
    effects: { healPct: 40 },
  },
  charm('hawk-eye', 90, 2, { crit: 0.08 }),
  charm('fox-tail', 90, 2, { dodge: 0.06 }),
  charm('ember-ward', 90, 2, { softer: { fire: 0.25, frost: 0.25 } }),
  charm('grave-ward', 90, 2, { softer: { death: 0.4 }, noWither: true }),
  charm('bloodstone', 200, 3, { healOnKill: 0.02 }),
  charm('ward-ring', 200, 3, { firstHitMult: 0.5 }),
];

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 500, y: 500 },
  classes: [{ id: 'knight', attrs: { ...none, str: 10, sta: 60, dex: 5 }, weapon, startGold: 0 }],
  monsters: [{ id: 'rat', attrs: { ...none, sta: 10, str: 10 }, weapon, bounty: 1, xp: 1 }],
  items,
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;

function hero(w: W, charmId: string | null = null, gold = 1000): UnitState {
  const id = spawnHero(w, 'knight', { x: 500, y: 500 });
  const u = w.units.find((x) => x.id === id) as UnitState;
  u.gold = gold;
  u.mode = 'rest';
  u.items = { weapon: 0, armour: 0, potions: 2, flasks: ['healing', 'healing'], charm: charmId };
  return u;
}

function market(w: W, tier: number): void {
  w.buildings.push({
    id: w.nextId++,
    type: 'market',
    tier,
    pos: { x: 460, y: 520 },
    plot: null,
    hp: 100,
    maxHp: 100,
  });
}

function monster(w: W, x: number, hp: number): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type: 'rat',
    tier: 1,
    god: null,
    path: null,
    pos: { x, y: 500 },
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

describe('charm shopping', () => {
  it('a hero without a charm buys one at a tier 2 market, none at tier 1', () => {
    const w1 = createWorld(1, data);
    market(w1, 1);
    expect(planShopping(w1, hero(w1))).toEqual([]);
    const w2 = createWorld(1, data);
    market(w2, 2);
    const plan = planShopping(w2, hero(w2));
    expect(plan).toHaveLength(1);
    expect(plan[0].items.some((id) => items.find((i) => i.id === id)?.slot === 'charm')).toBe(true);
  });

  it('a tier 3 market sells the 200 charms first', () => {
    const w = createWorld(1, data);
    market(w, 3);
    const [stop] = planShopping(w, hero(w));
    expect(stop.items.some((id) => id === 'bloodstone' || id === 'ward-ring')).toBe(true);
  });

  it('a hero swaps a charm only for a dearer 200 one', () => {
    const w = createWorld(1, data);
    const h = hero(w, 'hawk-eye');
    expect(buyItem(w, h, 'fox-tail', 2)).toBe(0);
    expect(h.items?.charm).toBe('hawk-eye');
    expect(buyItem(w, h, 'bloodstone', 2)).toBe(0);
    expect(buyItem(w, h, 'bloodstone', 3)).toBe(200);
    expect(h.items?.charm).toBe('bloodstone');
    expect(buyItem(w, h, 'ward-ring', 3)).toBe(0);
    expect(buyItem(w, h, 'hawk-eye', 3)).toBe(0);
  });
});

describe('charm effects', () => {
  it('hawk-eye and fox-tail add crit and dodge chance', () => {
    const w = createWorld(1, data);
    const a = hero(w, 'hawk-eye');
    const b = hero(w, 'fox-tail');
    expect(buffOf(w, a.id, 'crit')).toBeCloseTo(0.08);
    expect(buffOf(w, a.id, 'dodge')).toBe(0);
    expect(buffOf(w, b.id, 'dodge')).toBeCloseTo(0.06);
  });

  it('ember-ward and grave-ward soften their types', () => {
    const w = createWorld(1, data);
    const e = hero(w, 'ember-ward');
    expect(statsOf(w, e)?.types).toEqual({ fire: 0.75, frost: 0.75 });
    const g = hero(w, 'grave-ward');
    expect(statsOf(w, g)?.types?.death).toBeCloseTo(0.6);
    expect(statsOf(w, hero(w))?.types).toBeUndefined();
  });

  it('grave-ward keeps wither off its wearer', () => {
    const w = createWorld(1, data);
    const g = hero(w, 'grave-ward');
    const plain = hero(w);
    const out = {
      dodged: false,
      crit: false,
      damage: 5,
      type: 'death',
      weak: false,
      resist: false,
    };
    applyRider(w, 'wither', plain.id, g, out);
    applyRider(w, 'wither', g.id, plain, out);
    expect(w.unitRuntime.get(g.id)?.status?.wither).toBeUndefined();
    expect(w.unitRuntime.get(plain.id)?.status?.wither).toBeDefined();
  });

  it('bloodstone heals 2% max hp per kill', () => {
    const w = createWorld(1, data);
    const h = hero(w, 'bloodstone');
    h.mode = 'wander';
    h.hp = h.maxHp - 100;
    const before = h.hp;
    const rat = monster(w, 1500, 0);
    w.pendingDeaths.push({ victim: rat.id, by: h.id });
    step(w, 50);
    expect(h.hp).toBeGreaterThanOrEqual(before + Math.round(0.02 * h.maxHp));
    expect(snapshot(w).events.some((e) => e.kind === 'heal' && e.target === h.id)).toBe(true);
  });

  it('ward-ring halves the first hit of each fight only', () => {
    const w = createWorld(1, data);
    const ringed = hero(w, 'ward-ring');
    const plain = hero(w);
    const rat = monster(w, 520, 1000);
    const hit = (target: UnitState) => {
      const before = target.hp;
      landStrike(w, rat, target, { attrs: { ...none, str: 20 }, canDodge: false, canCrit: false });
      return before - target.hp;
    };
    const first = hit(ringed);
    const second = hit(ringed);
    expect(first).toBe(10);
    expect(second).toBe(20);
    expect(hit(plain)).toBe(20);
  });
});

describe('lair relic', () => {
  it('the leader gets the dearest charm it lacks, never a downgrade', () => {
    const w = createWorld(1, data);
    const h = hero(w, 'hawk-eye');
    grantLairRelic(w, h, 7);
    const first = snapshot(w).events.find((e) => e.kind === 'relic');
    expect(first).toMatchObject({ unit: h.id, lair: 7 });
    expect(['bloodstone', 'ward-ring']).toContain(h.items?.charm);
    const kept = h.items?.charm;
    grantLairRelic(w, h, 8);
    expect(h.items?.charm).toBe(kept);
    expect(snapshot(w).events.some((e) => e.kind === 'relic')).toBe(false);
  });

  it('a hero without items gets one', () => {
    const w = createWorld(1, data);
    const h = hero(w);
    h.items = undefined;
    grantLairRelic(w, h, 1);
    const held = (u: UnitState) => u.items?.charm ?? null;
    expect(held(h)).not.toBeNull();
  });
});
