import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { loadWorld, saveWorld } from './save';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (nodes: object = { enabled: true }): GameData => ({
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
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1000, maxAlive: 1, hp: 60 }],
  lairSites: [
    { lair: 'barrow', pos: { x: 1000, y: 500 } },
    { lair: 'barrow', pos: { x: 2300, y: 1100 } },
  ],
  tuning: { nodes, hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
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

// A world with one freed node (the other lair stands); returns the node id.
function freed(nodes: object = { enabled: true }): { w: W; node: number } {
  const w = createWorld(1, data(nodes));
  step(w, 1000);
  const first = w.lairs[0].id;
  spawnHero(w, 'warrior', { x: w.lairs[0].pos.x - 60, y: w.lairs[0].pos.y });
  for (let t = 0; t < 60_000 && w.lairs.some((l) => l.id === first); t += TICK_MS) step(w, TICK_MS);
  for (const l of w.lairs) l.hp = l.maxHp = 1e12;
  // the hero has done its job
  w.units = w.units.filter((u) => u.kind !== 'hero');
  const node = snapshot(w).nodes.find((n) => n.state === 'freed');
  if (!node) throw new Error('no freed node');
  return { w, node: node.id };
}

const workers = (w: W) => w.units.filter((u) => u.kind === 'worker');

describe('gatherers', () => {
  it('cannot be hired while nodes are off', () => {
    const w = createWorld(1, data({}));
    expect(command(w, { kind: 'hireGatherer' }).ok).toBe(false);
  });

  it('cost gold, and the town hall tier caps them', () => {
    const { w } = freed();
    const gold = w.gold;
    expect(command(w, { kind: 'hireGatherer' }).ok).toBe(true);
    expect(w.gold).toBe(gold - 30);
    expect(command(w, { kind: 'hireGatherer' }).ok).toBe(true);
    expect(command(w, { kind: 'hireGatherer' })).toMatchObject({
      ok: false,
      reason: 'gatherer cap',
    });
    expect(snapshot(w).gathererCap).toBe(2);
    const hall = w.buildings.find((b) => b.type === 'townhall');
    if (hall) hall.tier = 2;
    expect(command(w, { kind: 'hireGatherer' }).ok).toBe(true);
  });

  it('need a freed node and an idle gatherer to be sent', () => {
    const { w, node } = freed();
    expect(command(w, { kind: 'sendGatherer', node })).toMatchObject({ ok: false });
    command(w, { kind: 'hireGatherer' });
    const locked = snapshot(w).nodes.find((n) => n.state === 'locked');
    expect(command(w, { kind: 'sendGatherer', node: locked?.id ?? -1 }).ok).toBe(false);
    expect(command(w, { kind: 'sendGatherer', node }).ok).toBe(true);
    expect(command(w, { kind: 'sendGatherer', node })).toMatchObject({
      reason: 'no idle gatherer',
    });
  });

  it('walk out, gather, carry the load home and go again', () => {
    const { w, node } = freed();
    command(w, { kind: 'hireGatherer' });
    command(w, { kind: 'sendGatherer', node });
    const pool = snapshot(w).nodes.find((n) => n.id === node)?.pool ?? 0;
    const ev = run(w, 60_000);
    const homes = ev.filter((e) => e.kind === 'jarHome');
    expect(homes.length).toBeGreaterThanOrEqual(2);
    expect(homes[0]).toMatchObject({ amount: 20 });
    expect(snapshot(w).ambrosia).toBeGreaterThanOrEqual(40);
    // the pool fell by what was carried (it also refills a little)
    const now = snapshot(w).nodes.find((n) => n.id === node)?.pool ?? 0;
    expect(now).toBeLessThan(pool);
  });

  it('can be recalled: the load still comes home, then they wait at the hall', () => {
    const { w, node } = freed();
    command(w, { kind: 'hireGatherer' });
    command(w, { kind: 'sendGatherer', node });
    run(w, 14_000);
    expect(command(w, { kind: 'recallGatherers', node }).ok).toBe(true);
    run(w, 40_000);
    const info = snapshot(w).workers[0];
    expect(info).toMatchObject({ node: null, phase: 'idle', carry: 0 });
    expect(command(w, { kind: 'recallGatherers' }).ok).toBe(false);
  });

  it('run home when hit and heal at the hall', () => {
    const { w, node } = freed();
    const id = (command(w, { kind: 'hireGatherer' }) as { id: number }).id;
    command(w, { kind: 'sendGatherer', node });
    run(w, 5_000);
    const u = w.units.find((x) => x.id === id);
    if (!u) throw new Error('gone');
    u.hp = 10;
    const ev = run(w, 50);
    expect(ev.some((e) => e.kind === 'workerHit')).toBe(true);
    expect(snapshot(w).workers[0]).toMatchObject({ phase: 'back', fleeing: true });
    run(w, 30_000);
    expect(u.hp).toBeGreaterThan(10);
  });

  it('can be made to heal before going out again', () => {
    const { w, node } = freed({ enabled: true, returnAtHp: 0.9 });
    const id = (command(w, { kind: 'hireGatherer' }) as { id: number }).id;
    command(w, { kind: 'sendGatherer', node });
    run(w, 5_000);
    const u = w.units.find((x) => x.id === id);
    if (!u) throw new Error('gone');
    u.hp = 10;
    run(w, 100);
    for (let i = 0; i < 1000 && u.hp < u.maxHp * 0.9; i++) {
      step(w, TICK_MS);
      if (u.hp < u.maxHp * 0.9) expect(snapshot(w).workers[0].phase).not.toBe('out');
    }
    expect(u.hp).toBeGreaterThanOrEqual(u.maxHp * 0.9);
  });

  it('die for good when a foe kills them', () => {
    const { w, node } = freed();
    const id = (command(w, { kind: 'hireGatherer' }) as { id: number }).id;
    command(w, { kind: 'sendGatherer', node });
    run(w, 3_000);
    const u = w.units.find((x) => x.id === id);
    if (!u) throw new Error('gone');
    w.pendingDeaths.push({ victim: id, by: 0 });
    u.hp = 0;
    const ev = run(w, 100);
    expect(ev.some((e) => e.kind === 'workerFell')).toBe(true);
    expect(workers(w)).toHaveLength(0);
  });

  it('keep their trip through a save and load', () => {
    const { w, node } = freed();
    command(w, { kind: 'hireGatherer' });
    command(w, { kind: 'sendGatherer', node });
    run(w, 9_000);
    const back = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data());
    expect(snapshot(back).workers).toEqual(snapshot(w).workers);
    run(w, 30_000);
    run(back, 30_000);
    expect(snapshot(back).ambrosia).toBe(snapshot(w).ambrosia);
  });
});
