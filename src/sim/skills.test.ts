import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { newParty } from './parties';
import { foesInShape } from './skills';
import { spawnHero } from './world';
import type { SkillDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const slam: SkillDef = {
  id: 'slam',
  path: 'thor-hammer',
  name: 'Slam',
  trigger: { kind: 'crowd', n: 2, radius: 90 },
  cooldownS: 10,
  target: 'self',
  shape: { kind: 'circle', radius: 90 },
  effects: [{ kind: 'damage', mult: 2, type: 'lightning' }],
  visual: ['burst'],
  t3: { shape: { kind: 'circle', radius: 130 }, effects: [{ kind: 'damage', mult: 4 }] },
};
const bolt: SkillDef = {
  id: 'bolt',
  path: 'thor-hammer',
  name: 'Bolt',
  trigger: { kind: 'ready', range: 300 },
  cooldownS: 4,
  target: 'foe',
  shape: { kind: 'single' },
  effects: [{ kind: 'damage', mult: 3, sure: true }],
  visual: ['bolt'],
};

function mkData(skill: SkillDef): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 3800, y: 3800 },
    classes: [{ id: 'knight', attrs: { ...none, str: 20, sta: 60 }, weapon, startGold: 0 }],
    gods: [{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' }],
    paths: [
      { id: 'thor-hammer', god: 'thor', template: 'knight', name: 'Hammer', attrs: [{}, {}] },
    ],
    monsters: [{ id: 'rat', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1 }],
    skills: [skill],
    tuning: {
      combat: { critK: 1e9, dodgeK: 1e9 },
      hero: { firstRecruitMs: 10_000_000 },
      town: { raidFirstMs: 10_000_000 },
    },
  };
}

type W = ReturnType<typeof createWorld>;

