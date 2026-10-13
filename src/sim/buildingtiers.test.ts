import { describe, expect, it } from 'vitest';
import {
  command,
  createWorld,
  snapshot,
  step as stepOnce,
  type GameData,
  type SimEvent,
} from './api';
import { spawnHero } from './world';

const attrs = { str: 2, dex: 2, sta: 3, cha: 1, per: 2, int: 1, wp: 2 };
const base: GameData = {
  buildings: [
    { id: 'temple_aesir', cost: 100 },
    { id: 'market', cost: 100 },
    { id: 'tower', cost: 80, upgradeCost: [111, 222] },
    { id: 'shrine', cost: 60 },
  ],
  plots: [
    { x: 700, y: 500 },
    { x: 800, y: 600 },
    { x: 900, y: 500 },
  ],
  startGold: 5000,
  map: { width: 3000, height: 3000 },
  townHall: { x: 100, y: 100 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1.5, range: 40 }, startGold: 0 }],
  gods: [
    { id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'warrior' },
    { id: 'tyr', pantheon: 'aesir', name: 'Tyr', template: 'warrior' },
    { id: 'odin', pantheon: 'aesir', name: 'Odin', template: 'warrior' },
  ],
  monsters: [{ id: 'imp', attrs, weapon: { baseAttackS: 2, range: 40 }, bounty: 5, xp: 3 }],
  lairs: [{ id: 'nest', monster: 'imp', spawnS: 5, maxAlive: 2, hp: 100_000 }],
  lairSites: [{ lair: 'nest', pos: { x: 800, y: 500 } }],
  tuning: {
    town: { raidFirstMs: 10_000_000, buildingHp: 200 },
    hero: { firstRecruitMs: 1_000, recruitMs: 10_000, maxPerTemple: 2, maxPerGod: 99 },
    lair: { tierUpEveryMs: 0 },
  },
};

type W = ReturnType<typeof createWorld>;

// step() runs at most 400 ticks per call, so spans go in chunks; events are collected.
function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let left = ms; left > 0; left -= 5_000) {
    stepOnce(w, Math.min(5_000, left));
    out.push(...snapshot(w).events);
  }
  return out;
}

function build(data: GameData, type: string, plot = 0) {
  const w = createWorld(1, data);
  const r = command(w, { kind: 'build', type, plot });
  if (!r.ok) throw new Error(r.reason);
  return { w, id: r.id };
}

const bState = (w: W, id: number) => {
  const b = snapshot(w).buildings.find((x) => x.id === id);
  if (!b) throw new Error('building');
  return b;
};

describe('upgrade command', () => {
  it('costs the building cost times the tier multiplier and goes up a tier', () => {
    const { w, id } = build(base, 'market');
    expect(bState(w, id)).toMatchObject({ tier: 1, upgradeCost: 150 });
    const gold = w.gold;
    expect(command(w, { kind: 'upgrade', building: id })).toEqual({ ok: true, id });
    expect(w.gold).toBe(gold - 150);
    const snap = snapshot(w);
    expect(snap.buildings.find((x) => x.id === id)).toMatchObject({ tier: 2, upgradeCost: 250 });
    expect(snap.events).toContainEqual({ kind: 'upgraded', building: id, type: 'market', tier: 2 });
    command(w, { kind: 'upgrade', building: id });
    expect(bState(w, id)).toMatchObject({ tier: 3, upgradeCost: null });
  });

  it('a building row can set its own tier costs', () => {
    const { w, id } = build(base, 'tower');
    expect(bState(w, id).upgradeCost).toBe(111);
    const gold = w.gold;
    command(w, { kind: 'upgrade', building: id });
    expect(gold - w.gold).toBe(111);
    expect(bState(w, id).upgradeCost).toBe(222);
  });

  it('is refused for an unknown building, the town hall, the top tier and a lack of gold', () => {
    const { w, id } = build(base, 'market');
    expect(command(w, { kind: 'upgrade', building: 99999 })).toEqual({
      ok: false,
      reason: 'unknown building',
    });
    const hall = snapshot(w).buildings.find((b) => b.type === 'townhall');
    expect(hall?.upgradeCost).toBeNull();
    expect(command(w, { kind: 'upgrade', building: hall?.id ?? 0 }).ok).toBe(false);
    w.gold = 10;
    expect(command(w, { kind: 'upgrade', building: id })).toEqual({
      ok: false,
      reason: 'not enough gold',
    });
    expect(w.gold).toBe(10);
    w.gold = 5000;
    command(w, { kind: 'upgrade', building: id });
    command(w, { kind: 'upgrade', building: id });
    expect(command(w, { kind: 'upgrade', building: id })).toEqual({
      ok: false,
      reason: 'already at the top tier',
    });
  });

  it('raises max hp and keeps the damage the building has taken', () => {
    const { w, id } = build(base, 'market');
    const b = w.buildings.find((x) => x.id === id);
    if (!b) throw new Error('building');
    b.hp = 50;
    command(w, { kind: 'upgrade', building: id });
    expect(bState(w, id)).toMatchObject({ maxHp: 300, hp: 150 });
  });
});

