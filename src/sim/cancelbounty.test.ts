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
  it('takes the flag down and refunds half its gold', () => {
    const w = createWorld(1, data);
    const placed = command(w, { kind: 'placeBounty', pos: { x: 900, y: 500 }, gold: 120 });
    if (!placed.ok) throw new Error('place failed');
    expect(w.gold).toBe(380);
    snapshot(w);
    const res = command(w, { kind: 'cancelBounty', bounty: placed.id });
    expect(res).toEqual({ ok: true, id: placed.id });
    expect(w.gold).toBe(440);
    expect(w.bounties).toHaveLength(0);
    expect(snapshot(w).events).toContainEqual({
      kind: 'bountyCancelled',
      bounty: placed.id,
      gold: 120,
      refund: 60,
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
    // 450 left after placing, 25 back once: never refunded twice
    expect(w.gold).toBe(475);
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

describe('raiseBounty', () => {
  it('adds gold to a standing flag and tells Scene the new total', () => {
    const w = createWorld(1, data);
    const placed = command(w, { kind: 'placeBounty', pos: { x: 900, y: 500 }, gold: 100 });
    if (!placed.ok) throw new Error('place failed');
    snapshot(w);
    expect(command(w, { kind: 'raiseBounty', bounty: placed.id, gold: 50 })).toEqual({
      ok: true,
      id: placed.id,
    });
    expect(w.gold).toBe(350);
    expect(w.bounties[0].gold).toBe(150);
    expect(snapshot(w).events).toContainEqual({
      kind: 'bountyRaised',
      bounty: placed.id,
      gold: 50,
      total: 150,
    });
  });

  it('refuses an unknown flag, a bad amount and a poor town', () => {
    const w = createWorld(1, data);
    const placed = command(w, { kind: 'placeBounty', pos: { x: 900, y: 500 }, gold: 100 });
    if (!placed.ok) throw new Error('place failed');
    expect(command(w, { kind: 'raiseBounty', bounty: 999, gold: 10 })).toEqual({
      ok: false,
      reason: 'unknown bounty',
    });
    expect(command(w, { kind: 'raiseBounty', bounty: placed.id, gold: 0 }).ok).toBe(false);
    expect(command(w, { kind: 'raiseBounty', bounty: placed.id, gold: 9999 })).toEqual({
      ok: false,
      reason: 'not enough gold',
    });
    expect(w.bounties[0].gold).toBe(100);
  });

  it('a cancel after a raise refunds half of the new total', () => {
    const w = createWorld(1, data);
    const placed = command(w, { kind: 'placeBounty', pos: { x: 900, y: 500 }, gold: 100 });
    if (!placed.ok) throw new Error('place failed');
    command(w, { kind: 'raiseBounty', bounty: placed.id, gold: 100 });
    command(w, { kind: 'cancelBounty', bounty: placed.id });
    expect(w.gold).toBe(300 + 100);
  });
});
