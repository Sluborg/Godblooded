import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData } from './api';
import { gapTo, visitPoint } from './collision';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (collision: object = {}): GameData => ({
  buildings: [
    { id: 'market', cost: 10 },
    { id: 'tower', cost: 10 },
  ],
  plots: [
    { x: 1000, y: 800 },
    { x: 1500, y: 800 },
  ],
  startGold: 1000,
  map: { width: 3000, height: 2000 },
  townHall: { x: 600, y: 500 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  monsters: [
    {
      id: 'brute',
      attrs: { ...attrs, str: 60, sta: 5 },
      weapon: { baseAttackS: 0.5, range: 40 },
      bounty: 1,
      xp: 1,
    },
  ],
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    collision,
  },
});

type W = ReturnType<typeof createWorld>;

const run = (w: W, ms: number) => {
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    snapshot(w);
  }
};

const hero = (w: W, x: number, y: number): UnitState => {
  const id = spawnHero(w, 'warrior', { x, y });
  return w.units.find((u) => u.id === id) as UnitState;
};

const insideAny = (w: W, u: UnitState) => w.buildings.some((b) => gapTo(w, b, u.pos) === 0);

describe('units keep apart', () => {
  it('units spawned on one spot spread out to at least their radii', () => {
    const w = createWorld(1, data());
    const heroes = Array.from({ length: 12 }, () => hero(w, 2000, 1200));
    run(w, 3_000);
    for (let i = 0; i < heroes.length; i++) {
      for (let j = i + 1; j < heroes.length; j++) {
        const d = Math.hypot(heroes[i].pos.x - heroes[j].pos.x, heroes[i].pos.y - heroes[j].pos.y);
        // heroes also walk, so only check they are not stacked
        expect(d).toBeGreaterThan(8);
      }
    }
  });

  it('is deterministic', () => {
    const final = () => {
      const w = createWorld(1, data());
      const hs = Array.from({ length: 8 }, () => hero(w, 2000, 1200));
      run(w, 2_000);
      return JSON.stringify(hs.map((h) => [Math.round(h.pos.x * 100), Math.round(h.pos.y * 100)]));
    };
    expect(final()).toBe(final());
  });

  it('can be switched off', () => {
    const w = createWorld(1, data({ enabled: false }));
    // a hero standing in the town hall's middle is left there
    const h = hero(w, 600, 500);
    run(w, 200);
    expect(gapTo(w, w.buildings[0], h.pos)).toBe(0);
  });

  it('a crowd of 200 costs little', () => {
    const w = createWorld(1, data());
    for (let i = 0; i < 200; i++) hero(w, 2000 + (i % 10), 1200 + (i % 7));
    const t0 = performance.now();
    run(w, 5_000);
    expect(performance.now() - t0).toBeLessThan(5_000);
  });
});

describe('building footprints', () => {
  it('nobody ends a tick inside a building, even when walking at its middle', () => {
    const w = createWorld(1, data());
    command(w, { kind: 'build', type: 'market', plot: 0 });
    const m = w.buildings.find((b) => b.type === 'market');
    if (!m) throw new Error('no market');
    const h = hero(w, m.pos.x - 200, m.pos.y);
    const rt = w.heroRuntime.get(h.id);
    for (let t = 0; t < 20_000; t += TICK_MS) {
      if (rt) rt.dest = { x: m.pos.x + 300, y: m.pos.y };
      h.mode = 'explore';
      step(w, TICK_MS);
      expect(insideAny(w, h)).toBe(false);
    }
    // it went round and out the other side
    expect(h.pos.x).toBeGreaterThan(m.pos.x + 50);
  });

  it('a spawned hero is moved out of the temple that called it', () => {
    const w = createWorld(1, data());
    command(w, { kind: 'build', type: 'tower', plot: 0 });
    const t = w.buildings.find((b) => b.type === 'tower');
    if (!t) throw new Error('no tower');
    const h = hero(w, t.pos.x, t.pos.y);
    step(w, TICK_MS);
    expect(insideAny(w, h)).toBe(false);
  });

  it('a visit point sits on the edge on the visitor side, clear of other buildings', () => {
    const w = createWorld(1, data());
    const hall = w.buildings[0];
    const from = { x: hall.pos.x + 400, y: hall.pos.y };
    const p = visitPoint(w, hall.pos, from);
    expect(gapTo(w, hall, p)).toBeGreaterThan(0);
    expect(gapTo(w, hall, p)).toBeLessThan(20);
    expect(p.x).toBeGreaterThan(hall.pos.x);
    // a point outside any building is left as it is
    expect(visitPoint(w, { x: 2000, y: 1500 }, from)).toEqual({ x: 2000, y: 1500 });
    // a neighbour in the way: the hero is sent to another side
    w.buildings.push({
      id: 999,
      type: 'tower',
      tier: 1,
      pos: { x: hall.pos.x + 110, y: hall.pos.y },
      plot: null,
      hp: 1,
      maxHp: 1,
    });
    const q = visitPoint(w, hall.pos, from);
    expect(gapTo(w, w.buildings[w.buildings.length - 1], q)).toBeGreaterThan(0);
    expect(gapTo(w, hall, q)).toBeGreaterThan(0);
  });

  it('a resting hero stands at the town hall, outside it', () => {
    const w = createWorld(1, data());
    const h = hero(w, 1000, 600);
    h.hp = 5;
    run(w, 400);
    h.mode = 'return';
    for (let i = 0; i < 1000 && (h.mode as string) !== 'rest'; i++) step(w, TICK_MS);
    expect(h.mode as string).toBe('rest');
    expect(insideAny(w, h)).toBe(false);
    expect(gapTo(w, w.buildings[0], h.pos)).toBeLessThan(40);
  });

  it('raiders reach a building from outside its footprint and bring it down', () => {
    const w = createWorld(1, data());
    command(w, { kind: 'build', type: 'market', plot: 0 });
    const m = w.buildings.find((b) => b.type === 'market');
    if (!m) throw new Error('no market');
    const id = w.nextId++;
    w.units.push({
      id,
      kind: 'monster',
      type: 'brute',
      tier: 1,
      god: null,
      path: null,
      pos: { x: m.pos.x + 300, y: m.pos.y },
      facing: { x: 0, y: 1 },
      hp: 1e6,
      maxHp: 1e6,
      target: null,
      ko: false,
      mode: 'wander',
      party: 0,
      trait: null,
      gold: 0,
      bounty: null,
    });
    w.unitRuntime.set(id, {
      lair: null,
      raid: true,
      raidId: 5,
      cooldownMs: 0,
      target: null,
      idleMs: 0,
    });
    w.raidActive.push(5);
    run(w, 15_000);
    expect(w.buildings.some((b) => b.id === m.id)).toBe(false);
  });
});
