import { describe, expect, it } from 'vitest';
import {
  createWorld,
  snapshot,
  step as stepOnce,
  TICK_MS,
  type GameData,
  type SimEvent,
} from './api';
import { addBond } from './parties';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1.5, range: 40 }, startGold: 0 }],
  monsters: [
    {
      id: 'ogre',
      attrs: { ...attrs, str: 6 },
      weapon: { baseAttackS: 2, range: 40 },
      bounty: 1,
      xp: 1,
    },
  ],
  tuning: { town: { raidFirstMs: 10_000_000 }, hero: { firstRecruitMs: 10_000_000 } },
};

type W = ReturnType<typeof createWorld>;

function run(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms; t += TICK_MS) {
    stepOnce(w, TICK_MS);
    out.push(...w.events.splice(0));
  }
  return out;
}

const unit = (w: W, id: number) => {
  const u = w.units.find((x) => x.id === id);
  if (!u) throw new Error('unit');
  return u;
};

// Two heroes side by side, each in a party of its own.
function pair(gap = 60) {
  const w = createWorld(1, data);
  const a = spawnHero(w, 'warrior', { x: 400, y: 400 });
  const b = spawnHero(w, 'warrior', { x: 400 + gap, y: 400 });
  return { w, a, b };
}

function together(w: W, a: number, b: number) {
  const pa = w.parties.get(unit(w, a).party);
  const pb = w.parties.get(unit(w, b).party);
  if (!pa || !pb) throw new Error('parties');
  w.parties.delete(pb.id);
  pa.members.push(b);
  unit(w, b).party = pa.id;
  return pa;
}

const addMonster = (w: W, x: number, y: number) => {
  const id = w.nextId++;
  w.units.push({
    id,
    kind: 'monster',
    type: 'ogre',
    tier: 1,
    god: null,
    path: null,
    pos: { x, y },
    facing: { x: 0, y: 1 },
    hp: 80,
    maxHp: 80,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  });
  w.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  return id;
};

describe('rivals', () => {
  it('a bond at or below the threshold makes rivals, and the snapshot lists the pair', () => {
    const { w, a, b } = pair();
    expect(snapshot(w).rivals).toEqual([]);
    addBond(w, a, b, -1);
    expect(snapshot(w).rivals).toEqual([]);
    addBond(w, a, b, -1);
    expect(snapshot(w).rivals).toEqual([[a, b]]);
    addBond(w, a, b, 3);
    expect(snapshot(w).rivals).toEqual([]);
  });

  it('rival parties refuse to merge; friends still do', () => {
    const merged = (delta: number) => {
      const { w, a, b } = pair(80);
      addBond(w, a, b, delta);
      run(w, 60_000);
      return unit(w, a).party === unit(w, b).party;
    };
    expect(merged(-3)).toBe(false);
    expect(merged(3)).toBe(true);
  });

  it('rivals in range argue, and not again before the cooldown', () => {
    const { w, a, b } = pair();
    // heroes wander off, so keep them within earshot
    w.tuning.party.argueRange = 100_000;
    addBond(w, a, b, -3);
    const first = run(w, 5_000).filter((e) => e.kind === 'argue');
    expect(first).toEqual([{ kind: 'argue', a, b }]);
    expect(run(w, 10_000).some((e) => e.kind === 'argue')).toBe(false);
    expect(run(w, 10_000).some((e) => e.kind === 'argue')).toBe(true);
  });

  it('rivals out of range do not argue', () => {
    const { w, a, b } = pair(900);
    addBond(w, a, b, -3);
    expect(run(w, 15_000).some((e) => e.kind === 'argue')).toBe(false);
  });

  it('rivals in one party argue but the party stays together', () => {
    const { w, a, b } = pair();
    const party = together(w, a, b);
    w.tuning.party.argueRange = 100_000;
    addBond(w, a, b, -3);
    const ev = run(w, 30_000);
    expect(ev.some((e) => e.kind === 'argue')).toBe(true);
    expect(party.members).toEqual([a, b]);
    expect(unit(w, b).party).toBe(party.id);
  });

  it('fleeing on your party makes rivals over time', () => {
    const { w, a, b } = pair();
    together(w, a, b);
    // two flights without a shared kill in between: bond 0 -> -2
    unit(w, b).hp = 1;
    unit(w, b).mode = 'explore';
    run(w, 200);
    unit(w, b).mode = 'explore';
    unit(w, b).hp = 1;
    run(w, 200);
    expect(snapshot(w).rivals).toEqual([[a, b]]);
  });
});

