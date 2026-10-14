import { describe, expect, it, vi } from 'vitest';
import { GRAYBOX } from '../data/graybox';
import {
  command,
  createWorld,
  loadWorld,
  migrateSave,
  saveWorld,
  SAVE_VERSION,
  SaveError,
  snapshot,
  step,
  type GameData,
  type SaveGame,
  type SimEvent,
} from './api';
import { shareXp } from './parties';
import { spawnHero } from './world';

// These tests play minutes of the graybox with a snapshot every tick: slow under a loaded runner.
vi.setConfig({ testTimeout: 60_000 });

type W = ReturnType<typeof createWorld>;

// Plays like the balance bot: builds, then answers every card with its first choice.
function play(w: W, ms: number): SimEvent[] {
  const out: SimEvent[] = [];
  for (let t = 0; t < ms && w.status === 'running'; t += 100) {
    step(w, 100);
    const snap = snapshot(w);
    out.push(...snap.events);
    const path = snap.parties.find((p) => p.pathOffer);
    const card = snap.parties.find((p) => p.offer);
    if (path?.pathOffer) {
      command(w, { kind: 'pickPath', party: path.id, path: path.pathOffer.options[0] });
    } else if (card?.offer) {
      command(w, { kind: 'pickUpgrade', party: card.id, upgrade: card.offer[0] });
    }
    if (w.timeMs % 5_000 === 0) {
      for (const [type, plot] of [
        ['temple_aesir', 0],
        ['market', 1],
        ['shrine', 2],
        ['tower', 3],
      ] as const) {
        if (!w.buildings.some((b) => b.type === type)) command(w, { kind: 'build', type, plot });
      }
    }
  }
  return out;
}

const roundtrip = (w: W, data: GameData = GRAYBOX): W =>
  loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data);

