import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, type GameData } from './api';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [],
  startGold: 500,
  map: { width: 2000, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
};

describe('cancelBounty', () => {
  it('takes the flag down and refunds its gold in full', () => {
    const w = createWorld(1, data);
    const placed = command(w, { kind: 'placeBounty', pos: { x: 900, y: 500 }, gold: 120 });
    if (!placed.ok) throw new Error('place failed');
    expect(w.gold).toBe(380);
    snapshot(w);
    const res = command(w, { kind: 'cancelBounty', bounty: placed.id });
    expect(res).toEqual({ ok: true, id: placed.id });
    expect(w.gold).toBe(500);
    expect(w.bounties).toHaveLength(0);
    expect(snapshot(w).events).toContainEqual({
      kind: 'bountyCancelled',
      bounty: placed.id,
      gold: 120,
    });
  });

  it('refuses an unknown or already taken flag, so gold is never refunded twice', () => {
    const w = createWorld(1, data);
    const placed = command(w, { kind: 'placeBounty', pos: { x: 900, y: 500 }, gold: 50 });
    if (!placed.ok) throw new Error('place failed');
    command(w, { kind: 'cancelBounty', bounty: placed.id });
    expect(command(w, { kind: 'cancelBounty', bounty: placed.id })).toEqual({
      ok: false,
      reason: 'unknown bounty',
    });
    expect(w.gold).toBe(500);
  });

  it('a hero heading for the flag drops it', () => {
    const w = createWorld(1, data);
    const id = spawnHero(w, 'warrior', { x: 600, y: 500 });
    const hero = w.units.find((u) => u.id === id)!;
    hero.mode = 'explore';
    const placed = command(w, { kind: 'placeBounty', pos: { x: 1500, y: 500 }, gold: 200 });
    if (!placed.ok) throw new Error('place failed');
    step(w, 1_500);
    expect(w.heroRuntime.get(id)?.bounty).toBe(placed.id);
    command(w, { kind: 'cancelBounty', bounty: placed.id });
    step(w, 1_500);
    expect(w.heroRuntime.get(id)?.bounty).toBeUndefined();
    expect(snapshot(w).units.find((u) => u.id === id)?.bounty).toBeNull();
  });
});
