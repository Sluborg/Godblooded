import { describe, expect, it } from 'vitest';
import { createWorld, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 2000, height: 1200 },
  townHall: { x: 1800, y: 1100 },
  classes: [
    { id: 'warrior', attrs, weapon: { baseAttackS: 1.5, range: 40 }, startGold: 0 },
    {
      id: 'healer',
      attrs: { ...attrs, int: 6, wp: 4 },
      weapon: { baseAttackS: 1.5, range: 200 },
      startGold: 0,
      heals: true,
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
  tuning: { town: { raidFirstMs: 10_000_000 } },
};

// A quiet world (no lairs) with a healer and a warrior in one party, side by side.
function pair(extra: Partial<GameData> = {}, gap = 60) {
  const w = createWorld(1, { ...data, ...extra });
  const healer = spawnHero(w, 'healer', { x: 400, y: 400 });
  const warrior = spawnHero(w, 'warrior', { x: 400 + gap, y: 400 });
  const h = w.units.find((u) => u.id === healer)!;
  const m = w.units.find((u) => u.id === warrior)!;
  const party = w.parties.get(h.party)!;
  w.parties.delete(m.party);
  party.members.push(warrior);
  m.party = party.id;
  return { w, h, m };
}

function run(w: ReturnType<typeof createWorld>, ms: number) {
  const out: SimEvent[] = [];
  for (let i = 0; i < ms / TICK_MS; i++) {
    step(w, TICK_MS);
    out.push(...w.events.splice(0));
  }
  return out;
}

describe('healer', () => {
  it('heals a hurt party mate below 70% instead of attacking', () => {
    const { w, m } = pair();
    m.hp = Math.floor(m.maxHp * 0.5);
    const before = m.hp;
    const log = run(w, 3_000);
    const heals = log.filter((e) => e.kind === 'heal');
    expect(heals.length).toBeGreaterThan(0);
    expect(m.hp).toBeGreaterThan(before);
    expect(log.some((e) => e.kind === 'hit')).toBe(false);
  });

  it('heal amount comes from int plus wp and never overheals', () => {
    const { w, m } = pair();
    m.maxHp = 10;
    m.hp = 6;
    const first = run(w, 3_000).find((e) => e.kind === 'heal');
    expect(first).toMatchObject({ kind: 'heal', amount: 4, target: m.id });
    expect(m.hp).toBe(10);
    m.maxHp = 100;
    m.hp = 1;
    const next = run(w, 3_000).find((e) => e.kind === 'heal');
    expect(next).toMatchObject({ amount: 10 });
  });

  it('a windup announces the heal before it lands', () => {
    const { w, m } = pair();
    m.hp = Math.floor(m.maxHp * 0.3);
    const log = run(w, 2_000);
    const wind = log.findIndex((e) => e.kind === 'windup');
    const heal = log.findIndex((e) => e.kind === 'heal');
    expect(wind).toBeGreaterThanOrEqual(0);
    expect(heal).toBeGreaterThan(wind);
  });

  it('does not heal at or above the threshold', () => {
    const { w, m } = pair();
    m.hp = Math.ceil(m.maxHp * 0.75);
    expect(run(w, 2_000).some((e) => e.kind === 'heal')).toBe(false);
  });

  it('does not heal a party mate out of range', () => {
    const { w, m } = pair({}, 900);
    m.hp = 1;
    expect(run(w, 1_000).some((e) => e.kind === 'heal')).toBe(false);
  });

  it('does not heal a knocked-out party mate', () => {
    const { w, m } = pair();
    m.hp = 0;
    m.ko = true;
    expect(run(w, 1_000).some((e) => e.kind === 'heal')).toBe(false);
  });

  it('does not heal heroes of another party', () => {
    const { w } = pair();
    const other = spawnHero(w, 'warrior', { x: 420, y: 400 });
    const o = w.units.find((u) => u.id === other)!;
    o.hp = 1;
    const log = run(w, 1_000);
    expect(log.some((e) => e.kind === 'heal' && e.target === other)).toBe(false);
  });

  it('a non-healer class never heals', () => {
    const { w, h, m } = pair();
    h.type = 'warrior';
    m.hp = 1;
    expect(run(w, 2_000).some((e) => e.kind === 'heal')).toBe(false);
  });

  it('tuning overrides range, threshold and power', () => {
    const t = { combat: { healBelow: 0.9, healPower: 2 } };
    const { w, m } = pair({ tuning: { ...data.tuning, ...t } });
    m.hp = Math.floor(m.maxHp * 0.85);
    const log = run(w, 2_000);
    const first = log.find((e) => e.kind === 'heal');
    expect(first).toBeDefined();
    if (first?.kind === 'heal') expect(first.amount).toBeLessThanOrEqual(20);
    const short = pair({ tuning: { ...data.tuning, combat: { healRange: 10 } } });
    short.m.hp = 1;
    expect(run(short.w, 1_000).some((e) => e.kind === 'heal')).toBe(false);
  });

  it('is deterministic', () => {
    const a = pair();
    const b = pair();
    a.m.hp = 5;
    b.m.hp = 5;
    expect(run(a.w, 4_000)).toEqual(run(b.w, 4_000));
  });
});
