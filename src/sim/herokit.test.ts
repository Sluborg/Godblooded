import { describe, expect, it } from 'vitest';
import { createWorld, loadWorld, migrateSave, saveWorld, SAVE_VERSION, type GameData } from './api';
import { armourBonus, weaponPower, wornBuff } from './items';
import { planShopping } from './shopping';
import { spawnHero } from './world';
import type { ItemDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const row = (
  id: string,
  slot: ItemDef['slot'],
  level: number,
  price: number,
  effects: ItemDef['effects'],
): ItemDef => ({ id, slot, level, price, shop: 'smithy', shopTier: 1, effects });

const data = (builds = true): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 500, y: 500 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 10, sta: 60 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  gods: [
    {
      id: 'thor',
      pantheon: 'aesir',
      name: 'Thor',
      template: 'knight',
      ...(builds ? { builds: ['broad', 'short'] as const } : {}),
    },
  ],
  items: [
    row('helm-1', 'headgear', 1, 30, { kits: { heavy: { armour: 2, wp: 0 } } }),
    row('shield-1', 'offhand', 1, 40, { kits: { heavy: { armour: 3, wp: 0 } }, crit: 0.05 }),
    row('armour-1', 'armour', 1, 50, { kits: { heavy: { armour: 4, wp: 1 } } }),
    row('focus-1', 'offhand', 1, 40, { power: 3 }),
  ],
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
});

const hero = (w: ReturnType<typeof createWorld>): UnitState => {
  const id = spawnHero(w, 'thor', { x: 600, y: 600 });
  return w.units.find((u) => u.id === id) as UnitState;
};

describe('builds', () => {
  it("a hero gets one of its god's two builds, kept for life, from the seed", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const w = createWorld(seed, data());
      const u = hero(w);
      expect(['broad', 'short']).toContain(u.build);
      seen.add(u.build as string);
      expect(hero(createWorld(seed, data())).build).toBe(u.build);
    }
    expect(seen.size).toBe(2);
  });

  it('a god without builds gives none', () => {
    expect(hero(createWorld(1, data(false))).build).toBeUndefined();
  });

  it("survives a save, and an old hero gets its god's first build", () => {
    const w = createWorld(3, data());
    const u = hero(w);
    const loaded = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data());
    expect(loaded.units.find((x) => x.id === u.id)?.build).toBe(u.build);
    const old = JSON.parse(JSON.stringify(saveWorld(w)));
    old.version = 6;
    for (const x of old.world.units) {
      delete x.build;
      delete x.items.headgear;
      delete x.items.offhand;
    }
    const migrated = migrateSave(old);
    expect(migrated.version).toBe(SAVE_VERSION);
    const back = loadWorld(old, data()).units.find((x) => x.id === u.id);
    expect(back?.build).toBe('broad');
    expect(back?.items).toMatchObject({ headgear: 0, offhand: 0 });
  });
});

describe('headgear and off-hand', () => {
  it('add armour, power and crit to the hero', () => {
    const w = createWorld(1, data());
    const u = hero(w);
    u.items = { weapon: 0, armour: 1, headgear: 1, offhand: 1, potions: 0, charm: null };
    expect(armourBonus(w, u)).toEqual({ armour: 4 + 2 + 3, wp: 1 });
    expect(wornBuff(w, u, 'crit')).toBeCloseTo(0.05);
    expect(weaponPower(w, u)).toBe(0);
    // a focus is an off-hand row with power
    const f = createWorld(1, {
      ...data(),
      items: data().items?.filter((i) => i.id !== 'shield-1'),
    });
    const v = hero(f);
    v.items = { weapon: 0, armour: 0, headgear: 0, offhand: 1, potions: 0, charm: null };
    expect(weaponPower(f, v)).toBe(3);
  });

  it('a hero with no new levels is as before', () => {
    const w = createWorld(1, data());
    const u = hero(w);
    u.items = { weapon: 0, armour: 0, potions: 0, charm: null };
    expect(armourBonus(w, u)).toEqual({ armour: 0, wp: 0 });
    expect(wornBuff(w, u, 'crit')).toBe(0);
  });

  it('are bought at the smithy, cheapest first', () => {
    const w = createWorld(1, data());
    w.buildings.push({
      id: w.nextId++,
      type: 'smithy',
      tier: 1,
      pos: { x: 620, y: 620 },
      plot: null,
      hp: 100,
      maxHp: 100,
    });
    const u = hero(w);
    u.gold = 400;
    const plan = planShopping(w, u);
    const ids = plan.flatMap((s) => s.items);
    expect(ids).toContain('helm-1');
    expect(ids).toContain('armour-1');
    expect(ids.filter((i) => i === 'shield-1' || i === 'focus-1')).toHaveLength(1);
  });
});
