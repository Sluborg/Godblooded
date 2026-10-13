import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, type ClassDef, type GameData, type MonsterDef } from './api';
import { attackStrike, resolveStrike } from './strike';
import { spawnHero } from './world';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

function world(extra: Partial<GameData> = {}) {
  return createWorld(1, {
    buildings: [],
    startGold: 0,
    map: { width: 3000, height: 3000 },
    townHall: { x: 2800, y: 2800 },
    tuning: { combat: { critK: 1e9, dodgeK: 1e9 }, town: { raidFirstMs: 10_000_000 } },
    ...extra,
  });
}

describe('armour and magic resist', () => {
  it('a weapon strike is cut by armour, a spell by Willpower, and not the other way round', () => {
    const w = world();
    const target = { attrs: { ...none, wp: 30 }, armour: 20 };
    const weaponHit = resolveStrike(
      w,
      attackStrike({ attrs: { ...none, str: 20 }, weapon }, target),
    );
    // armour 20 (K 20): 45% off
    expect(weaponHit.damage).toBe(11);
    const spellHit = resolveStrike(
      w,
      attackStrike({ attrs: { ...none, int: 20 }, weapon, spellMult: 1 }, target),
    );
    // Wp 30 (K 30): 45% off, armour ignored
    expect(spellHit.damage).toBe(11);
    const noWp = resolveStrike(
      w,
      attackStrike(
        { attrs: { ...none, int: 20 }, weapon, spellMult: 1 },
        { attrs: none, armour: 1e6 },
      ),
    );
    expect(noWp.damage).toBe(20);
  });

  it('spell power is Int times spellMult; spells cannot be dodged', () => {
    const w = world({ tuning: { combat: { critK: 1e9, dodgeK: 1e-9 } } });
    const caster = { attrs: { ...none, int: 10 }, weapon, spellMult: 0.8 };
    const fast = { attrs: { ...none, dex: 100, per: 100 } };
    for (let i = 0; i < 50; i++) {
      const hit = resolveStrike(w, attackStrike(caster, fast));
      expect(hit.dodged).toBe(false);
      expect(hit.damage).toBe(8);
    }
    // the same target does dodge a weapon strike, nearly always
    const weaponCaster = { attrs: { ...none, str: 10 }, weapon };
    const dodged = Array.from({ length: 50 }, () =>
      resolveStrike(w, attackStrike(weaponCaster, fast)),
    ).filter((h) => h.dodged).length;
    expect(dodged).toBeGreaterThan(40);
  });

  it('without a target (lairs, buildings) a caster still uses its spell power', () => {
    const w = world();
    expect(
      resolveStrike(w, attackStrike({ attrs: { ...none, int: 10 }, weapon, spellMult: 0.5 }))
        .damage,
    ).toBe(5);
    expect(resolveStrike(w, attackStrike({ attrs: { ...none, str: 7 }, weapon })).damage).toBe(7);
  });

  // A hero and a monster fight in a quiet world; the first hit of each side is returned.
  function duel(cls: Partial<ClassDef>, mon: Partial<MonsterDef>, lairMult?: number) {
    const w = createWorld(1, {
      buildings: [],
      startGold: 0,
      map: { width: 3000, height: 3000 },
      townHall: { x: 2800, y: 2800 },
      classes: [
        { id: 'knight', attrs: { ...none, str: 20, sta: 50 }, weapon, startGold: 0, ...cls },
      ],
      monsters: [
        { id: 'ogre', attrs: { ...none, str: 20, sta: 50 }, weapon, bounty: 1, xp: 1, ...mon },
      ],
      lairs: [{ id: 'den', monster: 'ogre', spawnS: 1, maxAlive: 1, hp: 1e9 }],
      lairSites: [{ lair: 'den', pos: { x: 500, y: 500 } }],
      tuning: {
        combat: { critK: 1e9, dodgeK: 1e9 },
        hero: { firstRecruitMs: 10_000_000 },
        town: { raidFirstMs: 10_000_000 },
        lair:
          lairMult === undefined
            ? { tierUpEveryMs: 0 }
            : { tierUpEveryMs: 0, statMult: [lairMult] },
      },
    });
    const hero = spawnHero(w, 'knight', { x: 480, y: 500 });
    let heroHit = 0;
    let monHit = 0;
    for (let i = 0; i < 100 && (!heroHit || !monHit); i++) {
      step(w, 100);
      for (const e of snapshot(w).events) {
        if (e.kind !== 'hit' || e.damage <= 0) continue;
        if (e.attacker === hero && !heroHit && e.target !== 2) heroHit = e.damage;
        else if (e.attacker !== hero && !monHit) monHit = e.damage;
      }
    }
    return { heroHit, monHit };
  }

  it('monster armour cuts hero hits; template armour cuts monster hits', () => {
    const plain = duel({}, {});
    expect(plain).toEqual({ heroHit: 20, monHit: 20 });
    const armoured = duel({ armour: 20 }, { armour: 20 });
    expect(armoured).toEqual({ heroHit: 11, monHit: 11 });
  });

  it('monster armour scales with the lair tier like the other attributes', () => {
    // statMult 2: str 40, armour 20 -> 40
    const r = duel({}, { armour: 10 }, 2);
    // hero 20 str against armour 20: 55% of 20
    expect(r.heroHit).toBe(11);
  });

  it('a caster template strikes as a spell in a fight', () => {
    const r = duel(
      { attrs: { ...none, int: 20, sta: 50, wp: 30 }, spellMult: 0.5 },
      { armour: 1e6 },
    );
    // Int 20 * 0.5 = 10 against an armoured monster with no Wp: armour is ignored
    expect(r.heroHit).toBe(10);
    // the monster's weapon hits are physical: Willpower does not cut them, armour would
    expect(r.monHit).toBe(20);
  });
});
