import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, type GameData } from './api';
import { addBond, fleeThreshold, shareXp } from './parties';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 2000, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs: { ...attrs, str: 7, sta: 8 },
      weapon: { baseAttackS: 1.5, range: 40 },
      startGold: 50,
    },
  ],
  upgrades: [
    {
      id: 'iron-arms',
      name: 'Iron Arms',
      text: '+2 Str',
      effect: { attr: { str: 2 } },
    },
    {
      id: 'thick-hide',
      name: 'Thick Hide',
      text: '+2 Sta',
      effect: { attr: { sta: 2 } },
    },
    {
      id: 'odins-eye',
      name: "Odin's Eye",
      text: 'Heal and flee later',
      effect: { healPct: 50, flee: 0.15 },
    },
    { id: 'extra', name: 'Extra', text: 'x', effect: { attr: { dex: 1 } } },
  ],
};

function world(seed = 1) {
  return createWorld(seed, data);
}

describe('parties', () => {
  it('every hero arrives as a party of one with a trait', () => {
    const w = world();
    spawnHero(w, 'warrior', { x: 100, y: 100 });
    spawnHero(w, 'warrior', { x: 1900, y: 1100 });
    const s = snapshot(w);
    expect(s.parties).toHaveLength(2);
    expect(s.parties.every((p) => p.members.length === 1 && p.level === 1)).toBe(true);
    expect(s.units.filter((u) => u.kind === 'hero').every((u) => u.trait !== null)).toBe(true);
  });

  it('level 1 parties that meet merge, never above 4 members', () => {
    const w = world();
    for (let i = 0; i < 6; i++) spawnHero(w, 'warrior', { x: 300, y: 300 });
    step(w, 120_000);
    const s = snapshot(w);
    expect(s.parties.every((p) => p.members.length <= 4)).toBe(true);
    expect(s.parties.length).toBeLessThan(6);
    expect(s.events.some((e) => e.kind === 'partyFormed')).toBe(true);
  });

  it('far apart parties stay apart', () => {
    const w = world();
    spawnHero(w, 'warrior', { x: 100, y: 100 });
    spawnHero(w, 'warrior', { x: 1900, y: 1100 });
    step(w, 1_000);
    expect(snapshot(w).parties).toHaveLength(2);
  });

  it('party xp accumulates below the level threshold without an offer', () => {
    const w = world();
    const a = spawnHero(w, 'warrior', { x: 300, y: 300 });
    shareXp(w, a, 10);
    const p = snapshot(w).parties[0];
    expect(p.xp).toBe(10);
    expect(p.xpNext).toBe(30);
    expect(p.offer).toBeNull();
  });
});

