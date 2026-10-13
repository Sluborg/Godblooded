import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData } from './api';
import { applyShield, buffOf } from './effects';
import { noteFight } from './engage';
import { newParty } from './parties';
import { passivesFor } from './passives';
import { attackStrike, landStrike } from './strike';
import { attackMs } from './units';
import { spawnHero, statsOf, targetOf } from './world';
import type { PassiveDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const P = (id: string, scope: 'self' | 'party', keys: PassiveDef['keys'], range?: number) =>
  ({ id, name: id, scope, range, keys }) as PassiveDef;

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    { id: 'knight', attrs: { ...none, str: 20, sta: 60, dex: 3, per: 3 }, weapon, startGold: 0 },
  ],
  gods: [
    {
      id: 'odin',
      pantheon: 'aesir',
      name: 'Odin',
      template: 'knight',
      passive: P('eye', 'party', { attr: { per: 3 }, firstStrike: true }, 300),
    },
    {
      id: 'thor',
      pantheon: 'aesir',
      name: 'Thor',
      template: 'knight',
      passive: P('giant', 'self', { vsTag: { giant: 1.5 } }),
    },
    {
      id: 'loki',
      pantheon: 'aesir',
      name: 'Loki',
      template: 'knight',
      passive: P('slip', 'self', { firstHitMisses: true, dodge: 0.05 }),
    },
    {
      id: 'freyja',
      pantheon: 'aesir',
      name: 'Freyja',
      template: 'knight',
      passive: P('chooser', 'party', { koMult: 0.5, koGoldLoss: 0 }, 300),
    },
    {
      id: 'athena',
      pantheon: 'greek',
      name: 'Athena',
      template: 'knight',
      passive: P('strat', 'party', { armour: 2 }, 200),
    },
    {
      id: 'ares',
      pantheon: 'greek',
      name: 'Ares',
      template: 'knight',
      passive: P('blood', 'self', { onKillStack: { stat: 'attackSpeed', per: 0.06, max: 5 } }),
    },
    {
      id: 'apollo',
      pantheon: 'greek',
      name: 'Apollo',
      template: 'knight',
      passive: P('sun', 'party', { restMult: 1.5 }),
    },
    {
      id: 'poseidon',
      pantheon: 'greek',
      name: 'Poseidon',
      template: 'knight',
      passive: P('quake', 'self', { everyNth: { n: 3, effects: [{ kind: 'stagger' }] } }),
    },
    {
      id: 'horus',
      pantheon: 'egypt',
      name: 'Horus',
      template: 'knight',
      passive: P('eyeh', 'self', { aggroMult: 1.2, crit: 0.05 }),
    },
    {
      id: 'sekhmet',
      pantheon: 'egypt',
      name: 'Sekhmet',
      template: 'knight',
      passive: P('lioness', 'self', { belowHp: { below: 0.5, stat: 'damage', amount: 0.25 } }),
    },
    {
      id: 'isis',
      pantheon: 'egypt',
      name: 'Isis',
      template: 'knight',
      passive: P('magic', 'party', { healTakenMult: 1.25 }),
    },
    { id: 'plain', pantheon: 'egypt', name: 'Plain', template: 'knight' },
  ],
  monsters: [
    { id: 'rat', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1 },
    {
      id: 'ogre',
      attrs: { ...none, sta: 100, dex: 30, per: 30 },
      weapon,
      bounty: 1,
      xp: 1,
      tags: ['giant'],
    },
  ],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;
const world = () => createWorld(1, data);

function hero(w: W, god: string, x = 500, party?: number): UnitState {
  const id = spawnHero(w, god, { x, y: 500 });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.trait = null;
  if (party === undefined) u.party = newParty(w, id);
  else {
    u.party = party;
    w.parties.get(party)?.members.push(id);
  }
  return u;
}

function monster(w: W, type = 'rat', x = 520, hp = 100_000): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type,
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

const attrsOf = (w: W, u: UnitState) => statsOf(w, u)?.attrs;

