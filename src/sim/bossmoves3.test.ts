import { describe, expect, it } from 'vitest';
import {
  createWorld,
  loadWorld,
  saveWorld,
  snapshot,
  step,
  TICK_MS,
  type GameData,
  type SimEvent,
} from './api';
import { isSwallowed } from './effects';
import { spawnHero } from './world';
import type { BossMove, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };

const MOVES: Record<string, BossMove> = {
  venom: {
    venom: { everyS: 12, enragedEveryS: 8, windupMs: 1000, radius: 60, dotPct: 0.03, s: 8 },
  },
  howl: {
    howl: {
      everyS: 15,
      enragedEveryS: 10,
      windupMs: 800,
      radius: 200,
      belowHp: 0.5,
      fleeS: 3,
      calls: 1,
    },
  },
  riddle: {
    riddle: {
      everyS: 18,
      enragedEveryS: 12,
      windupMs: 1200,
      intAtLeast: 8,
      buff: 0.3,
      buffS: 6,
      stoneS: 3,
    },
  },
  swallow: {
    swallow: { everyS: 15, enragedEveryS: 10, windupMs: 1000, s: 4, dotPct: 0.08, freePct: 0.25 },
  },
  hydra: {
    heads: { count: 3, cutAt: [0.66, 0.33], regrowS: 8, enragedRegrowS: 5, stopType: 'fire' },
  },
};

function mk(move: BossMove, classAttrs: object = {}): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 3800, y: 3800 },
    classes: [
      {
        id: 'knight',
        attrs: { ...none, str: 3, sta: 400, per: 1e6, ...classAttrs },
        weapon: { baseAttackS: 1000, range: 60 },
        startGold: 0,
      },
    ],
    monsters: [
      {
        id: 'wyrm',
        attrs: { ...none, str: 5, sta: 5 },
        weapon: { baseAttackS: 4, range: 70 },
        bounty: 1,
        xp: 1,
        boss: {},
        hp: 10_000,
        move,
      },
      {
        id: 'imp',
        attrs: { ...none, str: 1, sta: 1 },
        weapon: { baseAttackS: 3, range: 40 },
        bounty: 1,
        xp: 1,
      },
    ],
    lairs: [{ id: 'nest', monster: 'wyrm', spawnS: 100_000, maxAlive: 0, hp: 1000, escort: 'imp' }],
    lairSites: [{ lair: 'nest', pos: { x: 500, y: 500 } }],
    tuning: {
      combat: { critK: 1e9, dodgeK: 1e9 },
      hero: { firstRecruitMs: 10_000_000 },
      town: { raidFirstMs: 10_000_000 },
      lair: { tierUpEveryMs: 0 },
      boss: { sealUntilMs: 0, emergeBelow: 2, enrageAt: 0 },
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

function hero(w: W, x: number, y: number, hp = 1e6): UnitState {
  const id = spawnHero(w, 'knight', { x, y });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.mode = 'explore';
  u.maxHp = hp;
  u.hp = hp;
  return u;
}

const TIMED_KEYS = ['venom', 'howl', 'riddle', 'swallow'] as const;

// A saved and reloaded copy of the world carries on exactly as the original does.
function copy(w: W, data: GameData): W {
  return loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data);
}

const sig = (w: W) =>
  JSON.stringify(
    w.units.map((u) => [
      u.id,
      Math.round(u.hp * 1000) / 1000,
      u.ko,
      Math.round(u.pos.x),
      Math.round(u.pos.y),
    ]),
  );

