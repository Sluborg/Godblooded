import { describe, expect, it } from 'vitest';
import { GRAYBOX } from '../data/graybox';
import { command, createWorld, snapshot, step } from './api';
import { slayHero } from './deaths';
import { spawnHero } from './world';

const data = {
  ...GRAYBOX,
  miracles: [
    {
      id: 'storm',
      pantheon: 'aesir',
      radius: 250,
      effects: [
        { kind: 'damage', to: 'foes', amount: 60, type: 'lightning', strikes: 6, overS: 3 },
      ],
    },
  ],
  tuning: {
    ...GRAYBOX.tuning,
    nodes: { enabled: true },
    town: { ...GRAYBOX.tuning?.town, hallTiers: false },
  },
} as typeof GRAYBOX;

function town() {
  const w = createWorld(1, data);
  w.gold = 5000;
  const r = command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
  if (!r.ok) throw new Error(r.reason);
  w.ambrosia = 500;
  return { w, temple: r.id };
}

describe('Ambrosia purchases', () => {
  it('are off while nodes are off', () => {
    const w = createWorld(1, GRAYBOX);
    w.gold = 5000;
    const r = command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    w.ambrosia = 500;
    const id = r.ok ? r.id : -1;
    expect(command(w, { kind: 'upgradeWithAmbrosia', building: id }).ok).toBe(false);
    expect(command(w, { kind: 'offering', building: id }).ok).toBe(false);
  });

  it('buy a temple tier for 60 then 100 Ambrosia, no gold', () => {
    const { w, temple } = town();
    const gold = w.gold;
    expect(command(w, { kind: 'upgradeWithAmbrosia', building: temple }).ok).toBe(true);
    expect(w.ambrosia).toBe(440);
    expect(command(w, { kind: 'upgradeWithAmbrosia', building: temple }).ok).toBe(true);
    expect(w.ambrosia).toBe(340);
    expect(w.buildings.find((b) => b.id === temple)?.tier).toBe(3);
    expect(command(w, { kind: 'upgradeWithAmbrosia', building: temple })).toMatchObject({
      reason: 'already at the top tier',
    });
    expect(w.gold).toBe(gold);
    w.ambrosia = 10;
    const w2 = town();
    w2.w.ambrosia = 10;
    expect(command(w2.w, { kind: 'upgradeWithAmbrosia', building: w2.temple })).toMatchObject({
      reason: 'not enough ambrosia',
    });
  });

  it('an Offering fills the pantheon favour bar', () => {
    const { w, temple } = town();
    expect(command(w, { kind: 'offering', building: temple }).ok).toBe(true);
    expect(w.ambrosia).toBe(460);
    const bar = snapshot(w).favour.find((f) => f.pantheon === 'aesir');
    expect(bar?.value).toBe(bar?.max);
    expect(command(w, { kind: 'offering', building: 9999 }).ok).toBe(false);
  });

  it('Recall the Fallen brings a slain hero back at its level and path, once', () => {
    const { w, temple } = town();
    const id = spawnHero(w, 'odin', { x: 100, y: 100 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('no hero');
    const party = w.parties.get(hero.party);
    if (party) party.level = 4;
    hero.path = 'path-test';
    hero.tier = 2;
    slayHero(w, hero);
    const grave = w.graves[0];
    expect(grave.level).toBe(4);
    const before = w.ambrosia;
    const r = command(w, { kind: 'recallFallen', building: temple, grave: grave.id });
    expect(r.ok).toBe(true);
    expect(w.ambrosia).toBe(before - 80);
    const back = w.units.find((u) => r.ok && u.id === r.id);
    expect(back).toMatchObject({ god: 'odin', path: 'path-test', tier: 2, kind: 'hero' });
    expect(w.parties.get(back?.party ?? 0)?.level).toBe(4);
    expect(command(w, { kind: 'recallFallen', building: temple, grave: grave.id })).toMatchObject({
      reason: 'already recalled',
    });
    step(w, 1000);
  });

  it('Recall only works at a temple of the hero pantheon', () => {
    const w = createWorld(1, data);
    w.gold = 5000;
    w.ambrosia = 500;
    const shrine = command(w, { kind: 'build', type: 'shrine', plot: 1 });
    const id = spawnHero(w, 'odin', { x: 100, y: 100 });
    const hero = w.units.find((u) => u.id === id);
    if (!hero) throw new Error('no hero');
    slayHero(w, hero);
    expect(
      command(w, {
        kind: 'recallFallen',
        building: shrine.ok ? shrine.id : -1,
        grave: w.graves[0].id,
      }).ok,
    ).toBe(false);
    expect(command(w, { kind: 'recallFallen', building: 1, grave: 12345 }).ok).toBe(false);
  });
});
