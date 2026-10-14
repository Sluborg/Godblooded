import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, type GameData } from './api';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data = (hallTiers: boolean): GameData => ({
  buildings: [
    { id: 'temple_aesir', cost: 150, pantheon: 'aesir' },
    { id: 'market', cost: 100 },
  ],
  plots: Array.from({ length: 12 }, (_, i) => ({ x: 700 + i * 60, y: 700 })),
  startGold: 5000,
  map: { width: 2400, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [{ id: 'warrior', attrs, weapon: { baseAttackS: 1, range: 40 }, startGold: 0 }],
  tuning: { town: { hallTiers } },
});

const hall = (w: ReturnType<typeof createWorld>) => {
  const h = w.buildings.find((b) => b.type === 'townhall');
  if (!h) throw new Error('no hall');
  return h;
};

describe('town hall tiers', () => {
  it('are off by default: the hall stays tier 1, nothing is gated or locked', () => {
    const w = createWorld(1, data(false));
    const id = hall(w).id;
    expect(command(w, { kind: 'upgrade', building: id }).ok).toBe(false);
    const s = snapshot(w);
    expect(s.plots.every((p) => !p.locked)).toBe(true);
    expect(command(w, { kind: 'build', type: 'temple_aesir', plot: 11 }).ok).toBe(true);
    expect(command(w, { kind: 'upgrade', building: w.buildings[1].id }).ok).toBe(true);
  });

  it('upgrade for 400 then 900 gold, with hp 500, 750, 1000', () => {
    const w = createWorld(1, data(true));
    const h = hall(w);
    expect(h.maxHp).toBe(500);
    const gold = w.gold;
    expect(command(w, { kind: 'upgrade', building: h.id }).ok).toBe(true);
    expect(w.gold).toBe(gold - 400);
    expect(h).toMatchObject({ tier: 2, maxHp: 750, hp: 750 });
    expect(command(w, { kind: 'upgrade', building: h.id }).ok).toBe(true);
    expect(w.gold).toBe(gold - 1300);
    expect(h).toMatchObject({ tier: 3, maxHp: 1000 });
    expect(command(w, { kind: 'upgrade', building: h.id })).toMatchObject({
      reason: 'already at the top tier',
    });
    expect(snapshot(w).buildings.find((b) => b.id === h.id)?.upgradeCost).toBeNull();
  });

  it('gate other buildings: no tier above the town hall', () => {
    const w = createWorld(1, data(true));
    const r = command(w, { kind: 'build', type: 'market', plot: 0 });
    if (!r.ok) throw new Error(r.reason);
    expect(command(w, { kind: 'upgrade', building: r.id })).toMatchObject({
      reason: 'needs town hall tier 2',
    });
    expect(snapshot(w).buildings.find((b) => b.id === r.id)?.upgradeGate).toBe(2);
    command(w, { kind: 'upgrade', building: hall(w).id });
    expect(command(w, { kind: 'upgrade', building: r.id }).ok).toBe(true);
    expect(snapshot(w).buildings.find((b) => b.id === r.id)?.upgradeGate).toBe(3);
  });

  it('open plots 9-10 at tier 2 and 11-12 at tier 3', () => {
    const w = createWorld(1, data(true));
    const locked = () =>
      snapshot(w)
        .plots.filter((p) => p.locked)
        .map((p) => p.id);
    expect(locked()).toEqual([8, 9, 10, 11]);
    expect(snapshot(w).plots[8].unlockTier).toBe(2);
    expect(snapshot(w).plots[10].unlockTier).toBe(3);
    expect(command(w, { kind: 'build', type: 'market', plot: 8 })).toMatchObject({
      reason: 'needs town hall tier 2',
    });
    command(w, { kind: 'upgrade', building: hall(w).id });
    expect(locked()).toEqual([10, 11]);
    expect(command(w, { kind: 'build', type: 'market', plot: 8 }).ok).toBe(true);
    command(w, { kind: 'upgrade', building: hall(w).id });
    expect(locked()).toEqual([]);
  });

  it('gate the temple tier bought with Ambrosia too', () => {
    const w = createWorld(1, {
      ...data(true),
      tuning: { town: { hallTiers: true }, nodes: { enabled: true } },
    });
    const r = command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    if (!r.ok) throw new Error(r.reason);
    w.ambrosia = 500;
    expect(command(w, { kind: 'upgradeWithAmbrosia', building: r.id })).toMatchObject({
      reason: 'needs town hall tier 2',
    });
    expect(w.ambrosia).toBe(500);
  });
});
