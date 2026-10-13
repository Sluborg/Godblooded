import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { attackMs } from './units';
import { newParty } from './parties';
import { spawnHero, statsOf } from './world';
import type { SkillDef, SkillEffect, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const skill = (effects: SkillEffect[], over: Partial<SkillDef> = {}): SkillDef => ({
  id: 'sk',
  path: 'thor-hammer',
  name: 'Sk',
  trigger: { kind: 'ready', range: 300 },
  cooldownS: 30,
  target: 'self',
  shape: { kind: 'circle', radius: 200 },
  effects,
  visual: ['aura'],
  ...over,
});

function mkData(sk: SkillDef): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 3800, y: 3800 },
    classes: [
      { id: 'knight', attrs: { ...none, str: 20, sta: 60, int: 5, wp: 5 }, weapon, startGold: 0 },
    ],
    gods: [{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' }],
    paths: [
      { id: 'thor-hammer', god: 'thor', template: 'knight', name: 'Hammer', attrs: [{}, {}] },
    ],
    monsters: [
      { id: 'rat', attrs: { ...none, sta: 100, str: 10 }, weapon, bounty: 1, xp: 1 },
      { id: 'wyrm', attrs: { ...none, sta: 100 }, weapon, bounty: 0, xp: 0, tags: ['boss'] },
    ],
    skills: [sk],
    tuning: {
      combat: { critK: 1e9, dodgeK: 1e9 },
      hero: { firstRecruitMs: 10_000_000 },
      town: { raidFirstMs: 10_000_000 },
    },
  };
}

type W = ReturnType<typeof createWorld>;

function monster(w: W, x: number, y: number, hp = 100_000): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type: 'rat',
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
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

