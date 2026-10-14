import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData } from './api';
import { spawnMonster } from './boss';
import { addBond, bond, newParty } from './parties';
import {
  hasCritStagger,
  hasSkillsReady,
  passiveBondMult,
  passiveFlagMult,
  passiveGoldMult,
  passiveHealOnKill,
  passivePhalanx,
  passiveReviveHp,
  passiveTwinCast,
  runRegen,
} from './passives';
import { landStrike } from './strike';
import { spawnHero } from './world';
import type { PassiveKeys, UnitState } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const KEYS: Record<string, PassiveKeys> = {
  phalanx: { phalanx: { armour: 3, within: 100, members: 3 } },
  einherjar: { koReviveHp: 0.5, koMult: 0.5 },
  kleos: { goldMult: 1.5 },
  hunters: { flagMult: 1.5 },
  oath: { bondMult: 2 },
  scarab: { healOnKill: 0.03 },
  metis: { crit: 0.1, critStagger: true },
  twin: { twinCast: 0.25 },
  gambit: { skillsReady: true },
  apollo: { regen: 0.01 },
  stand: { lastStand: 3000 },
  bond: { healSplash: 0.5 },
  oathstay: { loyalStays: true },
};
const data: GameData = {
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'cleric',
      attrs: { ...none, int: 10, wp: 10, sta: 20 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
      heals: true,
    },
    {
      id: 'knight',
      attrs: { ...none, str: 5, sta: 30 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'imp',
      attrs: { ...none, str: 40, sta: 5 },
      weapon: { baseAttackS: 1, range: 40 },
      bounty: 1,
      xp: 1,
    },
  ],
  upgrades: Object.entries(KEYS).map(([id, keys]) => ({
    id,
    name: id,
    text: id,
    effect: { keys },
  })),
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
};

function squad(cards: string[], n = 3, spread = 20) {
  const w = createWorld(1, data);
  const ids = Array.from({ length: n }, (_, i) =>
    spawnHero(w, 'knight', { x: 500 + i * spread, y: 500 }),
  );
  const pid = newParty(w, ids[0]);
  const party = w.parties.get(pid)!;
  for (const id of ids) {
    const u = w.units.find((x) => x.id === id)!;
    u.party = pid;
    if (id !== ids[0]) party.members.push(id);
  }
  party.upgrades.push(...cards);
  const units = ids.map((id) => w.units.find((x) => x.id === id) as UnitState);
  return { w, party, units };
}

