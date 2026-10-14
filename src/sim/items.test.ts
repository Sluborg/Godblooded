import { describe, expect, it } from 'vitest';
import { createWorld, loadWorld, migrateSave, saveWorld, snapshot, type GameData } from './api';
import { itemsOf, weaponPower, armourBonus } from './items';
import { attackStrike, landStrike } from './strike';
import { spawnHero, statsOf, targetOf } from './world';
import type { ItemDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const items: ItemDef[] = [
  {
    id: 'weapon-1',
    slot: 'weapon',
    level: 1,
    price: 60,
    shop: 'smithy',
    shopTier: 1,
    effects: { power: 2 },
  },
  {
    id: 'weapon-2',
    slot: 'weapon',
    level: 2,
    price: 150,
    shop: 'smithy',
    shopTier: 2,
    effects: { power: 4 },
  },
  {
    id: 'armour-1',
    slot: 'armour',
    level: 1,
    price: 50,
    shop: 'smithy',
    shopTier: 1,
    effects: {
      kits: {
        heavy: { armour: 4, wp: 0 },
        light: { armour: 2, wp: 1 },
        robe: { armour: 0, wp: 2 },
      },
    },
  },
];

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 10, sta: 60, wp: 5 },
      weapon,
      startGold: 0,
      kit: 'heavy',
    },
    {
      id: 'rogue',
      attrs: { ...none, str: 10, sta: 60, wp: 5 },
      weapon,
      startGold: 0,
      kit: 'light',
    },
    {
      id: 'mage',
      attrs: { ...none, str: 2, int: 10, sta: 60, wp: 5 },
      weapon,
      startGold: 0,
      kit: 'robe',
      spellMult: 0.8,
    },
    { id: 'plainclass', attrs: { ...none, str: 10, sta: 60 }, weapon, startGold: 0 },
  ],
  items,
  monsters: [{ id: 'rat', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1 }],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

const world = () => createWorld(1, data);

function hero(w: ReturnType<typeof createWorld>, cls: string): UnitState {
  const id = spawnHero(w, cls, { x: 500, y: 500 });
  return w.units.find((u) => u.id === id) as UnitState;
}

function rat(w: ReturnType<typeof createWorld>): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type: 'rat',
    tier: 1,
    god: null,
    path: null,
    pos: { x: 520, y: 500 },
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

describe('hero items', () => {
  it('a new hero carries level 0 gear and no potions, and snapshots a copy', () => {
    const w = world();
    const h = hero(w, 'knight');
    expect(h.items).toEqual({
      weapon: 0,
      armour: 0,
      headgear: 0,
      offhand: 0,
      potions: 0,
      charm: null,
    });
    const snap = snapshot(w).units.find((u) => u.id === h.id);
    expect(snap?.items).toEqual(h.items);
    snap!.items!.weapon = 3;
    expect(h.items?.weapon).toBe(0);
    expect(itemsOf(rat(w)).weapon).toBe(0);
  });

  it('a weapon level adds its power to a weapon strike, a caster spell and skills', () => {
    const w = world();
    const k = hero(w, 'knight');
    const m = hero(w, 'mage');
    const foe = rat(w);
    const dmg = (u: UnitState) => {
      const before = foe.hp;
      landStrike(w, u, foe, attackStrike(statsOf(w, u)!, targetOf(w, foe)));
      return before - foe.hp;
    };
    expect(dmg(k)).toBe(10);
    expect(dmg(m)).toBe(8);
    k.items!.weapon = 2;
    m.items!.weapon = 1;
    expect(weaponPower(w, k)).toBe(4);
    expect(dmg(k)).toBe(14);
    expect(dmg(m)).toBe(10);
  });

  it('armour gives armour and Willpower by kit', () => {
    const w = world();
    for (const [cls, armour, wp] of [
      ['knight', 4, 5],
      ['rogue', 2, 6],
      ['mage', 0, 7],
    ] as const) {
      const h = hero(w, cls);
      h.items!.armour = 1;
      expect(armourBonus(w, h)).toEqual({ armour, wp: wp - 5 });
      expect(statsOf(w, h)?.armour ?? 0).toBe(armour);
      expect(statsOf(w, h)?.attrs.wp).toBe(wp);
    }
    // A class with no kit counts as heavy.
    const p = hero(w, 'plainclass');
    p.items!.armour = 1;
    expect(statsOf(w, p)?.armour).toBe(4);
  });

  it('armour lowers what a physical hit does', () => {
    const w = world();
    const k = hero(w, 'knight');
    const foe = rat(w);
    foe.maxHp = foe.hp = 5000;
    const hit = () => {
      const before = k.hp;
      landStrike(w, foe, k, { attrs: { ...none, str: 100 }, target: targetOf(w, k) });
      return before - k.hp;
    };
    const bare = hit();
    k.items!.armour = 1;
    expect(hit()).toBeLessThan(bare);
  });

  it('a level with no row does nothing', () => {
    const w = world();
    const k = hero(w, 'knight');
    k.items!.weapon = 3;
    k.items!.armour = 3;
    expect(weaponPower(w, k)).toBe(0);
    expect(armourBonus(w, k)).toEqual({ armour: 0, wp: 0 });
  });
});

describe('saves with gear', () => {
  it('round-trips hero items', () => {
    const w = world();
    const k = hero(w, 'knight');
    k.items = { weapon: 2, armour: 1, potions: 1, charm: null };
    const back = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data);
    expect(back.units.find((u) => u.id === k.id)?.items).toEqual(k.items);
  });

  it('migrates a version 1 save: heroes get level 0 gear', () => {
    const w = world();
    const k = hero(w, 'knight');
    const old = JSON.parse(JSON.stringify(saveWorld(w)));
    old.version = 1;
    for (const u of old.world.units) delete u.items;
    const migrated = migrateSave(old);
    expect(migrated.version).toBeGreaterThanOrEqual(2);
    const back = loadWorld(old, data);
    expect(back.units.find((u) => u.id === k.id)?.items).toEqual({
      weapon: 0,
      armour: 0,
      headgear: 0,
      offhand: 0,
      potions: 0,
      charm: null,
    });
  });
});