describe('level up', () => {
  it('offers 3 distinct upgrades, waits for the pick, then applies it', () => {
    const w = world();
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('setup');
    const party = hero.party;
    const hpBefore = hero.maxHp;
    shareXp(w, id, 30);
    const s = snapshot(w);
    const offer = s.parties[0].offer;
    expect(s.parties[0].level).toBe(2);
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    expect(s.events.some((e) => e.kind === 'levelUp')).toBe(true);

    const t = w.timeMs;
    step(w, 5_000);
    expect(w.timeMs).toBe(t); // frozen while a pick is pending

    expect(command(w, { kind: 'pickUpgrade', party, upgrade: 'nope' })).toEqual({
      ok: false,
      reason: 'not offered',
    });
    const pick = offer?.includes('thick-hide') ? 'thick-hide' : (offer?.[0] ?? '');
    expect(command(w, { kind: 'pickUpgrade', party, upgrade: pick }).ok).toBe(true);
    expect(command(w, { kind: 'pickUpgrade', party, upgrade: pick })).toEqual({
      ok: false,
      reason: 'no pick pending',
    });
    if (pick === 'thick-hide') expect(hero.maxHp).toBe(hpBefore + 16);
    step(w, 1_000);
    expect(w.timeMs).toBeGreaterThan(t);
    expect(command(w, { kind: 'pickUpgrade', party: 999, upgrade: pick })).toEqual({
      ok: false,
      reason: 'unknown party',
    });
  });

  it('stat upgrades raise attributes and hp, tiers rise at levels 3 and 6', () => {
    const w = world();
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('setup');
    const base = hero.maxHp;
    const levelUp = () => {
      const party = w.parties.get(hero.party);
      shareXp(w, id, (party?.level ?? 1) * 30);
      const offer = w.parties.get(hero.party)?.offer ?? [];
      return command(w, { kind: 'pickUpgrade', party: hero.party, upgrade: offer[0] });
    };
    expect(levelUp().ok).toBe(true); // level 2
    expect(hero.tier).toBe(1);
    expect(levelUp().ok).toBe(true); // level 3
    expect(hero.tier).toBe(2);
    levelUp();
    levelUp();
    expect(levelUp().ok).toBe(true); // level 6
    expect(hero.tier).toBe(3);
    expect(hero.maxHp).toBeGreaterThanOrEqual(base);
  });

  it('Odins Eye style upgrades lower the flee threshold, traits scale it', () => {
    const w = world();
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('setup');
    hero.trait = 'loyal';
    expect(fleeThreshold(w, hero)).toBeCloseTo(0.3);
    hero.trait = 'brave';
    expect(fleeThreshold(w, hero)).toBeLessThan(0.3);
    hero.trait = 'coward';
    expect(fleeThreshold(w, hero)).toBeGreaterThan(0.3);
    const party = w.parties.get(hero.party);
    if (!party) throw new Error('setup');
    party.upgrades.push('odins-eye');
    hero.trait = 'loyal';
    expect(fleeThreshold(w, hero)).toBeCloseTo(0.15);
  });

  it('a hero that flees costs trust with party mates', () => {
    const w = world();
    const a = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const b = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const ua = w.units.find((u) => u.id === a);
    const ub = w.units.find((u) => u.id === b);
    if (!ua || !ub) throw new Error('setup');
    // Put both in one party, bonded.
    const party = w.parties.get(ua.party);
    if (!party) throw new Error('setup');
    w.parties.delete(ub.party);
    ub.party = ua.party;
    party.members.push(b);
    addBond(w, a, b, 2);
    ub.hp = 1;
    ub.trait = 'loyal';
    step(w, 100);
    expect(ub.mode).toBe('return');
    expect(w.bonds.get(`${Math.min(a, b)}:${Math.max(a, b)}`)).toBe(1);
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const w = world(seed);
      for (let i = 0; i < 4; i++) spawnHero(w, 'warrior', { x: 300 + i, y: 300 });
      step(w, 60_000);
      return JSON.stringify(snapshot(w));
    };
    expect(run(9)).toBe(run(9));
  });

  it('a played-out town: heroes form parties, win xp and level up through picks', () => {
    const full: GameData = {
      ...data,
      buildings: [{ id: 'temple_aesir', cost: 100 }],
      plots: [{ x: 700, y: 500 }],
      startGold: 500,
      monsters: [
        {
          id: 'draugr',
          attrs: { ...attrs, str: 2, sta: 2 },
          weapon: { baseAttackS: 2, range: 40 },
          bounty: 12,
          xp: 20,
        },
      ],
      lairs: [{ id: 'barrow', monster: 'draugr', spawnS: 5, maxAlive: 4, hp: 300 }],
      lairSites: [{ lair: 'barrow', pos: { x: 1000, y: 500 } }],
    };
    const w = createWorld(3, full);
    command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    let picks = 0;
    for (let i = 0; i < 6000; i++) {
      step(w, 100);
      for (const p of w.parties.values()) {
        if (p.offer) {
          command(w, { kind: 'pickUpgrade', party: p.id, upgrade: p.offer[0] });
          picks++;
        }
      }
    }
    expect(picks).toBeGreaterThan(0);
    expect([...w.parties.values()].some((p) => p.level > 1)).toBe(true);
  });
});
