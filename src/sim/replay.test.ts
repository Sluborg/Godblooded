import { describe, expect, it } from 'vitest';
import { GRAYBOX } from '../data/graybox';
import {
  command,
  createWorld,
  decodeReplay,
  encodeReplay,
  loadWorld,
  replayHash,
  runReplay,
  runReport,
  saveWorld,
  snapshot,
  step,
} from './api';

type W = ReturnType<typeof createWorld>;

// A scripted "player": builds, places and cancels flags, picks cards, with irregular frame times.
function play(seed: number, ms: number): W {
  const w = createWorld(seed, GRAYBOX);
  let frame = 0;
  for (let t = 0; t < ms && w.status === 'running';) {
    const dt = [16, 33, 50, 100, 250][frame++ % 5];
    step(w, dt);
    t += dt;
    const snap = snapshot(w);
    if (frame % 40 === 1) {
      const plot = snap.plots.find((p) => !p.occupied);
      const type = ['temple_aesir', 'market', 'tower', 'shrine'][Math.min(3, frame / 160)];
      if (plot) command(w, { kind: 'build', type, plot: plot.id });
    }
    if (frame % 90 === 0) {
      const lair = snap.lairs[0];
      if (lair) command(w, { kind: 'placeBounty', pos: lair.pos, gold: 30 });
    }
    if (frame % 200 === 0 && snap.bounties[0]) {
      command(w, { kind: 'cancelBounty', bounty: snap.bounties[0].id });
    }
    const p = snap.parties.find((x) => x.offer);
    if (p?.offer) command(w, { kind: 'pickUpgrade', party: p.id, upgrade: p.offer[0] });
  }
  return w;
}

describe('replay code', () => {
  it('plays a run back to the same report', () => {
    const w = play(7, 240_000);
    const report = runReport(w);
    expect(w.commandLog.length).toBeGreaterThan(8);
    expect(report.replay).toBeTruthy();
    const { world, dataMatches } = runReplay(report.replay ?? '', GRAYBOX);
    expect(dataMatches).toBe(true);
    expect(world.tick).toBe(w.tick);
    expect(runReport(world)).toEqual(report);
    expect(JSON.stringify(snapshot(world).units)).toBe(JSON.stringify(snapshot(w).units));
  });

  it('is deterministic across seeds and carries the commands', () => {
    for (const seed of [1, 2, 3]) {
      const w = play(seed, 120_000);
      const code = decodeReplay(runReport(w).replay ?? '');
      expect(code.seed).toBe(seed);
      expect(code.log.length).toBe(w.commandLog.length);
      expect(code.log.map((r) => r.cmd.kind)).toEqual(w.commandLog.map((r) => r.cmd.kind));
      expect(runReport(runReplay(code, GRAYBOX).world)).toEqual(runReport(w));
    }
  });

  it('keeps only commands that took effect', () => {
    const w = createWorld(1, GRAYBOX);
    expect(command(w, { kind: 'build', type: 'nope', plot: 0 }).ok).toBe(false);
    expect(command(w, { kind: 'build', type: 'temple_aesir', plot: 0 }).ok).toBe(true);
    expect(w.commandLog).toHaveLength(1);
  });

  it('survives a save and load, and an old save has no code', () => {
    const w = play(5, 90_000);
    const saved = JSON.parse(JSON.stringify(saveWorld(w)));
    const back = loadWorld(saved, GRAYBOX);
    expect(runReport(back).replay).toBe(runReport(w).replay);
    delete saved.world.commandLog;
    delete saved.world.replayable;
    expect(runReport(loadWorld(saved, GRAYBOX)).replay).toBeNull();
  });

  it('refuses a bad code and notices other data', () => {
    expect(() => decodeReplay('hello')).toThrow(/replay code/);
    expect(() => decodeReplay(btoa('[2,1,"x",0,[]]'))).toThrow(/replay code/);
    const w = play(3, 30_000);
    const code = runReport(w).replay ?? '';
    const other = { ...GRAYBOX, startGold: GRAYBOX.startGold + 1 };
    expect(replayHash(other)).not.toBe(replayHash(GRAYBOX));
    expect(runReplay(code, other).dataMatches).toBe(false);
  });

  it('plays a first run and an avoided boss back the same', () => {
    const w = createWorld(5, GRAYBOX, { firstRun: true, avoidBoss: 'fenrir' });
    command(w, { kind: 'build', type: 'temple_aesir', plot: 0 });
    for (let i = 0; i < 400; i++) step(w, 50);
    const code = encodeReplay(w);
    expect(decodeReplay(code).opts).toEqual({ firstRun: true, avoidBoss: 'fenrir' });
    const back = runReplay(code, GRAYBOX).world;
    expect(back.firstRun).toBe(true);
    expect(back.started).toBe(w.started);
    expect(runReport(back)).toEqual(runReport(w));
  });
});
