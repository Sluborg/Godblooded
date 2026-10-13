import { describe, expect, it } from 'vitest';
import { createWorld, DEFAULT_TUNING, snapshot, step, type GameData } from './api';
import { spawnHero } from './world';
import { resolveStrike } from './strike';
import { armourPct, critChance, dodgeChance } from './units';

const attrs = { str: 6, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const data = (combat: Partial<typeof DEFAULT_TUNING.combat> = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 1000, height: 1000 },
  townHall: { x: 100, y: 100 },
  tuning: { combat },
});
const world = (combat = {}) => createWorld(1, data(combat));

// Many strikes with the world's seeded rng: how often something happened.
const share = (n: number, f: (i: number) => boolean) => {
  let c = 0;
  for (let i = 0; i < n; i++) if (f(i)) c++;
  return c / n;
};

describe('strike pipeline', () => {
  it('step 20: power is the attacker Str, or a flat power', () => {
    const w = world({ critK: 1e9 });
    expect(resolveStrike(w, { attrs, canDodge: false }).damage).toBe(6);
    expect(resolveStrike(w, { attrs, power: 11, canDodge: false }).damage).toBe(11);
    // a weaponless 0 Str still lands for 1
    expect(resolveStrike(w, { attrs: none, canDodge: false }).damage).toBe(1);
  });

  it('step 30: a skill multiplies the power, and the result is rounded', () => {
    const w = world({ critK: 1e9 });
    expect(resolveStrike(w, { attrs, skillMult: 2, canDodge: false }).damage).toBe(12);
    expect(resolveStrike(w, { attrs, skillMult: 1.25, canDodge: false }).damage).toBe(8);
    expect(resolveStrike(w, { attrs, skillMult: 0.01, canDodge: false }).damage).toBe(1);
  });

  it('step 10: only a dodgeable strike with a target rolls dodge, at the curve', () => {
    const w = world({ critK: 1e9 });
    const target = { attrs: { ...attrs, dex: 10, per: 4 } };
    const p = dodgeChance(target.attrs, DEFAULT_TUNING.combat.dodgeK);
    const dodged = share(4000, () => resolveStrike(w, { attrs, target }).dodged);
    expect(dodged).toBeGreaterThan(p - 0.04);
    expect(dodged).toBeLessThan(p + 0.04);
    expect(resolveStrike(w, { attrs, target, canDodge: false }).dodged).toBe(false);
    expect(resolveStrike(w, { attrs }).dodged).toBe(false);
    const out = share(200, () => resolveStrike(w, { attrs, target }).damage === 0);
    expect(out).toBeGreaterThan(0);
  });

  it('step 40: crit chance follows Per, multiplies by critMult, and can be turned off', () => {
    const lucky = { ...attrs, per: 1e6 };
    const w = world();
    const c = DEFAULT_TUNING.combat;
    const crits = share(4000, () => resolveStrike(w, { attrs: lucky, canDodge: false }).crit);
    expect(crits).toBeGreaterThan(critChance(lucky, c.critK) - 0.03);
    expect(crits).toBeLessThan(0.91);
    const r = resolveStrike(world({ critK: 1e-9 }), { attrs: lucky, canDodge: false });
    expect(r).toMatchObject({ crit: true, damage: Math.round(6 * c.critMult) });
    expect(
      share(500, () => resolveStrike(w, { attrs: lucky, canCrit: false, canDodge: false }).crit),
    ).toBe(0);
    expect(
      share(
        500,
        () => resolveStrike(world({ critMult: 1 }), { attrs: none, canDodge: false }).crit,
      ),
    ).toBeLessThan(0.01);
  });

  it('step 60: armour takes its share off', () => {
    const w = world({ critK: 1e9 });
    const target = { attrs: none, armour: 20 };
    expect(armourPct(20, DEFAULT_TUNING.combat.armourK)).toBeCloseTo(0.45);
    expect(resolveStrike(w, { attrs: { ...attrs, str: 20 }, target, canDodge: false }).damage).toBe(
      11,
    );
    // never below 1 on a landed strike
    expect(
      resolveStrike(w, { attrs, target: { attrs: none, armour: 1e9 }, canDodge: false }).damage,
    ).toBe(1);
  });

  it('is deterministic for a seed', () => {
    const go = () => {
      const w = world();
      return JSON.stringify(
        Array.from({ length: 50 }, () => resolveStrike(w, { attrs, target: { attrs } })),
      );
    };
    expect(go()).toBe(go());
  });
});

describe('strikes in a fight', () => {
  it('hit events carry crit when the strike crit, and every strike goes through the pipeline', () => {
    const lucky = { ...attrs, per: 1e6, dex: 0 };
    const w = createWorld(1, {
      ...data({ critK: 1e-9 }),
      classes: [
        { id: 'warrior', attrs: lucky, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 },
      ],
      monsters: [
        {
          id: 'ogre',
          attrs: { ...none, sta: 40 },
          weapon: { baseAttackS: 9, range: 40 },
          bounty: 1,
          xp: 1,
        },
      ],
      lairs: [{ id: 'den', monster: 'ogre', spawnS: 1, maxAlive: 1, hp: 100_000 }],
      lairSites: [{ lair: 'den', pos: { x: 300, y: 300 } }],
      tuning: { combat: { critK: 1e-9 }, town: { raidFirstMs: 10_000_000 } },
    });
    const hero = spawnHero(w, 'warrior', { x: 280, y: 300 });
    const hits = [];
    for (let i = 0; i < 60; i++) {
      step(w, 100);
      hits.push(...snapshot(w).events.filter((e) => e.kind === 'hit' && e.attacker === hero));
    }
    const mine = hits.filter((e) => e.kind === 'hit' && e.damage > 0);
    expect(mine.length).toBeGreaterThan(0);
    // crit chance tops out at 90%: a crit is 6 * 1.5, anything else a plain 6
    const crits = mine.filter((e) => e.kind === 'hit' && e.crit === true);
    expect(crits.length).toBeGreaterThan(mine.length / 2);
    expect(crits.every((e) => e.kind === 'hit' && e.damage === 9)).toBe(true);
    expect(
      mine
        .filter((e) => e.kind === 'hit' && !e.crit)
        .every((e) => e.kind === 'hit' && e.damage === 6),
    ).toBe(true);
  });
});
