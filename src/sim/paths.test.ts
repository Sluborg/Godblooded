import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, type GameData, type SimEvent } from './api';
import { shareXp } from './parties';
import { maxHp } from './units';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const cls = (id: string, over: Partial<typeof attrs> = {}) => ({
  id,
  attrs: { ...attrs, ...over },
  weapon: { baseAttackS: 1.5, range: 40 },
  startGold: 0,
});
const data: GameData = {
  buildings: [
    { id: 'temple_aesir', cost: 10 },
    { id: 'shrine_greek', cost: 10, pantheon: 'greek' },
  ],
  plots: [
    { x: 700, y: 500 },
    { x: 800, y: 500 },
  ],
  startGold: 100,
  map: { width: 2000, height: 1200 },
  townHall: { x: 1800, y: 1100 },
  classes: [
    cls('warrior'),
    cls('paladin', { sta: 9, str: 3 }),
    cls('wizard', { str: 2, int: 8 }),
    cls('rogue', { dex: 7 }),
  ],
  gods: [
    { id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'warrior' },
    { id: 'loki', pantheon: 'aesir', name: 'Loki', template: 'rogue' },
    { id: 'odin', pantheon: 'aesir', name: 'Odin', template: 'wizard' },
    { id: 'ares', pantheon: 'greek', name: 'Ares', template: 'warrior' },
  ],
  upgrades: [{ id: 'iron-arms', name: 'Iron Arms', text: '+2 Str', effect: { attr: { str: 2 } } }],
  paths: [
    {
      id: 'thor-hammer',
      god: 'thor',
      template: 'paladin',
      name: 'Hammerborn',
      attrs: [{ sta: 2 }, { sta: 4 }],
    },
    {
      id: 'thor-storm',
      god: 'thor',
      template: 'wizard',
      name: 'Stormcaller',
      attrs: [{ int: 1 }, { int: 3 }],
    },
    {
      id: 'loki-trickster',
      god: 'loki',
      template: 'rogue',
      name: 'Trickster',
      attrs: [{ dex: 2 }, { dex: 4 }],
    },
    {
      id: 'ares-warlord',
      god: 'ares',
      template: 'warrior',
      name: 'Warlord',
      attrs: [{ str: 1 }, { str: 3 }],
    },
  ],
  tuning: {
    town: { raidFirstMs: 10_000_000 },
    hero: { firstRecruitMs: 10_000_000 },
    party: { autoPick: false, offerSlowdown: 0 },
  },
};

function setup(builds: number[] = []) {
  const w = createWorld(1, data);
  const types = ['temple_aesir', 'shrine_greek'];
  for (const plot of builds) command(w, { kind: 'build', type: types[plot], plot });
  return w;
}

const hero = (w: ReturnType<typeof createWorld>, id: number) => {
  const u = w.units.find((x) => x.id === id);
  if (!u) throw new Error('hero');
  return u;
};

// Gives the hero's party exactly one level.
function levelUp(w: ReturnType<typeof createWorld>, id: number) {
  const party = w.parties.get(hero(w, id).party);
  if (!party) throw new Error('party');
  shareXp(w, id, party.level * 30);
  const offer = party.offer;
  if (offer && !party.pathOffer)
    command(w, { kind: 'pickUpgrade', party: party.id, upgrade: offer[0] });
}

function toLevel(w: ReturnType<typeof createWorld>, id: number, level: number) {
  while ((w.parties.get(hero(w, id).party)?.level ?? 0) < level) levelUp(w, id);
}

