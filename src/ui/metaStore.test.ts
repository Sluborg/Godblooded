import { describe, expect, it } from 'vitest';
import { emptyMeta } from '../sim/api';
import { META_KEY, readMeta, writeMeta } from './metaStore';

const memory = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
};

describe('metaStore', () => {
  it('starts fresh with no save or a broken one', () => {
    expect(readMeta(memory())).toEqual(emptyMeta());
    const s = memory();
    s.setItem(META_KEY, '{nope');
    expect(readMeta(s)).toEqual(emptyMeta());
    expect(readMeta(null)).toEqual(emptyMeta());
  });
  it('round-trips a meta', () => {
    const s = memory();
    const meta = { ...emptyMeta(), essence: 340, wins: 2, lean: 'greek' };
    expect(writeMeta(meta, s)).toBe(true);
    expect(readMeta(s)).toMatchObject({ essence: 340, wins: 2, lean: 'greek' });
  });
  it('reports a missing storage', () => {
    expect(writeMeta(emptyMeta(), null)).toBe(false);
  });
});
