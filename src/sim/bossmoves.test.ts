import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { buffOf, curePoison, isStoned, isSwallowed } from './effects';
import { landStrike } from './strike';
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

function arena(moveKey: string, classAttrs: object = {}) {
  const w = createWorld(1, mk(MOVES[moveKey], classAttrs));
  const a = hero(w, 540, 500);
  run(w, 100);
  const boss = w.units.find((u) => u.type === 'wyrm')!;
  return { w, a, boss };
}

describe('Venom', () => {
  it('poisons the target and heroes within 60 of it, not those farther away', () => {
    const { w, a, boss } = arena('venom');
    const near = hero(w, 560, 540);
    const far = hero(w, 3000, 3000);
    far.mode = 'return';
    a.hp = 2e6;
    a.maxHp = 2e6;
    const ev = run(w, 13_500);
    expect(
      ev.some((e) => e.kind === 'windup' && e.move === 'venom' && e.attacker === boss.id),
    ).toBe(true);
    const hit = ev
      .filter((e) => e.kind === 'status' && e.status === 'poison')
      .map((e) => (e as { unit: number }).unit);
    expect(hit).toContain(a.id);
    expect(hit).toContain(near.id);
    expect(hit).not.toContain(far.id);
    // 3% of max hp per second for 8 s as death damage
    run(w, 3_000);
    expect(near.hp).toBeLessThan(near.maxHp * 0.95);
    expect(far.hp).toBe(far.maxHp);
  });

  it('any heal ends the poison', () => {
    const { w, a } = arena('venom');
    run(w, 13_500);
    const before = a.hp;
    expect(w.unitRuntime.get(a.id)?.fx?.poison).toBeDefined();
    curePoison(w, a.id);
    run(w, 3_000);
    // only the boss's own weak strikes now, no more 3% ticks
    expect(before - a.hp).toBeLessThan(100);
  });
});

describe('Howl', () => {
  it('hurt heroes in range break and run from the boss, the bold stay, and a guard is called', () => {
    const { w, a, boss } = arena('howl');
    const brave = hero(w, 520, 540);
    brave.trait = 'brave';
    run(w, 14_500);
    // hurt just before the howl lands, so nobody has fled yet
    for (const h of [a, brave]) h.hp = Math.floor(h.maxHp * 0.3);
    const ev = run(w, 2_000);
    const fear = ev
      .filter((e) => e.kind === 'status' && e.status === 'fear')
      .map((e) => (e as { unit: number }).unit);
    expect(fear).toContain(a.id);
    expect(fear).not.toContain(brave.id);
    expect(w.units.some((u) => u.type === 'imp')).toBe(true);
    void boss;
  });
});

describe('Riddle', () => {
  it('Int 8 or more answers and hits harder; less is stone: no actions, half damage', () => {
    const smart = arena('riddle', { int: 20 });
    const evS = run(smart.w, 19_500);
    expect(evS.find((e) => e.kind === 'riddle')).toMatchObject({
      answered: true,
      target: smart.a.id,
    });
    expect(buffOf(smart.w, smart.a.id, 'damage')).toBeCloseTo(0.3);

    const dull = arena('riddle', { int: 0 });
    const evD = run(dull.w, 19_500);
    expect(evD.find((e) => e.kind === 'riddle')).toMatchObject({
      answered: false,
      target: dull.a.id,
    });
    expect(isStoned(dull.w, dull.a.id)).toBe(true);
    // half damage while stone
    const before = dull.a.hp;
    landStrike(dull.w, dull.boss, dull.a, {
      attrs: { ...none, str: 100 },
      canDodge: false,
      canCrit: false,
    });
    expect(before - dull.a.hp).toBe(50);
    run(dull.w, 3_500);
    expect(isStoned(dull.w, dull.a.id)).toBe(false);
  });

  it('asks the hero with the lowest Int', () => {
    const d = mk(MOVES.riddle, { int: 0 });
    d.classes = [
      ...(d.classes ?? []),
      {
        id: 'sage',
        attrs: { ...none, str: 3, sta: 400, per: 1e6, int: 20 },
        weapon: { baseAttackS: 1000, range: 60 },
        startGold: 0,
      },
    ];
    const w = createWorld(1, d);
    const sageId = spawnHero(w, 'sage', { x: 540, y: 500 });
    const knightId = spawnHero(w, 'knight', { x: 545, y: 505 });
    for (const id of [sageId, knightId]) {
      const u = w.units.find((x) => x.id === id)!;
      u.mode = 'explore';
      u.maxHp = 1e6;
      u.hp = 1e6;
    }
    const ev = run(w, 19_500);
    expect(ev.find((e) => e.kind === 'riddle')).toMatchObject({
      target: knightId,
      answered: false,
    });
  });
});