describe('paths of the gods', () => {
  it('the only path of a god is taken at level 3, with its template, and tier 2 starts', () => {
    const w = setup();
    const id = spawnHero(w, 'loki', { x: 300, y: 300 });
    toLevel(w, id, 2);
    expect(hero(w, id)).toMatchObject({ tier: 1, god: 'loki', path: null, type: 'rogue' });
    levelUp(w, id);
    expect(hero(w, id)).toMatchObject({ tier: 2, path: 'loki-trickster', type: 'rogue' });
    const ev = snapshot(w).events.filter((e) => e.kind === 'tierUp');
    expect(ev).toContainEqual({ kind: 'tierUp', unit: id, tier: 2, path: 'loki-trickster' });
  });

  it('two free paths of its own god make a card, and the path template takes over', () => {
    const w = setup();
    const id = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, id, 3);
    const party = hero(w, id).party;
    const snap = snapshot(w);
    expect(snap.parties.find((p) => p.id === party)?.pathOffer).toEqual({
      hero: id,
      options: ['thor-hammer', 'thor-storm'],
    });
    expect(snap.events.some((e) => e.kind === 'pathOffer')).toBe(true);
    expect(hero(w, id)).toMatchObject({ tier: 1, path: null, type: 'warrior' });
    // Another god's path and an unknown one are not on the card.
    expect(command(w, { kind: 'pickPath', party, path: 'loki-trickster' })).toEqual({
      ok: false,
      reason: 'not offered',
    });
    expect(command(w, { kind: 'pickPath', party: 999, path: 'thor-hammer' }).ok).toBe(false);
    expect(command(w, { kind: 'pickPath', party, path: 'thor-hammer' }).ok).toBe(true);
    expect(hero(w, id)).toMatchObject({ tier: 2, path: 'thor-hammer', type: 'paladin' });
    expect(w.parties.get(party)?.pathOffer).toBeNull();
    expect(command(w, { kind: 'pickPath', party, path: 'thor-hammer' }).ok).toBe(false);
  });

  it('a hero is only offered the paths of its own god', () => {
    const w = setup();
    const id = spawnHero(w, 'loki', { x: 300, y: 300 });
    const other = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, id, 3);
    toLevel(w, other, 3);
    expect(hero(w, id).path).toBe('loki-trickster');
    expect(w.parties.get(hero(w, other).party)?.pathOffer?.options).toEqual([
      'thor-hammer',
      'thor-storm',
    ]);
  });

  it('attributes come from the path template plus the path bonus', () => {
    const w = setup();
    const id = spawnHero(w, 'thor', { x: 300, y: 300 });
    expect(hero(w, id).maxHp).toBe(maxHp(cls('warrior').attrs));
    toLevel(w, id, 3);
    command(w, { kind: 'pickPath', party: hero(w, id).party, path: 'thor-hammer' });
    const up = w.parties.get(hero(w, id).party)?.upgrades.length ?? 0;
    expect(up).toBe(1);
    // paladin template (sta 9, str 3) + tier 2 bonus (sta +2) + the picked upgrade (str +2)
    expect(hero(w, id).maxHp).toBe(maxHp({ ...cls('paladin').attrs, sta: 11, str: 5 }));
  });

  it('level 6 gives tier 3 on the same path and the tier 3 bonus replaces the tier 2 one', () => {
    const w = setup();
    const id = spawnHero(w, 'loki', { x: 300, y: 300 });
    toLevel(w, id, 3);
    const tier2 = hero(w, id).maxHp;
    toLevel(w, id, 6);
    expect(hero(w, id)).toMatchObject({ tier: 3, path: 'loki-trickster', type: 'rogue' });
    // Loki's bonus is dex only, so hp moves only through the upgrades picked on the way (str).
    expect(hero(w, id).maxHp).toBeGreaterThanOrEqual(tier2);
    const hammer = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, hammer, 3);
    command(w, { kind: 'pickPath', party: hero(w, hammer).party, path: 'thor-hammer' });
    const at2 = hero(w, hammer).maxHp;
    const strAt2 = 2 * (w.parties.get(hero(w, hammer).party)?.upgrades.length ?? 0);
    toLevel(w, hammer, 6);
    expect(hero(w, hammer)).toMatchObject({ tier: 3, path: 'thor-hammer', type: 'paladin' });
    const strNow = 2 * (w.parties.get(hero(w, hammer).party)?.upgrades.length ?? 0);
    // tier 3 total sta bonus is 4, not 2 + 4: hp rises by 2 sta plus the new upgrades' str.
    expect(hero(w, hammer).maxHp - at2).toBe(2 * 8 + (strNow - strAt2) * 4);
  });

  it('a hurt hero never drops to 0 hp when its path template has a lower max hp', () => {
    const w = setup();
    const id = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, id, 2);
    hero(w, id).hp = 5;
    const before = hero(w, id).maxHp;
    levelUp(w, id);
    command(w, { kind: 'pickPath', party: hero(w, id).party, path: 'thor-storm' });
    expect(hero(w, id).maxHp).toBeLessThan(before);
    expect(hero(w, id).hp).toBe(1);
    expect(hero(w, id).ko).toBe(false);
  });

  it('the path card comes before the upgrade card and freezes the world', () => {
    const w = setup();
    const id = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, id, 2);
    const party = hero(w, id).party;
    shareXp(w, id, 60);
    const p = w.parties.get(party);
    expect(p?.pathOffer).not.toBeNull();
    expect(p?.offer).not.toBeNull();
    expect(command(w, { kind: 'pickUpgrade', party, upgrade: (p?.offer ?? [])[0] })).toEqual({
      ok: false,
      reason: 'pick a path first',
    });
    const t = w.timeMs;
    step(w, 1_000);
    expect(w.timeMs).toBe(t);
    command(w, { kind: 'pickPath', party, path: 'thor-storm' });
    expect(command(w, { kind: 'pickUpgrade', party, upgrade: (p?.offer ?? [])[0] }).ok).toBe(true);
  });

  it('siblings of a god take different paths; the second takes the last free one', () => {
    const w = setup();
    const a = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, a, 3);
    command(w, { kind: 'pickPath', party: hero(w, a).party, path: 'thor-hammer' });
    const b = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, b, 3);
    // one path left for b: taken without a card
    expect(w.parties.get(hero(w, b).party)?.pathOffer).toBeNull();
    expect(hero(w, a)).toMatchObject({ tier: 2, path: 'thor-hammer', type: 'paladin' });
    expect(hero(w, b)).toMatchObject({ tier: 2, path: 'thor-storm', type: 'wizard' });
  });

  it('a third child of a god has no free path and stays tier 1', () => {
    const w = setup();
    for (let i = 0; i < 2; i++) {
      const id = spawnHero(w, 'thor', { x: 300, y: 300 });
      toLevel(w, id, 3);
      command(w, {
        kind: 'pickPath',
        party: hero(w, id).party,
        path: i === 0 ? 'thor-hammer' : 'thor-storm',
      });
    }
    const c = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, c, 6);
    step(w, 2_000);
    expect(hero(w, c)).toMatchObject({ tier: 1, path: null, type: 'warrior' });
  });

  it('a god with no path rows tiers by level alone', () => {
    const w = setup();
    const id = spawnHero(w, 'odin', { x: 300, y: 300 });
    toLevel(w, id, 3);
    expect(hero(w, id)).toMatchObject({ tier: 2, path: null, type: 'wizard' });
    toLevel(w, id, 6);
    expect(hero(w, id).tier).toBe(3);
  });

  it('a path needs no built temple: the hero already came from its pantheon', () => {
    const w = setup();
    const id = spawnHero(w, 'ares', { x: 300, y: 300 });
    toLevel(w, id, 3);
    expect(hero(w, id)).toMatchObject({ tier: 2, path: 'ares-warlord' });
  });

  it('pantheon comes from the god; availability from the temple row or temple_<pantheon>', () => {
    const w = setup([1]);
    const paths = snapshot(w).paths;
    expect(paths.find((p) => p.id === 'ares-warlord')).toMatchObject({
      pantheon: 'greek',
      god: 'ares',
      template: 'warrior',
      available: true,
    });
    expect(paths.find((p) => p.id === 'thor-hammer')).toMatchObject({
      pantheon: 'aesir',
      template: 'paladin',
      available: false,
    });
    command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    expect(snapshot(w).paths.every((p) => p.available)).toBe(true);
  });

  it('snapshot units carry god and path, and paths show who holds them', () => {
    const w = setup();
    const id = spawnHero(w, 'loki', { x: 300, y: 300 });
    toLevel(w, id, 3);
    expect(snapshot(w).paths.find((p) => p.id === 'loki-trickster')?.takenBy).toBe(id);
    expect(snapshot(w).units.find((u) => u.id === id)).toMatchObject({
      god: 'loki',
      path: 'loki-trickster',
    });
  });

  it('two heroes of one party queue one card at a time', () => {
    const w = setup();
    const a = spawnHero(w, 'thor', { x: 300, y: 300 });
    const b = spawnHero(w, 'thor', { x: 300, y: 300 });
    const pa = w.parties.get(hero(w, a).party);
    const pb = w.parties.get(hero(w, b).party);
    if (!pa || !pb) throw new Error('parties');
    w.parties.delete(pb.id);
    pa.members.push(b);
    hero(w, b).party = pa.id;
    toLevel(w, a, 3);
    expect(pa.pathOffer?.hero).toBe(a);
    command(w, { kind: 'pickPath', party: pa.id, path: 'thor-hammer' });
    // one path left for b: taken without a card
    expect(pa.pathOffer).toBeNull();
    expect(hero(w, b)).toMatchObject({ tier: 2, path: 'thor-storm' });
  });

  it('a card whose path was taken meanwhile is refused and redealt', () => {
    const w = setup();
    const a = spawnHero(w, 'thor', { x: 300, y: 300 });
    const b = spawnHero(w, 'thor', { x: 300, y: 300 });
    toLevel(w, a, 3);
    toLevel(w, b, 3);
    const pa = w.parties.get(hero(w, a).party);
    const pb = w.parties.get(hero(w, b).party);
    expect(pa?.pathOffer?.options).toHaveLength(2);
    expect(pb?.pathOffer?.options).toHaveLength(2);
    expect(command(w, { kind: 'pickPath', party: pa?.id ?? 0, path: 'thor-hammer' }).ok).toBe(true);
    // b's card still lists the hammer: refused, redealt (one path left: auto-assigned)
    expect(command(w, { kind: 'pickPath', party: pb?.id ?? 0, path: 'thor-hammer' })).toEqual({
      ok: false,
      reason: 'path taken',
    });
    expect(hero(w, b)).toMatchObject({ tier: 2, path: 'thor-storm' });
  });

  it('a hero spawned straight from a template has no god and tiers by level alone', () => {
    const w = setup();
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    expect(hero(w, id).god).toBeNull();
    toLevel(w, id, 3);
    expect(hero(w, id)).toMatchObject({ tier: 2, path: null, type: 'warrior' });
  });

  it('is deterministic', () => {
    const run = () => {
      const w = setup();
      const id = spawnHero(w, 'thor', { x: 300, y: 300 });
      toLevel(w, id, 3);
      command(w, { kind: 'pickPath', party: hero(w, id).party, path: 'thor-storm' });
      toLevel(w, id, 6);
      const out: SimEvent[] = [];
      out.push(...snapshot(w).events);
      return out;
    };
    expect(run()).toEqual(run());
  });
});
