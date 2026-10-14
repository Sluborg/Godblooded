import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { fleeThreshold } from './parties';
import { spawnHero } from './world';
import type { SkillDef, UnitState } from './types';

const attrs = { str: 10, dex: 3, sta: 12, cha: 1, per: 3, int: 6, wp: 6 };

function data(skill: SkillDef, extra: Partial<GameData> = {}): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 2000 },
    townHall: { x: 3800, y: 1900 },
    classes: [
      {
        id: 'warrior',
        attrs,
        weapon: { baseAttackS: 1, range: 40 },
        startGold: 0,
      },
    ],
    monsters: [
      {
        id: 'dummy',
        attrs: { ...attrs, str: 1, sta: 30 },
        weapon: { baseAttackS: 5, range: 40 },
        bounty: 1,
        xp: 1,
      },
      {
        id: 'weakling',
        attrs: { ...attrs, str: 1, sta: 1 },
        weapon: { baseAttackS: 5, range: 40 },
        bounty: 1,
        xp: 1,
      },
    ],
    gods: [{ id: 'g', pantheon: 'p', name: 'G', template: 'warrior' }],
    paths: [{ id: 'g-path', god: 'g', template: 'warrior', name: 'P', attrs: [{}, {}] }],
    skills: [skill],
    tuning: {
      hero: { firstRecruitMs: 10_000_000 },
      town: { raidFirstMs: 10_000_000 },
      combat: { critK: 1e9, dodgeK: 1e9 },
      skill: { castWindupMs: 100 },
    },
    ...extra,
  };
}

type W = ReturnType<typeof createWorld>;

function mon(w: W, type: string, x: number, y: number, hp?: number): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type,
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp: hp ?? 400,
    maxHp: 400,
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

