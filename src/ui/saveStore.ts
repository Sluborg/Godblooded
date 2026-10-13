import type { SaveGame } from '../sim/api';

// The run save in localStorage (Scene 190): the sim makes the save (saveWorld), this keeps it. All
// storage access is guarded: a blocked or full storage means no Continue, never a crash.

export const SAVE_KEY = 'godblooded.save.v1';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): Store | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function readSave(store: Store | null = defaultStore()): unknown | null {
  try {
    const raw = store?.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(save: SaveGame, store: Store | null = defaultStore()): boolean {
  try {
    store?.setItem(SAVE_KEY, JSON.stringify(save));
    return store !== null;
  } catch {
    return false;
  }
}

export function clearSave(store: Store | null = defaultStore()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    // nothing to clear
  }
}

export function hasSave(store: Store | null = defaultStore()): boolean {
  return readSave(store) !== null;
}

// A fresh seed for each new run (scenes may use non-sim randomness; the sim stays seeded from it).
// A positive 31-bit integer so it survives JSON and any generator.
export function newSeed(now: number = Date.now(), rand: number = Math.random()): number {
  const s = (Math.floor(now) ^ Math.floor(rand * 0x7fffffff)) & 0x7fffffff;
  return s === 0 ? 1 : s;
}

// A save written by a newer game than this client: it must stay in storage (an old tab or a
// stale cached client must not delete a newer run), unlike a damaged or unusable save.
export function isNewerSave(e: unknown): boolean {
  return e instanceof Error && e.message.startsWith('save is from a newer game');
}
