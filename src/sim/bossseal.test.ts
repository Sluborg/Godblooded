import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

function mk(boss: object = {}): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 3800, y: 3800 },
    classes: [{ id: 'knight', attrs: { ...none, str: 20, sta: 60, per: 5 }, weapon, startGold: 0 }],
    monsters: [
      {
        id: 'wyrm',
        attrs: { ...none, str: 5, sta: 5 },
        weapon,
        bounty: 1,
        xp: 1,
        boss: {},
        hp: 500,
      },
      { id: 'imp', attrs: { ...none, str: 1, sta: 1 }, weapon, bounty: 1, xp: 1 },
    ],
    lairs: [
      { id: 'wyrm-nest', monster: 'wyrm', spawnS: 100_000, maxAlive: 0, hp: 1000, escort: 'imp' },
      { id: 'den', monster: 'imp', spawnS: 100_000, maxAlive: 0, hp: 30 },
      { id: 'den2', monster: 'imp', spawnS: 100_000, maxAlive: 0, hp: 30 },
    ],
    lairSites: [
      { lair: 'wyrm-nest', pos: { x: 500, y: 500 } },
      { lair: 'den', pos: { x: 3000, y: 500 } },
      { lair: 'den2', pos: { x: 3000, y: 1500 } },
    ],
    tuning: {
      combat: { critK: 1e9, dodgeK: 1e9 },
      hero: { firstRecruitMs: 10_000_000 },
      town: { raidFirstMs: 10_000_000 },
      lair: { tierUpEveryMs: 0 },
      boss: boss as never,
    },
  };
}

type W = ReturnType<typeof createWorld>;

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const nest = (w: W) => w.lairs.find((l) => l.type === 'wyrm-nest')!;

describe('sealed boss lair', () => {
  it('cannot be attacked, and shows as sealed in the snapshot', () => {
    const w = createWorld(1, mk());
    const id = spawnHero(w, 'knight', { x: 480, y: 500 });
    const h = w.units.find((u) => u.id === id)!;
    h.mode = 'explore';
    run(w, 10_000);
    expect(nest(w).hp).toBe(nest(w).maxHp);
    expect(snapshot(w).map.sealed).toBe(true);
  });

  it('breaks at the set run time, with an event', () => {
    const w = createWorld(1, mk({ sealUntilMs: 5_000 }));
    expect(run(w, 4_000).some((e) => e.kind === 'bossLairUnsealed')).toBe(false);
    const ev = run(w, 2_000);
    expect(ev.filter((e) => e.kind === 'bossLairUnsealed')).toEqual([
      { kind: 'bossLairUnsealed', lair: nest(w).id, by: 'time' },
    ]);
    expect(snapshot(w).map.sealed).toBe(false);
    // once only
    expect(run(w, 1_000).some((e) => e.kind === 'bossLairUnsealed')).toBe(false);
  });

  it('breaks after two other lairs have fallen', () => {
    const w = createWorld(1, mk());
    w.stats.lairsDestroyed = 1;
    expect(run(w, 200).some((e) => e.kind === 'bossLairUnsealed')).toBe(false);
    w.stats.lairsDestroyed = 2;
    const ev = run(w, 200);
    expect(ev).toContainEqual({ kind: 'bossLairUnsealed', lair: nest(w).id, by: 'lairs' });
  });

  it('once unsealed the lair can be attacked', () => {
    const w = createWorld(1, mk({ sealUntilMs: 1_000 }));
    const id = spawnHero(w, 'knight', { x: 480, y: 500 });
    const h = w.units.find((u) => u.id === id)!;
    h.mode = 'explore';
    run(w, 6_000);
    expect(nest(w).hp).toBeLessThan(nest(w).maxHp);
  });
});

describe('sealed lair details', () => {
  it('a flag next to a sealed boss lair is not taken until it opens', () => {
    const w = createWorld(1, mk({ sealUntilMs: 5_000 }));
    const id = spawnHero(w, 'knight', { x: 600, y: 500 });
    const h = w.units.find((u) => u.id === id)!;
    h.mode = 'explore';
    w.bounties.push({ id: w.nextId++, pos: { x: 520, y: 500 }, gold: 500 } as never);
    run(w, 3_000);
    expect(w.heroRuntime.get(id)?.bounty).toBeUndefined();
    run(w, 3_000);
    expect(snapshot(w).map.sealed).toBe(false);
  });

  it('a save with the boss already out never reseals', () => {
    const w = createWorld(1, mk());
    const lrt = w.lairRuntime.get(nest(w).id)!;
    lrt.bossSpawned = true;
    const ev = run(w, 200);
    expect(snapshot(w).map.sealed).toBe(false);
    expect(ev.some((e) => e.kind === 'bossLairUnsealed')).toBe(false);
  });
});
