import { describe, expect, it } from 'vitest';
import { createWorld, step, TICK_MS, type GameData } from './api';
import { fleeThreshold } from './parties';
import { spawnHero } from './world';
import type { TraitId, UnitState } from './types';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 2000 },
  townHall: { x: 3800, y: 1900 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 12, sta: 30 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'draugr',
      attrs: { ...attrs, str: 1, sta: 4 },
      weapon: { baseAttackS: 5, range: 40 },
      bounty: 1,
      xp: 1,
    },
    {
      id: 'ogre',
      attrs: { ...attrs, str: 1, sta: 40 },
      weapon: { baseAttackS: 5, range: 40 },
      bounty: 1,
      xp: 1,
    },
  ],
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
};

type W = ReturnType<typeof createWorld>;

const hero = (w: W, trait: TraitId, x: number, y: number): UnitState => {
  const id = spawnHero(w, 'warrior', { x, y });
  const u = w.units.find((v) => v.id === id) as UnitState;
  u.trait = trait;
  return u;
};

function monster(w: W, type: string, x: number, y: number, hp?: number): UnitState {
  const id = w.nextId++;
  const mon = data.monsters?.find((m) => m.id === type);
  const maxHp = hp ?? (mon ? mon.attrs.sta * 8 + mon.attrs.str * 4 : 40);
  const u: UnitState = {
    id,
    kind: 'monster',
    type,
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp: maxHp,
    maxHp,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  };
  w.units.push(u);
  w.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  return u;
}

const run = (w: W, ms: number) => {
  for (let t = 0; t < ms; t += TICK_MS) step(w, TICK_MS);
};

// Puts two heroes in one party.
function join(w: W, a: UnitState, b: UnitState) {
  const pa = w.parties.get(a.party);
  const pb = w.parties.get(b.party);
  if (!pa || !pb) throw new Error('no party');
  pa.members.push(b.id);
  w.parties.delete(pb.id);
  b.party = pa.id;
}

describe('trait behaviours', () => {
  it('a brave hero charges into a fight faster than another hero', () => {
    const dist = (trait: TraitId) => {
      const w = createWorld(1, data);
      const h = hero(w, trait, 1000, 1000);
      monster(w, 'ogre', 1180, 1000);
      run(w, 1_000);
      return h.pos.x - 1000;
    };
    expect(dist('brave')).toBeGreaterThan(dist('greedy') * 1.1);
  });

  it('a proud hero picks the biggest foe in reach, others the nearest', () => {
    const pick = (trait: TraitId) => {
      const w = createWorld(1, data);
      const h = hero(w, trait, 1000, 1000);
      monster(w, 'draugr', 1060, 1000);
      const big = monster(w, 'ogre', 1100, 1000);
      run(w, 100);
      return h.target === big.id;
    };
    expect(pick('proud')).toBe(true);
    expect(pick('brave')).toBe(false);
  });

  it('a proud hero holds out to 20% hp before it flees', () => {
    const w = createWorld(1, data);
    const proud = hero(w, 'proud', 1000, 1000);
    const plain = hero(w, 'greedy', 1000, 1100);
    expect(fleeThreshold(w, proud)).toBeLessThanOrEqual(0.2);
    expect(fleeThreshold(w, plain)).toBeGreaterThan(0.2);
  });

  it('a coward in a party stops behind the front member', () => {
    const w = createWorld(1, data);
    const front = hero(w, 'brave', 1000, 1000);
    const coward = hero(w, 'coward', 1000, 1040);
    join(w, front, coward);
    const foe = monster(w, 'ogre', 1180, 1000);
    run(w, 3_000);
    const df = Math.hypot(front.pos.x - foe.pos.x, front.pos.y - foe.pos.y);
    const dc = Math.hypot(coward.pos.x - foe.pos.x, coward.pos.y - foe.pos.y);
    expect(dc).toBeGreaterThanOrEqual(df + 40);
    // alone it closes in like anyone
    const w2 = createWorld(1, data);
    const solo = hero(w2, 'coward', 1000, 1000);
    const foe2 = monster(w2, 'ogre', 1180, 1000);
    run(w2, 3_000);
    expect(Math.hypot(solo.pos.x - foe2.pos.x, solo.pos.y - foe2.pos.y)).toBeLessThan(60);
  });

  it('a loyal hero stands over a knocked out party mate', () => {
    const w = createWorld(1, data);
    const mate = hero(w, 'brave', 1500, 1000);
    const loyal = hero(w, 'loyal', 1000, 1000);
    join(w, mate, loyal);
    mate.ko = true;
    mate.hp = 0;
    mate.mode = 'ko';
    const rt = w.heroRuntime.get(mate.id);
    if (rt) rt.koMs = 1e9;
    run(w, 15_000);
    expect(Math.hypot(loyal.pos.x - mate.pos.x, loyal.pos.y - mate.pos.y)).toBeLessThanOrEqual(60);
  });

  it('curious has no gold bonus any more', () => {
    expect(createWorld(1, data).tuning.bounty.curiousGoldMult).toBe(1);
  });
});
