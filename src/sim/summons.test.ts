import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { newParty } from './parties';
import { spawnHero } from './world';
import { spawnSummons } from './summons';
import { loadWorld, saveWorld } from './save';
import type { SkillDef, SkillEffect, SummonDef, SummonEffect, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const skill = (effects: SkillEffect[], over: Partial<SkillDef> = {}): SkillDef => ({
  id: 'sk',
  path: 'thor-hammer',
  name: 'Sk',
  trigger: { kind: 'ready', range: 300 },
  cooldownS: 999,
  target: 'self',
  shape: { kind: 'circle', radius: 200 },
  effects,
  visual: ['aura'],
  ...over,
});

const SUMMONS: SummonDef[] = [
  { id: 'decoy', hpShare: 0.5, taunt: { radius: 300 }, respawnS: 5 },
  { id: 'falcon', hp: 30, strike: { mult: 1, everyS: 1 }, flies: true },
  { id: 'thrall', fromDead: { share: 0.5 } },
];

function mkData(effects: SkillEffect[]): GameData {
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
    monsters: [{ id: 'rat', attrs: { ...none, sta: 100, str: 10 }, weapon, bounty: 1, xp: 1 }],
    skills: [skill(effects)],
    summons: SUMMONS,
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

function hero(w: W): UnitState {
  const id = spawnHero(w, 'thor', { x: 500, y: 500 });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.tier = 2;
  u.path = 'thor-hammer';
  u.trait = null;
  u.party = newParty(w, id);
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

const of = <K extends SimEvent['kind']>(ev: readonly SimEvent[], kind: K) =>
  ev.filter((e): e is Extract<SimEvent, { kind: K }> => e.kind === kind);

const summonsOf = (w: W, def: string) => w.units.filter((u) => u.summon?.def === def && u.hp > 0);

const call = (summon: string, over: Partial<SummonEffect> = {}): SkillEffect => ({
  kind: 'summon',
  summon,
  ...over,
});

describe('summons', () => {
  it('a cast calls the unit at the point and tells Scene', () => {
    const w = createWorld(1, mkData([call('decoy', { s: 10 })]));
    const h = hero(w);
    monster(w, 560, 500);
    const ev = run(w, 800);
    const [made] = of(ev, 'summoned');
    expect(made.owner).toBe(h.id);
    expect(made.summon).toBe('decoy');
    const d = summonsOf(w, 'decoy');
    expect(d).toHaveLength(1);
    expect(d[0].kind).toBe('summon');
    expect(d[0].party).toBe(h.party);
    expect(d[0].maxHp).toBe(Math.round(0.5 * h.maxHp));
    expect(snapshot(w).units.some((u) => u.kind === 'summon')).toBe(true);
  });

  it('a decoy draws foes and ends with its time', () => {
    const w = createWorld(1, mkData([call('decoy', { s: 3 })]));
    const h = hero(w);
    const rat = monster(w, 560, 500);
    run(w, 1200);
    const rt = w.unitRuntime.get(rat.id);
    expect(rt?.fx?.taunt?.by).toBe(summonsOf(w, 'decoy')[0].id);
    const ev = run(w, 4000);
    expect(of(ev, 'unsummoned').some((e) => e.reason === 'expired' && e.owner === h.id)).toBe(true);
    expect(summonsOf(w, 'decoy')).toHaveLength(0);
  });

  it('a dead decoy comes back after its respawn time while the caster stands', () => {
    const w = createWorld(1, mkData([call('decoy')]));
    hero(w);
    monster(w, 560, 500);
    run(w, 800);
    const d = summonsOf(w, 'decoy')[0];
    w.pendingDeaths.push({ victim: d.id, by: 0 });
    const ev = run(w, 200);
    expect(of(ev, 'unsummoned').some((e) => e.reason === 'died')).toBe(true);
    expect(w.respawns).toHaveLength(1);
    run(w, 5200);
    expect(summonsOf(w, 'decoy')).toHaveLength(1);
    expect(w.respawns).toHaveLength(0);
  });

  it('a falcon strikes foes and the kill is credited to its owner; melee cannot reach it', () => {
    const w = createWorld(1, mkData([call('falcon')]));
    const h = hero(w);
    const rat = monster(w, 560, 500, 20);
    const ev = run(w, 4000);
    const hits = of(ev, 'hit').filter((e) => e.target === rat.id);
    expect(hits.length).toBeGreaterThan(0);
    const falcon = w.units.find((u) => u.summon?.def === 'falcon');
    expect(falcon).toBeDefined();
    expect(of(ev, 'hit').some((e) => e.target === falcon?.id && e.attacker === rat.id)).toBe(false);
    expect(of(ev, 'died').some((e) => e.unit === rat.id && e.by === h.id)).toBe(true);
  });

  it('a thrall rises from a recent kill and is used up', () => {
    const w = createWorld(1, mkData([call('thrall')]));
    const h = hero(w);
    w.recentKills.push({
      pos: { x: 540, y: 500 },
      timeMs: w.timeMs,
      by: h.id,
      type: 'rat',
      tier: 1,
    });
    monster(w, 560, 500);
    run(w, 800);
    const t = summonsOf(w, 'thrall');
    expect(t).toHaveLength(1);
    expect(t[0].type).toBe('rat');
    expect(w.recentKills).toHaveLength(0);
  });

  it('no recent kill, no thrall', () => {
    const w = createWorld(1, mkData([call('thrall')]));
    hero(w);
    monster(w, 560, 500);
    run(w, 800);
    expect(summonsOf(w, 'thrall')).toHaveLength(0);
  });

  it('casting again replaces the earlier unit of the same skill', () => {
    const w = createWorld(1, mkData([]));
    const h = hero(w);
    const eff = call('decoy') as SummonEffect;
    spawnSummons(w, h, eff, { x: 510, y: 500 }, 'sk');
    spawnSummons(w, h, eff, { x: 520, y: 500 }, 'sk');
    expect(summonsOf(w, 'decoy')).toHaveLength(1);
    expect(of(snapshot(w).events, 'unsummoned').some((e) => e.reason === 'replaced')).toBe(true);
  });

  it('an end burst hits the foes around it when it expires', () => {
    const w = createWorld(
      1,
      mkData([
        call('decoy', {
          s: 2,
          end: { radius: 200, effects: [{ kind: 'damage', mult: 2 }] },
        }),
      ]),
    );
    const h = hero(w);
    const rat = monster(w, 560, 500);
    const ev = run(w, 4000);
    expect(
      of(ev, 'hit').some((e) => e.attacker === h.id && e.target === rat.id && e.damage > 0),
    ).toBe(true);
  });

  it('summons go when the owner is knocked out', () => {
    const w = createWorld(1, mkData([call('falcon')]));
    const h = hero(w);
    monster(w, 560, 500);
    run(w, 800);
    expect(summonsOf(w, 'falcon')).toHaveLength(1);
    w.pendingDeaths.push({ victim: h.id, by: 0 });
    const ev = run(w, 200);
    expect(of(ev, 'unsummoned').some((e) => e.reason === 'orphaned')).toBe(true);
    expect(summonsOf(w, 'falcon')).toHaveLength(0);
  });

  it('survives a save round trip', () => {
    const data = mkData([call('decoy')]);
    const w = createWorld(1, data);
    hero(w);
    monster(w, 560, 500);
    run(w, 800);
    const back = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data);
    expect(summonsOf(back, 'decoy')).toHaveLength(1);
  });
});
