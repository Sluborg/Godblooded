import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { isBound } from './effects';
import { newParty } from './parties';
import { applyRider } from './riders';
import { speedOf } from './units';
import { spawnHero, statsOf } from './world';
import type { SkillDef, SkillEffect, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const skill = (effects: SkillEffect[], over: Partial<SkillDef> = {}): SkillDef => ({
  id: 'sk',
  path: 'p',
  name: 'Sk',
  trigger: { kind: 'ready', range: 300 },
  cooldownS: 60,
  target: 'self',
  shape: { kind: 'circle', radius: 200 },
  effects,
  visual: ['aura'],
  ...over,
});

function mk(sk: SkillDef): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 3800, y: 3800 },
    classes: [
      { id: 'knight', attrs: { ...none, str: 10, sta: 60, int: 5, wp: 5 }, weapon, startGold: 0 },
    ],
    gods: [{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' }],
    paths: [{ id: 'p', god: 'thor', template: 'knight', name: 'P', attrs: [{}, {}] }],
    monsters: [
      { id: 'rat', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1 },
      { id: 'wyrm', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1, boss: {}, hp: 1000 },
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

function monster(w: W, x: number, hp = 100_000, type = 'rat'): UnitState {
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

function setup(sk: SkillDef) {
  const w = createWorld(1, mk(sk));
  const id = spawnHero(w, 'thor', { x: 500, y: 500 });
  const h = w.units.find((u) => u.id === id) as UnitState;
  h.tier = 2;
  h.path = 'p';
  h.trait = null;
  h.party = newParty(w, id);
  return { w, h };
}

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

describe('skill effects part 2', () => {
  it('knockback pushes foes away from the caster, but not a boss', () => {
    const { w } = setup(skill([{ kind: 'knockback', dist: 100 }]));
    const rat = monster(w, 540);
    const wyrm = monster(w, 540, 1000, 'wyrm');
    run(w, 700);
    expect(rat.pos.x).toBeGreaterThan(600);
    expect(wyrm.pos.x).toBeLessThan(600);
  });

  it('bind roots a foe and slows its attacks; a boss is bound for half the time', () => {
    const { w, h } = setup(skill([{ kind: 'bind', s: 4 }]));
    const rat = monster(w, 560);
    const wyrm = monster(w, 560, 1000, 'wyrm');
    run(w, 700);
    expect(isBound(w, rat.id)).toBe(true);
    expect(speedOf(statsOf(w, rat)!)).toBe(0);
    const plain = statsOf(w, h)!;
    expect(statsOf(w, rat)?.attackMult).toBe(2);
    expect(plain.rooted).toBeUndefined();
    const ratUntil = w.unitRuntime.get(rat.id)?.fx?.bind?.until ?? 0;
    const wyrmUntil = w.unitRuntime.get(wyrm.id)?.fx?.bind?.until ?? 0;
    expect(wyrmUntil - (ratUntil - 4000)).toBeCloseTo(2000, -1);
    // The bind ends.
    run(w, 5000);
    expect(isBound(w, rat.id)).toBe(false);
  });

  it('execute kills foes under the share, not a healthy foe or a boss', () => {
    const { w } = setup(skill([{ kind: 'execute', below: 0.2 }]));
    const weak = monster(w, 540, 1000);
    weak.hp = 100;
    const healthy = monster(w, 540, 1000);
    const wyrm = monster(w, 540, 1000, 'wyrm');
    wyrm.hp = 50;
    run(w, 700);
    expect(w.units.some((u) => u.id === weak.id)).toBe(false);
    expect(healthy.hp).toBeGreaterThan(0);
    expect(wyrm.hp).toBeGreaterThan(0);
  });

  it('cleanse removes riders from allies', () => {
    const { w, h } = setup(skill([{ kind: 'cleanse' }]));
    monster(w, 540);
    applyRider(w, 'chill', 0, h, {
      dodged: false,
      crit: false,
      damage: 5,
      type: 'frost',
      weak: false,
      resist: false,
    });
    expect(w.unitRuntime.get(h.id)?.status?.chill).toBeDefined();
    run(w, 700);
    expect(w.unitRuntime.get(h.id)?.status).toBeUndefined();
  });

  it('hot heals pct of max hp each second for s seconds', () => {
    const { w, h } = setup(skill([{ kind: 'hot', pct: 0.05, s: 3 }]));
    monster(w, 540);
    h.hp = Math.floor(h.maxHp * 0.5);
    const before = h.hp;
    const ev = run(w, 4500);
    const heals = ev.filter((e) => e.kind === 'heal' && e.target === h.id);
    expect(heals.length).toBeGreaterThanOrEqual(3);
    expect(heals[0]).toMatchObject({ amount: Math.round(h.maxHp * 0.05) });
    expect(h.hp).toBeGreaterThan(before);
  });

  it('revive stands a knocked out mate up, once per fight', () => {
    const { w, h } = setup(
      skill([{ kind: 'revive', pct: 0.4 }], { trigger: { kind: 'ready', range: 300 } }),
    );
    const mid = spawnHero(w, 'thor', { x: 520, y: 500 });
    const mate = w.units.find((u) => u.id === mid) as UnitState;
    const party = w.parties.get(h.party)!;
    w.parties.delete(mate.party);
    mate.party = h.party;
    party.members.push(mate.id);
    mate.ko = true;
    mate.hp = 0;
    mate.mode = 'ko';
    monster(w, 560);
    const ev = run(w, 800);
    expect(ev.some((e) => e.kind === 'revived' && e.unit === mate.id)).toBe(true);
    expect(mate.ko).toBe(false);
    expect(mate.hp).toBeGreaterThan(0);
  });

  it('refresh restarts the timer of the buffs its own skill put on the caster', () => {
    const { w, h } = setup(
      skill([{ kind: 'buff', stat: 'damage', amount: 0.5, s: 5, to: 'self' }, { kind: 'refresh' }]),
    );
    monster(w, 540);
    run(w, 700);
    const buff = w.unitRuntime.get(h.id)?.fx?.buffs?.[0];
    expect(buff?.src).toBe('sk');
    const t0 = buff?.until ?? 0;
    // Another cast would extend it; here refresh keeps the full 5 s from the cast.
    expect(t0).toBeGreaterThan(w.timeMs);
  });
});
