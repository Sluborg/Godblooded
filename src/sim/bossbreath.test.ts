import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const BREATH = {
  everyN: 3,
  enragedEveryN: 2,
  range: 160,
  angleDeg: 70,
  mult: 1.2,
  type: 'fire' as const,
  rider: 'burn' as const,
  windupMs: 1200,
};

const data = (breath: object = BREATH): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 3, sta: 400, dex: 0, per: 1e6 },
      weapon: { baseAttackS: 100, range: 60 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'wyrm',
      attrs: { ...none, str: 20, sta: 5 },
      weapon: { baseAttackS: 1, range: 70 },
      bounty: 1,
      xp: 1,
      boss: {},
      hp: 100_000,
      move: { breath: breath as never },
    },
  ],
  lairs: [{ id: 'nest', monster: 'wyrm', spawnS: 100_000, maxAlive: 0, hp: 1000 }],
  lairSites: [{ lair: 'nest', pos: { x: 500, y: 500 } }],
  tuning: {
    combat: { critK: 1e9, dodgeK: 1 },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
    lair: { tierUpEveryMs: 0 },
    boss: { sealUntilMs: 0, emergeBelow: 2, enrageAt: 0 },
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

function setup(breath?: object): { w: W; target: UnitState; boss: UnitState } {
  const w = createWorld(1, data(breath));
  const id = spawnHero(w, 'knight', { x: 540, y: 500 });
  const target = w.units.find((u) => u.id === id)!;
  target.mode = 'explore';
  target.maxHp = 1e9;
  target.hp = 1e9;
  run(w, 100);
  const boss = w.units.find((u) => u.type === 'wyrm')!;
  return { w, target, boss };
}

describe('Fafnir Fire Breath', () => {
  it('every third strike is a cone, announced 1.2 s ahead', () => {
    const { w } = setup();
    const ev = run(w, 8_000);
    const winds = ev.filter((e) => e.kind === 'windup' && e.attacker !== undefined);
    const cones = winds.filter((e) => 'cone' in e && e.cone);
    expect(cones.length).toBeGreaterThanOrEqual(2);
    const first = cones[0] as Extract<SimEvent, { kind: 'windup' }>;
    expect(first.inMs).toBe(1200);
    expect(first.cone).toMatchObject({ range: 160, angleDeg: 70 });
    // the strikes between are plain: two basic windups before each cone
    const idx = winds.indexOf(cones[0]);
    expect(idx).toBe(2);
  });

  it('hits heroes inside the cone with burning fire it cannot be dodged, and misses the rest', () => {
    const { w, target, boss } = setup();
    // one hero off to the side (90 degrees from the axis), one behind the boss
    const side = spawnHero(w, 'knight', { x: boss.pos.x, y: boss.pos.y + 100 });
    const behind = spawnHero(w, 'knight', { x: boss.pos.x - 100, y: boss.pos.y });
    for (const id of [side, behind]) {
      const u = w.units.find((x) => x.id === id)!;
      u.maxHp = 1e9;
      u.hp = 1e9;
      u.mode = 'rest';
    }
    // keep the bystanders out of the boss's own target choice: it fights `target` only
    const ev = run(w, 6_000);
    const breathHits = ev.filter(
      (e) => e.kind === 'hit' && e.attacker === boss.id && e.type === 'fire',
    ) as Extract<SimEvent, { kind: 'hit' }>[];
    expect(breathHits.length).toBeGreaterThan(0);
    expect(breathHits.every((h) => !h.dodged)).toBe(true);
    expect(breathHits.some((h) => h.target === target.id)).toBe(true);
    expect(breathHits.some((h) => h.target === behind)).toBe(false);
    expect(breathHits.some((h) => h.target === side)).toBe(false);
    expect(ev.some((e) => e.kind === 'rider' && e.rider === 'burn')).toBe(true);
  });

  it('enraged, it breathes every second strike', () => {
    const { w, boss } = setup();
    const rt = w.unitRuntime.get(boss.id)!;
    rt.boss!.enraged = true;
    const ev = run(w, 8_000);
    const winds = ev.filter((e) => e.kind === 'windup');
    const firstCone = winds.findIndex((e) => 'cone' in e && e.cone);
    expect(firstCone).toBe(1);
  });

  it('a boss without a move still cleaves as before', () => {
    const d = data();
    d.monsters = d.monsters!.map((m) => ({ ...m, move: undefined }));
    const w = createWorld(1, d);
    const id = spawnHero(w, 'knight', { x: 540, y: 500 });
    const u = w.units.find((x) => x.id === id)!;
    u.mode = 'explore';
    u.maxHp = 1e9;
    u.hp = 1e9;
    const ev = run(w, 8_000);
    expect(ev.some((e) => e.kind === 'windup' && 'area' in e && e.area)).toBe(true);
    expect(ev.some((e) => e.kind === 'windup' && 'cone' in e && e.cone)).toBe(false);
  });
});
