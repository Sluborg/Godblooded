import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData } from './api';
import { loadWorld, migrateSave, saveWorld } from './save';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (nodes: object = { enabled: true }, lairX = 1000): GameData => ({
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
    { lair: 'barrow', pos: { x: lairX, y: 500 } },
    { lair: 'barrow', pos: { x: 2300, y: 1100 } },
  ],
  tuning: { nodes },
});

type W = ReturnType<typeof createWorld>;

function fell(w: W): void {
  const lair = w.lairs[0];
  const id = lair.id;
  spawnHero(w, 'warrior', { x: lair.pos.x - 60, y: lair.pos.y });
  for (let t = 0; t < 60_000 && w.lairs.some((l) => l.id === id); t += TICK_MS) step(w, TICK_MS);
}

describe('celestial nodes', () => {
  it('are off by default: no nodes, no events', () => {
    const w = createWorld(1, data({}));
    step(w, 1000);
    fell(w);
    expect(snapshot(w).nodes).toHaveLength(0);
    expect(snapshot(w).events.some((e) => e.kind === 'nodeFreed')).toBe(false);
  });

  it('sit locked under a standing lair', () => {
    const w = createWorld(1, data());
    step(w, 1000);
    const [n] = snapshot(w).nodes;
    expect(n.state).toBe('locked');
    expect(n.pool).toBe(0);
    expect(n.pos).toEqual(w.lairs[0].pos);
  });

  it('are freed with the opening pool when the lair falls', () => {
    const w = createWorld(1, data());
    step(w, 1000);
    fell(w);
    const s = snapshot(w);
    const ev = s.events.find((e) => e.kind === 'nodeFreed');
    expect(ev).toMatchObject({ kind: 'nodeFreed', pool: 40 });
    expect(s.nodes[0]).toMatchObject({ state: 'freed', max: 80 });
    expect(s.nodes[0].pool).toBeGreaterThanOrEqual(40);
  });

  it('refill slowly and stop at the max', () => {
    const w = createWorld(1, data({ enabled: true, regenPerMin: 60 }));
    step(w, 1000);
    fell(w);
    for (const l of w.lairs) l.hp = l.maxHp = 1e12; // the other lair stands, the run goes on
    const before = snapshot(w).nodes[0].pool;
    for (let i = 0; i < 10; i++) step(w, 6000 - (6000 % TICK_MS));
    expect(snapshot(w).nodes[0].pool).toBeGreaterThan(before);
    for (let i = 0; i < 60; i++) step(w, 20_000);
    expect(snapshot(w).nodes[0].pool).toBe(80);
  });

  it('hold more far from town and under a harder lair', () => {
    // 1700 is 1100 from the hall: one full 400 beyond 600, so x1.25.
    const far = createWorld(1, data({ enabled: true }, 1700));
    step(far, 1000);
    fell(far);
    expect(snapshot(far).nodes[0]).toMatchObject({ max: 100 });
    const hard = createWorld(1, data());
    step(hard, 1000);
    hard.lairs[0].tier = 3;
    fell(hard);
    expect(snapshot(hard).nodes[0]).toMatchObject({ max: 120 });
  });

  it('are not made for a boss lair', () => {
    const w = createWorld(1, data());
    w.lairs[0].boss = true;
    step(w, 1000);
    const boss = w.lairs[0].id;
    expect(snapshot(w).nodes.some((n) => n.lair === boss)).toBe(false);
    expect(snapshot(w).nodes).toHaveLength(1);
  });

  it('survive a save and load, and an old save gets none', () => {
    const w = createWorld(1, data());
    step(w, 1000);
    fell(w);
    const back = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data());
    expect(back.nodes).toEqual(w.nodes);
    const old = { ...saveWorld(w), version: 5 };
    delete (old.world as Record<string, unknown>).nodes;
    delete (old.world as Record<string, unknown>).ambrosia;
    const up = migrateSave(old);
    expect(up.world.nodes).toEqual([]);
    expect(up.world.ambrosia).toBe(0);
  });
});
