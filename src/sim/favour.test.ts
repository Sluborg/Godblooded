import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { addFavour, pickSpot } from './favour';
import { spawnHero } from './world';
import type { MiracleDef, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const MIRACLES: MiracleDef[] = [
  {
    id: 'storm',
    pantheon: 'aesir',
    radius: 250,
    effects: [{ kind: 'damage', to: 'foes', amount: 60, type: 'lightning', strikes: 6, overS: 3 }],
  },
  {
    id: 'aegis',
    pantheon: 'greek',
    radius: 250,
    effects: [
      { kind: 'shield', to: 'heroes', pct: 0.4, s: 8 },
      { kind: 'buff', to: 'heroes', stat: 'armour', buff: 0.3, s: 8 },
    ],
  },
  {
    id: 'dawn',
    pantheon: 'egyptian',
    radius: 250,
    effects: [
      { kind: 'heal', to: 'heroes', pct: 0.35 },
      { kind: 'damage', to: 'foes', tag: 'undead', amount: 80, type: 'holy', rider: 'sear' },
    ],
  },
];

const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 500, y: 500 },
  classes: [{ id: 'knight', attrs: { ...none, str: 10, sta: 60 }, weapon, startGold: 0 }],
  gods: [
    { id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' },
    { id: 'athena', pantheon: 'greek', name: 'Athena', template: 'knight' },
    { id: 'ra', pantheon: 'egyptian', name: 'Ra', template: 'knight' },
  ],
  monsters: [
    { id: 'rat', attrs: { ...none, sta: 100, str: 1 }, weapon, bounty: 1, xp: 1 },
    {
      id: 'mummy',
      attrs: { ...none, sta: 100, str: 1 },
      weapon,
      bounty: 1,
      xp: 1,
      tags: ['undead'],
    },
  ],
  miracles: MIRACLES,
  tuning: {
    combat: { critK: 1e9, dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;

function hero(w: W, god: string, x: number, hpShare = 1): UnitState {
  const id = spawnHero(w, god, { x, y: 500 });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.mode = 'rest';
  u.hp = Math.round(u.maxHp * hpShare);
  return u;
}

function monster(w: W, type: string, x: number, hp = 100_000, raid = false): UnitState {
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
  w.unitRuntime.set(id, {
    lair: null,
    cooldownMs: 0,
    target: null,
    idleMs: 0,
    ...(raid ? { raid: true } : {}),
  });
  return u;
}

function temple(w: W, pantheon: string, tier: number): void {
  w.buildings.push({
    id: w.nextId++,
    type: `temple_${pantheon}`,
    tier,
    pos: { x: 300, y: 300 },
    plot: null,
    hp: 100,
    maxHp: 100,
  });
}

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const miracles = (ev: SimEvent[]) =>
  ev.filter((e): e is Extract<SimEvent, { kind: 'miracle' }> => e.kind === 'miracle');

describe('favour bars', () => {
  it('a temple fills its pantheon bar by tier / 4 s', () => {
    const w = createWorld(1, data);
    temple(w, 'aesir', 2);
    run(w, 8000);
    expect(w.favour.aesir).toBeCloseTo(4, 1);
    expect(w.favour.greek).toBeUndefined();
    expect(snapshot(w).favour).toEqual([{ pantheon: 'aesir', value: w.favour.aesir, max: 100 }]);
  });

  it('nothing fills without miracle rows; a bar never passes max', () => {
    const w = createWorld(1, { ...data, miracles: [] });
    temple(w, 'aesir', 1);
    run(w, 4000);
    expect(w.favour).toEqual({});
    const v = createWorld(1, data);
    addFavour(v, 'aesir', 250);
    expect(v.favour.aesir).toBe(100);
  });
});

describe('the gods act', () => {
  it('a full bar waits while nobody is in danger', () => {
    const w = createWorld(1, data);
    hero(w, 'thor', 500);
    addFavour(w, 'aesir', 100);
    expect(miracles(run(w, 3000))).toHaveLength(0);
    expect(w.favour.aesir).toBe(100);
  });

  it('picks the fight with the most hurt heroes of its pantheon', () => {
    const w = createWorld(1, data);
    hero(w, 'thor', 1000, 0.3);
    hero(w, 'thor', 1800, 0.3);
    hero(w, 'thor', 1830, 0.2);
    hero(w, 'thor', 300, 0.9);
    hero(w, 'athena', 400, 0.1);
    const spot = pickSpot(w, 'aesir');
    expect(spot && Math.round(spot.x)).toBeGreaterThanOrEqual(1800);
  });

  it("Thor's storm strikes six random monsters over 3 s, credited to a hero", () => {
    const w = createWorld(1, data);
    const h = hero(w, 'thor', 500, 0.3);
    const rats = [200, 220, 240, 260, 280, 300].map((d) => monster(w, 'rat', 500 + d, 100_000));
    addFavour(w, 'aesir', 100);
    const ev = run(w, 6000);
    const [m] = miracles(ev);
    expect(m).toMatchObject({ id: 'storm', pantheon: 'aesir', tellMs: 1500 });
    expect(w.favour.aesir).toBeLessThan(5);
    const hits = ev.filter(
      (e) => e.kind === 'hit' && e.attacker === h.id && e.type === 'lightning',
    );
    expect(hits).toHaveLength(6);
    expect(rats.some((r) => r.hp < r.maxHp)).toBe(true);
  });

  it("Athena's aegis shields every hero in reach", () => {
    const w = createWorld(1, data);
    const a = hero(w, 'athena', 500, 0.3);
    const b = hero(w, 'thor', 560);
    const far = hero(w, 'thor', 2000);
    addFavour(w, 'greek', 100);
    const ev = run(w, 3000);
    expect(miracles(ev)).toHaveLength(1);
    const shielded = ev
      .filter((e) => e.kind === 'status' && e.status === 'shield')
      .map((e) => (e as { unit: number }).unit);
    expect(shielded).toContain(a.id);
    expect(shielded).toContain(b.id);
    expect(shielded).not.toContain(far.id);
  });

  it("Ra's dawn heals heroes and burns only the undead", () => {
    const w = createWorld(1, data);
    const h = hero(w, 'ra', 500, 0.3);
    const before = h.hp;
    const mummy = monster(w, 'mummy', 600);
    const rat = monster(w, 'rat', 620);
    addFavour(w, 'egyptian', 100);
    run(w, 3000);
    expect(h.hp).toBeGreaterThan(before);
    expect(mummy.hp).toBeLessThan(mummy.maxHp);
    expect(rat.hp).toBe(rat.maxHp);
  });

  it('a raid at the town counts as a fight', () => {
    const w = createWorld(1, data);
    hero(w, 'thor', 500);
    monster(w, 'rat', 700, 100_000, true);
    addFavour(w, 'aesir', 100);
    expect(miracles(run(w, 2000))).toHaveLength(1);
  });

  it('a lost pantheon without heroes casts nothing', () => {
    const w = createWorld(1, data);
    hero(w, 'thor', 500, 0.1);
    addFavour(w, 'greek', 100);
    expect(miracles(run(w, 2000))).toHaveLength(0);
  });
});
