import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 2000, height: 1200 },
  townHall: { x: 1800, y: 1100 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 6, sta: 10 },
      weapon: { baseAttackS: 1.5, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 2, sta: 30 },
      weapon: { baseAttackS: 2, range: 40 },
      bounty: 1,
      xp: 1,
    },
  ],
  lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1, maxAlive: 1, hp: 100_000 }],
  lairSites: [{ lair: 'barrow', pos: { x: 200, y: 200 } }],
  tuning: { town: { raidFirstMs: 10_000_000 } },
};

// Runs the world a tick at a time and records every event with its time.
function record(w: ReturnType<typeof createWorld>, ms: number) {
  const out: { t: number; e: SimEvent }[] = [];
  for (let i = 0; i < ms / TICK_MS; i++) {
    step(w, TICK_MS);
    for (const e of snapshot(w).events) out.push({ t: w.timeMs, e });
  }
  return out;
}

describe('windup', () => {
  it('every hit is announced by a windup inMs earlier, same attacker and target', () => {
    const w = createWorld(1, data);
    step(w, 1_100);
    spawnHero(w, 'warrior', { x: 240, y: 200 });
    const log = record(w, 20_000);
    const hits = log.filter((x) => x.e.kind === 'hit');
    expect(hits.length).toBeGreaterThan(2);
    for (const h of hits) {
      if (h.e.kind !== 'hit') continue;
      const hit = h.e;
      const wind = log
        .filter((x) => x.e.kind === 'windup' && x.t <= h.t)
        .map((x) => x)
        .reverse()
        .find((x) => x.e.kind === 'windup' && x.e.attacker === hit.attacker);
      expect(wind).toBeDefined();
      if (!wind || wind.e.kind !== 'windup') continue;
      expect(wind.e.target).toBe(hit.target);
      expect(h.t - wind.t).toBeGreaterThanOrEqual(wind.e.inMs);
      expect(h.t - wind.t).toBeLessThan(wind.e.inMs + 2 * TICK_MS);
    }
  });

  it('windup lasts 300 ms by default and at most 40% of the attack cycle', () => {
    const w = createWorld(1, data);
    step(w, 1_100);
    spawnHero(w, 'warrior', { x: 240, y: 200 });
    const winds = record(w, 10_000).filter((x) => x.e.kind === 'windup');
    for (const x of winds) {
      if (x.e.kind === 'windup') expect(x.e.inMs).toBeLessThanOrEqual(300);
    }
    const fast = createWorld(1, {
      ...data,
      classes: [
        {
          ...data.classes![0],
          attrs: { ...attrs, dex: 10 },
          weapon: { baseAttackS: 0.4, range: 40 },
        },
      ],
    });
    step(fast, 1_100);
    spawnHero(fast, 'warrior', { x: 240, y: 200 });
    const fastWinds = record(fast, 5_000).filter(
      (x) =>
        x.e.kind === 'windup' && x.e.attacker === fast.units.find((u) => u.kind === 'hero')?.id,
    );
    expect(fastWinds.length).toBeGreaterThan(0);
    for (const x of fastWinds) {
      // 0.4 s base with 10 dex is a 200 ms cycle: windup is 40% of it.
      if (x.e.kind === 'windup') expect(x.e.inMs).toBeCloseTo(80);
    }
  });

  it('the windup length comes from tuning.combat', () => {
    const w = createWorld(1, { ...data, tuning: { ...data.tuning, combat: { windupMs: 100 } } });
    step(w, 1_100);
    spawnHero(w, 'warrior', { x: 240, y: 200 });
    const winds = record(w, 5_000).filter((x) => x.e.kind === 'windup');
    expect(winds.length).toBeGreaterThan(0);
    for (const x of winds) if (x.e.kind === 'windup') expect(x.e.inMs).toBe(100);
  });

  it('an attacker stands still during the windup', () => {
    const w = createWorld(1, data);
    step(w, 1_100);
    const id = spawnHero(w, 'warrior', { x: 240, y: 200 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('setup');
    let checked = 0;
    for (let i = 0; i < 400; i++) {
      step(w, TICK_MS);
      const rt = w.unitRuntime.get(id);
      if (rt?.swing) {
        const at = { ...hero.pos };
        step(w, TICK_MS);
        if (w.unitRuntime.get(id)?.swing) {
          expect(hero.pos).toEqual(at);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('a swing whose target dies or goes away never lands', () => {
    const w = createWorld(1, data);
    step(w, 1_100);
    const id = spawnHero(w, 'warrior', { x: 240, y: 200 });
    let swung = false;
    for (let i = 0; i < 200 && !swung; i++) {
      step(w, TICK_MS);
      swung = !!w.unitRuntime.get(id)?.swing;
    }
    expect(swung).toBe(true);
    const mon = w.units.find((u) => u.kind === 'monster');
    if (!mon) throw new Error('setup');
    snapshot(w);
    mon.hp = 0; // the target is gone before the strike lands
    step(w, 600);
    const events = snapshot(w).events;
    expect(events.some((e) => e.kind === 'hit' && e.attacker === id && e.target === mon.id)).toBe(
      false,
    );
  });

  it('lairs and buildings get windups too', () => {
    const w = createWorld(1, {
      ...data,
      lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 100_000, maxAlive: 1, hp: 100_000 }],
    });
    spawnHero(w, 'warrior', { x: 230, y: 200 });
    const log = record(w, 3_000);
    const lair = w.lairs[0];
    expect(log.some((x) => x.e.kind === 'windup' && x.e.target === lair.id)).toBe(true);
    expect(log.some((x) => x.e.kind === 'hit' && x.e.target === lair.id)).toBe(true);

    const raided = createWorld(1, {
      ...data,
      lairSites: [{ lair: 'barrow', pos: { x: 1750, y: 1100 } }],
      lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 100_000, maxAlive: 1, hp: 100 }],
      tuning: { town: { raidFirstMs: 500, raidEveryMs: 1_000_000, raidSize: 1 } },
    });
    const raidLog = record(raided, 6_000);
    const hall = raided.buildings[0];
    expect(raidLog.some((x) => x.e.kind === 'windup' && x.e.target === hall.id)).toBe(true);
    expect(raidLog.some((x) => x.e.kind === 'hit' && x.e.target === hall.id)).toBe(true);
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const w = createWorld(seed, data);
      step(w, 1_100);
      spawnHero(w, 'warrior', { x: 240, y: 200 });
      return JSON.stringify(record(w, 10_000));
    };
    expect(run(4)).toBe(run(4));
  });
});
