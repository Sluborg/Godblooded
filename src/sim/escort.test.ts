import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { escortOpenTo } from './escort';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (): GameData => ({
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
    { lair: 'barrow', pos: { x: 1000, y: 500 } },
    { lair: 'barrow', pos: { x: 2300, y: 1100 } },
  ],
  tuning: {
    nodes: { enabled: true },
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
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

function setup(): { w: W; node: number; gatherer: number } {
  const w = createWorld(1, data());
  step(w, 1000);
  const first = w.lairs[0].id;
  const h = spawnHero(w, 'warrior', { x: w.lairs[0].pos.x - 60, y: w.lairs[0].pos.y });
  for (let t = 0; t < 60_000 && w.lairs.some((l) => l.id === first); t += TICK_MS) step(w, TICK_MS);
  for (const l of w.lairs) l.hp = l.maxHp = 1e12;
  w.units = w.units.filter((u) => u.id !== h);
  const node = snapshot(w).nodes.find((n) => n.state === 'freed');
  if (!node) throw new Error('no freed node');
  const gatherer = (command(w, { kind: 'hireGatherer' }) as { id: number }).id;
  command(w, { kind: 'sendGatherer', node: node.id });
  return { w, node: node.id, gatherer };
}

const get = (w: W, id: number) => {
  const u = w.units.find((x) => x.id === id);
  if (!u) throw new Error('gone');
  return u;
};

describe('escort bounty', () => {
  it('costs 25 or 50 gold, one per gatherer', () => {
    const { w, gatherer } = setup();
    const gold = w.gold;
    expect(command(w, { kind: 'placeEscort', unit: gatherer, gold: 30 })).toMatchObject({
      reason: 'bad amount',
    });
    expect(command(w, { kind: 'placeEscort', unit: 999, gold: 25 }).ok).toBe(false);
    expect(command(w, { kind: 'placeEscort', unit: gatherer, gold: 25 }).ok).toBe(true);
    expect(w.gold).toBe(gold - 25);
    expect(command(w, { kind: 'placeEscort', unit: gatherer, gold: 50 })).toMatchObject({
      reason: 'already escorted',
    });
  });

  it('follows the gatherer, and half comes back if the gatherer falls', () => {
    const { w, gatherer } = setup();
    command(w, { kind: 'placeEscort', unit: gatherer, gold: 50 });
    run(w, 6_000);
    const flag = w.bounties[0];
    expect(flag.pos).toEqual(get(w, gatherer).pos);
    const gold = w.gold;
    w.pendingDeaths.push({ victim: gatherer, by: 0 });
    get(w, gatherer).hp = 0;
    const ev = run(w, 100);
    expect(ev.some((e) => e.kind === 'bountyCancelled')).toBe(true);
    expect(w.bounties).toHaveLength(0);
    expect(w.gold).toBe(gold + 25);
  });

  it('is taken by the first hero to reach the gatherer and paid when the jar is home', () => {
    const { w, gatherer } = setup();
    command(w, { kind: 'placeEscort', unit: gatherer, gold: 50 });
    const g = get(w, gatherer);
    const hero = spawnHero(w, 'warrior', { x: g.pos.x + 40, y: g.pos.y });
    const before = get(w, hero).gold;
    const ev = run(w, 60_000);
    expect(ev.some((e) => e.kind === 'escortTaken' && e.unit === hero)).toBe(true);
    const paid = ev.find((e) => e.kind === 'bountyClaimed' && e.escort);
    expect(paid).toMatchObject({ unit: hero, gold: 50 });
    expect(get(w, hero).gold).toBeGreaterThanOrEqual(before + 50);
    expect(w.bounties.some((b) => b.escort !== undefined)).toBe(false);
  });

  it('shows as an escort intent while the party walks with the gatherer', () => {
    const { w, gatherer } = setup();
    command(w, { kind: 'placeEscort', unit: gatherer, gold: 50 });
    const g = get(w, gatherer);
    spawnHero(w, 'warrior', { x: g.pos.x + 40, y: g.pos.y });
    const ev = run(w, 10_000);
    expect(ev.some((e) => e.kind === 'intent' && e.intent.kind === 'escort')).toBe(true);
  });

  it('a taken escort is closed to other parties', () => {
    const { w, gatherer } = setup();
    command(w, { kind: 'placeEscort', unit: gatherer, gold: 50 });
    const g = get(w, gatherer);
    const a = spawnHero(w, 'warrior', { x: g.pos.x + 40, y: g.pos.y });
    const b = spawnHero(w, 'warrior', { x: 100, y: 100 });
    run(w, 1_000);
    const flag = w.bounties.find((x) => x.escort === gatherer);
    if (!flag) throw new Error('no flag');
    expect(flag.escortBy).toBe(a);
    expect(escortOpenTo(w, get(w, a), flag)).toBe(true);
    expect(escortOpenTo(w, get(w, b), flag)).toBe(false);
  });
});