describe('tier effects', () => {
  it('a higher tier temple recruits faster and holds more heroes', () => {
    const heroes = (tier: number, ms: number) => {
      const { w, id } = build(base, 'temple_aesir');
      for (let t = 1; t < tier; t++) command(w, { kind: 'upgrade', building: id });
      run(w, ms);
      return snapshot(w).units.filter((u) => u.kind === 'hero').length;
    };
    // tier 1 caps at 2; tier 2 at 4; tier 3 at 6 (maxPerTemple 2 + 0, 2, 4)
    expect(heroes(1, 120_000)).toBe(2);
    expect(heroes(2, 120_000)).toBe(4);
    expect(heroes(3, 120_000)).toBe(6);
    // tier 3 recruits every 6 s against 10 s: more after 30 s
    expect(heroes(3, 30_000)).toBeGreaterThan(heroes(1, 30_000));
  });

  it('a higher tier market sells more per visit and taxes more', () => {
    const tax = (tier: number) => {
      const { w, id } = build(base, 'market');
      for (let t = 1; t < tier; t++) command(w, { kind: 'upgrade', building: id });
      const hero = spawnHero(w, 'thor', { x: 800, y: 600 });
      const u = w.units.find((x) => x.id === hero);
      if (!u) throw new Error('hero');
      u.gold = 1000;
      u.mode = 'shop';
      run(w, 5_000);
      return snapshot(w).stats.taxCollected;
    };
    // spendShare 0.6 would be 600; stock caps it at 120, 240, 480. Tax rate 0.5, x1, 1.25, 1.5.
    expect(tax(1)).toBe(60);
    expect(tax(2)).toBe(150);
    expect(tax(3)).toBe(360);
  });

  it('a tower shoots a monster in range for its tier damage, and the kill is its own', () => {
    const { w, id } = build(base, 'tower', 1);
    const ev = run(w, 40_000);
    const hits = ev.filter((e) => e.kind === 'hit' && e.attacker === id);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.kind === 'hit' && e.damage === 8)).toBe(true);
    const died = ev.find((e) => e.kind === 'died');
    expect(died).toMatchObject({ kind: 'died', by: id, type: 'imp' });
  });

  it('a monster a tower kills is gone in that very tick', () => {
    const { w, id } = build(base, 'tower', 0);
    run(w, 10_000);
    const mon = w.units.find((u) => u.kind === 'monster');
    if (!mon) throw new Error('no monster');
    mon.hp = 1;
    mon.pos = { x: 700, y: 520 };
    w.towerNextMs.set(id, 0);
    snapshot(w);
    stepOnce(w, 50);
    const snap = snapshot(w);
    expect(snap.events.some((e) => e.kind === 'died' && e.unit === mon.id && e.by === id)).toBe(
      true,
    );
    expect(w.pendingDeaths).toHaveLength(0);
    expect(snap.units.some((u) => u.id === mon.id)).toBe(false);
  });

  it('a tower upgrade raises damage and speeds up the shots', () => {
    const shots = (tier: number) => {
      const { w, id } = build(base, 'tower', 1);
      for (let t = 1; t < tier; t++) command(w, { kind: 'upgrade', building: id });
      const ev = run(w, 40_000).filter((e) => e.kind === 'hit' && e.attacker === id);
      return ev.map((e) => (e.kind === 'hit' ? e.damage : 0));
    };
    expect(shots(2).every((d) => d === 14)).toBe(true);
    expect(shots(3).every((d) => d === 22)).toBe(true);
  });

  it('a tower only shoots monsters inside its range', () => {
    // Monsters stay on the lair (wanderRadius 1), 100 units from the tower on plot 0.
    const shot = (towerRange: number) => {
      const data: GameData = {
        ...base,
        tuning: {
          ...base.tuning,
          monster: { wanderRadius: 1 },
          building: { towerRange: [towerRange] },
        },
      };
      const { w, id } = build(data, 'tower', 0);
      return run(w, 40_000).some((e) => e.kind === 'hit' && e.attacker === id);
    };
    expect(shot(50)).toBe(false);
    expect(shot(150)).toBe(true);
  });

  it('is deterministic', () => {
    const go = () => {
      const { w, id } = build(base, 'tower', 1);
      command(w, { kind: 'upgrade', building: id });
      return JSON.stringify(run(w, 30_000));
    };
    expect(go()).toBe(go());
  });
});