describe('card keys', () => {
  it('Phalanx: armour only while enough members stand close', () => {
    const near = squad(['phalanx']);
    expect(passivePhalanx(near.w, near.units[0])).toBe(3);
    const far = squad(['phalanx'], 3, 300);
    expect(passivePhalanx(far.w, far.units[0])).toBe(0);
    expect(passivePhalanx(squad([]).w, near.units[0])).toBe(0);
  });

  it('numeric keys fold over the cards taken', () => {
    const s = squad(['einherjar', 'kleos', 'hunters', 'oath', 'scarab', 'twin']);
    const [u] = s.units;
    expect(passiveReviveHp(s.w, u)).toBe(0.5);
    expect(passiveGoldMult(s.w, u)).toBe(1.5);
    expect(passiveFlagMult(s.w, u)).toBe(1.5);
    expect(passiveBondMult(s.w, u)).toBe(2);
    expect(passiveHealOnKill(s.w, u)).toBeCloseTo(0.03);
    expect(passiveTwinCast(s.w, u)).toBe(0.25);
    const plain = squad([]);
    expect(passiveGoldMult(plain.w, plain.units[0])).toBe(1);
    expect(passiveReviveHp(plain.w, plain.units[0])).toBe(0);
  });

  it('flags keys', () => {
    const s = squad(['metis', 'gambit']);
    expect(hasCritStagger(s.w, s.units[0])).toBe(true);
    expect(hasSkillsReady(s.w, s.units[0])).toBe(true);
    expect(hasCritStagger(squad([]).w, squad([]).units[0])).toBe(false);
  });

  it('Oath-Brothers: bonds grow twice as fast, losses are not doubled', () => {
    const a = squad([]);
    addBond(a.w, a.units[0].id, a.units[1].id, 1);
    const b = squad(['oath']);
    addBond(b.w, b.units[0].id, b.units[1].id, 1);
    expect(bond(b.w, b.units[0].id, b.units[1].id)).toBe(
      2 * bond(a.w, a.units[0].id, a.units[1].id),
    );
    addBond(b.w, b.units[0].id, b.units[1].id, -1);
    expect(bond(b.w, b.units[0].id, b.units[1].id)).toBe(1);
  });

  it('Apollo: heroes heal each second only while in a fight', () => {
    const s = squad(['apollo'], 1);
    const [u] = s.units;
    u.hp = u.maxHp * 0.5;
    const before = u.hp;
    s.w.tick = 20;
    runRegen(s.w);
    expect(u.hp).toBe(before);
    const rt = s.w.unitRuntime.get(u.id);
    if (!rt) throw new Error('no runtime');
    rt.fightUntilMs = s.w.timeMs + 5_000;
    runRegen(s.w);
    expect(u.hp).toBeCloseTo(before + u.maxHp * 0.01);
  });

  it('Last Stand: once per fight a lethal hit leaves 1 hp, and nothing lands lower for 3 s', () => {
    const s = squad(['stand'], 1);
    const [hero] = s.units;
    const wid = spawnHero(s.w, 'knight', { x: 520, y: 500 });
    const foe = s.w.units.find((x) => x.id === wid) as UnitState;
    foe.kind = 'monster';
    foe.type = 'imp';
    s.w.unitRuntime.set(foe.id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
    hero.hp = 3;
    const hit = () => landStrike(s.w, foe, hero, { attrs: { ...none, str: 40 }, power: 40 });
    hit();
    expect(hero.hp).toBe(1);
    hit();
    expect(hero.hp).toBe(1);
    for (let t = 0; t < 3_500; t += TICK_MS) s.w.timeMs += TICK_MS;
    hit();
    expect(hero.hp).toBe(0);
  });

  it('Mending Bond: a heal also touches the most hurt second ally', () => {
    const run = (cards: string[]) => {
      const w = createWorld(1, data);
      const ids = ['cleric', 'knight', 'knight'].map((c, i) =>
        spawnHero(w, c, { x: 500 + i * 20, y: 500 }),
      );
      const pid = newParty(w, ids[0]);
      const party = w.parties.get(pid)!;
      for (const id of ids) {
        const u = w.units.find((x) => x.id === id)!;
        u.party = pid;
        if (id !== ids[0]) party.members.push(id);
        u.mode = 'rest';
      }
      party.upgrades.push(...cards);
      const [, a, b] = ids.map((id) => w.units.find((x) => x.id === id) as UnitState);
      a.hp = a.maxHp * 0.3;
      b.hp = b.maxHp * 0.5;
      const bHp = b.hp;
      for (let t = 0; t < 2_000; t += TICK_MS) step(w, TICK_MS);
      return { aGain: a.hp - a.maxHp * 0.3, bGain: b.hp - bHp };
    };
    const base = run([]);
    const splash = run(['bond']);
    expect(base.aGain).toBeGreaterThan(0);
    expect(splash.bGain).toBeGreaterThan(base.bGain);
  });
});

describe('Oath-Brothers: loyal stays', () => {
  const stays = (trait: 'loyal' | 'brave', cards: string[], mates: number) => {
    const s = squad(cards, 1 + mates);
    const [u] = s.units;
    u.trait = trait;
    u.mode = 'explore';
    u.hp = u.maxHp * 0.05;
    for (const m of s.units.slice(1)) m.mode = 'explore';
    step(s.w, TICK_MS);
    return u.mode;
  };
  it('does not flee alone with a mate standing, a plain loyal hero does', () => {
    expect(stays('loyal', ['oathstay'], 1)).toBe('explore');
    expect(stays('loyal', [], 1)).toBe('return');
    expect(stays('brave', ['oathstay'], 1)).toBe('return');
  });
  it('flees when it is the last one standing', () => {
    expect(stays('loyal', ['oathstay'], 0)).toBe('return');
  });
});

describe('everyNth.strike: the nth basic strike changes type', () => {
  it('every 2nd strike is holy and the others stay physical', () => {
    const w = createWorld(1, {
      ...data,
      monsters: [
        {
          id: 'ogre',
          attrs: { ...none, str: 1, sta: 400 },
          weapon: { baseAttackS: 3, range: 40 },
          bounty: 1,
          xp: 1,
        },
      ],
      lairs: [{ id: 'den', monster: 'ogre', spawnS: 100_000, maxAlive: 1, hp: 500 }],
      lairSites: [{ lair: 'den', pos: { x: 900, y: 900 } }],
      upgrades: [
        {
          id: 'ra',
          name: 'ra',
          text: 'ra',
          effect: {
            keys: { everyNth: { n: 2, effects: [], strike: { type: 'holy' as const } } },
          },
        },
      ],
    });
    const id = spawnHero(w, 'knight', { x: 500, y: 500 });
    const hero = w.units.find((u) => u.id === id) as UnitState;
    w.parties.get(hero.party)?.upgrades.push('ra');
    const lair = w.lairs[0];
    const ogre = spawnMonster(w, lair, (w.data.monsters ?? [])[0]);
    ogre.pos = { x: 520, y: 500 };
    const types: string[] = [];
    for (let t = 0; t < 12_000 && types.length < 6; t += TICK_MS) {
      step(w, TICK_MS);
      for (const e of snapshot(w).events) {
        if (e.kind === 'hit' && e.attacker === id) types.push(e.type ?? 'physical');
      }
    }
    expect(types.length).toBeGreaterThanOrEqual(4);
    types.forEach((ty, i) => expect(ty).toBe(i % 2 === 1 ? 'holy' : 'physical'));
  });
});
