import { describe, expect, it } from 'vitest';
import { command, createWorld, snapshot, step, type GameData } from './api';
import { spawnHero } from './world';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const cls = (id: string) => ({
  id,
  attrs,
  weapon: { baseAttackS: 1.5, range: 40 },
  startGold: 10,
});
const base: GameData = {
  buildings: [{ id: 'temple_aesir', cost: 100 }],
  plots: [
    { x: 700, y: 500 },
    { x: 800, y: 500 },
  ],
  startGold: 1000,
  map: { width: 2000, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [cls('warrior'), cls('ranger'), cls('wizard')],
  tuning: {
    hero: { firstRecruitMs: 1_000, recruitMs: 1_000, maxPerTemple: 99 },
    town: { raidFirstMs: 10_000_000 },
  },
};

function counts(w: ReturnType<typeof createWorld>) {
  const out: Record<string, number> = {};
  for (const u of snapshot(w).units) if (u.kind === 'hero') out[u.type] = (out[u.type] ?? 0) + 1;
  return out;
}

function town(data: GameData, buildings = 1) {
  const w = createWorld(1, data);
  for (let plot = 0; plot < buildings; plot++) {
    command(w, { kind: 'build', type: 'temple_aesir', plot });
  }
  return w;
}

describe('class cap', () => {
  it('at most 2 heroes of each class by default, 6 in all with 3 classes', () => {
    const w = town(base);
    step(w, 120_000);
    const c = counts(w);
    expect(Object.values(c).every((n) => n <= 2)).toBe(true);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(6);
  });

  it('a full class is skipped and the temple picks another one it offers', () => {
    const w = town({
      ...base,
      classes: [cls('warrior'), cls('ranger')],
    });
    spawnHero(w, 'warrior', { x: 100, y: 100 });
    spawnHero(w, 'warrior', { x: 100, y: 100 });
    step(w, 20_000);
    const c = counts(w);
    expect(c.warrior).toBe(2);
    expect(c.ranger).toBe(2);
  });

  it('with every class full nobody is recruited that cycle', () => {
    const w = town({ ...base, classes: [cls('warrior')] });
    step(w, 60_000);
    expect(counts(w).warrior).toBe(2);
    expect(snapshot(w).stats.heroesArrived).toBe(2);
  });

  it('a knocked-out hero still counts against the cap', () => {
    const w = town({ ...base, classes: [cls('warrior')] });
    const a = spawnHero(w, 'warrior', { x: 100, y: 100 });
    spawnHero(w, 'warrior', { x: 100, y: 100 });
    const hero = w.units.find((u) => u.id === a);
    if (!hero) throw new Error('setup');
    hero.ko = true;
    hero.hp = 0;
    hero.mode = 'ko';
    const rt = w.heroRuntime.get(a);
    if (rt) rt.koMs = 10_000_000;
    step(w, 30_000);
    expect(counts(w).warrior).toBe(2);
  });

  it('the cap is tuning.hero.maxPerClass', () => {
    const total = (maxPerClass: number) => {
      const w = town({
        ...base,
        tuning: { ...base.tuning, hero: { ...base.tuning?.hero, maxPerClass } },
      });
      step(w, 120_000);
      return Object.values(counts(w)).reduce((a, b) => a + b, 0);
    };
    expect(total(1)).toBe(3);
    expect(total(3)).toBe(9);
  });

  it('two temples share the cap', () => {
    const w = town(base, 2);
    step(w, 120_000);
    const c = counts(w);
    expect(Object.values(c).every((n) => n <= 2)).toBe(true);
    expect(Object.values(c).reduce((a, b) => a + b, 0)).toBe(6);
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const w = createWorld(seed, base);
      command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
      step(w, 60_000);
      return JSON.stringify(snapshot(w).units.map((u) => [u.type, u.id]));
    };
    expect(run(3)).toBe(run(3));
  });
});
