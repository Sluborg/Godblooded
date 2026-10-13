import { resolveTuning } from './tuning';
import { createWorld, type World } from './world';
import type { GameData } from './types';

// Save and load a run (Sim 160). A save is the run's state as plain JSON data: the seed, the
// position of the random generator and every field of the world except the content rows
// (GameData), which the game supplies again on load. Because the generator carries on from the
// saved position, a loaded run plays out exactly as the original would have.
//
// Changing the shape of the world (a new field is fine, it falls back to its fresh value; a
// renamed, removed or reinterpreted one is not) bumps SAVE_VERSION and adds a migration.

export const SAVE_VERSION = 1;

export interface SaveGame {
  version: number;
  seed: number;
  // Position of the random generator.
  rng: number;
  // The world's fields, with Maps and non-finite numbers tagged so the whole thing is JSON.
  world: Record<string, unknown>;
}

export class SaveError extends Error {}

// World fields that are not part of a save: content, derived from content, or per snapshot.
const SKIP = new Set(['data', 'rng', 'tuning', 'events', 'seed']);

// Migrations: MIGRATIONS[n] turns a version n save into a version n + 1 one. Empty until the
// first change of shape.
const MIGRATIONS: Record<number, (save: SaveGame) => SaveGame> = {};

export function saveWorld(world: World): SaveGame {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(world)) {
    if (!SKIP.has(key)) out[key] = encode(value);
  }
  return { version: SAVE_VERSION, seed: world.seed, rng: world.rng.state(), world: out };
}

// Brings a save of any known version up to SAVE_VERSION. Throws SaveError for something that is
// not a save or comes from a newer game.
export function migrateSave(raw: unknown): SaveGame {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('not a save');
  let save = raw as SaveGame;
  if (!Number.isInteger(save.version) || save.version < 1) throw new SaveError('not a save');
  if (save.version > SAVE_VERSION)
    throw new SaveError(`save is from a newer game (version ${save.version})`);
  while (save.version < SAVE_VERSION) {
    const step = MIGRATIONS[save.version];
    if (!step) throw new SaveError(`no migration from save version ${save.version}`);
    save = step(save);
  }
  if (typeof save.seed !== 'number' || typeof save.rng !== 'number' || !isRecord(save.world)) {
    throw new SaveError('save is damaged');
  }
  return save;
}

// Rebuilds a run from a save and the game's data. Throws SaveError when the save is damaged,
// from a newer game, or names content the data no longer has (the game should drop such a save).
export function loadWorld(raw: unknown, data: GameData): World {
  const save = migrateSave(raw);
  try {
    const world = createWorld(save.seed, data);
    const target = world as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(save.world)) {
      if (SKIP.has(key) || !(key in target)) continue;
      const saved = decode(value);
      // A field must keep the kind it has in a fresh world (a Map stays a Map, a list a list);
      // only a plain value may switch between null and a number or string (bossLair, say).
      const fresh = kindOf(target[key]);
      const got = kindOf(saved);
      const plain = (k: string) => k === 'null' || k === 'number' || k === 'string';
      if (fresh !== got && !(plain(fresh) && plain(got))) {
        throw new SaveError(`save is damaged: ${key}`);
      }
      target[key] = saved;
    }
    world.rng.restore(save.rng);
    world.tuning = resolveTuning(data);
    world.events = [];
    check(world, data);
    return world;
  } catch (e) {
    // Anything else that goes wrong on damaged data is a damaged save to the caller.
    if (e instanceof SaveError) throw e;
    throw new SaveError(`save is damaged: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const kindOf = (v: unknown): string =>
  v instanceof Map ? 'map' : Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v;

// The saved run must fit the content it is loaded into.
function check(world: World, data: GameData): void {
  const bad = (what: string, id: string) => {
    throw new SaveError(`save does not fit the game data: unknown ${what} ${id}`);
  };
  for (const b of world.buildings) {
    if (b.type !== 'townhall' && !data.buildings.some((d) => d.id === b.type))
      bad('building', b.type);
  }
  for (const l of world.lairs) if (!data.lairs?.some((d) => d.id === l.type)) bad('lair', l.type);
  for (const u of world.units) {
    const known =
      u.kind === 'hero'
        ? data.classes?.some((c) => c.id === u.type)
        : data.monsters?.some((m) => m.id === u.type);
    if (!known) bad(u.kind === 'hero' ? 'template' : 'monster', u.type);
    if (u.god && !data.gods?.some((g) => g.id === u.god)) bad('god', u.god);
    if (u.path && !data.paths?.some((p) => p.id === u.path)) bad('path', u.path);
  }
  const upgrade = (id: string) => {
    if (!data.upgrades?.some((d) => d.id === id)) bad('upgrade', id);
  };
  for (const p of world.parties.values()) {
    p.upgrades.forEach(upgrade);
    // Cards waiting for a pick must still be offerable.
    p.offer?.forEach(upgrade);
    for (const id of p.pathOffer?.options ?? []) {
      if (!data.paths?.some((d) => d.id === id)) bad('path', id);
    }
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Maps become { $map: [[key, value], ...] }; numbers JSON cannot hold become { $num: 'Infinity' }.
function encode(value: unknown): unknown {
  if (value instanceof Map) {
    return { $map: [...value.entries()].map(([k, v]) => [encode(k), encode(v)]) };
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return { $num: String(value) };
  if (Array.isArray(value)) return value.map(encode);
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) if (v !== undefined) out[k] = encode(v);
    return out;
  }
  return value;
}

function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (isRecord(value)) {
    if (Array.isArray(value.$map)) {
      return new Map((value.$map as [unknown, unknown][]).map(([k, v]) => [decode(k), decode(v)]));
    }
    if (typeof value.$num === 'string') return Number(value.$num);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = decode(v);
    return out;
  }
  return value;
}

// Once every autosaveMs of run time the sim says so; the game saves in answer.
export function runAutosave(world: World): void {
  const every = world.tuning.save.autosaveMs;
  if (every <= 0) return;
  if (world.nextAutosaveMs <= 0) world.nextAutosaveMs = every;
  if (world.timeMs < world.nextAutosaveMs) return;
  world.events.push({ kind: 'autosave' });
  // The next deadline is kept, not derived, so any interval works (a save made before the
  // deadline moved on still fires once and carries on).
  while (world.nextAutosaveMs <= world.timeMs) world.nextAutosaveMs += every;
}
