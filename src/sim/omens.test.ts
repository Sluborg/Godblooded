import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { omenDamageMult } from './omens';
import { spawnHero } from './world';
import type { OmenDef, UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };

const OMENS: OmenDef[] = [
  {
    id: 'red-sky',
    name: 'Red Sky',
    text: 'Monsters hit harder; bounties pay double.',
    weight: 1,
    durationMs: 6_000,
    mods: { monsterDamage: 1.2, bountyMult: 2 },
  },
  {
    id: 'frost',
    name: 'Fimbul Frost',
    text: 'Everyone slower.',
    pantheon: 'aesir',
    weight: 1,
    durationMs: 6_000,
    mods: { moveSpeed: 0.5, typeDamage: { frost: 1.25 } },
  },
  {
    id: 'eclipse',
    name: 'Eclipse of Ra',
    text: 'Undead hit harder.',
    pantheon: 'egyptian',
    weight: 1,
    durationMs: 6_000,
    mods: { undeadDamage: 1.25, typeDamage: { holy: 1.5 } },
  },
];

const data = (omens: readonly OmenDef[] | undefined, events: object = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 2000 },
  townHall: { x: 3800, y: 1900 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 12, sta: 30 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 8, sta: 4 },
      weapon: { baseAttackS: 1, range: 40 },
      bounty: 1,
      xp: 1,
      tags: ['undead'],
    },
  ],
  ...(omens ? { omens } : {}),
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    events: { omenFirstMs: 30_000, omenEveryMs: [20_000, 20_000], omenLeadMs: 5_000, ...events },
  },
});

type W = ReturnType<typeof createWorld>;

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const mon = (w: W, x: number, y: number): UnitState => {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type: 'draugr',
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp: 100,
    maxHp: 100,
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
};

describe('omens', () => {
  it('do nothing without a deck', () => {
    const w = createWorld(1, data(undefined));
    const ev = run(w, 60_000);
    expect(ev.some((e) => e.kind === 'omen')).toBe(false);
    expect(snapshot(w).omen).toBeNull();
  });

  it('are announced, start, end, then the next comes', () => {
    const w = createWorld(1, data(OMENS));
    const ev = run(w, 90_000);
    const kinds = ev.filter((e) => e.kind.startsWith('omen')).map((e) => e.kind);
    expect(kinds.slice(0, 3)).toEqual(['omen', 'omenStart', 'omenEnd']);
    expect(kinds.filter((k) => k === 'omen').length).toBeGreaterThanOrEqual(2);
    const first = ev.find((e) => e.kind === 'omen');
    expect(first).toMatchObject({ inMs: 5_000 });
    const start = ev.find((e) => e.kind === 'omenStart');
    expect(start).toMatchObject({ durationMs: 6_000 });
  });

  it('shows in the snapshot as announced, then active, with time left', () => {
    const w = createWorld(1, data(OMENS));
    run(w, 26_000);
    expect(snapshot(w).omen).toMatchObject({ phase: 'announced' });
    run(w, 6_000);
    const o = snapshot(w).omen;
    expect(o).toMatchObject({ phase: 'active' });
    expect(o?.msLeft).toBeGreaterThan(0);
    expect(o?.msLeft).toBeLessThanOrEqual(6_000);
  });

  it('never repeats until others have been drawn, and the lean weighs more', () => {
    const w = createWorld(
      3,
      data(OMENS, { omenEveryMs: [1_000, 1_000], omenFirstMs: 1_000, omenNoRepeat: 2 }),
    );
    const ev = run(w, 120_000);
    const ids = ev.filter((e) => e.kind === 'omen').map((e) => (e.kind === 'omen' ? e.omen : ''));
    expect(ids.length).toBeGreaterThan(6);
    for (let i = 3; i < ids.length; i++) {
      expect(new Set(ids.slice(i - 2, i + 1)).size).toBe(3);
    }
  });

  it('Red Sky: monsters hit 20% harder and flags pay double', () => {
    const w = createWorld(1, data([OMENS[0]], { omenFirstMs: 1_000 }));
    run(w, 3_000);
    expect(snapshot(w).omen).toMatchObject({ phase: 'active' });
    expect(omenDamageMult(w, mon(w, 0, 0), 'physical')).toBeCloseTo(1.2);
    // a flag a hero stands on pays double
    const id = spawnHero(w, 'warrior', { x: 500, y: 500 });
    const hero = w.units.find((u) => u.id === id) as UnitState;
    hero.gold = 0;
    w.gold = 100;
    command(w, { kind: 'placeBounty', pos: { x: 500, y: 500 }, gold: 40 });
    run(w, 1_000);
    expect(hero.gold).toBe(80);
    // and without the omen it pays the face value
    const calm = createWorld(1, data([OMENS[0]], { omenFirstMs: 100_000 }));
    const id2 = spawnHero(calm, 'warrior', { x: 500, y: 500 });
    const h2 = calm.units.find((u) => u.id === id2) as UnitState;
    h2.gold = 0;
    calm.gold = 100;
    command(calm, { kind: 'placeBounty', pos: { x: 500, y: 500 }, gold: 40 });
    run(calm, 1_000);
    expect(h2.gold).toBe(40);
  });

  it('Fimbul Frost slows movement and raises frost damage; Eclipse raises undead and holy', () => {
    const w = createWorld(1, data([OMENS[1]], { omenFirstMs: 1_000 }));
    run(w, 3_000);
    const m = mon(w, 0, 0);
    expect(omenDamageMult(w, m, 'frost')).toBeCloseTo(1.25);
    expect(omenDamageMult(w, m, 'physical')).toBe(1);
    const e = createWorld(1, data([OMENS[2]], { omenFirstMs: 1_000 }));
    run(e, 3_000);
    const m2 = mon(e, 0, 0);
    expect(omenDamageMult(e, m2, 'holy')).toBeCloseTo(1.25 * 1.5);
    // movement: a hero walks half as far under the frost
    const walk = (omens: OmenDef[]) => {
      const x = createWorld(1, data(omens, { omenFirstMs: 1_000 }));
      run(x, 3_000);
      const id = spawnHero(x, 'warrior', { x: 1000, y: 1000 });
      const u = x.units.find((v) => v.id === id) as UnitState;
      const from = { ...u.pos };
      run(x, 2_000);
      return Math.hypot(u.pos.x - from.x, u.pos.y - from.y);
    };
    expect(walk([OMENS[1]])).toBeLessThan(walk([{ ...OMENS[0], mods: {} }]) * 0.7);
  });
});