describe('save and load', () => {
  it('a loaded run plays on exactly as the original would have', () => {
    const a = createWorld(5, GRAYBOX);
    play(a, 240_000);
    snapshot(a); // drain the events both sides start without
    const b = roundtrip(a);
    expect(snapshot(b)).toEqual(snapshot(a));
    const evA = play(a, 120_000);
    const evB = play(b, 120_000);
    expect(evB).toEqual(evA);
    expect(snapshot(b)).toEqual(snapshot(a));
    // it was a real run: heroes, parties, a card or two
    expect(snapshot(a).stats.heroesArrived).toBeGreaterThan(2);
  });

  it('survives a pending card pick: the world stays slowed on the same offer', () => {
    const manual: GameData = {
      ...GRAYBOX,
      tuning: { ...GRAYBOX.tuning, party: { autoPick: false, offerSlowdown: 0.3 } },
    };
    const a = createWorld(3, manual);
    play(a, 200_000);
    // stop right on a card: deal xp until one is open
    const party = [...a.parties.values()][0];
    if (!party) throw new Error('no party');
    shareXp(a, party.members[0], 200);
    const open = [...a.parties.values()].find((p) => p.offer || p.pathOffer);
    expect(open).toBeDefined();
    const b = roundtrip(a, manual);
    const t = b.timeMs;
    step(b, 2_000);
    // at the offer slowdown (30%): 600 ms of 2 s
    expect(b.timeMs - t).toBeLessThan(700);
    expect(b.timeMs - t).toBeGreaterThan(0);
    const pb = b.parties.get(open?.id ?? 0);
    expect(pb?.offer).toEqual(open?.offer);
    expect(pb?.pathOffer).toEqual(open?.pathOffer);
  });

  it('is plain JSON: Infinity, Maps and optional fields come back as they were', () => {
    const data: GameData = {
      ...GRAYBOX,
      tuning: { ...GRAYBOX.tuning, lair: { tierUpEveryMs: 10_000 } },
    };
    const a = createWorld(2, data);
    play(a, 60_000);
    expect([...a.lairRuntime.values()].some((r) => r.nextTierMs === Infinity)).toBe(true);
    const text = JSON.stringify(saveWorld(a));
    expect(text).not.toContain('"nextTierMs":null');
    const b = loadWorld(JSON.parse(text), data);
    expect([...b.lairRuntime.values()].map((r) => r.nextTierMs)).toEqual(
      [...a.lairRuntime.values()].map((r) => r.nextTierMs),
    );
    expect(b.parties).toBeInstanceOf(Map);
    expect(b.bonds).toBeInstanceOf(Map);
    expect(JSON.stringify(saveWorld(b))).toBe(text);
  });

  it('the loaded world does not share state with the save or the original', () => {
    const a = createWorld(4, GRAYBOX);
    play(a, 90_000);
    const save = saveWorld(a);
    const b = loadWorld(save, GRAYBOX);
    const gold = a.gold;
    b.gold += 1_000;
    b.units.length = 0;
    expect(a.gold).toBe(gold);
    expect(a.units.length).toBeGreaterThan(0);
    expect(loadWorld(save, GRAYBOX).units.length).toBeGreaterThan(0);
  });

  it('emits an autosave event every 30 s of run time', () => {
    const w = createWorld(1, GRAYBOX);
    const ev = play(w, 95_000);
    expect(ev.filter((e) => e.kind === 'autosave')).toHaveLength(3);
    const off = createWorld(1, {
      ...GRAYBOX,
      tuning: { ...GRAYBOX.tuning, save: { autosaveMs: 0 } },
    });
    expect(play(off, 95_000).some((e) => e.kind === 'autosave')).toBe(false);
  });

  it('a save made from the autosave moment loads and continues', () => {
    const a = createWorld(8, GRAYBOX);
    let saved: SaveGame | null = null;
    for (let t = 0; t < 120_000 && !saved; t += 100) {
      if (play(a, 100).some((e) => e.kind === 'autosave')) saved = saveWorld(a);
    }
    if (!saved) throw new Error('no autosave');
    const b = loadWorld(JSON.parse(JSON.stringify(saved)), GRAYBOX);
    expect(b.timeMs).toBe(30_000);
    play(b, 10_000);
    expect(b.timeMs).toBe(40_000);
  });
});

describe('autosave and damaged saves', () => {
  it('autosaves on a deadline, so an interval that is no multiple of the tick still works', () => {
    const w = createWorld(1, {
      ...GRAYBOX,
      tuning: { ...GRAYBOX.tuning, save: { autosaveMs: 30_025 } },
    });
    const times: number[] = [];
    for (let t = 0; t < 95_000; t += 100) {
      for (const e of play(w, 100)) if (e.kind === 'autosave') times.push(w.timeMs);
    }
    expect(times).toHaveLength(3);
    expect(times[0]).toBeGreaterThanOrEqual(30_025);
    expect(times[0]).toBeLessThan(30_200);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(30_000);
    expect(times[1] - times[0]).toBeLessThan(30_300);
  });

  const played = () => {
    const w = createWorld(1, GRAYBOX);
    play(w, 60_000);
    return JSON.parse(JSON.stringify(saveWorld(w))) as SaveGame;
  };

  it('a field of the wrong kind is a SaveError, not a crash', () => {
    for (const key of ['parties', 'units', 'bonds', 'buildings']) {
      const save = played();
      save.world[key] = null;
      expect(() => loadWorld(save, GRAYBOX), key).toThrow(SaveError);
      save.world[key] = 7;
      expect(() => loadWorld(save, GRAYBOX), key).toThrow(SaveError);
    }
  });

  it('garbage inside a field is a SaveError too', () => {
    const save = played();
    save.world.units = [null];
    expect(() => loadWorld(save, GRAYBOX)).toThrow(SaveError);
  });

  it('pending card ids must still exist in the data', () => {
    // A fixed party, independent of the graybox balance: one hero, levelled by hand with the
    // auto-pick off so the offer stays open.
    const manual: GameData = {
      ...GRAYBOX,
      tuning: { ...GRAYBOX.tuning, party: { ...GRAYBOX.tuning?.party, autoPick: false } },
    };
    const a = createWorld(3, manual);
    const god = manual.gods?.[0]?.id;
    if (!god) throw new Error('no god in the data');
    const hero = spawnHero(a, god, { ...manual.townHall });
    shareXp(a, hero, a.tuning.party.xpPerLevel);
    const save = JSON.parse(JSON.stringify(saveWorld(a))) as SaveGame;
    const open = [...a.parties.values()].find((p) => p.offer || p.pathOffer);
    expect(open).toBeDefined();
    if (open?.pathOffer) {
      const noPaths: GameData = { ...manual, paths: [] };
      expect(() => loadWorld(save, noPaths)).toThrow(/unknown path/);
    } else {
      const noUpgrades: GameData = { ...manual, upgrades: [] };
      expect(() => loadWorld(save, noUpgrades)).toThrow(/unknown upgrade/);
    }
  });
});

