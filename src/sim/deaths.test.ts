import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { bond } from './parties';
import { deathChance } from './deaths';
import { spawnHero } from './world';
import type { UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

function mk(combat: object = {}): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 3800, y: 3800 },
    classes: [
      { id: 'knight', attrs: { ...none, str: 10, sta: 60 }, weapon, startGold: 0 },
      { id: 'healer', attrs: { ...none, int: 6, sta: 40 }, weapon, startGold: 0, heals: true },
    ],
    gods: [
      { id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' },
      {
        id: 'freyja',
        pantheon: 'aesir',
        name: 'Freyja',
        template: 'healer',
        passive: {
          id: 'chooser',
          name: 'Chooser',
          effects: [{ scope: 'party', keys: { koGoldLoss: 0 } }],
        },
      },
      {
        id: 'anubis',
        pantheon: 'egypt',
        name: 'Anubis',
        template: 'knight',
        passive: {
          id: 'weigher',
          name: 'Weigher',
          effects: [{ scope: 'party', keys: { bossDeathAdd: -0.1 } }],
        },
      },
    ],
    monsters: [
      { id: 'rat', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1 },
      { id: 'wyrm', attrs: { ...none, sta: 100 }, weapon, bounty: 1, xp: 1, boss: {}, hp: 500 },
    ],
    lairs: [{ id: 'den', monster: 'rat', spawnS: 1000, maxAlive: 1, hp: 100 }],
    lairSites: [{ lair: 'den', pos: { x: 3000, y: 3000 } }],
    tuning: {
      combat: { critK: 1e9, dodgeK: 1e9, ...combat },
      hero: { firstRecruitMs: 10_000_000 },
      town: { raidFirstMs: 10_000_000 },
    },
  };
}

type W = ReturnType<typeof createWorld>;

function hero(w: W, god = 'thor', gold = 100): UnitState {
  const id = spawnHero(w, god, { x: 500, y: 500 });
  const h = w.units.find((u) => u.id === id) as UnitState;
  h.gold = gold;
  return h;
}

function monster(
  w: W,
  type = 'rat',
  tier = 1,
  lair: number | null = null,
  raid = false,
): UnitState {
  const id = w.nextId++;
  const u: UnitState = {
    id,
    kind: 'monster',
    type,
    tier,
    god: null,
    path: null,
    pos: { x: 520, y: 500 },
    facing: { x: 0, y: 1 },
    hp: 1000,
    maxHp: 1000,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  };
  w.units.push(u);
  w.unitRuntime.set(id, {
    lair,
    cooldownMs: 0,
    target: null,
    idleMs: 0,
    ...(raid ? { raid: true } : {}),
  });
  return u;
}

function kill(w: W, h: UnitState, by: UnitState): readonly SimEvent[] {
  h.hp = 0;
  w.pendingDeaths.push({ victim: h.id, by: by.id });
  step(w, TICK_MS);
  return snapshot(w).events;
}

describe('knockout cost', () => {
  it('drops 25% of the gold carried and lowers every party bond by one', () => {
    const w = createWorld(1, mk());
    const a = hero(w);
    const b = hero(w);
    const party = w.parties.get(a.party)!;
    // put b in a's party
    w.parties.delete(b.party);
    b.party = a.party;
    party.members.push(b.id);
    const before = bond(w, a.id, b.id);
    const ev = kill(w, a, monster(w));
    expect(a.gold).toBe(75);
    expect(ev.find((e) => e.kind === 'knockout')).toMatchObject({ unit: a.id, goldLost: 25 });
    expect(bond(w, a.id, b.id)).toBe(before - 1);
    expect(a.ko).toBe(true);
  });

  it('a passive can set the share to nothing', () => {
    const w = createWorld(1, mk());
    const f = hero(w, 'freyja', 100);
    const ev = kill(w, f, monster(w));
    expect(f.gold).toBe(100);
    expect(ev.find((e) => e.kind === 'knockout')).toMatchObject({ unit: f.id });
    expect(
      (ev.find((e) => e.kind === 'knockout') as { goldLost?: number }).goldLost,
    ).toBeUndefined();
  });
});

