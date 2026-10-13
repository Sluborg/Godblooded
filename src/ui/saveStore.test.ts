import { describe, expect, it } from 'vitest';
import { migrateSave, SaveError, type SaveGame } from '../sim/api';
import {
  clearSave,
  hasSave,
  storedIsNewer,
  isNewerSave,
  newSeed,
  readSave,
  SAVE_KEY,
  writeSave,
} from './saveStore';

function fakeStore(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}
const save = { version: 1, seed: 7, rng: 3, world: {} } as SaveGame;

describe('saveStore', () => {
  it('round trips a save and clears it', () => {
    const s = fakeStore();
    expect(hasSave(s)).toBe(false);
    expect(writeSave(save, s)).toBe(true);
    expect(readSave(s)).toEqual(save);
    expect(hasSave(s)).toBe(true);
    clearSave(s);
    expect(readSave(s)).toBeNull();
  });
  it('treats junk as no save', () => {
    expect(readSave(fakeStore({ [SAVE_KEY]: '{not json' }))).toBeNull();
  });
  it('survives a storage that throws or is missing', () => {
    const boom = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readSave(boom)).toBeNull();
    expect(writeSave(save, boom)).toBe(false);
    expect(() => clearSave(boom)).not.toThrow();
    expect(writeSave(save, null)).toBe(false);
  });
});

describe('newSeed', () => {
  it('is a positive 31-bit integer, differs between runs', () => {
    const a = newSeed(1_700_000_000_000, 0.123);
    const b = newSeed(1_700_000_000_001, 0.9);
    expect(Number.isInteger(a) && a > 0 && a <= 0x7fffffff).toBe(true);
    expect(a).not.toBe(b);
  });
  it('never returns 0', () => {
    expect(newSeed(0, 0)).toBe(1);
  });
});

describe('isNewerSave', () => {
  it('tells a newer game save from a damaged one', () => {
    const err = (raw: unknown): unknown => {
      try {
        migrateSave(raw);
      } catch (e) {
        return e;
      }
      return null;
    };
    const newer = err({ version: 9999, seed: 1, rng: 1, world: {} });
    expect(newer).toBeInstanceOf(SaveError);
    expect(isNewerSave(newer)).toBe(true);
    expect(isNewerSave(err('junk'))).toBe(false);
    expect(isNewerSave(new Error('other'))).toBe(false);
  });
});

describe('a newer stored save', () => {
  const newer = JSON.stringify({ version: 9999, seed: 1, rng: 1, world: {} });
  it('is never overwritten or cleared', () => {
    const s = fakeStore({ [SAVE_KEY]: newer });
    expect(storedIsNewer(s)).toBe(true);
    expect(writeSave(save, s)).toBe(false);
    clearSave(s);
    expect(s.raw.get(SAVE_KEY)).toBe(newer);
  });
  it('does not protect an older or damaged save', () => {
    const old = fakeStore({ [SAVE_KEY]: JSON.stringify(save) });
    expect(storedIsNewer(old)).toBe(false);
    clearSave(old);
    expect(old.raw.has(SAVE_KEY)).toBe(false);
    const bad = fakeStore({ [SAVE_KEY]: 'junk' });
    expect(storedIsNewer(bad)).toBe(false);
    clearSave(bad);
    expect(bad.raw.has(SAVE_KEY)).toBe(false);
  });
});