describe('boss moves survive a save', () => {
  it('mid-swallow: the hero is still swallowed, and both worlds play out the same', () => {
    const data = mk(MOVES.swallow);
    const w = createWorld(1, data);
    const a = hero(w, 540, 500);
    run(w, 100);
    for (let i = 0; i < 400 && !isSwallowed(w, a.id); i++) run(w, TICK_MS);
    expect(isSwallowed(w, a.id)).toBe(true);
    const back = copy(w, data);
    expect(isSwallowed(back, a.id)).toBe(true);
    const ea = run(w, 8_000);
    const eb = run(back, 8_000);
    expect(isSwallowed(back, a.id)).toBe(isSwallowed(w, a.id));
    expect(sig(back)).toBe(sig(w));
    expect(eb.map((e) => e.kind)).toEqual(ea.map((e) => e.kind));
  });

  it('mid-windup: an announced move still lands after a reload', () => {
    for (const key of TIMED_KEYS) {
      const data = mk(MOVES[key]);
      const w = createWorld(1, data);
      hero(w, 540, 500);
      run(w, 100);
      let pending = false;
      for (let i = 0; i < 600 && !pending; i++) {
        run(w, TICK_MS);
        pending = !!w.unitRuntime.get(w.units.find((u) => u.type === 'wyrm')?.id ?? -1)?.boss
          ?.pending;
      }
      expect(pending, key).toBe(true);
      const back = copy(w, data);
      const ea = run(w, 12_000);
      const eb = run(back, 12_000);
      expect(sig(back), key).toBe(sig(w));
      expect(
        eb.map((e) => e.kind),
        key,
      ).toEqual(ea.map((e) => e.kind));
    }
  });

  it('mid-cut: a head still growing back grows back after a reload', () => {
    const data = mk(MOVES.hydra);
    const w = createWorld(1, data);
    hero(w, 540, 500);
    run(w, 100);
    const boss = w.units.find((u) => u.type === 'wyrm');
    if (!boss) throw new Error('no boss');
    boss.hp = Math.floor(boss.maxHp * 0.6);
    run(w, 2_000);
    const brt = w.unitRuntime.get(boss.id)?.boss;
    expect(brt?.heads).toBe(2);
    expect(brt?.regrowAtMs).toBeTruthy();
    const back = copy(w, data);
    const bb = back.units.find((u) => u.type === 'wyrm');
    expect(back.unitRuntime.get(bb?.id ?? -1)?.boss?.heads).toBe(2);
    const ea = run(w, 9_000);
    const eb = run(back, 9_000);
    expect(w.unitRuntime.get(boss.id)?.boss?.heads).toBe(3);
    expect(back.unitRuntime.get(bb?.id ?? -1)?.boss?.heads).toBe(3);
    expect(eb.filter((e) => e.kind === 'bossHeads')).toEqual(
      ea.filter((e) => e.kind === 'bossHeads'),
    );
  });
});

describe('enraged timers', () => {
  it('every timed move first fires after its enragedEveryS, not everyS', () => {
    for (const key of TIMED_KEYS) {
      const move = MOVES[key][key] as { everyS: number; enragedEveryS: number };
      const first = (enraged: boolean): number => {
        const w = createWorld(1, mk(MOVES[key]));
        hero(w, 540, 500);
        run(w, 100);
        const boss = w.units.find((u) => u.type === 'wyrm');
        const brt = w.unitRuntime.get(boss?.id ?? -1)?.boss;
        if (!brt || !boss) throw new Error('no boss');
        brt.enraged = enraged;
        const start = w.timeMs;
        for (let i = 0; i < 1000; i++) {
          const ev = run(w, TICK_MS);
          if (ev.some((e) => e.kind === 'windup' && e.move === key))
            return (w.timeMs - start) / 1000;
        }
        return Infinity;
      };
      const calm = first(false);
      const mad = first(true);
      expect(calm, key).toBeGreaterThanOrEqual(move.everyS - 0.2);
      expect(mad, key).toBeGreaterThanOrEqual(move.enragedEveryS - 0.2);
      expect(mad, key).toBeLessThan(move.everyS);
    }
  });
});

describe('Three Heads, the 33% cut', () => {
  it('a second cut at 33% leaves one head, and both grow back in turn', () => {
    const w = createWorld(1, mk(MOVES.hydra));
    hero(w, 540, 500);
    run(w, 100);
    const boss = w.units.find((u) => u.type === 'wyrm');
    if (!boss) throw new Error('no boss');
    boss.hp = Math.floor(boss.maxHp * 0.3);
    const ev = run(w, 20_000);
    const heads = ev
      .filter((e) => e.kind === 'bossHeads')
      .map((e) => (e.kind === 'bossHeads' ? e.heads : 0));
    expect(heads.slice(0, 2)).toEqual([2, 1]);
    expect(heads.slice(2)).toEqual([2, 3]);
  });
});
