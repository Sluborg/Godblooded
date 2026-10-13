import { describe, expect, it } from 'vitest';
import { createWorld, step, type GameData } from './api';
import { newParty, shareXp } from './parties';
import { offerCards } from './cards';
import { spawnHero } from './world';
import type { CardNeeds, CardRarity, UnitState, UpgradeDef } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const weapon = { baseAttackS: 1, range: 40 };

const card = (
  id: string,
  family: UpgradeDef['family'],
  rarity: CardRarity = 'common',
  needs?: CardNeeds,
  stack?: number,
): UpgradeDef => ({ id, name: id, text: id, effect: {}, family, rarity, needs, stack });

function mk(upgrades: UpgradeDef[], tuning: GameData['tuning'] = {}): GameData {
  return {
    buildings: [],
    startGold: 0,
    map: { width: 4000, height: 4000 },
    townHall: { x: 3800, y: 3800 },
    classes: [
      { id: 'knight', attrs: { ...none, str: 5, sta: 20 }, weapon, startGold: 0 },
      { id: 'mage', attrs: { ...none, int: 8, sta: 20 }, weapon, startGold: 0, spellMult: 0.8 },
    ],
    gods: [
      { id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'knight' },
      { id: 'athena', pantheon: 'greek', name: 'Athena', template: 'mage' },
    ],
    upgrades,
    tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 }, ...tuning },
  };
}

function party(data: GameData, gods: string[] = ['thor']) {
  const w = createWorld(1, data);
  const ids = gods.map((g) => spawnHero(w, g, { x: 500, y: 500 }));
  const pid = newParty(w, ids[0]);
  const p = w.parties.get(pid)!;
  for (const id of ids) {
    const u = w.units.find((x) => x.id === id)!;
    u.party = pid;
    if (id !== ids[0]) p.members.push(id);
  }
  return { w, p, ids };
}

