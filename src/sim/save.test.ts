import { describe, expect, it } from 'vitest';
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

  it('survives a pending card pick: the world stays frozen on the same offer', () => {
    const a = createWorld(3, GRAYBOX);
    play(a, 200_000);
    // stop right on a card: deal xp until one is open
    const party = [...a.parties.values()][0];
    if (!party) throw new Error('no party');
    shareXp(a, party.members[0], 200);
    const open = [...a.parties.values()].find((p) => p.offer || p.pathOffer);
    expect(open).toBeDefined();
    const b = roundtrip(a);
    const t = b.timeMs;
    step(b, 2_000);
    expect(b.timeMs).toBe(t);
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
