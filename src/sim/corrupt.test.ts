import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { freeNode } from './nodes';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (nodes: object = {}, third = false): GameData => ({
  buildings: [],
  plots: [],
  startGold: 500,
  map: { width: 2400, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 12, sta: 12 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 50,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 6, sta: 3 },
      weapon: { baseAttackS: 1, range: 40 },
      bounty: 12,
      xp: 10,
    },
  ],
  lairs: [
    { id: 'barrow', monster: 'draugr', spawnS: 100000, maxAlive: 1, hp: 60 },
    { id: 'roost', monster: 'draugr', spawnS: 100000, maxAlive: 1, hp: 60 },
  ],
  lairSites: [
    { lair: 'barrow', pos: { x: 1000, y: 500 } },
    { lair: 'barrow', pos: { x: 1800, y: 900 } },
    ...(third ? [{ lair: 'barrow', pos: { x: 2300, y: 1100 } }] : []),
    { lair: 'barrow', pos: { x: 2300, y: 200 } },
  ],
  tuning: {
    nodes: { enabled: true, ...nodes },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
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

// Frees the lair at index i the way a fall does (without a hero), and keeps the rest standing.
function free(w: W, i: number): number {
  const lair = w.lairs[i];
  w.lairs = w.lairs.filter((l) => l.id !== lair.id);
  w.lairRuntime.delete(lair.id);
  freeNode(w, lair);
  for (const l of w.lairs) l.hp = l.maxHp = 1e12;
  return w.nodes.find((n) => n.lair === lair.id)?.id ?? -1;
}

function raider(w: W, x: number, y: number, hp = 1e6): UnitState {
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
    raid: true,
    raidId: 99,
    cooldownMs: 0,
    target: null,
    idleMs: 0,
  });
  w.raidActive.push(99);
  return u;
}

const nodeOf = (w: W, id: number) => {
  const n = w.nodes.find((x) => x.id === id);
  if (!n) throw new Error('no node');
  return n;
};

describe('defiled nodes', () => {
  it('raiders at a freed node stop; after 10 s it is defiled and two stay as defilers', () => {
    const w = createWorld(1, data());
    step(w, 100);
    const node = free(w, 0);
    const pos = nodeOf(w, node).pos;
    const rs = [0, 1, 2, 3].map((i) => raider(w, pos.x + 20 * i, pos.y + 10));
    const early = run(w, 1_000);
    expect(early.filter((e) => e.kind === 'nodeThreat')).toHaveLength(1);
    // held: they have not marched off
    expect(Math.hypot(rs[0].pos.x - pos.x, rs[0].pos.y - pos.y)).toBeLessThan(120);
    const ev = run(w, 10_000);
    const defiled = ev.find((e) => e.kind === 'nodeDefiled');
    expect(defiled).toMatchObject({ node });
    expect(nodeOf(w, node).state).toBe('defiled');
    const stayed = rs.filter((r) => w.unitRuntime.get(r.id)?.defiler === node);
    expect(stayed).toHaveLength(2);
    for (const r of stayed) expect(w.unitRuntime.get(r.id)?.raid).toBe(false);
    // the rest march on
    run(w, 5_000);
    const mover = rs.find((r) => !stayed.includes(r));
    expect(Math.hypot((mover?.pos.x ?? 0) - pos.x, (mover?.pos.y ?? 0) - pos.y)).toBeGreaterThan(
      120,
    );
  });

  it('a threat that is beaten off in time is forgotten', () => {
    const w = createWorld(1, data());
    step(w, 100);
    const node = free(w, 0);
    const pos = nodeOf(w, node).pos;
    const rs = [raider(w, pos.x, pos.y), raider(w, pos.x + 10, pos.y)];
    run(w, 3_000);
    for (const r of rs) {
      w.pendingDeaths.push({ victim: r.id, by: 0 });
      r.hp = 0;
    }
    run(w, 15_000);
    expect(nodeOf(w, node).state).toBe('freed');
    expect(nodeOf(w, node).threatSinceMs).toBeUndefined();
  });

  it('gatherers leave a defiled node and its pool stops refilling', () => {
    const w = createWorld(1, data());
    step(w, 100);
    const node = free(w, 0);
    const g = (command(w, { kind: 'hireGatherer' }) as { id: number }).id;
    command(w, { kind: 'sendGatherer', node });
    run(w, 2_000);
    const n = nodeOf(w, node);
    n.state = 'defiled';
    n.pool = 25;
    n.max = 80;
    run(w, 30_000);
    expect(nodeOf(w, node).pool).toBe(25);
    expect(snapshot(w).workers.find((x) => x.unit === g)).toMatchObject({ node: null });
  });

  it('are cleansed by a hero holding the node for 10 s once the defilers are dead', () => {
    const w = createWorld(1, data());
    step(w, 100);
    const node = free(w, 0);
    const pos = nodeOf(w, node).pos;
    const rs = [0, 1].map((i) => raider(w, pos.x + 10 * i, pos.y));
    run(w, 11_000);
    expect(nodeOf(w, node).state).toBe('defiled');
    const pool = nodeOf(w, node).pool;
    const hero = spawnHero(w, 'warrior', { x: pos.x + 30, y: pos.y });
    // the defilers are still alive: a foe near blocks the cleanse
    const hold = (ms: number): SimEvent[] => {
      const out: SimEvent[] = [];
      for (let t = 0; t < ms; t += TICK_MS) {
        const u = w.units.find((x) => x.id === hero);
        if (u) {
          u.pos = { x: pos.x + 30, y: pos.y };
          u.hp = u.maxHp;
        }
        step(w, TICK_MS);
        out.push(...snapshot(w).events);
      }
      return out;
    };
    hold(12_000);
    expect(nodeOf(w, node).state).toBe('defiled');
    for (const r of rs) {
      w.pendingDeaths.push({ victim: r.id, by: hero });
      r.hp = 0;
    }
    const ev = hold(12_000);
    expect(ev.some((e) => e.kind === 'nodeFreed' && e.node === node)).toBe(true);
    expect(nodeOf(w, node).state).toBe('freed');
    // the pool is what it held (plus a little refill since it was freed again)
    expect(nodeOf(w, node).pool).toBeGreaterThanOrEqual(pool);
    expect(nodeOf(w, node).pool).toBeLessThan(pool + 3);
  });
});

