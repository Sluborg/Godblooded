import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';
import type { UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const base: GameData = {
  buildings: [],
  plots: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 500, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 12, sta: 12 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
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
  tuning: {
    hero: { firstRecruitMs: 10_000_000 },
    town: { raidFirstMs: 10_000_000 },
  },
};

type W = ReturnType<typeof createWorld>;

function hero(w: W, x = 500, y = 500): UnitState {
  const id = spawnHero(w, 'warrior', { x, y });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.trait = null;
  u.mode = 'explore';
  return u;
}

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    step(w, TICK_MS);
    out.push(...snapshot(w).events);
  }
  return out;
}

const flag = (w: W, x: number, y: number, gold: number) =>
  command(w, { kind: 'placeBounty', pos: { x, y }, gold });

describe('score and commit', () => {
  it('distance counts: a near flag beats a richer far one', () => {
    const w = createWorld(1, { ...base, startGold: 1000 });
    const h = hero(w);
    flag(w, 800, 500, 100);
    flag(w, 3500, 3500, 150);
    run(w, 1_100);
    const goal = w.heroRuntime.get(h.id)?.goal;
    expect(goal?.kind).toBe('flag');
    expect(w.bounties.find((b) => b.id === goal?.id)?.pos.x).toBe(800);
  });

  it('a flag too far to pay for itself is ignored: the hero explores', () => {
    const w = createWorld(1, { ...base, startGold: 1000 });
    const h = hero(w);
    flag(w, 3900, 3900, 50);
    run(w, 1_100);
    expect(w.heroRuntime.get(h.id)?.goal?.kind).toBe('explore');
  });

  it('holds a choice for commitMs and switches only for a clearly better option', () => {
    const w = createWorld(1, { ...base, startGold: 1000 });
    const h = hero(w);
    flag(w, 2000, 500, 100);
    run(w, 1_100);
    const first = w.heroRuntime.get(h.id)?.goal;
    expect(first?.kind).toBe('flag');
    // a flag only a little better does not tempt it, even after the hold
    flag(w, 2000, 520, 108);
    run(w, 8_000);
    expect(w.heroRuntime.get(h.id)?.goal?.id).toBe(first?.id);
  });

  it('switches to a much better flag once the hold is over', () => {
    const w = createWorld(1, { ...base, startGold: 1000 });
    const h = hero(w);
    flag(w, 1500, 500, 90);
    run(w, 1_100);
    const first = w.heroRuntime.get(h.id)?.goal;
    expect(first?.kind).toBe('flag');
    flag(w, 1500, 520, 200);
    // within the hold nothing changes
    run(w, 3_000);
    expect(w.heroRuntime.get(h.id)?.goal?.id).toBe(first?.id);
    run(w, 4_000);
    const now = w.heroRuntime.get(h.id)?.goal;
    expect(now?.kind).toBe('flag');
    expect(now?.id).not.toBe(first?.id);
  });

  it('a lair is a goal when it pays: the hero heads for it', () => {
    const w = createWorld(1, {
      ...base,
      lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1000, maxAlive: 0, hp: 5000 }],
      lairSites: [{ lair: 'barrow', pos: { x: 700, y: 500 } }],
    });
    const h = hero(w);
    const ev = run(w, 1_100);
    expect(w.heroRuntime.get(h.id)?.goal?.kind).toBe('lair');
    expect(ev.some((e) => e.kind === 'intent' && e.intent.kind === 'lair')).toBe(true);
  });

  it('a hero committed to a flag does not drop it for a lair on the way', () => {
    const w = createWorld(1, {
      ...base,
      startGold: 2000,
      lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 1000, maxAlive: 0, hp: 5000 }],
      lairSites: [{ lair: 'barrow', pos: { x: 1000, y: 500 } }],
    });
    const h = hero(w, 900, 500);
    flag(w, 1100, 520, 600);
    run(w, 1_100);
    expect(w.heroRuntime.get(h.id)?.goal?.kind).toBe('flag');
    run(w, 1_000);
    expect(w.lairs[0].hp).toBe(w.lairs[0].maxHp);
  });
});

describe('review regressions', () => {
  it('the intent does not flip between lair and explore while a lair is fought', () => {
    const w = createWorld(1, {
      ...base,
      lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 2, maxAlive: 4, hp: 100_000 }],
      lairSites: [{ lair: 'barrow', pos: { x: 800, y: 500 } }],
    });
    hero(w, 600, 500);
    const ev = run(w, 20_000);
    const kinds = ev
      .filter((e): e is Extract<SimEvent, { kind: 'intent' }> => e.kind === 'intent')
      .map((e) => e.intent.kind);
    // a handful of changes at most (explore, lair, maybe retreat/rest), not one every few seconds
    expect(kinds.length).toBeLessThan(8);
    expect(kinds.join(',')).not.toMatch(/lair,explore,lair,explore/);
  });

  it('a new flag is noticed within a second even after a long walk', () => {
    const w = createWorld(1, { ...base, startGold: 1000 });
    const h = hero(w);
    run(w, 20_000);
    flag(w, h.pos.x + 400, h.pos.y, 300);
    run(w, 1_100);
    expect(w.heroRuntime.get(h.id)?.goal?.kind).toBe('flag');
  });
});

