import { describe, expect, it } from 'vitest';
import { command, createWorld, loadWorld, saveWorld, snapshot, step, type GameData } from './api';

const attrs = { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
const data: GameData = {
  buildings: [{ id: 'temple_aesir', cost: 10, pantheon: 'aesir' }],
  plots: [{ x: 700, y: 500 }],
  startGold: 100,
  map: { width: 2000, height: 1200 },
  townHall: { x: 600, y: 500 },
  classes: [
    {
      id: 'warrior',
      attrs,
      weapon: { baseAttackS: 1, range: 40 },
      startGold: 0,
    },
  ],
  monsters: [],
  tuning: { town: { raidFirstMs: 240_000, raidEveryMs: 99_000 }, hero: { firstRecruitMs: 5_000 } },
  firstRun: { town: { raidFirstMs: 480_000 } },
};

describe('first run', () => {
  it('waits for the first temple: no time passes until one stands', () => {
    const w = createWorld(1, data, { firstRun: true });
    step(w, 10_000);
    expect(w.timeMs).toBe(0);
    expect(snapshot(w).waiting).toBe(true);
    // building something else does not start it; a temple does
    expect(command(w, { kind: 'build', type: 'temple_aesir', plot: 0 }).ok).toBe(true);
    step(w, 1_000);
    expect(w.timeMs).toBe(1_000);
    expect(snapshot(w).waiting).toBe(false);
  });

  it('never pauses again once started, even if the temple falls', () => {
    const w = createWorld(1, data, { firstRun: true });
    command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    step(w, 500);
    w.buildings = w.buildings.filter((b) => b.type === 'townhall');
    step(w, 500);
    expect(w.timeMs).toBe(1_000);
  });

  it('an ordinary run starts at once', () => {
    const w = createWorld(1, data);
    step(w, 1_000);
    expect(w.timeMs).toBe(1_000);
    expect(snapshot(w).waiting).toBe(false);
  });

  it('applies data.firstRun over tuning, group by group, only on a first run', () => {
    const first = createWorld(1, data, { firstRun: true });
    expect(first.tuning.town.raidFirstMs).toBe(480_000);
    expect(first.tuning.town.raidEveryMs).toBe(99_000);
    expect(first.tuning.hero.firstRecruitMs).toBe(5_000);
    const normal = createWorld(1, data);
    expect(normal.tuning.town.raidFirstMs).toBe(240_000);
  });

  it('keeps its overrides and its wait through a save and load', () => {
    const w = createWorld(1, data, { firstRun: true });
    const back = loadWorld(JSON.parse(JSON.stringify(saveWorld(w))), data);
    expect(back.tuning.town.raidFirstMs).toBe(480_000);
    step(back, 5_000);
    expect(back.timeMs).toBe(0);
    command(back, { kind: 'build', type: 'temple_aesir', plot: 0 });
    step(back, 1_000);
    const again = loadWorld(JSON.parse(JSON.stringify(saveWorld(back))), data);
    expect(again.started).toBe(true);
    expect(again.tuning.town.raidFirstMs).toBe(480_000);
  });
});
