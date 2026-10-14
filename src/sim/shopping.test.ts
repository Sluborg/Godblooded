import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { planShopping } from './shopping';
import { spawnHero } from './world';
import type { ItemDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };
const gear = (
  id: string,
  slot: ItemDef['slot'],
  level: number | undefined,
  price: number,
  shop: ItemDef['shop'],
  shopTier: number,
  effects: ItemDef['effects'],
): ItemDef => ({
  id,
  slot,
  level,
  price,
  shop,
  shopTier,
  effects,
});
const items: ItemDef[] = [
  gear('weapon-1', 'weapon', 1, 60, 'smithy', 1, { power: 2 }),
  gear('weapon-2', 'weapon', 2, 150, 'smithy', 2, { power: 4 }),
  gear('armour-1', 'armour', 1, 50, 'smithy', 1, { kits: { heavy: { armour: 4, wp: 0 } } }),
  gear('armour-2', 'armour', 2, 130, 'smithy', 2, { kits: { heavy: { armour: 8, wp: 1 } } }),
  gear('healing', 'potion', undefined, 20, 'market', 1, { healPct: 40 }),
  gear('greater', 'potion', undefined, 40, 'market', 2, { healPct: 70 }),
];

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 500, y: 500 },
  classes: [{ id: 'knight', attrs: { ...none, str: 10, sta: 60, dex: 5 }, weapon, startGold: 0 }],
  items,
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;

function town(opts: { smithy?: number; market?: number } = {}): W {
  const w = createWorld(1, data);
  const add = (type: string, tier: number, x: number) =>
    w.buildings.push({
      id: w.nextId++,
      type,
      tier,
      pos: { x, y: 520 },
      plot: null,
      hp: 100,
      maxHp: 100,
    });
  if (opts.smithy) add('smithy', opts.smithy, 540);
  if (opts.market) add('market', opts.market, 460);
  return w;
}

function hero(w: W, gold: number, trait: UnitState['trait'] = null): UnitState {
  const id = spawnHero(w, 'knight', { x: 500, y: 500 });
  const u = w.units.find((x) => x.id === id) as UnitState;
  u.gold = gold;
  u.trait = trait;
  u.mode = 'rest';
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

describe('shopping plans', () => {
  it('buys a potion, then the cheaper of weapon and armour, then another potion', () => {
    const w = town({ smithy: 1, market: 1 });
    const h = hero(w, 200);
    // budget 60% of 200 = 120: potion 20, armour 50 (cheaper than weapon 60), second potion 20.
    expect(planShopping(w, h)).toEqual([
      { shop: 'market', items: ['healing', 'healing'] },
      { shop: 'smithy', items: ['armour-1'] },
    ]);
  });

  it('a hero with no gear buys its first piece before its first potion', () => {
    const w = town({ smithy: 1, market: 1 });
    // budget 60% of 100 = 60: armour 50 first, 10 left is no potion (before: potion 20, no armour)
    expect(planShopping(w, hero(w, 100))).toEqual([{ shop: 'smithy', items: ['armour-1'] }]);
  });

  it('and falls back to the potion when it cannot pay for any gear', () => {
    const w = town({ smithy: 1, market: 1 });
    // budget 36: armour 50 does not fit, so the potion as before
    expect(planShopping(w, hero(w, 60))).toEqual([{ shop: 'market', items: ['healing'] }]);
  });

  it('a hero that already has a piece of gear keeps the potion first', () => {
    const w = town({ smithy: 1, market: 1 });
    const h = hero(w, 100);
    h.items = { weapon: 1, armour: 0, potions: 0, charm: null };
    // budget 60: potion 20, armour 50 does not fit in the 40 left, so a second potion
    expect(planShopping(w, h)).toEqual([{ shop: 'market', items: ['healing', 'healing'] }]);
  });

  it('proud wants the weapon first and spends more; coward the armour', () => {
    const w = town({ smithy: 1, market: 1 });
    const proud = hero(w, 200, 'proud');
    const coward = hero(w, 200, 'coward');
    const smithyOf = (u: UnitState) => planShopping(w, u).find((s) => s.shop === 'smithy')?.items;
    // proud budget 160: potion 20, weapon-1 60, armour-1 50, potion 20
    expect(smithyOf(proud)).toEqual(['weapon-1', 'armour-1']);
    expect(smithyOf(coward)).toEqual(['armour-1']);
  });

  it('greedy hoards: a smaller budget buys less', () => {
    const w = town({ smithy: 1, market: 1 });
    const g = hero(w, 200, 'greedy');
    // budget 70: potion 20, armour 50 fits, nothing more
    expect(planShopping(w, g)).toEqual([
      { shop: 'market', items: ['healing'] },
      { shop: 'smithy', items: ['armour-1'] },
    ]);
  });

  it('a shop sells only up to its tier, climbing one level per purchase', () => {
    const rich = hero(town({ smithy: 1, market: 1 }), 2000);
    const w1 = town({ smithy: 1, market: 1 });
    const h1 = hero(w1, 2000);
    expect(planShopping(w1, h1).find((s) => s.shop === 'smithy')?.items).toEqual([
      'armour-1',
      'weapon-1',
    ]);
    const w2 = town({ smithy: 2, market: 2 });
    const h2 = hero(w2, 2000);
    const plan = planShopping(w2, h2);
    expect(plan.find((s) => s.shop === 'smithy')?.items).toEqual([
      'armour-1',
      'weapon-1',
      'armour-2',
      'weapon-2',
    ]);
    // A tier 2 market sells the greater potion.
    expect(plan.find((s) => s.shop === 'market')?.items).toEqual(['greater', 'greater']);
    void rich;
  });

  it('with no shop built, or too little gold, it plans nothing', () => {
    expect(planShopping(town(), hero(town(), 200))).toEqual([]);
    const w = town({ smithy: 1, market: 1 });
    expect(planShopping(w, hero(w, 10))).toEqual([]);
  });
});

describe('shopping trips', () => {
  it('walks to the market then the smithy, pays, taxes per item and carries the gear', () => {
    const w = town({ smithy: 1, market: 2 });
    const h = hero(w, 200);
    const ev = run(w, 20_000);
    const shopped = ev.filter(
      (e): e is Extract<SimEvent, { kind: 'shopped' }> => e.kind === 'shopped',
    );
    // The market (tier 2) sells greater potions: 40, then the smithy's armour 50 (budget 120).
    expect(shopped.map((s) => s.item)).toEqual(['greater', 'armour-1']);
    expect(shopped.map((s) => s.spent)).toEqual([40, 50]);
    // tax = price x 0.5 x tier multiplier (market tier 2: 1.25, smithy tier 1: 1)
    expect(shopped.map((s) => s.tax)).toEqual([25, 25]);
    expect(h.gold).toBe(200 - 90);
    expect(h.items).toMatchObject({ armour: 1, weapon: 0, potions: 1, flasks: ['greater'] });
    expect(w.gold).toBe(50);
    expect(h.mode).toBe('explore');
  });

  it('skips a stop whose shop was destroyed', () => {
    const w = town({ smithy: 1, market: 1 });
    const h = hero(w, 200);
    run(w, 100);
    w.buildings = w.buildings.filter((b) => b.type !== 'market');
    run(w, 20_000);
    expect(h.items?.armour).toBe(1);
    expect(h.mode).toBe('explore');
  });
});