describe('Swallow', () => {
  it('takes the hero with the most hp out of the fight, 8%/s as death damage, back after 4 s', () => {
    const { w, a, boss } = arena('swallow');
    const other = hero(w, 520, 540, 1e5);
    a.hp = 2e6;
    a.maxHp = 2e6;
    const ev = run(w, 16_500);
    expect(ev.some((e) => e.kind === 'status' && e.status === 'swallowed' && e.unit === a.id)).toBe(
      true,
    );
    expect(isSwallowed(w, a.id)).toBe(true);
    expect(a.hp).toBeLessThan(a.maxHp);
    run(w, 4_500);
    expect(isSwallowed(w, a.id)).toBe(false);
    void boss;
    void other;
  });

  it('25% of the boss max hp in damage frees it early', () => {
    const { w, a, boss } = arena('swallow');
    a.hp = 2e6;
    a.maxHp = 2e6;
    run(w, 16_200);
    expect(isSwallowed(w, a.id)).toBe(true);
    boss.hp -= boss.maxHp * 0.26;
    run(w, 200);
    expect(isSwallowed(w, a.id)).toBe(false);
  });

  it('a hero knocked out while swallowed is a boss knockout (credited to the boss)', () => {
    const { w, a, boss } = arena('swallow');
    a.hp = 2e6;
    a.maxHp = 2e6;
    run(w, 16_200);
    a.hp = 1;
    const ev = run(w, 1_200);
    expect(ev.some((e) => e.kind === 'knockout' && e.unit === a.id && e.by === boss.id)).toBe(true);
  });
});

describe('Three Heads', () => {
  it('hits up to 3 heroes per strike', () => {
    const w = createWorld(1, mk(MOVES.hydra));
    const hs = [hero(w, 540, 500), hero(w, 530, 520), hero(w, 520, 540), hero(w, 510, 560)];
    run(w, 100);
    const boss = w.units.find((u) => u.type === 'wyrm')!;
    const ev = run(w, 4_500);
    const targets = new Set(
      ev
        .filter((e) => e.kind === 'hit' && e.attacker === boss.id)
        .map((e) => (e as { target: number }).target),
    );
    expect(targets.size).toBe(3);
    void hs;
  });

  it('a head is cut at 66% and regrows after 8 s unless a fire hit lands meanwhile', () => {
    const { w, a, boss } = arena('hydra');
    boss.hp = boss.maxHp * 0.65;
    const ev = run(w, 200);
    expect(ev.find((e) => e.kind === 'bossHeads')).toMatchObject({ heads: 2 });
    const ev2 = run(w, 8_200);
    expect(ev2.find((e) => e.kind === 'bossHeads')).toMatchObject({ heads: 3 });

    // second cut at 33%; a fire hit within the 8 s keeps it cut
    boss.hp = boss.maxHp * 0.32;
    run(w, 200);
    landStrike(w, a, boss, {
      attrs: { ...none, str: 1 },
      type: 'fire',
      canDodge: false,
      canCrit: false,
    });
    const ev3 = run(w, 9_000);
    expect(ev3.some((e) => e.kind === 'bossHeads' && e.heads === 3)).toBe(false);
    expect(w.unitRuntime.get(boss.id)?.boss?.heads).toBe(2);
  });

  it('enraged, it regrows in 5 s', () => {
    const { w, boss } = arena('hydra');
    w.unitRuntime.get(boss.id)!.boss!.enraged = true;
    boss.hp = boss.maxHp * 0.65;
    run(w, 200);
    const ev = run(w, 5_300);
    expect(ev.some((e) => e.kind === 'bossHeads' && e.heads === 3)).toBe(true);
  });
});