function monster(w: W, x: number, y: number, hp = 800): UnitState {
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

// A tier 2 hero of the path at (500, 500), in a party of one.
function hero(w: W, tier = 2): UnitState {
  const id = spawnHero(w, 'thor', { x: 500, y: 500 });
  const u = w.units.find((x) => x.id === id) as UnitState;
  u.tier = tier;
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

const of = <K extends SimEvent['kind']>(ev: SimEvent[], kind: K) =>
  ev.filter((e): e is Extract<SimEvent, { kind: K }> => e.kind === kind);

describe('skill engine', () => {
  it('a tier 1 hero or a path with no row never casts', () => {
    const w = createWorld(1, mkData(bolt));
    const h = hero(w, 1);
    monster(w, 540, 500);
    expect(of(run(w, 3000), 'cast')).toHaveLength(0);
    h.tier = 2;
    h.path = null;
    expect(of(run(w, 3000), 'cast')).toHaveLength(0);
  });

  it('casts with a windup, lands on the foe, then waits out the cooldown', () => {
    const w = createWorld(1, mkData(bolt));
    const h = hero(w);
    const rat = monster(w, 560, 500);
    const ev = run(w, 4500);
    const casts = of(ev, 'cast');
    expect(casts[0]).toMatchObject({ skill: 'bolt', caster: h.id, target: rat.id, inMs: 500 });
    const idx = ev.indexOf(casts[0]);
    // The skill lands 500 ms later, as a skill event with a hit on the rat of 3 x Str.
    const lands = of(ev, 'skill');
    expect(lands[0]).toMatchObject({ skill: 'bolt', caster: h.id, hits: [rat.id] });
    const hit = ev.slice(idx).find((e) => e.kind === 'hit' && e.damage === 60);
    expect(hit).toBeDefined();
    // Cooldown 4 s from the cast: not yet a second cast at 4 s, one at 4.5 s.
    expect(casts.length).toBe(2);
  });

  it('the caster does not strike during a cast', () => {
    const w = createWorld(1, mkData(bolt));
    const h = hero(w);
    monster(w, 520, 500);
    const ev = run(w, 600);
    const cast = of(ev, 'cast')[0];
    expect(cast).toBeDefined();
    const land = ev.findIndex((e) => e.kind === 'skill');
    expect(land).toBeGreaterThan(ev.indexOf(cast));
    const during = ev.slice(ev.indexOf(cast) + 1, land);
    expect(during.filter((e) => e.kind === 'windup' && e.attacker === h.id)).toHaveLength(0);
  });

  it('crowd needs n foes in the radius; the circle hits all of them', () => {
    const w = createWorld(1, mkData(slam));
    hero(w);
    const a = monster(w, 540, 500);
    expect(of(run(w, 2000), 'cast')).toHaveLength(0);
    const b = monster(w, 560, 540);
    const far = monster(w, 700, 500);
    const lands = of(run(w, 1500), 'skill');
    expect(lands[0].hits.sort()).toEqual([a.id, b.id].sort());
    expect(lands[0].hits).not.toContain(far.id);
  });

  it('tier 3 merges its fields over the tier 2 skill', () => {
    const w = createWorld(1, mkData(slam));
    hero(w, 3);
    const a = monster(w, 540, 500);
    monster(w, 560, 540);
    const far = monster(w, 600, 500);
    const lands = of(run(w, 1500), 'skill');
    expect(lands[0].hits).toContain(far.id);
    expect(lands[0].hits).toContain(a.id);
  });

  it('the first cast and every fourth shows the skill name', () => {
    const w = createWorld(1, mkData({ ...bolt, cooldownS: 1 }));
    hero(w);
    monster(w, 520, 500, 100_000);
    const casts = of(run(w, 9000), 'cast');
    expect(casts.length).toBeGreaterThanOrEqual(5);
    const said = casts.map((c) => !!c.say);
    expect(said.slice(0, 5)).toEqual([true, false, false, false, true]);
  });

  it('engage fires only inside its range band', () => {
    const eng: SkillDef = { ...bolt, trigger: { kind: 'engage', min: 60, max: 300 } };
    const near = createWorld(1, mkData(eng));
    hero(near);
    monster(near, 540, 500);
    expect(of(run(near, 1000), 'cast')).toHaveLength(0);
    const far = createWorld(1, mkData(eng));
    hero(far);
    monster(far, 590, 500);
    expect(of(run(far, 1500), 'cast').length).toBeGreaterThan(0);
  });

  it('selfHurt fires earlier for a coward and later for a brave hero', () => {
    const self: SkillDef = {
      ...bolt,
      trigger: { kind: 'selfHurt', below: 0.4 },
      target: 'self',
      shape: { kind: 'circle', radius: 100 },
    };
    const casts = (trait: 'coward' | 'brave' | null) => {
      const w = createWorld(1, mkData(self));
      const h = hero(w);
      h.trait = trait;
      h.hp = Math.floor(h.maxHp * 0.5);
      monster(w, 560, 500);
      return of(run(w, 1000), 'cast').length;
    };
    expect(casts('coward')).toBeGreaterThan(0);
    expect(casts(null)).toBe(0);
    expect(casts('brave')).toBe(0);
  });

  it('allyHurt casts at the hurt party mate', () => {
    const heal: SkillDef = {
      ...bolt,
      trigger: { kind: 'allyHurt', below: 0.5, radius: 200 },
      target: 'ally',
      shape: { kind: 'single' },
    };
    const w = createWorld(1, mkData(heal));
    const h = hero(w);
    const mate = hero(w);
    const party = w.parties.get(h.party);
    if (!party) throw new Error('party');
    w.parties.delete(mate.party);
    mate.party = h.party;
    party.members.push(mate.id);
    mate.pos = { x: 560, y: 500 };
    expect(of(run(w, 1000), 'cast')).toHaveLength(0);
    mate.hp = Math.floor(mate.maxHp * 0.3);
    const casts = of(run(w, 1000), 'cast');
    expect(casts[0]).toMatchObject({ caster: h.id, target: mate.id });
  });

  it('kill fires after a monster dies nearby', () => {
    const k: SkillDef = {
      ...bolt,
      trigger: { kind: 'kill', radius: 200 },
      target: 'self',
      shape: { kind: 'circle', radius: 100 },
    };
    const w = createWorld(1, mkData(k));
    hero(w);
    const weak = monster(w, 530, 500, 5);
    const ev = run(w, 2500);
    expect(of(ev, 'died').some((d) => d.unit === weak.id)).toBe(true);
    expect(of(ev, 'cast').length).toBeGreaterThan(0);
  });

  it('any fires when either trigger holds', () => {
    const either: SkillDef = {
      ...bolt,
      trigger: {
        any: [
          { kind: 'crowd', n: 5, radius: 50 },
          { kind: 'ready', range: 100 },
        ],
      },
    };
    const w = createWorld(1, mkData(either));
    hero(w);
    monster(w, 540, 500);
    expect(of(run(w, 1500), 'cast').length).toBeGreaterThan(0);
  });

  it('a knockout cancels the cast', () => {
    const w = createWorld(1, mkData(bolt));
    const h = hero(w);
    monster(w, 540, 500);
    const first = of(run(w, 100), 'cast');
    expect(first).toHaveLength(1);
    h.hp = 0;
    w.pendingDeaths.push({ victim: h.id, by: 0 });
    const ev = run(w, 1500);
    expect(of(ev, 'skill')).toHaveLength(0);
  });

  it('a proud hero aims at the foe with the most max hp', () => {
    const w = createWorld(1, mkData(bolt));
    const h = hero(w);
    h.trait = 'proud';
    monster(w, 530, 500, 100);
    const big = monster(w, 580, 500, 900);
    const cast = of(run(w, 600), 'cast')[0];
    expect(cast.target).toBe(big.id);
  });

  it('is deterministic for a seed', () => {
    const play = () => {
      const w = createWorld(7, mkData(slam));
      hero(w);
      monster(w, 540, 500);
      monster(w, 560, 540);
      return JSON.stringify(run(w, 6000));
    };
    expect(play()).toBe(play());
  });
});

describe('skill shapes', () => {
  const w = createWorld(1, mkData(bolt));
  const h = hero(w);
  h.pos = { x: 0, y: 0 };
  const m = (x: number, y: number) => monster(w, x, y);
  const a = m(50, 0);
  const b = m(120, 10);
  const c = m(200, 0);
  const side = m(50, 200);
  const ids = (hs: { unit: UnitState }[]) => hs.map((x) => x.unit.id);

  it('cone: inside the radius and half angle only', () => {
    const got = foesInShape(
      w,
      h,
      { kind: 'cone', radius: 130, angle: 60 },
      { x: 100, y: 0 },
      undefined,
    );
    expect(ids(got)).toEqual([a.id, b.id]);
  });

  it('line: along the line within half the width, nearest first', () => {
    const got = foesInShape(
      w,
      h,
      { kind: 'line', length: 250, width: 40 },
      { x: 100, y: 0 },
      undefined,
    );
    expect(ids(got)).toEqual([a.id, b.id, c.id]);
    expect(ids(got)).not.toContain(side.id);
  });

  it('chain: jumps to the nearest unhit foe with falloff', () => {
    const got = foesInShape(
      w,
      h,
      { kind: 'chain', jumps: 2, radius: 100, falloff: 0.5 },
      { x: 50, y: 0 },
      a,
    );
    expect(ids(got)).toEqual([a.id, b.id, c.id]);
    expect(got.map((x) => x.mult)).toEqual([1, 0.5, 0.25]);
  });
});

describe('skill engine, review fixes', () => {
  it('ready and engage reach foes beyond the aggro radius', () => {
    const w = createWorld(1, mkData({ ...bolt, trigger: { kind: 'ready', range: 300 } }));
    hero(w);
    monster(w, 780, 500);
    expect(of(run(w, 1000), 'cast').length).toBeGreaterThan(0);
  });

  it('a self-centred crowd counts foes around the caster, not around the foe', () => {
    const w = createWorld(1, mkData(slam));
    hero(w);
    // Two rats cluster 200 away from the hero: not a crowd for a circle around the hero.
    monster(w, 700, 500);
    monster(w, 710, 520);
    expect(of(run(w, 2000), 'cast')).toHaveLength(0);
  });

  it('cooldown runs while the hero is not fighting', () => {
    const w = createWorld(1, mkData({ ...bolt, cooldownS: 5 }));
    const h = hero(w);
    const rat = monster(w, 540, 500, 100_000);
    run(w, 600);
    rat.pos = { x: 3000, y: 3000 };
    h.mode = 'rest';
    run(w, 6000);
    h.mode = 'explore';
    rat.pos = { x: 540, y: 500 };
    const ev = run(w, 100);
    expect(of(ev, 'cast')).toHaveLength(1);
  });

  it('a single cast misses a target that left the cast point', () => {
    const w = createWorld(1, mkData(bolt));
    hero(w);
    const rat = monster(w, 540, 500, 100_000);
    run(w, 200);
    rat.pos = { x: 700, y: 500 };
    const ev = run(w, 600);
    expect(of(ev, 'skill')[0].hits).toEqual([]);
  });

  it('keeps no kill history without skill rows', () => {
    const d = mkData(bolt);
    const w = createWorld(1, { ...d, skills: [] });
    hero(w);
    monster(w, 530, 500, 5);
    run(w, 2000);
    expect(w.recentKills).toHaveLength(0);
  });
});
