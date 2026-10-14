import { describe, expect, it } from 'vitest';
import { createWorld, snapshot, step, TICK_MS, type GameData, type SimEvent } from './api';
import { spawnHero } from './world';
import type { DamageType } from './types';

const none = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
const data = (strikeType?: DamageType): GameData => ({
  buildings: [],
  startGold: 0,
  map: { width: 4000, height: 4000 },
  townHall: { x: 3800, y: 3800 },
  classes: [
    {
      id: 'knight',
      attrs: { ...none, str: 5, sta: 200, dex: 30, wp: 40 },
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [
    {
      id: 'wyrm',
      attrs: { ...none, str: 30, sta: 5 },
      weapon: { baseAttackS: 1, range: 40 },
      bounty: 1,
      xp: 1,
      ...(strikeType ? { strikeType } : {}),
    },
  ],
  lairs: [{ id: 'nest', monster: 'wyrm', spawnS: 1, maxAlive: 1, hp: 1000 }],
  lairSites: [{ lair: 'nest', pos: { x: 500, y: 500 } }],
  tuning: { hero: { firstRecruitMs: 10_000_000 }, town: { raidFirstMs: 10_000_000 } },
});

function hits(strikeType?: DamageType): Extract<SimEvent, { kind: 'hit' }>[] {
  const w = createWorld(1, data(strikeType));
  spawnHero(w, 'knight', { x: 520, y: 500 });
  const out: Extract<SimEvent, { kind: 'hit' }>[] = [];
  for (let t = 0; t < 60_000; t += TICK_MS) {
    step(w, TICK_MS);
    for (const e of snapshot(w).events) {
      if (e.kind === 'hit' && w.units.find((u) => u.id === e.target)?.kind === 'hero') out.push(e);
    }
  }
  return out;
}

describe('MonsterDef.strikeType', () => {
  it('defaults to physical', () => {
    const h = hits();
    expect(h.length).toBeGreaterThan(3);
    expect(h.every((e) => !e.type || e.type === 'physical')).toBe(true);
  });

  it('a death strike is typed and cannot be dodged', () => {
    const phys = hits();
    const death = hits('death');
    expect(death.length).toBeGreaterThan(3);
    expect(death.every((e) => e.type === 'death')).toBe(true);
    expect(death.some((e) => e.dodged)).toBe(false);
    expect(phys.some((e) => e.dodged)).toBe(true);
  });
});