describe('intent', () => {
  it('announces a party intent when it changes and carries it in the snapshot', () => {
    const w = createWorld(1, { ...base, startGold: 1000 });
    const h = hero(w);
    flag(w, 900, 500, 100);
    const ev = run(w, 1_100);
    const intents = ev.filter(
      (e): e is Extract<SimEvent, { kind: 'intent' }> => e.kind === 'intent',
    );
    expect(intents.at(-1)?.intent).toMatchObject({ kind: 'flag', pos: { x: 900, y: 500 } });
    expect(intents.at(-1)?.party).toBe(h.party);
    expect(snapshot(w).parties.find((p) => p.id === h.party)?.intent.kind).toBe('flag');
    // no event while nothing changes
    expect(run(w, 500).filter((e) => e.kind === 'intent')).toHaveLength(0);
    // hurt: it heads home, the party's intent turns to retreat
    h.hp = 1;
    const ev2 = run(w, 500);
    expect(ev2.some((e) => e.kind === 'intent' && e.intent.kind === 'retreat')).toBe(true);
  });
});

function party(w: W, n: number): UnitState[] {
  const heroes = Array.from({ length: n }, (_, i) => hero(w, 1500 + i * 10, 1500));
  const lead = heroes[0];
  const p = w.parties.get(lead.party)!;
  for (const h of heroes.slice(1)) {
    w.parties.delete(h.party);
    h.party = lead.party;
    p.members.push(h.id);
  }
  return heroes;
}

describe('party retreat', () => {
  it('half the fighting members below the line send everyone home together, with no bond lost', () => {
    const w = createWorld(1, base);
    const [a, b, c] = party(w, 3);
    a.hp = Math.floor(a.maxHp * 0.2);
    b.hp = Math.floor(b.maxHp * 0.2);
    const ev = run(w, 100);
    const [r] = ev.filter(
      (e): e is Extract<SimEvent, { kind: 'partyRetreat' }> => e.kind === 'partyRetreat',
    );
    expect(r.units.sort()).toEqual([a.id, b.id, c.id].sort());
    expect([a.mode, b.mode, c.mode]).toEqual(['return', 'return', 'return']);
    expect(w.bonds.size).toBe(0);
  });

  it('one hurt member of three is not enough', () => {
    const w = createWorld(1, base);
    const [a, b] = party(w, 3);
    a.hp = Math.floor(a.maxHp * 0.2);
    const ev = run(w, 100);
    expect(ev.some((e) => e.kind === 'partyRetreat')).toBe(false);
    expect(b.mode).toBe('explore');
    // alone it still flees, and that costs trust as before
    expect(a.mode).toBe('return');
  });

  it('a proud hero stays until 20% hp', () => {
    const w = createWorld(1, base);
    const [a, b, c] = party(w, 3);
    c.trait = 'proud';
    a.hp = Math.floor(a.maxHp * 0.2);
    b.hp = Math.floor(b.maxHp * 0.2);
    c.hp = Math.floor(c.maxHp * 0.25);
    run(w, 100);
    expect(a.mode).toBe('return');
    expect(c.mode).toBe('explore');
    c.hp = Math.floor(c.maxHp * 0.15);
    run(w, 100);
    expect(c.mode).toBe('return');
  });
});

describe('defend', () => {
  const monster = (w: W, x: number, y: number) => {
    const id = w.nextId++;
    w.units.push({
      id,
      kind: 'monster',
      type: 'draugr',
      tier: 1,
      god: null,
      path: null,
      pos: { x, y },
      facing: { x: 0, y: 1 },
      hp: 100000,
      maxHp: 100000,
      target: null,
      ko: false,
      mode: 'wander',
      party: 0,
      trait: null,
      gold: 0,
      bounty: null,
    });
    w.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  };
  const withTown = (): W => {
    const w = createWorld(1, base);
    w.buildings.push({
      id: w.nextId++,
      type: 'market',
      tier: 1,
      pos: { x: 700, y: 500 },
      plot: null,
      hp: 100,
      maxHp: 100,
    });
    return w;
  };

  it('a resting hero rejoins when a monster is within 400 of a building', () => {
    const w = withTown();
    const h = hero(w, 520, 500);
    h.mode = 'rest';
    monster(w, 1000, 500);
    const ev = run(w, 200);
    expect(h.mode).not.toBe('rest');
    expect(ev.some((e) => e.kind === 'defend' && e.unit === h.id)).toBe(true);
  });

  it('a monster near the hero but far from every building does not call it', () => {
    const w = withTown();
    const h = hero(w, 3000, 3000);
    h.mode = 'rest';
    h.hp = Math.floor(h.maxHp * 0.6);
    monster(w, 3050, 3000);
    const ev = run(w, 200);
    expect(h.mode).toBe('rest');
    expect(ev.some((e) => e.kind === 'defend')).toBe(false);
  });
});