describe('permadeath', () => {
  it('a rat, a tier 2 lair monster or a raider never kills', () => {
    const w = createWorld(1, mk({ bossDeathChance: 1, deathFloor: 1 }));
    const lair = w.lairs[0].id;
    for (const killer of [
      monster(w),
      monster(w, 'rat', 2, lair),
      monster(w, 'rat', 3, lair, true),
    ]) {
      const h = hero(w);
      expect(kill(w, h, killer).some((e) => e.kind === 'slain')).toBe(false);
      expect(h.ko).toBe(true);
    }
  });

  it('a boss knockout can kill: the hero is gone, a grave stays, the party loses it', () => {
    const w = createWorld(1, mk({ bossDeathChance: 1, deathFloor: 1 }));
    const a = hero(w);
    const mate = hero(w);
    const party = w.parties.get(a.party)!;
    w.parties.delete(mate.party);
    mate.party = a.party;
    party.members.push(mate.id);
    const boss = monster(w, 'wyrm');
    const ev = kill(w, a, boss);
    expect(ev.find((e) => e.kind === 'slain')).toMatchObject({
      unit: a.id,
      by: boss.id,
      goldLost: 25,
    });
    expect(ev.some((e) => e.kind === 'knockout')).toBe(false);
    expect(w.units.some((u) => u.id === a.id)).toBe(false);
    expect(party.members).toEqual([mate.id]);
    const snap = snapshot(w);
    expect(snap.graves).toHaveLength(1);
    expect(snap.graves[0]).toMatchObject({ id: a.id, type: 'knight', god: 'thor' });
    // its god slot is free again: the cap counts living heroes
    expect(w.units.filter((u) => u.god === 'thor' && u.kind === 'hero')).toHaveLength(1);
  });

  it('a monster of a tier 3 lair can kill too', () => {
    const w = createWorld(1, mk({ bossDeathChance: 1, deathFloor: 1 }));
    const h = hero(w);
    const ev = kill(w, h, monster(w, 'rat', 3, w.lairs[0].id));
    expect(ev.some((e) => e.kind === 'slain')).toBe(true);
  });

  it('an empty party goes with its last member', () => {
    const w = createWorld(1, mk({ bossDeathChance: 1, deathFloor: 1 }));
    const h = hero(w);
    const pid = h.party;
    kill(w, h, monster(w, 'wyrm'));
    expect(w.parties.has(pid)).toBe(false);
  });

  it('the chance falls with shrine tiers, a living healer and Anubis, down to the floor', () => {
    const w = createWorld(1, mk());
    const h = hero(w);
    const boss = monster(w, 'wyrm');
    expect(deathChance(w, h, boss.id)).toBeCloseTo(0.2);
    w.buildings.push({
      id: w.nextId++,
      type: 'shrine',
      tier: 2,
      pos: { x: 0, y: 0 },
      plot: null,
      hp: 1,
      maxHp: 1,
    });
    expect(deathChance(w, h, boss.id)).toBeCloseTo(0.1);
    const healer = hero(w, 'freyja');
    const party = w.parties.get(h.party)!;
    w.parties.delete(healer.party);
    healer.party = h.party;
    party.members.push(healer.id);
    expect(deathChance(w, h, boss.id)).toBeCloseTo(0.05);
    expect(deathChance(w, h, monster(w).id)).toBeUndefined();
    // the floor
    const w2 = createWorld(1, mk());
    const h2 = hero(w2, 'anubis');
    w2.buildings.push({
      id: w2.nextId++,
      type: 'shrine',
      tier: 3,
      pos: { x: 0, y: 0 },
      plot: null,
      hp: 1,
      maxHp: 1,
    });
    expect(deathChance(w2, h2, monster(w2, 'wyrm').id)).toBeCloseTo(0.05);
  });

  it('slain heroes stay in the end report', () => {
    const w = createWorld(1, mk({ bossDeathChance: 1, deathFloor: 1 }));
    const h = hero(w);
    kill(w, h, monster(w, 'wyrm'));
    w.status = 'lost';
    const report = snapshot(w).report;
    expect(report?.heroes.find((x) => x.unit === h.id)).toMatchObject({ slain: true });
  });
});
