import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { slowOf } from './riders';
import { resolveStrike } from './strike';
import { spawnHero } from './world';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 2, range: 60 };
const data = (over: Partial<GameData> = {}): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 3, sta: 200, dex: 5, per: 1e6 },
      weapon: { baseAttackS: 1, range: 60 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'wyrm',
      attrs: { ...none, str: 10, sta: 5 },
      weapon,
      bounty: 77,
      xp: 55,
      boss: {},
      hp: 500,
      armour: 0,
    },
    { id: 'imp', attrs: { ...none, str: 1, sta: 1 }, weapon, bounty: 1, xp: 1 },
  ],
  lairs: [
    { id: 'wyrm-nest', monster: 'wyrm', spawnS: 100_000, maxAlive: 3, hp: 1000, escort: 'imp' },
  ],
  lairSites: [{ lair: 'wyrm-nest', pos: { x: 500, y: 500 } }],
  tuning: {
    combat: { dodgeK: 1e9 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    lair: { tierUpEveryMs: 0 },
  },
  ...over,
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

const lairOf = (w: W) => {
  const l = w.lairs[0];
  if (!l) throw new Error('lair');
  return l;
};
const bossUnit = (w: W) => w.units.find((u) => u.type === 'wyrm');

describe('boss emergence', () => {
  it('stays in the lair until the lair is below 75% hp, then comes out once with its own hp', () => {
    const w = createWorld(1, data());
    expect(run(w, 3_000).some((e) => e.kind === 'bossEmerged')).toBe(false);
    expect(bossUnit(w)).toBeUndefined();
    lairOf(w).hp = 700;
    const ev = run(w, 200);
    expect(ev.filter((e) => e.kind === 'bossEmerged')).toHaveLength(1);
    expect(bossUnit(w)).toMatchObject({ hp: 500, maxHp: 500, type: 'wyrm' });
    expect(run(w, 3_000).some((e) => e.kind === 'bossEmerged')).toBe(false);
    expect(w.units.filter((u) => u.type === 'wyrm')).toHaveLength(1);
  });

  it('a boss lair spawns its escort, never the boss itself; with no escort, nothing', () => {
    const w = createWorld(
      1,
      data({
        lairs: [
          { id: 'wyrm-nest', monster: 'wyrm', spawnS: 1, maxAlive: 3, hp: 1000, escort: 'imp' },
        ],
      }),
    );
    run(w, 5_000);
    expect(w.units.every((u) => u.type === 'imp')).toBe(true);
    expect(w.units.length).toBeGreaterThan(0);
    const bare = createWorld(
      1,
      data({
        lairs: [{ id: 'wyrm-nest', monster: 'wyrm', spawnS: 1, maxAlive: 3, hp: 1000 }],
      }),
    );
    run(bare, 5_000);
    expect(bare.units).toHaveLength(0);
  });
});

describe('guards and raids', () => {
  it('guards stop spawning once the boss has come out; only the enrage call adds more', () => {
    const w = createWorld(
      1,
      data({
        lairs: [
          { id: 'wyrm-nest', monster: 'wyrm', spawnS: 1, maxAlive: 3, hp: 1000, escort: 'imp' },
        ],
      }),
    );
    run(w, 4_000);
    expect(w.units.filter((u) => u.type === 'imp').length).toBeGreaterThan(0);
    lairOf(w).hp = 700;
    run(w, 200);
    // wipe the guards: none come back while the boss is out
    for (const u of w.units.filter((x) => x.type === 'imp')) {
      u.hp = 0;
      w.pendingDeaths.push({ victim: u.id, by: 0 });
    }
    run(w, 100);
    expect(w.units.filter((u) => u.type === 'imp')).toHaveLength(0);
    run(w, 5_000);
    expect(w.units.filter((u) => u.type === 'imp')).toHaveLength(0);
    expect(bossUnit(w)).toBeDefined();
  });

  it('a boss lair that raids (fixed map) sends its escort, never clones of the boss', () => {
    const w = createWorld(
      1,
      data({
        tuning: {
          ...data().tuning,
          town: { raidFirstMs: 1_000, raidSize: 2, raidEveryMs: 10_000_000, townHallHp: 1e9 },
        },
      }),
    );
    run(w, 1_500);
    expect(w.units.some((u) => u.type === 'wyrm')).toBe(false);
    expect(w.units.filter((u) => w.unitRuntime.get(u.id)?.raid && u.type === 'imp').length).toBe(2);
    // with no escort a boss lair has nothing to raid with
    const bare = createWorld(
      1,
      data({
        lairs: [{ id: 'wyrm-nest', monster: 'wyrm', spawnS: 1000, maxAlive: 3, hp: 1000 }],
        tuning: {
          ...data().tuning,
          town: { raidFirstMs: 1_000, raidSize: 2, raidEveryMs: 10_000_000, townHallHp: 1e9 },
        },
      }),
    );
    run(bare, 1_500);
    expect(bare.units).toHaveLength(0);
  });
});

describe('the lair cannot fall while the boss lives', () => {
  it('a killing blow on the lair leaves it at 1 hp until the boss is dead', () => {
    const w = createWorld(1, data());
    const hero = spawnHero(w, 'knight', { x: 480, y: 500 });
    const u = w.units.find((x) => x.id === hero);
    if (!u) throw new Error('hero');
    // a lair about to fall, the boss not out yet
    lairOf(w).hp = 1;
    run(w, 4_000);
    expect(w.lairs).toHaveLength(1);
    expect(lairOf(w).hp).toBe(1);
    expect(bossUnit(w)).toBeDefined();
    // kill the boss: the lair falls on the next blow
    const boss = bossUnit(w);
    if (!boss) throw new Error('boss');
    boss.hp = 0;
    w.pendingDeaths.push({ victim: boss.id, by: hero });
    const ev = run(w, 30_000);
    expect(ev.some((e) => e.kind === 'died' && e.type === 'wyrm' && e.bounty === 77)).toBe(true);
    expect(w.lairs).toHaveLength(0);
    expect(w.status).toBe('won');
  });
});

describe('cleave', () => {
  function fightWorld() {
    const w = createWorld(1, data());
    lairOf(w).hp = 600;
    run(w, 100);
    const boss = bossUnit(w);
    if (!boss) throw new Error('boss');
    boss.pos = { x: 600, y: 500 };
    // targets stand where the boss strikes: one in front, one beside it, one far away
    const a = spawnHero(w, 'knight', { x: 640, y: 500 });
    const b = spawnHero(w, 'knight', { x: 640, y: 540 });
    const far = spawnHero(w, 'knight', { x: 640, y: 900 });
    // heroes stand where they are (resting, no regen) so the boss keeps the same targets
    w.tuning.hero.restPerS = 0;
    for (const id of [a, b, far]) {
      const u = w.units.find((x) => x.id === id);
      if (u) {
        u.mode = 'rest';
        u.hp = Math.round(u.maxHp * 0.3);
      }
    }
    return { w, boss, a, b, far };
  }

  it('every third strike is a cleave: long windup with a marked area', () => {
    const { w, boss } = fightWorld();
    const winds: Extract<SimEvent, { kind: 'windup' }>[] = [];
    for (const e of run(w, 20_000)) {
      if (e.kind === 'windup' && e.attacker === boss.id) winds.push(e);
    }
    expect(winds.length).toBeGreaterThanOrEqual(6);
    winds.forEach((e, i) => {
      if ((i + 1) % 3 === 0) {
        expect(e.inMs).toBe(1_200);
        expect(e.area).toMatchObject({ r: 70 });
      } else {
        expect(e.inMs).toBeLessThan(1_200);
        expect(e.area).toBeUndefined();
      }
    });
  });

  it('hits the target in full and heroes inside the area for 60%, not those outside', () => {
    const { w, boss, a, b, far } = fightWorld();
    // heroes cannot be KO'd or hurt otherwise: record the boss hits per target
    const dmg = new Map<number, number[]>();
    for (const e of run(w, 12_000)) {
      if (e.kind === 'hit' && e.attacker === boss.id) {
        dmg.set(e.target, [...(dmg.get(e.target) ?? []), e.damage]);
      }
    }
    const first = dmg.get(a) ?? dmg.get(b) ?? [];
    expect(first.length).toBeGreaterThan(0);
    const all = [...dmg.values()].flat();
    // the full hit is Str 10; the cleave share is 60% of it
    expect(new Set(all)).toEqual(new Set([10, 6]));
    expect(dmg.has(far)).toBe(false);
    // somebody was hit for 6: the bystander in the area
    expect([...dmg.values()].some((v) => v.includes(6))).toBe(true);
  });
});

describe('enrage', () => {
  it('at half hp: faster attacks and the lair escort comes', () => {
    const w = createWorld(1, data());
    lairOf(w).hp = 600;
    run(w, 100);
    const boss = bossUnit(w);
    if (!boss) throw new Error('boss');
    const before = w.units.filter((u) => u.type === 'imp').length;
    boss.hp = 240;
    const ev = run(w, 100);
    expect(ev.filter((e) => e.kind === 'enraged')).toHaveLength(1);
    expect(w.units.filter((u) => u.type === 'imp').length).toBeGreaterThanOrEqual(before + 2);
    expect(run(w, 2_000).some((e) => e.kind === 'enraged')).toBe(false);
  });

  it('enraged attack time is x0.7', () => {
    const cycle = (hp: number) => {
      const w = createWorld(1, data());
      lairOf(w).hp = 600;
      run(w, 100);
      const boss = bossUnit(w);
      if (!boss) throw new Error('boss');
      boss.hp = hp;
      boss.pos = { x: 600, y: 500 };
      spawnHero(w, 'knight', { x: 640, y: 500 });
      const times: number[] = [];
      for (let t = 0; t < 30_000; t += TICK_MS) {
        step(w, TICK_MS);
        for (const e of snapshot(w).events) {
          if (e.kind === 'windup' && e.attacker === boss.id && !e.area) times.push(w.timeMs);
        }
      }
      return times[1] - times[0];
    };
    expect(cycle(240) / cycle(500)).toBeCloseTo(0.7, 1);
  });
});

describe('immunities', () => {
  it('bosses cannot be crit; a plain monster of the same build can', () => {
    const w = createWorld(1, data());
    const lucky = { ...none, str: 10, per: 1e6 };
    const boss = { attrs: none, tags: ['boss'] };
    const plain = { attrs: none, tags: [] as string[] };
    const crits = (target: typeof boss) =>
      Array.from({ length: 200 }, () =>
        resolveStrike(w, { attrs: lucky, target, canDodge: false }),
      ).filter((h) => h.crit).length;
    expect(crits(boss)).toBe(0);
    expect(crits(plain)).toBeGreaterThan(100);
  });

  it('chill takes half strength on a boss row', () => {
    const w = createWorld(1, data());
    lairOf(w).hp = 600;
    run(w, 100);
    const boss = bossUnit(w);
    if (!boss) throw new Error('boss');
    const rt = w.unitRuntime.get(boss.id);
    if (rt) rt.status = { chill: { untilMs: w.timeMs + 3000, slow: 0.125 } };
    expect(slowOf(w, boss.id)).toBe(0.125);
  });
});
