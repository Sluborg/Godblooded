import { describe, expect, it } from 'vitest';
import type { UnitState } from '../sim/api';
import { describeEvent, EventFeed, MAX_TOASTS, TOAST_MS, type FeedWorld } from './eventFeed';

const hero = {
  id: 1,
  kind: 'hero',
  god: 'thor',
  path: null,
  tier: 1,
  pos: { x: 5, y: 6 },
} as UnitState;
const world: FeedWorld = {
  unit: (id) => (id === 1 ? hero : undefined),
  structure: (id) => (id === 9 ? { x: 100, y: 200 } : undefined),
  leader: () => hero,
  townHall: { x: 1, y: 2 },
};

describe('describeEvent', () => {
  it('describes a cleared lair with its place', () => {
    const t = describeEvent(
      { kind: 'lairDestroyed', lair: 9, type: 'barrow', by: 1, bounty: 80 },
      world,
    );
    expect(t?.text).toBe('barrow lair cleared! +80 gold');
    expect(t?.pos).toEqual({ x: 100, y: 200 });
  });
  it('names a knocked out hero by god, ignores monsters', () => {
    expect(describeEvent({ kind: 'knockout', unit: 1, by: 2 }, world)?.text).toBe(
      'Thor-born knocked out',
    );
    expect(describeEvent({ kind: 'knockout', unit: 7, by: 2 }, world)).toBeNull();
  });
  it('a raid falls back to the town hall', () => {
    expect(describeEvent({ kind: 'raid', lair: 55, size: 3 }, world)?.pos).toEqual({ x: 1, y: 2 });
  });
  it('level up and tier-up', () => {
    expect(
      describeEvent({ kind: 'levelUp', party: 2, level: 4, offer: [] }, world)?.text,
    ).toContain('level 4');
    expect(
      describeEvent({ kind: 'tierUp', unit: 1, tier: 2, path: 'thor-hammerborn' }, world)?.text,
    ).toBe('Thor-born rose to Hammerborn');
  });
  it('ignores events it does not announce', () => {
    expect(describeEvent({ kind: 'built', building: 1, type: 'market' }, world)).toBeNull();
  });
});

describe('EventFeed', () => {
  const spec = (text: string) => ({ text, color: '#000', pos: null });
  it('drops the same text inside the dedupe window, allows it later', () => {
    const f = new EventFeed();
    expect(f.push(spec('a'))).not.toBeNull();
    expect(f.push(spec('a'))).toBeNull();
    f.update(2500);
    expect(f.push(spec('a'))).not.toBeNull();
  });
  it('keeps at most MAX_TOASTS, newest last', () => {
    const f = new EventFeed();
    for (let i = 0; i < MAX_TOASTS + 2; i++) f.push(spec(`t${i}`));
    expect(f.toasts).toHaveLength(MAX_TOASTS);
    expect(f.toasts[MAX_TOASTS - 1].text).toBe(`t${MAX_TOASTS + 1}`);
  });
  it('expires toasts and dismisses on tap', () => {
    const f = new EventFeed();
    const t = f.push(spec('x'));
    f.push(spec('y'));
    f.dismiss(t!.id);
    expect(f.toasts.map((x) => x.text)).toEqual(['y']);
    f.update(TOAST_MS + 1);
    expect(f.toasts).toEqual([]);
  });
});