describe('save checks', () => {
  const good = () => JSON.parse(JSON.stringify(saveWorld(createWorld(1, GRAYBOX)))) as SaveGame;

  it('carries the version', () => {
    expect(good().version).toBe(SAVE_VERSION);
  });

  it('rejects things that are not saves, newer saves and damaged saves', () => {
    expect(() => migrateSave(null)).toThrow(SaveError);
    expect(() => migrateSave('save')).toThrow(SaveError);
    expect(() => migrateSave({})).toThrow(SaveError);
    expect(() => migrateSave({ ...good(), version: SAVE_VERSION + 1 })).toThrow(/newer game/);
    expect(() => migrateSave({ ...good(), version: 0 })).toThrow(SaveError);
    expect(() => migrateSave({ ...good(), seed: 'x' })).toThrow(/damaged/);
    expect(() => loadWorld({ ...good(), world: null }, GRAYBOX)).toThrow(SaveError);
  });

  it('rejects a save that names content the data no longer has', () => {
    const a = createWorld(1, GRAYBOX);
    play(a, 60_000);
    const save = JSON.parse(JSON.stringify(saveWorld(a)));
    const noLairs: GameData = { ...GRAYBOX, lairs: [], lairSites: [] };
    expect(() => loadWorld(save, noLairs)).toThrow(/unknown lair/);
    const noBuildings: GameData = { ...GRAYBOX, buildings: [] };
    expect(() => loadWorld(save, noBuildings)).toThrow(/unknown building/);
  });

  it('a field missing from an older save keeps its fresh value', () => {
    const save = good();
    delete save.world.towerNextMs;
    const w = loadWorld(save, GRAYBOX);
    expect(w.towerNextMs).toBeInstanceOf(Map);
  });
});

describe('save v2 to v3', () => {
  it('migrates a hero holding greater potions: flasks take the old potionId', () => {
    const a = createWorld(2, GRAYBOX);
    const id = spawnHero(a, 'thor', { x: 300, y: 300 });
    const hero = a.units.find((u) => u.id === id)!;
    hero.items = { weapon: 1, armour: 0, potions: 2, charm: null };
    const old = JSON.parse(JSON.stringify(saveWorld(a)));
    old.version = 2;
    const saved = old.world.units.find((u: { id: number }) => u.id === id);
    saved.items.potionId = 'greater';
    const migrated = migrateSave(old);
    expect(migrated.version).toBe(SAVE_VERSION);
    const back = loadWorld(old, GRAYBOX);
    const items = back.units.find((u) => u.id === id)?.items as unknown as Record<string, unknown>;
    expect(items.flasks).toEqual(['greater', 'greater']);
    expect(items.potionId).toBeUndefined();
    expect(items.potions).toBe(2);
  });

  it('a hero with no potions, or no potionId, keeps plain potions', () => {
    const a = createWorld(2, GRAYBOX);
    const id = spawnHero(a, 'thor', { x: 300, y: 300 });
    const hero = a.units.find((u) => u.id === id)!;
    hero.items = { weapon: 0, armour: 0, potions: 1, charm: null };
    const old = JSON.parse(JSON.stringify(saveWorld(a)));
    old.version = 2;
    const back = loadWorld(old, GRAYBOX);
    const items = back.units.find((u) => u.id === id)?.items as unknown as Record<string, unknown>;
    expect(items.flasks).toBeUndefined();
    expect(items.potions).toBe(1);
  });
});