describe('god passives', () => {
  it('a party passive reaches mates in range once, and not out of range', () => {
    const w = world();
    const a = hero(w, 'odin');
    const b = hero(w, 'odin', 520, a.party);
    const c = hero(w, 'plain', 540, a.party);
    const far = hero(w, 'plain', 2000, a.party);
    expect(attrsOf(w, c)?.per).toBe(3 + 3);
    expect(attrsOf(w, a)?.per).toBe(3 + 3);
    expect(attrsOf(w, b)?.per).toBe(3 + 3);
    expect(attrsOf(w, far)?.per).toBe(3);
    expect(passivesFor(w, c)).toHaveLength(1);
  });

  it('a self passive stays with its owner, and a knocked out owner gives nothing', () => {
    const w = world();
    const a = hero(w, 'horus');
    const b = hero(w, 'plain', 520, a.party);
    expect(passivesFor(w, b)).toHaveLength(0);
    const o = hero(w, 'athena', 500);
    const m = hero(w, 'plain', 520, o.party);
    expect(statsOf(w, m)?.armour).toBe(2);
    o.ko = true;
    expect(statsOf(w, m)?.armour ?? 0).toBe(0);
  });

  it('vsTag multiplies damage against a tag', () => {
    const w = world();
    const h = hero(w, 'thor');
    const ogre = monster(w, 'ogre');
    const rat = monster(w, 'rat');
    const dmg = (foe: UnitState) => {
      const before = foe.hp;
      landStrike(w, h, foe, attackStrike(statsOf(w, h)!, targetOf(w, foe)));
      return before - foe.hp;
    };
    expect(dmg(rat)).toBe(20);
    expect(dmg(ogre)).toBe(30);
  });

  it('the first strike against firstHitMisses each fight misses', () => {
    const w = world();
    const l = hero(w, 'loki');
    const rat = monster(w);
    const hit = () => {
      const before = l.hp;
      landStrike(w, rat, l, attackStrike(statsOf(w, rat)!, targetOf(w, l)));
      return before - l.hp;
    };
    expect(hit()).toBe(0);
    let later = 0;
    for (let i = 0; i < 20; i++) later += hit();
    expect(later).toBeGreaterThan(0);
    expect(buffOf(w, l.id, 'dodge')).toBeCloseTo(0.05);
    expect(targetOf(w, l)?.dodgeAdd).toBeCloseTo(0.05);
  });

  it('koMult shortens a mate knockout', () => {
    const w = world();
    const f = hero(w, 'freyja');
    const m = hero(w, 'plain', 520, f.party);
    const base = hero(w, 'plain', 2500);
    m.hp = 0;
    base.hp = 0;
    w.pendingDeaths.push({ victim: m.id, by: 0 }, { victim: base.id, by: 0 });
    step(w, TICK_MS);
    expect(w.heroRuntime.get(base.id)?.koMs).toBe(w.tuning.hero.koMs - TICK_MS);
    expect(w.heroRuntime.get(m.id)?.koMs).toBe(w.tuning.hero.koMs * 0.5 - TICK_MS);
  });

  it('onKillStack adds attack speed per kill this fight, up to the cap', () => {
    const w = world();
    const a = hero(w, 'ares');
    const rt = w.unitRuntime.get(a.id)!;
    rt.fight = { kills: 2, missUsed: false, strikes: 0 };
    rt.fightUntilMs = w.timeMs + 5000;
    expect(statsOf(w, a)?.haste).toBeCloseTo(0.12);
    rt.fight.kills = 9;
    expect(statsOf(w, a)?.haste).toBeCloseTo(0.3);
    const base = attackMs({ ...statsOf(w, a)!, haste: 0 });
    expect(attackMs(statsOf(w, a)!)).toBeLessThan(base);
    // The stacks do not carry into the next fight.
    rt.fightUntilMs = w.timeMs - 1;
    expect(statsOf(w, a)?.haste).toBe(0);
  });

  it('an undodgeable strike is not voided by firstHitMisses', () => {
    const w = world();
    const l = hero(w, 'loki');
    const rat = monster(w);
    const before = l.hp;
    landStrike(w, rat, l, { ...attackStrike(statsOf(w, rat)!, targetOf(w, l)), canDodge: false });
    expect(l.hp).toBeLessThan(before);
    expect(w.unitRuntime.get(l.id)?.fight?.missUsed ?? false).toBe(false);
  });

  it('belowHp is a buff only while hurt', () => {
    const w = world();
    const s = hero(w, 'sekhmet');
    const rat = monster(w);
    const dmg = () => {
      const before = rat.hp;
      landStrike(w, s, rat, attackStrike(statsOf(w, s)!, targetOf(w, rat)));
      return before - rat.hp;
    };
    expect(dmg()).toBe(20);
    s.hp = Math.floor(s.maxHp * 0.4);
    expect(dmg()).toBe(25);
  });

  it('restMult speeds resting for the party', () => {
    const rest = (god: string) => {
      const w = world();
      const h = hero(w, god);
      h.mode = 'rest';
      h.hp = Math.floor(h.maxHp * 0.5);
      h.pos = { ...w.data.townHall };
      const before = h.hp;
      step(w, TICK_MS * 20);
      return h.hp - before;
    };
    expect(rest('apollo')).toBeCloseTo(rest('plain') * 1.5, 0);
  });

  it('every nth strike staggers the foe', () => {
    const w = world();
    const p = hero(w, 'poseidon');
    const rat = monster(w, 'rat', 520);
    const rrt = w.unitRuntime.get(rat.id)!;
    let staggers = 0;
    for (let i = 0; i < 400 && staggers < 1; i++) {
      step(w, TICK_MS);
      snapshot(w);
      if (w.unitRuntime.get(p.id)?.fight?.strikes === 3) {
        staggers++;
        expect(rrt.swing).toBeUndefined();
      }
    }
    expect(staggers).toBe(1);
  });

  it('aggroMult widens the aggro range', () => {
    const near = (god: string) => {
      const w = world();
      const h = hero(w, god);
      monster(w, 'rat', 500 + 215);
      step(w, TICK_MS);
      return h.target;
    };
    expect(near('plain')).toBeNull();
    expect(near('horus')).not.toBeNull();
  });

  it('healTakenMult scales healing received', async () => {
    const { healMult } = await import('./riders');
    const w = world();
    const i = hero(w, 'isis');
    const m = hero(w, 'plain', 520, i.party);
    expect(healMult(w, m.id)).toBeCloseTo(1.25);
  });

  it('firstStrike makes the foe wait even when it is the quicker one', () => {
    const w = world();
    const o = hero(w, 'odin');
    const ogre = monster(w, 'ogre', 520);
    const hrt = w.unitRuntime.get(o.id)!;
    const ort = w.unitRuntime.get(ogre.id)!;
    noteFight(w, o, hrt, statsOf(w, o)!, ogre, ort, statsOf(w, ogre));
    expect(ort.cooldownMs).toBeGreaterThan(0);
    expect(hrt.cooldownMs).toBe(0);
  });

  it('a weaker shield recast does not replace a stronger one', () => {
    const w = world();
    const h = hero(w, 'plain');
    applyShield(w, h, 100, 10);
    applyShield(w, h, 40, 10);
    expect(w.unitRuntime.get(h.id)?.fx?.shield?.hp).toBe(100);
    applyShield(w, h, 150, 10);
    expect(w.unitRuntime.get(h.id)?.fx?.shield?.hp).toBe(150);
  });
});
