import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData } from './api';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const data = (buildMs: number): GameData => ({
  buildings: [
    { id: 'temple_aesir', cost: 100 },
    { id: 'tower', cost: 60 },
  ],
  plots: [
    { x: 700, y: 500 },
    { x: 800, y: 500 },
  ],
  startGold: 2000,
  map: { width: 2000, height: 1000 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 5, sta: 20 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  gods: [{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' }],
  tuning: {
    hero: { firstRecruitMs: 1_000, recruitMs: 10_000 },
    town: { raidFirstMs: 10_000_000, buildMs, hallTiers: false },
  },
});

const run = (w: ReturnType<typeof createWorld>, ms: number) => {
  for (let t = 0; t < ms; t += TICK_MS) step(w, TICK_MS);
};
const heroes = (w: ReturnType<typeof createWorld>) => w.units.filter((u) => u.kind === 'hero');

describe('build and upgrade time', () => {
  it('is instant by default', () => {
    const w = createWorld(1, data(0));
    command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    expect(w.buildings.find((b) => b.type === 'temple_aesir')?.buildUntilMs).toBeUndefined();
    run(w, 3_000);
    expect(heroes(w).length).toBeGreaterThan(0);
  });

  it('a new building does not work until it is built', () => {
    const w = createWorld(1, data(5_000));
    command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    run(w, 4_000);
    expect(heroes(w)).toHaveLength(0);
    expect(snapshot(w).buildings.find((b) => b.type === 'temple_aesir')?.upgradeCost).toBeNull();
    run(w, 3_000);
    expect(snapshot(w).events.some((e) => e.kind === 'finished')).toBe(true);
    run(w, 3_000);
    expect(heroes(w).length).toBeGreaterThan(0);
  });

  it('an upgrade pays now, works at the old tier, and lands after buildMs', () => {
    const w = createWorld(1, data(5_000));
    const r = command(w, { kind: 'build', type: 'tower', plot: 0 });
    run(w, 6_000);
    const b = w.buildings.find((x) => x.type === 'tower');
    if (!b || !r.ok) throw new Error('setup');
    const gold = w.gold;
    expect(command(w, { kind: 'upgrade', building: b.id }).ok).toBe(true);
    expect(w.gold).toBeLessThan(gold);
    expect(b.tier).toBe(1);
    expect(command(w, { kind: 'upgrade', building: b.id })).toMatchObject({ ok: false });
    run(w, 4_000);
    expect(b.tier).toBe(1);
    run(w, 2_000);
    expect(b.tier).toBe(2);
    expect(b.upgradeUntilMs).toBeUndefined();
  });

  it('cannot upgrade while it is still being built', () => {
    const w = createWorld(1, data(5_000));
    const r = command(w, { kind: 'build', type: 'tower', plot: 0 });
    expect(r.ok && command(w, { kind: 'upgrade', building: r.id })).toMatchObject({ ok: false });
  });

  it('a rebuilt ruin has a scaffold too', () => {
    const w = createWorld(1, {
      ...data(5_000),
      tuning: {
        ...data(5_000).tuning,
        town: { raidFirstMs: 10_000_000, buildMs: 5_000, hallTiers: false, ruins: true },
      },
    });
    const r = command(w, { kind: 'build', type: 'tower', plot: 0 });
    run(w, 6_000);
    const b = w.buildings.find((x) => r.ok && x.id === r.id);
    if (!b) throw new Error('setup');
    // knock it down by hand into a ruin
    w.buildings = w.buildings.filter((x) => x.id !== b.id);
    w.ruins.push({ id: w.nextId++, type: 'tower', plot: 0, pos: { ...b.pos } } as never);
    const ruin = w.ruins[0];
    const res = command(w, { kind: 'rebuildRuin', ruin: ruin.id });
    expect(res.ok).toBe(true);
    const nb = w.buildings.find((x) => x.type === 'tower');
    expect(nb?.buildUntilMs).toBeGreaterThan(w.timeMs);
  });
});