describe('save v3 to v4', () => {
  it('a version 3 save loads with empty tills and no piles; the collector comes out when on', () => {
    const a = createWorld(2, GRAYBOX);
    const old = JSON.parse(JSON.stringify(saveWorld(a)));
    old.version = 3;
    // what a v3 save looks like: none of the collector fields
    delete old.world.piles;
    delete old.world.collectorQueue;
    for (const b of old.world.buildings as Record<string, unknown>[]) b.till = 99;
    const migrated = migrateSave(old);
    expect(migrated.version).toBe(SAVE_VERSION);
    const back = loadWorld(old, GRAYBOX);
    expect(back.piles).toEqual([]);
    expect(back.collectorQueue).toEqual([]);
    expect(back.buildings.every((b) => b.till === undefined)).toBe(true);
    // with the collector on, one comes out of the town hall
    const on = { ...GRAYBOX, tuning: { ...GRAYBOX.tuning, collector: { enabled: true } } };
    const again = loadWorld(old, on);
    for (let i = 0; i < 5; i++) step(again, 100);
    expect(again.units.filter((u) => u.kind === 'collector')).toHaveLength(1);
  });
});

describe('save v4 to v5', () => {
  // The town as it stood before spacing option B.
  const OLD: GameData = {
    ...GRAYBOX,
    townHall: { x: 1200, y: 800 },
    plots: GRAYBOX.plots?.map((_, i) => ({ x: 1200 + i * 50, y: 1100 })),
  };

  it('a version 4 save moves the hall, the plot buildings and the units beside them', () => {
    const a = createWorld(3, OLD);
    const built = command(a, { kind: 'build', type: 'temple_aesir', plot: 2 });
    expect(built.ok).toBe(true);
    const id = spawnHero(a, 'warrior', { x: 1210, y: 805 });
    const old = JSON.parse(JSON.stringify(saveWorld(a)));
    old.version = 4;
    const far = spawnHero(a, 'warrior', { x: 100, y: 100 });
    old.world.units = JSON.parse(JSON.stringify(saveWorld(a))).world.units;
    const back = loadWorld(old, GRAYBOX);
    const hall = back.buildings.find((b) => b.type === 'townhall');
    expect(hall?.pos).toEqual(GRAYBOX.townHall);
    const temple = back.buildings.find((b) => b.type === 'temple_aesir');
    expect(temple?.pos).toEqual(GRAYBOX.plots?.[2]);
    // a hero standing at the hall moved with it, one far away stayed
    const beside = back.units.find((u) => u.id === id);
    expect(beside?.pos.x).toBeCloseTo(1210 + (GRAYBOX.townHall.x - 1200));
    expect(beside?.pos.y).toBeCloseTo(805 + (GRAYBOX.townHall.y - 800));
    expect(back.units.find((u) => u.id === far)?.pos).toEqual({ x: 100, y: 100 });
    // and it plays on
    for (let i = 0; i < 20; i++) step(back, 100);
  });

  it('a version 5 save is left where it is', () => {
    const a = createWorld(3, GRAYBOX);
    command(a, { kind: 'build', type: 'temple_aesir', plot: 2 });
    const back = loadWorld(JSON.parse(JSON.stringify(saveWorld(a))), GRAYBOX);
    expect(back.buildings.map((b) => b.pos)).toEqual(a.buildings.map((b) => b.pos));
  });
});