describe('card offers', () => {
  it('offers three different cards', () => {
    const data = mk(['a', 'b', 'c', 'd', 'e'].map((id) => card(id, 'stats')));
    const { w, p } = party(data);
    p.level = 2;
    for (let i = 0; i < 20; i++) {
      const o = offerCards(w, p);
      expect(o).toHaveLength(3);
      expect(new Set(o).size).toBe(3);
    }
  });

  it('never offers a card whose needs the party fails, offers it when met', () => {
    const data = mk([
      card('plain', 'stats'),
      card('aesir', 'pantheon', 'common', { pantheon: 'aesir' }),
      card('greek', 'pantheon', 'common', { pantheon: 'greek' }),
      card('caster', 'stats', 'common', { caster: true }),
      card('tier2', 'skill', 'common', { tier: 2 }),
      card('thorcard', 'pantheon', 'common', { god: 'thor' }),
    ]);
    const { w, p } = party(data);
    p.level = 3;
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) offerCards(w, p).forEach((id) => seen.add(id));
    expect([...seen].sort()).toEqual(['aesir', 'plain', 'thorcard']);
    const both = party(data, ['thor', 'athena']);
    both.p.level = 3;
    const seen2 = new Set<string>();
    for (let i = 0; i < 60; i++) offerCards(both.w, both.p).forEach((id) => seen2.add(id));
    expect(seen2.has('greek')).toBe(true);
    expect(seen2.has('caster')).toBe(true);
    expect(seen2.has('tier2')).toBe(false);
  });

  it('stat cards stack three times, other families once, no family any number', () => {
    const data = mk([
      card('s', 'stats'),
      card('n', 'nerve'),
      { id: 'old', name: 'old', text: '', effect: {} },
    ]);
    const { w, p } = party(data);
    p.level = 3;
    p.upgrades = ['s', 's', 'n', 'old', 'old', 'old', 'old'];
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) offerCards(w, p).forEach((id) => seen.add(id));
    expect(seen.has('s')).toBe(true);
    expect(seen.has('n')).toBe(false);
    expect(seen.has('old')).toBe(true);
    p.upgrades.push('s');
    const after = new Set<string>();
    for (let i = 0; i < 20; i++) offerCards(w, p).forEach((id) => after.add(id));
    expect(after.has('s')).toBe(false);
  });

  it('rarity follows the weights of the party level band', () => {
    const data = mk(
      [
        ...['c1', 'c2', 'c3', 'c4'].map((id) => card(id, 'stats', 'common')),
        ...['r1', 'r2', 'r3', 'r4'].map((id) => card(id, 'nerve', 'rare')),
        ...['e1', 'e2', 'e3', 'e4'].map((id) => card(id, 'sustain', 'epic')),
      ],
      { party: { rarity: { low: [0, 100, 0], mid: [0, 0, 100], high: [100, 0, 0] } } },
    );
    const { w, p } = party(data);
    const kinds = (level: number) => {
      p.level = level;
      return offerCards(w, p).map((id) => id[0]);
    };
    expect(kinds(2)).toEqual(['r', 'r', 'r']);
    expect(kinds(5)).toEqual(['e', 'e', 'e']);
    expect(kinds(6)).toEqual(['c', 'c', 'c']);
  });

  it('one card in the offer is fitted to the party when one is eligible', () => {
    const data = mk(
      [
        ...['a', 'b', 'c', 'd', 'e', 'f'].map((id) => card(id, 'stats')),
        card('fit', 'pantheon', 'common', { pantheon: 'aesir' }),
      ],
      { party: { rarity: { low: [100, 0, 0], mid: [100, 0, 0], high: [100, 0, 0] } } },
    );
    const { w, p } = party(data);
    p.level = 2;
    for (let i = 0; i < 30; i++) expect(offerCards(w, p)).toContain('fit');
  });

  it('level 7 offers the favour cards of the gods in the party, topped up with epics', () => {
    const data = mk([
      card('plain', 'stats'),
      card('big', 'sustain', 'epic'),
      card('fav-thor', 'favour', 'epic', { god: 'thor' }),
      card('fav-athena', 'favour', 'epic', { god: 'athena' }),
    ]);
    const solo = party(data);
    solo.p.level = 7;
    const o = offerCards(solo.w, solo.p);
    expect(o).toContain('fav-thor');
    expect(o).not.toContain('fav-athena');
    expect(o).toContain('big');
    const duo = party(data, ['thor', 'athena']);
    duo.p.level = 7;
    expect(offerCards(duo.w, duo.p)).toEqual(
      expect.arrayContaining(['fav-thor', 'fav-athena', 'big']),
    );
    // Favour cards are never offered at other levels.
    duo.p.level = 6;
    for (let i = 0; i < 20; i++) {
      expect(offerCards(duo.w, duo.p).some((id) => id.startsWith('fav-'))).toBe(false);
    }
  });

  it('a party stops levelling at maxLevel, its XP still counts', () => {
    const data = mk([card('a', 'stats'), card('b', 'stats'), card('c', 'stats')], {
      party: { maxLevel: 2, xpPerLevel: 10 },
    });
    const { w, p, ids } = party(data);
    shareXp(w, ids[0], 10);
    expect(p.level).toBe(2);
    p.offer = null;
    shareXp(w, ids[0], 500);
    expect(p.level).toBe(2);
    expect(p.offer).toBeNull();
    expect(p.xp).toBeGreaterThan(400);
  });

  it('with autoPick the party takes a card itself, weighted by its leader, without pausing', () => {
    const cards: UpgradeDef[] = [
      { ...card('plain', 'stats'), pickTag: 'sight' },
      { ...card('sword', 'stats'), pickTag: 'attack', god: 'athena' },
      { ...card('shield', 'stats'), pickTag: 'defence' },
      { ...card('coin', 'stats'), pickTag: 'gold', god: 'thor' },
      { ...card('herb', 'stats'), pickTag: 'sustain' },
      { ...card('oath', 'stats'), pickTag: 'nerve' },
    ];
    // A huge weight makes the trait's choice certain, so the table can be checked.
    const pick = (trait: UnitState['trait'], pool = cards) => {
      const data = mk(pool, {
        party: { autoPick: true, offerSize: 6, xpPerLevel: 10, traitPickWeight: 1e9 },
      });
      const { w, p, ids } = party(data);
      const leader = w.units.find((u) => u.id === ids[0])!;
      leader.trait = trait;
      shareXp(w, ids[0], 10);
      expect(p.level).toBe(2);
      expect(p.offer).toBeNull();
      const picked = w.events.filter((e) => e.kind === 'upgradePicked');
      expect(picked).toHaveLength(1);
      expect(p.upgrades).toHaveLength(1);
      expect(picked[0]).toMatchObject({ party: p.id, auto: true, hero: leader.id });
      return { card: p.upgrades[0], event: picked[0] };
    };
    expect(pick('brave').card).toBe('sword');
    // proud: attack cards and its own god's (thor's coin)
    expect(['sword', 'coin']).toContain(pick('proud').card);
    expect(pick('coward').card).toBe('shield');
    expect(pick('greedy').card).toBe('coin');
    expect(pick('curious').card).toBe('plain');
    // loyal: sustain cards and its own god's
    expect(['herb', 'coin']).toContain(pick('loyal').card);
    // vengeful looks for attack and nerve
    expect(['sword', 'oath']).toContain(pick('vengeful').card);
    // greedy with no gold card in the offer looks for attack
    expect(
      pick(
        'greedy',
        cards.filter((c) => c.pickTag !== 'gold'),
      ).card,
    ).toBe('sword');
    // the event names the god that offers the card
    expect(pick('greedy').event).toMatchObject({ god: 'thor' });
    expect(pick('coward').event).toMatchObject({ god: 'thor' });
  });

  it('the draw is weighted, not forced: a matching card is likelier at the default weight', () => {
    const cards: UpgradeDef[] = [
      { ...card('a', 'stats'), pickTag: 'attack' },
      { ...card('b', 'stats'), pickTag: 'sight' },
      { ...card('c', 'stats'), pickTag: 'gold' },
    ];
    let attack = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const { w, p, ids } = party(mk(cards, { party: { xpPerLevel: 10 } }));
      void seed;
      const leader = w.units.find((u) => u.id === ids[0])!;
      leader.trait = 'brave';
      // each loop draws a different part of the seeded stream
      for (let i = 0; i < seed; i++) w.rng();
      shareXp(w, ids[0], 10);
      if (p.upgrades[0] === 'a') attack++;
    }
    // weight 3 against 1 and 1: expected 60%
    expect(attack).toBeGreaterThan(150);
    expect(attack).toBeLessThan(220);
  });

  it('the leader is the first member that is not knocked out', () => {
    const cards: UpgradeDef[] = [
      { ...card('sword', 'stats'), pickTag: 'attack' },
      { ...card('shield', 'stats'), pickTag: 'defence' },
    ];
    const { w, p, ids } = party(
      mk(cards, { party: { autoPick: true, offerSize: 2, xpPerLevel: 10, traitPickWeight: 1e9 } }),
      ['thor', 'thor'],
    );
    w.units.find((u) => u.id === ids[0])!.trait = 'brave';
    w.units.find((u) => u.id === ids[0])!.ko = true;
    w.units.find((u) => u.id === ids[1])!.trait = 'coward';
    shareXp(w, ids[1], 10);
    expect(p.upgrades[0]).toBe('shield');
  });

  it('autoPick levels through several levels at once; off, the offer waits', () => {
    const cards = ['a', 'b', 'c', 'd', 'e'].map((id) => card(id, 'stats'));
    const auto = party(mk(cards, { party: { autoPick: true, xpPerLevel: 10 } }));
    shareXp(auto.w, auto.ids[0], 10 + 20 + 30);
    expect(auto.p.level).toBe(4);
    expect(auto.p.upgrades).toHaveLength(3);
    const manual = party(mk(cards, { party: { autoPick: false, xpPerLevel: 10 } }));
    shareXp(manual.w, manual.ids[0], 10 + 20 + 30);
    expect(manual.p.level).toBe(2);
    expect(manual.p.offer).toHaveLength(3);
  });

  it('an open offer from an old save is taken by the party itself on load', () => {
    const cards = ['a', 'b', 'c'].map((id) => card(id, 'stats'));
    const { w, p } = party(mk(cards, { party: { autoPick: true } }));
    p.offer = ['a', 'b', 'c'];
    step(w, 1_000);
    expect(p.offer).toBeNull();
    expect(p.upgrades).toHaveLength(1);
  });

  it('a pending pick slows the run to offerSlowdown instead of freezing it', () => {
    const cards = ['a', 'b', 'c'].map((id) => card(id, 'stats'));
    const { w, p } = party(mk(cards, { party: { autoPick: false, offerSlowdown: 0.3 } }));
    p.offer = ['a', 'b', 'c'];
    const t = w.timeMs;
    step(w, 1_000);
    expect(w.timeMs - t).toBe(300);
    const frozen = party(mk(cards, { party: { autoPick: false, offerSlowdown: 0 } }));
    frozen.p.offer = ['a', 'b', 'c'];
    step(frozen.w, 1_000);
    expect(frozen.w.timeMs).toBe(0);
  });
});
