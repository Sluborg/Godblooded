import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, TICK_MS, type GameData } from './api';

const data: GameData = {
  buildings: [{ id: 'market', cost: 100 }],
  startGold: 150,
  map: { width: 1000, height: 600 },
  townHall: { x: 500, y: 300 },
};

describe('world', () => {
  it('starts with a town hall and the start gold', () => {
    const s = snapshot(createWorld(1, data));
    expect(s.gold).toBe(150);
    expect(s.buildings.map((b) => b.type)).toEqual(['townHall']);
    expect(s.status).toBe('running');
  });

  it('runs whole fixed ticks regardless of frame size', () => {
    const a = createWorld(1, data);
    const b = createWorld(1, data);
    for (let i = 0; i < 100; i++) step(a, 16);
    step(b, 1600);
    expect(a.tick).toBe(b.tick);
    expect(a.timeMs).toBe(a.tick * TICK_MS);
  });

  it('caps ticks after a huge dt', () => {
    const w = createWorld(1, data);
    step(w, 10_000_000);
    expect(w.tick).toBe(400);
  });

  it('builds when affordable and rejects otherwise', () => {
    const w = createWorld(1, data);
    expect(command(w, { kind: 'build', type: 'market', pos: { x: 10, y: 10 } }).ok).toBe(true);
    expect(w.gold).toBe(50);
    expect(command(w, { kind: 'build', type: 'market', pos: { x: 20, y: 20 } })).toEqual({
      ok: false,
      reason: 'not enough gold',
    });
    expect(command(w, { kind: 'build', type: 'nope', pos: { x: 1, y: 1 } }).ok).toBe(false);
    expect(command(w, { kind: 'build', type: 'market', pos: { x: -1, y: 1 } }).ok).toBe(false);
  });

  it('places bounties and drains events once', () => {
    const w = createWorld(1, data);
    expect(command(w, { kind: 'placeBounty', pos: { x: 5, y: 5 }, gold: 40 }).ok).toBe(true);
    expect(command(w, { kind: 'placeBounty', pos: { x: 5, y: 5 }, gold: 0 }).ok).toBe(false);
    const first = snapshot(w);
    expect(first.gold).toBe(110);
    expect(first.bounties).toHaveLength(1);
    expect(first.events).toHaveLength(1);
    expect(snapshot(w).events).toHaveLength(0);
  });

  it('snapshot does not alias the live world', () => {
    const w = createWorld(1, data);
    const s = snapshot(w);
    (s.buildings[0].pos as { x: number }).x = -99;
    expect(w.buildings[0].pos.x).toBe(500);
  });
});