function pathHero(w: W, x: number, y: number): UnitState {
  const id = spawnHero(w, 'g', { x, y });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.path = 'g-path';
  u.tier = 2;
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

const base = (over: Partial<SkillDef>): SkillDef => ({
  id: 's',
  path: 'g-path',
  name: 'S',
  trigger: { kind: 'ready', range: 300 },
  cooldownS: 5,
  target: 'foe',
  shape: { kind: 'single' },
  effects: [{ kind: 'damage', mult: 1 }],
  visual: [],
  ...over,
});

describe('skills3: Greek and Egyptian shapes', () => {
  it('lifesteal heals max hp per landed hit while the buff lasts', () => {
    const w = createWorld(
      1,
      data(
        base({
          target: 'self',
          shape: { kind: 'single' },
          effects: [{ kind: 'buff', stat: 'lifesteal', amount: 0.05, s: 5, to: 'self' }],
        }),
      ),
    );
    const h = pathHero(w, 1000, 1000);
    h.hp = Math.round(h.maxHp * 0.5);
    mon(w, 'dummy', 1030, 1000, 400);
    const before = h.hp;
    run(w, 3_000);
    expect(h.hp).toBeGreaterThan(before);
  });

  it('damageTaken takes a share off the damage a buffed hero suffers', () => {
    const hit = (guard: number) => {
      const w = createWorld(
        1,
        data(
          base({
            target: 'self',
            effects: [{ kind: 'buff', stat: 'damageTaken', amount: guard, s: 20, to: 'self' }],
            cooldownS: 100,
          }),
          {
            monsters: [
              {
                id: 'brute',
                attrs: { ...attrs, str: 30, sta: 5 },
                weapon: { baseAttackS: 1, range: 40 },
                bounty: 1,
                xp: 1,
              },
            ],
          },
        ),
      );
      const h = pathHero(w, 1000, 1000);
      h.maxHp = h.hp = 5000;
      const m = mon(w, 'brute', 1030, 1000, 400);
      m.maxHp = 1e6;
      m.hp = 1e6;
      const ev = run(w, 2_000);
      const hits = ev.filter((e) => e.kind === 'hit' && e.target === h.id && !e.dodged);
      return hits.length ? (hits[hits.length - 1] as { damage: number }).damage : 0;
    };
    expect(hit(0.5)).toBeLessThan(hit(0));
  });

  it('an effect with its own shape reaches more foes than the skill shape', () => {
    const w = createWorld(
      1,
      data(
        base({
          shape: { kind: 'single' },
          effects: [
            { kind: 'damage', mult: 0.1 },
            { kind: 'stagger', shape: { kind: 'circle', radius: 200 } },
          ],
        }),
      ),
    );
    pathHero(w, 1000, 1000);
    const a = mon(w, 'dummy', 1030, 1000);
    const b = mon(w, 'dummy', 1150, 1000);
    const ev = run(w, 800);
    const skill = ev.find((e) => e.kind === 'skill');
    expect(skill && skill.kind === 'skill' && skill.hits).toEqual(
      expect.arrayContaining([a.id, b.id]),
    );
  });

  it('drain heals the caster a share of the damage; critBelow crits a hurt foe for sure', () => {
    const w = createWorld(
      1,
      data(
        base({
          effects: [{ kind: 'damage', mult: 2, drain: 0.5, critBelow: 0.5 }],
          cooldownS: 100,
        }),
      ),
    );
    const h = pathHero(w, 1000, 1000);
    h.hp = Math.round(h.maxHp * 0.3);
    const m = mon(w, 'dummy', 1030, 1000, 100);
    const before = h.hp;
    const ev = run(w, 600);
    const strike = ev.find((e) => e.kind === 'hit' && e.attacker === h.id && e.crit);
    expect(strike).toBeTruthy();
    expect(h.hp).toBeGreaterThan(before);
    expect(m.hp).toBeLessThan(100);
  });

  it('volley strikes count times at foes in range', () => {
    const w = createWorld(
      1,
      data(
        base({
          target: 'self',
          effects: [{ kind: 'volley', count: 4, radius: 300, mult: 0.3 }],
          cooldownS: 100,
        }),
      ),
    );
    const h = pathHero(w, 1000, 1000);
    mon(w, 'dummy', 1030, 1000);
    mon(w, 'dummy', 1120, 1050);
    const ev = run(w, 800);
    const volleyHits = ev.filter((e) => e.kind === 'hit' && e.attacker === h.id);
    expect(volleyHits.length).toBeGreaterThanOrEqual(4);
  });

  it('noFlee keeps a hero from fleeing for the time given', () => {
    const w = createWorld(
      1,
      data(
        base({
          target: 'self',
          shape: { kind: 'circle', radius: 200 },
          effects: [{ kind: 'noFlee', s: 10 }],
          cooldownS: 100,
        }),
      ),
    );
    const h = pathHero(w, 1000, 1000);
    expect(fleeThreshold(w, h)).toBeGreaterThan(0);
    mon(w, 'dummy', 1030, 1000);
    run(w, 800);
    expect(fleeThreshold(w, h)).toBe(0);
    run(w, 12_000);
    expect(fleeThreshold(w, h)).toBeGreaterThan(0);
  });

  it('chainOnKill casts again on the next foe near the one that fell', () => {
    const w = createWorld(
      1,
      data(base({ effects: [{ kind: 'damage', mult: 8 }], cooldownS: 100, chainOnKill: 200 })),
    );
    const h = pathHero(w, 1000, 1000);
    const a = mon(w, 'weakling', 1030, 1000, 1);
    const b = mon(w, 'weakling', 1150, 1000, 1);
    const ev = run(w, 800);
    const deaths = ev.filter((e) => e.kind === 'died').map((e) => (e.kind === 'died' ? e.unit : 0));
    expect(deaths).toEqual(expect.arrayContaining([a.id, b.id]));
    expect(ev.filter((e) => e.kind === 'skill' && e.caster === h.id).length).toBe(2);
  });

  it('refreshOnKill resets the cooldown on a kill while the skill buff runs', () => {
    const w = createWorld(
      1,
      data(
        base({
          target: 'self',
          effects: [{ kind: 'buff', stat: 'attackSpeed', amount: 0.5, s: 20, to: 'self' }],
          cooldownS: 100,
          refreshOnKill: true,
        }),
      ),
    );
    const h = pathHero(w, 1000, 1000);
    mon(w, 'dummy', 1030, 1000, 400);
    const casts = (ev: SimEvent[]) => ev.filter((e) => e.kind === 'cast').length;
    expect(casts(run(w, 1_000))).toBe(1);
    // nothing kills: no second cast
    expect(casts(run(w, 3_000))).toBe(0);
    const weak = mon(w, 'weakling', 1040, 1000, 1);
    w.pendingDeaths.push({ victim: weak.id, by: h.id });
    weak.hp = 0;
    // the kill reset the cooldown, so the hero casts again at once
    expect(casts(run(w, 400))).toBe(1);
  });

  it('pick mostHp aims a single-target cast at the foe with the most hp', () => {
    const w = createWorld(
      1,
      data(base({ pick: 'mostHp', effects: [{ kind: 'damage', mult: 0.2 }], cooldownS: 100 })),
    );
    const h = pathHero(w, 1000, 1000);
    mon(w, 'dummy', 1030, 1000, 100);
    const big = mon(w, 'dummy', 1100, 1000, 400);
    const ev = run(w, 800);
    const skill = ev.find((e) => e.kind === 'skill' && e.caster === h.id);
    expect(skill && skill.kind === 'skill' && skill.hits).toContain(big.id);
  });

  it('a regen passive heals a hero while it fights', () => {
    const w = createWorld(
      1,
      data(base({ trigger: { kind: 'selfHurt', below: 0.01 } }), {
        gods: [
          {
            id: 'g',
            pantheon: 'p',
            name: 'G',
            template: 'warrior',
            passive: {
              id: 'sun',
              name: 'Sun',
              effects: [{ scope: 'self', keys: { regen: 0.05 } }],
            },
          },
        ],
      }),
    );
    const h = pathHero(w, 1000, 1000);
    h.hp = Math.round(h.maxHp * 0.5);
    const m = mon(w, 'dummy', 1030, 1000, 400);
    m.maxHp = m.hp = 1e6;
    const before = h.hp;
    run(w, 2_000);
    expect(h.hp).toBeGreaterThan(before + 2);
  });
});
