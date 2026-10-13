import { describe, expect, it } from 'vitest';
import type { SaveGame } from '../sim/api';
import { clearSave, hasSave, newSeed, readSave, SAVE_KEY, writeSave } from './saveStore';

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