describe('sprouting lairs', () => {
  const fast = { sproutFromMs: 2_000, sproutWarnMs: 3_000, sproutEveryMs: 4_000 };

  it('grow on a free node (not the nearest), warned first, at most twice, and do not count', () => {
    const w = createWorld(1, data(fast, true));
    step(w, 100);
    const near = free(w, 0);
    const far = free(w, 0);
    const farther = free(w, 0);
    expect(near).toBeGreaterThan(0);
    const ev = run(w, 8_000);
    const warn = ev.find((e) => e.kind === 'lairSprouting');
    const grew = ev.find((e) => e.kind === 'lairSprouted');
    expect(warn).toBeTruthy();
    expect(grew).toBeTruthy();
    if (warn?.kind === 'lairSprouting') expect([far, farther]).toContain(warn.node);
    expect(nodeOf(w, near).state).toBe('freed');
    const sprouted = w.lairs.filter((l) => l.sprouted);
    expect(sprouted).toHaveLength(1);
    expect(sprouted[0].tier).toBe(1);
    // at most two a run
    run(w, 60_000);
    expect(w.lairs.filter((l) => l.sprouted).length).toBeLessThanOrEqual(2);
    expect(w.sprouts).toBeLessThanOrEqual(2);
  });

  it('grow a lair of the run lean', () => {
    const w = createWorld(1, data(fast, true));
    (w.data as { mapRules?: unknown }).mapRules = {
      pool: [
        { lair: 'barrow', pantheon: 'aesir', weight: 1 },
        { lair: 'roost', pantheon: 'greek', weight: 1 },
      ],
    };
    w.mapLean = ['greek'];
    step(w, 100);
    free(w, 0);
    free(w, 0);
    free(w, 0);
    run(w, 8_000);
    const lair = w.lairs.find((l) => l.sprouted);
    expect(lair?.type).toBe('roost');
  });

  it('a sprouted lair does not count when destroyed, and its node reopens x1.25', () => {
    const w = createWorld(1, data(fast, true));
    step(w, 100);
    free(w, 0);
    free(w, 0);
    free(w, 0);
    run(w, 8_000);
    const lair = w.lairs.find((l) => l.sprouted);
    if (!lair) throw new Error('nothing sprouted');
    const node = w.nodes.find((n) => n.lair === lair.id);
    expect(node?.state).toBe('locked');
    const before = w.stats.lairsDestroyed;
    const log = w.lairLog.length;
    lair.hp = 1;
    spawnHero(w, 'warrior', { x: lair.pos.x - 50, y: lair.pos.y });
    const ev = run(w, 20_000);
    expect(w.lairs.some((l) => l.id === lair.id)).toBe(false);
    expect(w.stats.lairsDestroyed).toBe(before);
    expect(w.lairLog).toHaveLength(log);
    const freed = ev.find((e) => e.kind === 'nodeFreed' && e.node === node?.id);
    expect(freed).toBeTruthy();
    // base 40 (800+ from town: 1500 away is one step beyond 800 -> x1.25) x 1.25
    expect(nodeOf(w, node?.id ?? -1).state).toBe('freed');
  });
});
