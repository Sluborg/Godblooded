import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { newParty } from './parties';
import { landStrike } from './strike';
import { spawnHero } from './world';
import type { MonsterDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const mon = (id: string, over: Partial<MonsterDef> = {}): MonsterDef => ({
  id,
  attrs: { ...none, str: 100, sta: 20 },
  weapon,
  bounty: 10,
  xp: 0,
  ...over,
});

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [{ id: 'knight', attrs: { ...none, str: 10, sta: 10 }, weapon, startGold: 0 }],
  gods: [{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' }],
  monsters: [
    mon('plain'),
    mon('troll', { quirk: { regen: { pctS: 0.01, stopOnType: 'fire', stopS: 5 } } }),
    mon('harpy', { quirk: { stealGold: 5 } }),
    mon('draugr', { quirk: { koMult: 1.5 } }),
    mon('jackal', { role: 'pack', quirk: { healOnKo: 0.1 } }),
    mon('minotaur', {
      role: 'charger',
      attrs: { ...none, str: 100, sta: 20, per: 5 },
      quirk: { chargeSure: true },
    }),
  ],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;

function hero(w: W, x = 500, gold = 100): UnitState {
  const id = spawnHero(w, 'thor', { x, y: 500 });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.party = newParty(w, id);
  u.gold = gold;
  u.mode = 'rest';
  return u;
}

function monster(w: W, type: string, x: number, hp = 1000): UnitState {
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
    maxHp: 1000,
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

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

describe('regrowth', () => {
  it('heals 1% max hp per second and a fire hit stops it for 5 s', () => {
    const w = createWorld(1, data);
    const troll = monster(w, 'troll', 3000, 500);
    const plain = monster(w, 'plain', 3200, 500);
    run(w, 10_000);
    expect(troll.hp).toBe(600);
    expect(plain.hp).toBe(500);
    const h = hero(w, 100);
    landStrike(w, h, troll, {
      attrs: { ...none, str: 1 },
      power: 1,
      type: 'fire',
      canDodge: false,
      canCrit: false,
    });
    const hurt = troll.hp;
    run(w, 4_000);
    expect(troll.hp).toBe(hurt);
    run(w, 4_000);
    expect(troll.hp).toBeGreaterThan(hurt);
    // a frost hit does not stop it
    const frost = troll.hp;
    landStrike(w, h, troll, {
      attrs: { ...none, str: 1 },
      power: 1,
      type: 'frost',
      canDodge: false,
      canCrit: false,
    });
    run(w, 2_000);
    expect(troll.hp).toBeGreaterThan(frost - 1);
  });
});

describe('snatch', () => {
  it('a landed strike steals gold; whoever kills the thief gets it back', () => {
    const w = createWorld(1, data);
    const victim = hero(w, 500, 100);
    const killer = hero(w, 520, 0);
    const harpy = monster(w, 'harpy', 540);
    const ev: SimEvent[] = [];
    landStrike(w, harpy, victim, {
      attrs: { ...none, str: 1 },
      power: 1,
      canDodge: false,
      canCrit: false,
    });
    ev.push(...snapshot(w).events);
    expect(ev.some((e) => e.kind === 'stolen' && e.gold === 5)).toBe(true);
    expect(victim.gold).toBe(95);
    harpy.hp = 0;
    w.pendingDeaths.push({ victim: harpy.id, by: killer.id });
    run(w, 100);
    // bounty 10 plus the 5 snatched
    expect(killer.gold).toBe(15);
  });

  it('cannot take what the hero does not carry', () => {
    const w = createWorld(1, data);
    const poor = hero(w, 500, 3);
    const harpy = monster(w, 'harpy', 540);
    landStrike(w, harpy, poor, {
      attrs: { ...none, str: 1 },
      power: 1,
      canDodge: false,
      canCrit: false,
    });
    expect(poor.gold).toBe(0);
  });
});

describe('grave-cold', () => {
  it('a hero it knocks out stays down 50% longer', () => {
    const knock = (type: string) => {
      const w = createWorld(1, data);
      const h = hero(w);
      const m = monster(w, type, 520);
      h.hp = 0;
      w.pendingDeaths.push({ victim: h.id, by: m.id });
      run(w, 100);
      return w.heroRuntime.get(h.id)?.koMs ?? 0;
    };
    const plain = knock('plain');
    expect(plain).toBeGreaterThan(0);
    expect(knock('draugr')).toBeGreaterThan(plain * 1.4);
  });
});

describe('scavenger', () => {
  it('the killer and pack mates near it heal when it knocks a hero out', () => {
    const w = createWorld(1, data);
    const h = hero(w);
    const a = monster(w, 'jackal', 520, 500);
    const b = monster(w, 'jackal', 560, 500);
    const far = monster(w, 'jackal', 2000, 500);
    h.hp = 0;
    w.pendingDeaths.push({ victim: h.id, by: a.id });
    run(w, 50);
    expect(a.hp).toBeGreaterThanOrEqual(600);
    expect(b.hp).toBeGreaterThanOrEqual(600);
    expect(far.hp).toBe(500);
  });
});

describe('bull rush', () => {
  // A nimble hero (dodge caps at 90%) against a charger with and without the quirk.
  const firstHit = (seed: number, sure: boolean) => {
    const w = createWorld(seed, {
      ...data,
      classes: [{ id: 'knight', attrs: { ...none, dex: 5, sta: 10 }, weapon, startGold: 0 }],
      monsters: [
        mon('minotaur', {
          role: 'charger',
          attrs: { ...none, str: 100, sta: 20, per: 5 },
          ...(sure ? { quirk: { chargeSure: true } } : {}),
        }),
      ],
      tuning: { ...data.tuning, combat: { dodgeK: 1 } },
    });
    const h = hero(w, 700);
    h.mode = 'explore';
    monster(w, 'minotaur', 500);
    const ev = run(w, 1500);
    const hit = ev.find((e) => e.kind === 'hit' && e.target === h.id);
    return hit && 'dodged' in hit ? hit.dodged : undefined;
  };

  it('the charge cannot be dodged, though it can without the quirk', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const landed = (sure: boolean) =>
      seeds.map((s) => firstHit(s, sure)).filter((d): d is boolean => d !== undefined);
    expect(landed(true).length).toBeGreaterThan(2);
    expect(landed(true).every((d) => !d)).toBe(true);
    expect(landed(false).some((d) => d)).toBe(true);
  });
});
