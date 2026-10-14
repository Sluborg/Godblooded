import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (extraMonster: object = {}): GameData => ({
  buildings: [{ id: 'tower', cost: 80 }],
  plots: [{ x: 700, y: 500 }],
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
      ...extraMonster,
    },
  ],
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1000, maxAlive: 1, hp: 60 }],
  lairSites: [
    { lair: 'barrow', pos: { x: 1000, y: 500 } },
    { lair: 'barrow', pos: { x: 2300, y: 1100 } },
  ],
  tuning: {
    nodes: { enabled: true },
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

function setup(extraMonster: object = {}): { w: W; node: number; gatherer: number } {
  const w = createWorld(1, data(extraMonster));
  step(w, 1000);
  const first = w.lairs[0].id;
  spawnHero(w, 'warrior', { x: w.lairs[0].pos.x - 60, y: w.lairs[0].pos.y });
  for (let t = 0; t < 60_000 && w.lairs.some((l) => l.id === first); t += TICK_MS) step(w, TICK_MS);
  for (const l of w.lairs) l.hp = l.maxHp = 1e12;
  w.units = w.units.filter((u) => u.kind !== 'hero');
  const node = snapshot(w).nodes.find((n) => n.state === 'freed');
  if (!node) throw new Error('no freed node');
  command(w, { kind: 'build', type: 'tower', plot: 0 });
  const gatherer = (command(w, { kind: 'hireGatherer' }) as { id: number }).id;
  return { w, node: node.id, gatherer };
}

function monster(w: W, x: number, y: number, hp = 1e6): UnitState {
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
  w.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  return u;
}

const guards = (w: W) => w.units.filter((u) => u.kind === 'guard' && u.hp > 0);
const get = (w: W, id: number) => {
  const u = w.units.find((x) => x.id === id);
  if (!u) throw new Error('gone');
  return u;
};

describe('guards', () => {
  it('cost gold, need a tower with a free guard, and one per gatherer', () => {
    const { w, gatherer } = setup();
    const gold = w.gold;
    expect(command(w, { kind: 'sendGuard', unit: gatherer }).ok).toBe(true);
    expect(w.gold).toBe(gold - 15);
    expect(command(w, { kind: 'sendGuard', unit: gatherer })).toMatchObject({
      reason: 'already guarded',
    });
    const other = (command(w, { kind: 'hireGatherer' }) as { id: number }).id;
    expect(command(w, { kind: 'sendGuard', unit: other })).toMatchObject({
      reason: 'no guard to lend',
    });
    const w2 = createWorld(1, data());
    expect(command(w2, { kind: 'sendGuard', unit: 1 }).ok).toBe(false);
  });

  it('walk beside the gatherer and go home when its trip is over', () => {
    const { w, node, gatherer } = setup();
    command(w, { kind: 'sendGatherer', node });
    const g = (command(w, { kind: 'sendGuard', unit: gatherer }) as { id: number }).id;
    run(w, 12_000);
    const near = Math.hypot(
      get(w, g).pos.x - get(w, gatherer).pos.x,
      get(w, g).pos.y - get(w, gatherer).pos.y,
    );
    expect(near).toBeLessThan(120);
    command(w, { kind: 'recallGatherers' });
    const ev = run(w, 60_000);
    expect(ev.some((e) => e.kind === 'guardHome')).toBe(true);
    expect(guards(w)).toHaveLength(0);
    // and the tower has its guard to lend again
    expect(command(w, { kind: 'sendGuard', unit: gatherer }).ok).toBe(true);
  });

  it('fight what comes at the gatherer', () => {
    const { w, node, gatherer } = setup();
    command(w, { kind: 'sendGatherer', node });
    command(w, { kind: 'sendGuard', unit: gatherer });
    run(w, 9_000);
    const at = get(w, gatherer).pos;
    const foe = monster(w, at.x + 60, at.y, 20);
    const ev = run(w, 10_000);
    expect(ev.some((e) => e.kind === 'died' && e.unit === foe.id)).toBe(true);
  });

  it('are replaced by the tower a minute after they fall', () => {
    const { w, node, gatherer } = setup();
    command(w, { kind: 'sendGatherer', node });
    const g = (command(w, { kind: 'sendGuard', unit: gatherer }) as { id: number }).id;
    run(w, 2_000);
    w.pendingDeaths.push({ victim: g, by: 0 });
    get(w, g).hp = 0;
    const ev = run(w, 100);
    expect(ev.some((e) => e.kind === 'guardFell')).toBe(true);
    expect(command(w, { kind: 'sendGuard', unit: gatherer }).ok).toBe(false);
    run(w, 61_000);
    expect(command(w, { kind: 'sendGuard', unit: gatherer }).ok).toBe(true);
  });
});

describe('jars', () => {
  it('a fallen gatherer drops its load; the next gatherer brings it home; it expires', () => {
    const { w, node, gatherer } = setup();
    const second = (command(w, { kind: 'hireGatherer' }) as { id: number }).id;
    command(w, { kind: 'sendGatherer', node });
    // run until the first gatherer carries something
    for (let i = 0; i < 2000; i++) {
      step(w, TICK_MS);
      snapshot(w);
      if (snapshot(w).workers.some((x) => x.carry > 0)) break;
    }
    const carrier = snapshot(w).workers.find((x) => x.carry > 0);
    expect(carrier).toBeTruthy();
    const dead = get(w, carrier?.unit ?? 0);
    w.pendingDeaths.push({ victim: dead.id, by: 0 });
    dead.hp = 0;
    const ev = run(w, 100);
    const drop = ev.find((e) => e.kind === 'jarDropped');
    expect(drop).toMatchObject({ amount: 20 });
    expect(snapshot(w).jars).toHaveLength(1);
    // the other gatherer walks over and takes it home
    const other = carrier?.unit === gatherer ? second : gatherer;
    const jar = snapshot(w).jars[0];
    get(w, other).pos = { x: jar.pos.x + 10, y: jar.pos.y };
    const after = run(w, 30_000);
    expect(after.some((e) => e.kind === 'jarTaken')).toBe(true);
    expect(snapshot(w).ambrosia).toBeGreaterThanOrEqual(20);
    // an unclaimed jar goes away after jarMs
    const lone = createWorld(1, data());
    lone.jars.push({ id: 99, pos: { x: 5, y: 5 }, amount: 7, untilMs: 30_000 });
    run(lone, 31_000);
    expect(lone.jars).toHaveLength(0);
  });

  it('a snatching monster takes a carried jar and drops it when it falls', () => {
    const { w, node } = setup({ quirk: { stealGold: 2 } });
    command(w, { kind: 'sendGatherer', node });
    for (let i = 0; i < 2000; i++) {
      step(w, TICK_MS);
      snapshot(w);
      if (snapshot(w).workers.some((x) => x.carry > 0)) break;
    }
    const carrier = snapshot(w).workers.find((x) => x.carry > 0);
    const victim = get(w, carrier?.unit ?? 0);
    // stand it still (waiting at the node with its jar) so the thief can reach it
    const wk = w.unitRuntime.get(victim.id)?.worker;
    if (wk) Object.assign(wk, { phase: 'gather', untilMs: 1e12 });
    const thief = monster(w, victim.pos.x + 30, victim.pos.y, 1e6);
    victim.hp = 1e6;
    victim.maxHp = 1e6;
    const ev = run(w, 5_000);
    expect(ev.some((e) => e.kind === 'jarStolen' && e.thief === thief.id)).toBe(true);
    expect(w.unitRuntime.get(thief.id)?.jar).toBe(20);
    w.pendingDeaths.push({ victim: thief.id, by: 0 });
    thief.hp = 0;
    const after = run(w, 100);
    expect(after.some((e) => e.kind === 'jarDropped' && e.amount === 20)).toBe(true);
  });
});
