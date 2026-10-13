import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, type GameData, type SimEvent } from './api';
import { resolveStrike } from './strike';
import { spawnHero } from './world';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };
const quiet = { combat: { critK: 1e9, dodgeK: 1e9 }, town: { raidFirstMs: 10_000_000 } };

function world(extra: Partial<GameData> = {}) {
  return createWorld(1, {
    buildings: [],
    startGold: 0,
    map: { width: 3000, height: 3000 },
    townHall: { x: 2800, y: 2800 },
    tuning: quiet,
    ...extra,
  });
}

describe('step 50: the target type row', () => {
  const row = { fire: 1.5, frost: 0.5, holy: 0 };
  const target = { attrs: none, types: row };
  const strike = (type: string, str = 20) =>
    resolveStrike(world(), { attrs: { ...none, str }, type, target, canDodge: false });

  it('weak x1.5, resist x0.5, normal x1, immune 0', () => {
    expect(strike('physical')).toMatchObject({ damage: 20, weak: false, resist: false });
    expect(strike('fire')).toMatchObject({ damage: 30, weak: true, resist: false, type: 'fire' });
    expect(strike('frost')).toMatchObject({ damage: 10, weak: false, resist: true });
    expect(strike('lightning')).toMatchObject({ damage: 20 });
    // a row of 0 is immunity: not even the minimum 1
    expect(strike('holy')).toMatchObject({ damage: 0, resist: true });
  });

  it('a landed strike is still at least 1 when the row only shrinks it', () => {
    expect(strike('frost', 1).damage).toBe(1);
  });

  it('non-physical types are not dodged and are cut by Wp, not armour', () => {
    const w = world({ tuning: { combat: { critK: 1e9, dodgeK: 1e-9 } } });
    const quick = { attrs: { ...none, dex: 100, per: 100, wp: 30 }, armour: 1e6 };
    let dodged = 0;
    for (let i = 0; i < 50; i++) {
      const phys = resolveStrike(w, { attrs: { ...none, str: 20 }, target: quick });
      if (phys.dodged) dodged++;
      const fire = resolveStrike(w, { attrs: { ...none, str: 20 }, type: 'fire', target: quick });
      expect(fire.dodged).toBe(false);
      // Wp 30 (K 30): 45% off, armour ignored
      expect(fire.damage).toBe(11);
    }
    expect(dodged).toBeGreaterThan(40);
  });

  it('fire deals buildingFireMult more to a building; other types do not', () => {
    const w = world();
    const hit = (type: string) =>
      resolveStrike(w, { attrs: { ...none, str: 20 }, type, vsBuilding: true }).damage;
    expect(hit('fire')).toBe(30);
    expect(hit('frost')).toBe(20);
    expect(hit('physical')).toBe(20);
  });
});

describe('types on rows, in fights', () => {
  const classes = [
    { id: 'knight', attrs: { ...none, str: 20, sta: 60 }, weapon, startGold: 0 },
    {
      id: 'mage',
      attrs: { ...none, int: 20, sta: 60 },
      weapon: { baseAttackS: 1, range: 200 },
      startGold: 0,
      spellMult: 1,
    },
  ];
  const ogre = {
    id: 'ogre',
    attrs: { ...none, str: 1, sta: 60 },
    weapon,
    bounty: 1,
    xp: 1,
    armour: 20,
    types: { fire: 1.5, frost: 0.5 },
    tags: ['giant'],
  };
  const base: GameData = {
    buildings: [],
    startGold: 0,
    map: { width: 3000, height: 3000 },
    townHall: { x: 2800, y: 2800 },
    classes,
    gods: [
      { id: 'loki', pantheon: 'aesir', name: 'Loki', template: 'mage', damageType: 'fire' },
      { id: 'freyja', pantheon: 'aesir', name: 'Freyja', template: 'mage', damageType: 'holy' },
      { id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight', damageType: 'lightning' },
    ],
    paths: [
      {
        id: 'seidkona',
        god: 'freyja',
        template: 'mage',
        name: 'Seidkona',
        damageType: 'frost',
        attrs: [{}, {}],
      },
    ],
    monsters: [ogre],
    lairs: [{ id: 'den', monster: 'ogre', spawnS: 1, maxAlive: 1, hp: 1e9 }],
    lairSites: [{ lair: 'den', pos: { x: 500, y: 500 } }],
    tuning: { ...quiet, hero: { firstRecruitMs: 10_000_000 }, lair: { tierUpEveryMs: 0 } },
  };

  function firstHit(god: string, prep?: (w: ReturnType<typeof createWorld>, id: number) => void) {
    const w = createWorld(1, base);
    const id = spawnHero(w, god, { x: 480, y: 500 });
    prep?.(w, id);
    for (let i = 0; i < 100; i++) {
      step(w, 100);
      const hit = snapshot(w).events.find(
        (e): e is Extract<SimEvent, { kind: 'hit' }> =>
          e.kind === 'hit' && e.attacker === id && e.damage > 0 && e.target !== 2,
      );
      if (hit) return hit;
    }
    throw new Error('no hit');
  }

  it('a caster strikes with its god type, hits a weak row harder and carries the flags', () => {
    // Int 20 * 1 = 20, fire vs x1.5 = 30, no armour on a spell
    expect(firstHit('loki')).toMatchObject({ type: 'fire', damage: 30, weak: true });
  });

  it('a resisted type is flagged and cut', () => {
    const hit = firstHit('freyja', (w, id) => {
      const u = w.units.find((x) => x.id === id);
      if (u) u.path = 'seidkona';
    });
    // the path type (frost) wins over the god's (holy): 20 * 0.5
    expect(hit).toMatchObject({ type: 'frost', damage: 10, resist: true });
  });

  it('a weapon template stays physical whatever its god type says, and armour applies', () => {
    const hit = firstHit('thor');
    expect(hit).toMatchObject({ type: 'physical', damage: 11 });
    expect(hit.weak).toBeUndefined();
  });

  it('tower bolts are physical: monster armour applies to them', () => {
    const w = createWorld(1, {
      ...base,
      buildings: [{ id: 'tower', cost: 1 }],
      plots: [{ x: 480, y: 480 }],
      startGold: 100,
      tuning: {
        ...base.tuning,
        building: { towerDamage: [20] },
      },
    });
    w.buildings.push({
      id: 900,
      type: 'tower',
      tier: 1,
      pos: { x: 480, y: 480 },
      plot: 0,
      hp: 100,
      maxHp: 100,
    });
    let hit: Extract<SimEvent, { kind: 'hit' }> | undefined;
    for (let i = 0; i < 100 && !hit; i++) {
      step(w, 100);
      hit = snapshot(w).events.find(
        (e): e is Extract<SimEvent, { kind: 'hit' }> => e.kind === 'hit' && e.attacker === 900,
      );
    }
    // 20 flat, armour 20 takes 45%
    expect(hit).toMatchObject({ type: 'physical', damage: 11 });
  });
});