describe('revenge', () => {
  function setup(trait: 'vengeful' | 'brave' = 'vengeful', bondTo = 4) {
    const w = createWorld(1, data);
    const victim = spawnHero(w, 'warrior', { x: 400, y: 400 });
    const friend = spawnHero(w, 'warrior', { x: 420, y: 400 });
    unit(w, friend).trait = trait;
    unit(w, victim).trait = 'brave';
    addBond(w, victim, friend, bondTo);
    const ogre = addMonster(w, 1500, 400);
    return { w, victim, friend, ogre };
  }
  const knock = (w: W, victim: number, by: number) => {
    w.pendingDeaths.push({ victim, by });
    return run(w, TICK_MS);
  };

  it('a vengeful friend swears to hunt the monster that knocked a friend out', () => {
    const { w, victim, friend, ogre } = setup();
    const ev = knock(w, victim, ogre);
    expect(ev).toContainEqual({ kind: 'revenge', hero: friend, target: ogre, victim });
    expect(w.heroRuntime.get(friend)?.revenge?.target).toBe(ogre);
  });

  it('only vengeful heroes, and only friends of the victim, swear', () => {
    const calm = setup('brave');
    expect(knock(calm.w, calm.victim, calm.ogre).some((e) => e.kind === 'revenge')).toBe(false);
    const stranger = setup('vengeful', 0);
    expect(
      knock(stranger.w, stranger.victim, stranger.ogre).some((e) => e.kind === 'revenge'),
    ).toBe(false);
  });

  it('the avenger heads for the monster and fights it', () => {
    const { w, victim, friend, ogre } = setup();
    knock(w, victim, ogre);
    const start = Math.abs(unit(w, friend).pos.x - 1500);
    const ev = run(w, 40_000);
    expect(Math.abs(unit(w, friend).pos.x - 1500)).toBeLessThan(start - 200);
    expect(ev.some((e) => e.kind === 'hit' && e.attacker === friend && e.target === ogre)).toBe(
      true,
    );
  });

  it('killing the monster ends the oath with an avenged event', () => {
    const { w, victim, friend, ogre } = setup();
    knock(w, victim, ogre);
    unit(w, ogre).hp = 0;
    w.pendingDeaths.push({ victim: ogre, by: friend });
    const ev = run(w, TICK_MS);
    expect(ev).toContainEqual({ kind: 'avenged', hero: friend, target: ogre });
    expect(w.heroRuntime.get(friend)?.revenge).toBeUndefined();
  });

  it('the oath runs out after revengeMs', () => {
    const far = (ms: number) => {
      const { w, victim, friend, ogre } = setup();
      w.tuning.party.revengeMs = ms;
      knock(w, victim, ogre);
      unit(w, ogre).pos = { x: 3900, y: 100 };
      run(w, 5_000);
      return w.heroRuntime.get(friend)?.revenge;
    };
    expect(far(60_000)).toBeDefined();
    expect(far(2_000)).toBeUndefined();
  });

  it('is deterministic', () => {
    const go = () => {
      const { w, victim, ogre } = setup();
      knock(w, victim, ogre);
      return JSON.stringify([run(w, 20_000), snapshot(w).units]);
    };
    expect(go()).toBe(go());
  });
});
