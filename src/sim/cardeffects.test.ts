import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { newParty } from './parties';
import { buffOf } from './effects';
import { planShopping } from './shopping';
import { attackStrike, landStrike } from './strike';
import { slowOf } from './riders';
import { spawnHero, statsOf, targetOf } from './world';
import type { PassiveKeys, SkillDef, UnitState, UpgradeDef } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const card = (id: string, keys: PassiveKeys): UpgradeDef => ({
  id,
  name: id,
  text: id,
  effect: { keys },
  family: 'stats',
  stack: 3,
});

const engage: SkillDef = {
  id: 'bolt',
  path: 'p',
  name: 'Bolt',
  trigger: { kind: 'engage', min: 50, max: 160 },
  cooldownS: 10,
  target: 'foe',
  shape: { kind: 'single' },
  effects: [{ kind: 'damage', mult: 2, sure: true }],
  visual: ['bolt'],
};

function mk(upgrades: UpgradeDef[], extra: Partial<GameData> = {}): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 500, y: 500 },
    classes: [{ id: 'knight', attrs: { ...none, str: 10, sta: 60, per: 3 }, weapon, startGold: 0 }],
    gods: [{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' }],
    paths: [{ id: 'p', god: 'thor', template: 'knight', name: 'P', attrs: [{}, {}] }],
    monsters: [
      { id: 'rat', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1, tags: ['undead'] },
    ],
    skills: [engage],
    items: [
      {
        id: 'healing',
        slot: 'potion',
        price: 20,
        shop: 'market',
        shopTier: 1,
        effects: { healPct: 40 },
      },
    ],
    upgrades,
    tuning: {
      combat: { critK: 1e9, dodgeK: 1e9 },
      hero: { firstRecruitMs: 10_000_000 },
      town: { raidFirstMs: 10_000_000 },
    },
    ...extra,
  };
}

function setup(upgrades: UpgradeDef[], taken: string[], extra: Partial<GameData> = {}) {
  const w = createWorld(1, mk(upgrades, extra));
  const id = spawnHero(w, 'thor', { x: 500, y: 500 });
  const h = w.units.find((u) => u.id === id) as UnitState;
  h.trait = null;
  h.party = newParty(w, id);
  w.parties.get(h.party)!.upgrades = taken;
  return { w, h };
}

function rat(w: ReturnType<typeof createWorld>, x: number): UnitState {
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
  w.units.push(u);
  w.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  return u;
}

function run(w: ReturnType<typeof createWorld>, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

describe('card effect keys', () => {
  it('crit and armour keys add to every member and stack with each copy', () => {
    const cards = [card('hawk', { crit: 0.1 }), card('plate', { armour: 3 })];
    const { w, h } = setup(cards, ['hawk', 'plate']);
    expect(buffOf(w, h.id, 'crit')).toBeCloseTo(0.1);
    expect(statsOf(w, h)?.armour).toBe(3);
    w.parties.get(h.party)!.upgrades.push('hawk', 'plate');
    expect(buffOf(w, h.id, 'crit')).toBeCloseTo(0.2);
    expect(statsOf(w, h)?.armour).toBe(6);
  });

  it('a card with no keys, or an untaken card, changes nothing', () => {
    const { w, h } = setup([card('hawk', { crit: 0.1 })], []);
    expect(buffOf(w, h.id, 'crit')).toBe(0);
  });

  it('potionSlots lets a hero plan more potions', () => {
    const market = (taken: string[]) => {
      const { w, h } = setup([card('pockets', { potionSlots: 1 })], taken);
      w.buildings.push({
        id: w.nextId++,
        type: 'market',
        tier: 1,
        pos: { x: 520, y: 520 },
        plot: null,
        hp: 100,
        maxHp: 100,
      });
      h.gold = 1000;
      const potions = planShopping(w, h).flatMap((s) => s.items);
      return potions.length;
    };
    expect(market([])).toBe(2);
    expect(market(['pockets'])).toBe(3);
  });

  it('cooldownMult shortens skill cooldowns', () => {
    const casts = (taken: string[]) => {
      const { w, h } = setup([card('hands', { cooldownMult: 0.5 })], taken, {
        skills: [{ ...engage, trigger: { kind: 'ready', range: 300 } }],
      });
      h.tier = 2;
      h.path = 'p';
      const target = rat(w, 600);
      target.hp = target.maxHp;
      return run(w, 22_000).filter((e) => e.kind === 'cast').length;
    };
    expect(casts(['hands'])).toBeGreaterThan(casts([]));
  });

  it('rangeMult widens a skill trigger', () => {
    const casts = (taken: string[]) => {
      const { w, h } = setup([card('reach', { rangeMult: 1.5 })], taken);
      h.tier = 2;
      h.path = 'p';
      rat(w, 500 + 200);
      return run(w, 2000).filter((e) => e.kind === 'cast').length;
    };
    // engage max 160 misses a foe 200 away; x1.5 = 240 reaches it
    expect(casts([])).toBe(0);
    expect(casts(['reach'])).toBeGreaterThan(0);
  });

  it('rider makes basic strikes carry it', () => {
    const slowed = (taken: string[]) => {
      const { w, h } = setup([card('frost', { rider: 'chill' })], taken);
      const foe = rat(w, 520);
      run(w, 1500);
      return slowOf(w, foe.id) + (h.hp > 0 ? 0 : 1);
    };
    expect(slowed([])).toBe(0);
    expect(slowed(['frost'])).toBeGreaterThan(0);
  });

  it('vsTag raises damage against the tag, koMult shortens the knockout', () => {
    const { w, h } = setup(
      [card('book', { vsTag: { undead: 1.5 } }), card('einherjar', { koMult: 0.5 })],
      ['book', 'einherjar'],
    );
    const foe = rat(w, 520);
    const before = foe.hp;
    landStrike(w, h, foe, attackStrike(statsOf(w, h)!, targetOf(w, foe)));
    expect(before - foe.hp).toBe(15);
    h.hp = 0;
    w.pendingDeaths.push({ victim: h.id, by: 0 });
    step(w, TICK_MS);
    expect(w.heroRuntime.get(h.id)?.koMs).toBe(w.tuning.hero.koMs * 0.5 - TICK_MS);
  });

  it('restMult speeds resting', () => {
    const rest = (taken: string[]) => {
      const { w, h } = setup([card('dress', { restMult: 1.5 })], taken);
      h.mode = 'rest';
      h.hp = Math.floor(h.maxHp * 0.5);
      const before = h.hp;
      step(w, TICK_MS * 20);
      return h.hp - before;
    };
    expect(rest(['dress'])).toBeCloseTo(rest([]) * 1.5, 0);
  });
});