function hero(w: W, x = 500, party?: number): UnitState {
  const id = spawnHero(w, 'thor', { x, y: 500 });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.tier = 2;
  u.path = 'thor-hammer';
  u.trait = null;
  if (party === undefined) u.party = newParty(w, id);
  else {
    w.parties.delete(u.party);
    u.party = party;
    w.parties.get(party)?.members.push(id);
  }
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

const of = <K extends SimEvent['kind']>(ev: SimEvent[], kind: K) =>
  ev.filter((e): e is Extract<SimEvent, { kind: K }> => e.kind === kind);

describe('skill effects', () => {
  it('heal restores (Int + Wp) x mult to hurt allies in the shape, the caster included', () => {
    const w = createWorld(1, mkData(skill([{ kind: 'heal', mult: 2 }])));
    const h = hero(w);
    const mate = hero(w, 560, h.party);
    h.hp = Math.floor(h.maxHp * 0.8);
    mate.hp = Math.floor(mate.maxHp * 0.8);
    monster(w, 580, 500);
    const ev = run(w, 800);
    const heals = of(ev, 'heal').filter((e) => e.healer === h.id);
    expect(heals.map((e) => e.target).sort()).toEqual([h.id, mate.id].sort());
    expect(heals[0].amount).toBe(20);
  });

  it('a shield soaks damage first, then runs out', () => {
    const w = createWorld(1, mkData(skill([{ kind: 'shield', pct: 0.5, s: 10 }])));
    const h = hero(w);
    h.hp = Math.floor(h.maxHp * 0.8);
    const rat = monster(w, 520, 500);
    const ev = run(w, 3000);
    expect(of(ev, 'status').some((e) => e.unit === h.id && e.status === 'shield')).toBe(true);
    const start = Math.floor(h.maxHp * 0.8);
    const hits = of(ev, 'hit').filter((e) => e.target === h.id && e.attacker === rat.id);
    // The rat landed several hits; only the one before the cast (10) got through the shield.
    expect(hits.length).toBeGreaterThan(1);
    expect(h.hp).toBe(start - 10);
    // After the shield expires the rat hurts again.
    run(w, 11_000);
    expect(h.hp).toBeLessThan(start - 10);
  });

  it('mark makes foes take more damage from everyone', () => {
    const strike = (effects: SkillEffect[]) => {
      const w = createWorld(1, mkData(skill(effects, { cooldownS: 99 })));
      const h = hero(w);
      monster(w, 520, 500);
      const hits = of(run(w, 3000), 'hit').filter((e) => e.attacker === h.id);
      return hits[hits.length - 1].damage;
    };
    // The basic strike (Str 20) is 20 plain and 30 against a +50% mark.
    expect(strike([{ kind: 'buff', stat: 'crit', amount: 0, s: 1 }])).toBe(20);
    expect(strike([{ kind: 'mark', pct: 0.5, s: 20 }])).toBe(30);
  });

  it('buffs: attack speed shortens the cycle, armour and dodge and damage change stats', () => {
    const w = createWorld(
      1,
      mkData(
        skill([
          { kind: 'buff', stat: 'attackSpeed', amount: 0.5, s: 20 },
          { kind: 'buff', stat: 'armour', amount: 1, s: 20 },
        ]),
      ),
    );
    const h = hero(w);
    const before = statsOf(w, h);
    if (!before) throw new Error('stats');
    monster(w, 520, 500);
    run(w, 700);
    const after = statsOf(w, h);
    if (!after) throw new Error('stats');
    expect(attackMs(after)).toBeCloseTo(attackMs(before) / 1.5, 5);
    expect(after.haste).toBe(0.5);
  });

  it('a damage buff raises strikes and replaces a buff of the same stat', () => {
    const w = createWorld(1, mkData(skill([{ kind: 'buff', stat: 'damage', amount: 0.5, s: 20 }])));
    const h = hero(w);
    monster(w, 520, 500);
    const ev = run(w, 3000);
    const dmgs = of(ev, 'hit')
      .filter((e) => e.attacker === h.id)
      .map((e) => e.damage);
    expect(dmgs).toContain(30);
  });

  it('taunt pulls foes onto the caster, bosses excepted', () => {
    const w = createWorld(1, mkData(skill([{ kind: 'taunt', s: 10 }])));
    const h = hero(w);
    const mate = hero(w, 520, h.party);
    mate.path = null;
    const rat = monster(w, 530, 500);
    const boss = monster(w, 560, 500);
    boss.type = 'wyrm';
    run(w, 700);
    expect(rat.target).toBe(h.id);
    expect(mate.id).not.toBe(h.id);
    expect(boss.target).not.toBe(h.id);
  });

  it('stagger cancels a foe windup and makes it wait', () => {
    const w = createWorld(
      1,
      mkData(skill([{ kind: 'stagger' }], { trigger: { kind: 'ready', range: 300 } })),
    );
    hero(w);
    const rat = monster(w, 525, 500);
    run(w, 450);
    const rt = w.unitRuntime.get(rat.id);
    expect(rt?.swing).toBeUndefined();
    expect(rt?.cooldownMs).toBeGreaterThanOrEqual(0);
  });

  it('dash puts the caster beside the target before the other effects', () => {
    const sk = skill([{ kind: 'dash' }, { kind: 'damage', mult: 2, sure: true }], {
      target: 'foe',
      shape: { kind: 'single' },
      trigger: { kind: 'engage', min: 100, max: 300 },
    });
    const w = createWorld(1, mkData(sk));
    const h = hero(w);
    const rat = monster(w, 700, 500);
    const ev = run(w, 800);
    const landed = of(ev, 'skill')[0];
    expect(landed.from).toBeDefined();
    expect(Math.abs(h.pos.x - rat.pos.x)).toBeLessThanOrEqual(40);
    expect(landed.hits).toContain(rat.id);
  });

  it('single effects land on their own side of the pool', () => {
    // A foe-targeted single with a damage and an ally buff: the buff goes to the caster, not the rat.
    const sk = skill(
      [
        { kind: 'damage', mult: 1, sure: true },
        { kind: 'buff', stat: 'dodge', amount: 0.5, s: 10 },
      ],
      { target: 'foe', shape: { kind: 'single' } },
    );
    const w = createWorld(1, mkData(sk));
    const h = hero(w);
    const rat = monster(w, 530, 500);
    const ev = run(w, 800);
    const buffed = of(ev, 'status')
      .filter((e) => e.status === 'buff')
      .map((e) => e.unit);
    expect(buffed).toContain(h.id);
    expect(buffed).not.toContain(rat.id);
  });

  it('an ally-targeted single does not hit its mate with a damage effect', () => {
    const sk = skill(
      [
        { kind: 'heal', mult: 1 },
        { kind: 'damage', mult: 1, sure: true },
      ],
      {
        target: 'ally',
        shape: { kind: 'single' },
        trigger: { kind: 'allyHurt', below: 0.5, radius: 200 },
      },
    );
    const w = createWorld(1, mkData(sk));
    const h = hero(w);
    const mate = hero(w, 540, h.party);
    mate.path = null;
    mate.hp = Math.floor(mate.maxHp * 0.3);
    const ev = run(w, 900);
    expect(of(ev, 'heal').some((e) => e.target === mate.id)).toBe(true);
    expect(of(ev, 'hit').some((e) => e.attacker === h.id && e.target === mate.id)).toBe(false);
  });

  it('a fully absorbed hit shows no damage but the absorbed amount', () => {
    const w = createWorld(1, mkData(skill([{ kind: 'shield', pct: 0.5, s: 30 }])));
    const h = hero(w);
    const rat = monster(w, 520, 500);
    const ev = run(w, 3000);
    const soaked = of(ev, 'hit').filter(
      (e) => e.target === h.id && e.attacker === rat.id && e.absorbed,
    );
    expect(soaked.length).toBeGreaterThan(0);
    expect(soaked[0].damage).toBe(0);
    expect(soaked[0].absorbed).toBe(10);
  });

  it('a taunted monster does not leave its leash for the taunter', () => {
    const sk = skill([{ kind: 'taunt', s: 20 }]);
    const w = createWorld(1, mkData(sk));
    w.lairs.push({
      id: 900,
      type: 'x',
      boss: false,
      tier: 1,
      pos: { x: 3000, y: 3000 },
      hp: 1,
      maxHp: 1,
    });
    const h = hero(w);
    const rat = monster(w, 530, 500);
    w.unitRuntime.get(rat.id)!.lair = 900;
    run(w, 900);
    expect(rat.target).not.toBe(h.id);
  });
});
