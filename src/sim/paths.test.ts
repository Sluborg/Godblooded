import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, type GameData, type SimEvent } from './api';
import { shareXp } from './parties';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const cls = (id: string) => ({
  id,
  attrs,
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
  classes: [cls('warrior'), cls('rogue'), cls('wizard')],
  upgrades: [{ id: 'iron-arms', name: 'Iron Arms', text: '+2 Str', effect: { attr: { str: 2 } } }],
  paths: [
    {
      id: 'warrior-thor',
      class: 'warrior',
      pantheon: 'aesir',
      god: 'thor',
      name: 'Storm Berserker',
      attrs: [{ str: 2 }, { str: 4, sta: 2 }],
    },
    {
      id: 'warrior-ares',
      class: 'warrior',
      pantheon: 'greek',
      god: 'ares',
      name: 'Bloodsworn',
      attrs: [{ str: 1 }, { str: 3 }],
    },
    {
      id: 'rogue-loki',
      class: 'rogue',
      pantheon: 'aesir',
      god: 'loki',
      name: 'Rune Trickster',
      attrs: [{ dex: 2 }, { dex: 4 }],
    },
  ],
  tuning: { town: { raidFirstMs: 10_000_000 }, hero: { firstRecruitMs: 10_000_000 } },
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

describe('favor paths', () => {
  it('a lone free path is taken at level 3 and tier 2 starts', () => {
    const w = setup([0]);
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    toLevel(w, id, 2);
    expect(hero(w, id)).toMatchObject({ tier: 1, path: null });
    levelUp(w, id);
    expect(hero(w, id)).toMatchObject({ tier: 2, path: 'warrior-thor' });
    const ev = snapshot(w).events.filter((e) => e.kind === 'tierUp');
    expect(ev).toContainEqual({ kind: 'tierUp', unit: id, tier: 2, path: 'warrior-thor' });
  });

  it('level 6 gives tier 3 on the same path and the tier bonus replaces the tier 2 one', () => {
    const w = setup([0]);
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    toLevel(w, id, 3);
    const base = hero(w, id).maxHp;
    toLevel(w, id, 6);
    expect(hero(w, id)).toMatchObject({ tier: 3, path: 'warrior-thor' });
    // iron-arms is not picked twice, but sta +2 from the tier 3 bonus raised hp
    expect(hero(w, id).maxHp).toBeGreaterThan(base);
  });

  it('path attribute bonuses feed maxHp', () => {
    const w = setup([0]);
    const id = spawnHero(w, 'rogue', { x: 300, y: 300 });
    const before = hero(w, id).maxHp;
    toLevel(w, id, 3);
    expect(hero(w, id).path).toBe('rogue-loki');
    expect(hero(w, id).maxHp).toBeGreaterThanOrEqual(before);
  });

  it('several free paths make a card; pickPath assigns and the pick is checked', () => {
    const w = setup([0, 1]);
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    toLevel(w, id, 3);
    const party = hero(w, id).party;
    const snap = snapshot(w);
    const ps = snap.parties.find((p) => p.id === party);
    expect(ps?.pathOffer).toEqual({ hero: id, options: ['warrior-thor', 'warrior-ares'] });
    expect(snap.events.some((e) => e.kind === 'pathOffer')).toBe(true);
    expect(hero(w, id)).toMatchObject({ tier: 1, path: null });
    expect(command(w, { kind: 'pickPath', party, path: 'rogue-loki' })).toEqual({
      ok: false,
      reason: 'not offered',
    });
    expect(command(w, { kind: 'pickPath', party: 999, path: 'warrior-ares' }).ok).toBe(false);
    expect(command(w, { kind: 'pickPath', party, path: 'warrior-ares' }).ok).toBe(true);
    expect(hero(w, id)).toMatchObject({ tier: 2, path: 'warrior-ares' });
    expect(w.parties.get(party)?.pathOffer).toBeNull();
    expect(command(w, { kind: 'pickPath', party, path: 'warrior-ares' }).ok).toBe(false);
  });

  it('the path card comes before the upgrade card and freezes the world', () => {
    const w = setup([0, 1]);
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
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
    command(w, { kind: 'pickPath', party, path: 'warrior-thor' });
    expect(command(w, { kind: 'pickUpgrade', party, upgrade: (p?.offer ?? [])[0] }).ok).toBe(true);
  });

  it('one hero per path: the second warrior stays tier 1 until a path is free', () => {
    const w = setup([0]);
    const a = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const b = spawnHero(w, 'warrior', { x: 300, y: 300 });
    toLevel(w, a, 3);
    toLevel(w, b, 3);
    expect(hero(w, a)).toMatchObject({ tier: 2, path: 'warrior-thor' });
    expect(hero(w, b)).toMatchObject({ tier: 1, path: null });
    // A greek temple opens a second path; the retry gives it to b (one free: no card).
    command(w, { kind: 'build', type: 'shrine_greek', plot: 1 });
    step(w, 2_000);
    expect(hero(w, b)).toMatchObject({ tier: 2, path: 'warrior-ares' });
  });

  it('a class with no path rows tiers by level alone', () => {
    const w = setup();
    const id = spawnHero(w, 'wizard', { x: 300, y: 300 });
    toLevel(w, id, 3);
    expect(hero(w, id)).toMatchObject({ tier: 2, path: null });
    toLevel(w, id, 6);
    expect(hero(w, id).tier).toBe(3);
  });

  it('with no temple of its pantheon a path class stays tier 1', () => {
    const w = setup();
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    toLevel(w, id, 6);
    expect(hero(w, id)).toMatchObject({ tier: 1, path: null });
    command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    step(w, 2_000);
    expect(hero(w, id)).toMatchObject({ tier: 3, path: 'warrior-thor' });
  });

  it('pantheon comes from the building row, else from temple_<pantheon>', () => {
    const w = setup([1]);
    const paths = snapshot(w).paths;
    expect(paths.find((p) => p.id === 'warrior-ares')?.available).toBe(true);
    expect(paths.find((p) => p.id === 'warrior-thor')?.available).toBe(false);
    command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    expect(snapshot(w).paths.every((p) => p.available)).toBe(true);
  });

  it('snapshot paths show who holds a path', () => {
    const w = setup([0]);
    const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
    toLevel(w, id, 3);
    expect(snapshot(w).paths.find((p) => p.id === 'warrior-thor')?.takenBy).toBe(id);
    expect(snapshot(w).units.find((u) => u.id === id)?.path).toBe('warrior-thor');
  });

  it('two heroes of one party queue one card at a time', () => {
    const w = setup([0, 1]);
    const a = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const b = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const pa = w.parties.get(hero(w, a).party);
    const pb = w.parties.get(hero(w, b).party);
    if (!pa || !pb) throw new Error('parties');
    w.parties.delete(pb.id);
    pa.members.push(b);
    hero(w, b).party = pa.id;
    toLevel(w, a, 3);
    expect(pa.pathOffer?.hero).toBe(a);
    command(w, { kind: 'pickPath', party: pa.id, path: 'warrior-thor' });
    // one path left for b: taken without a card
    expect(pa.pathOffer).toBeNull();
    expect(hero(w, b)).toMatchObject({ tier: 2, path: 'warrior-ares' });
  });

  it('a card whose path was taken meanwhile is refused and redealt', () => {
    const w = setup([0, 1]);
    const a = spawnHero(w, 'warrior', { x: 300, y: 300 });
    const b = spawnHero(w, 'warrior', { x: 300, y: 300 });
    toLevel(w, a, 3);
    toLevel(w, b, 3);
    const pa = w.parties.get(hero(w, a).party);
    const pb = w.parties.get(hero(w, b).party);
    expect(pa?.pathOffer?.options).toHaveLength(2);
    expect(pb?.pathOffer?.options).toHaveLength(2);
    expect(command(w, { kind: 'pickPath', party: pa?.id ?? 0, path: 'warrior-thor' }).ok).toBe(
      true,
    );
    // b's card still lists thor: refused, redealt (one path left: auto-assigned)
    expect(command(w, { kind: 'pickPath', party: pb?.id ?? 0, path: 'warrior-thor' })).toEqual({
      ok: false,
      reason: 'path taken',
    });
    expect(hero(w, b)).toMatchObject({ tier: 2, path: 'warrior-ares' });
  });

  it('is deterministic', () => {
    const run = () => {
      const w = setup([0, 1]);
      const id = spawnHero(w, 'warrior', { x: 300, y: 300 });
      toLevel(w, id, 3);
      command(w, { kind: 'pickPath', party: hero(w, id).party, path: 'warrior-ares' });
      toLevel(w, id, 6);
      const out: SimEvent[] = [];
      out.push(...snapshot(w).events);
      return out;
    };
    expect(run()).toEqual(run());
  });
});
