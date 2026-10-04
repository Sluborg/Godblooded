// Headless balance sim: plays seeded runs of the graybox with a simple bot (builds, picks the
// first upgrade offered) and reports run length, win rate and deaths.
//   npm run sim -- --runs 100 --seed 1 --max-min 30 [--json]
import { createServer } from 'vite';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : fallback;
};
const runs = opt('runs', 100);
const seed0 = opt('seed', 1);
const maxMin = opt('max-min', 30);
const json = args.includes('--json');

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const sim = await server.ssrLoadModule('/src/sim/api.ts');
  const { GRAYBOX } = await server.ssrLoadModule('/src/data/graybox.ts');
  const BUILD_ORDER = ['temple_aesir', 'market', 'shrine', 'tower'];
  const DT = 100;
  const results = [];

  for (let r = 0; r < runs; r++) {
    const w = sim.createWorld(seed0 + r, GRAYBOX);
    let snap = sim.snapshot(w);
    let timeout = false;
    for (let t = 0; snap.status === 'running'; t += DT) {
      if (t > maxMin * 60_000) {
        timeout = true;
        break;
      }
      sim.step(w, DT);
      snap = sim.snapshot(w);
      if (snap.parties.some((p) => p.offer)) {
        const p = snap.parties.find((x) => x.offer);
        sim.command(w, { kind: 'pickUpgrade', party: p.id, upgrade: p.offer[0] });
      }
      if (t % 5000 === 0) botBuild(w, snap);
    }
    snap = sim.snapshot(w);
    results.push({
      seed: seed0 + r,
      outcome: timeout ? 'timeout' : snap.status,
      minutes: snap.timeMs / 60_000,
      ...snap.stats,
      heroes: snap.units.filter((u) => u.kind === 'hero').length,
      maxPartyLevel: Math.max(1, ...snap.parties.map((p) => p.level)),
    });
  }

  function botBuild(w, snap) {
    for (const type of BUILD_ORDER) {
      if (snap.buildings.some((b) => b.type === type)) continue;
      const plot = snap.plots.find((p) => !p.occupied);
      if (!plot) return;
      sim.command(w, { kind: 'build', type, plot: plot.id });
    }
  }

  const report = summarize(results);
  if (json) console.log(JSON.stringify({ runs, seed0, maxMin, report, results }, null, 2));
  else print(report);
} finally {
  await server.close();
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function mean(list, key) {
  return list.length === 0 ? 0 : list.reduce((a, r) => a + r[key], 0) / list.length;
}

function summarize(results) {
  const count = (o) => results.filter((r) => r.outcome === o).length;
  const ended = results.filter((r) => r.outcome !== 'timeout');
  const minutes = ended.map((r) => r.minutes).sort((a, b) => a - b);
  return {
    runs: results.length,
    won: count('won'),
    lost: count('lost'),
    timeout: count('timeout'),
    winRate: count('won') / results.length,
    minutes: {
      mean: mean(ended, 'minutes'),
      p10: pct(minutes, 0.1),
      median: pct(minutes, 0.5),
      p90: pct(minutes, 0.9),
    },
    perRun: Object.fromEntries(
      [
        'monstersKilled',
        'lairsDestroyed',
        'heroesArrived',
        'knockouts',
        'buildingsLost',
        'taxCollected',
        'maxPartyLevel',
      ].map((k) => [k, mean(results, k)]),
    ),
  };
}

function print(rep) {
  const f = (n) => n.toFixed(1);
  console.log(`Balance sim: ${rep.runs} runs (seed ${seed0}.., cap ${maxMin} min)`);
  console.log(
    `  won ${rep.won}  lost ${rep.lost}  timeout ${rep.timeout}  win rate ${(rep.winRate * 100).toFixed(0)}%`,
  );
  console.log(
    `  run length (min, ended runs): mean ${f(rep.minutes.mean)}  p10 ${f(rep.minutes.p10)}  median ${f(rep.minutes.median)}  p90 ${f(rep.minutes.p90)}`,
  );
  console.log('  per run (mean):');
  for (const [k, v] of Object.entries(rep.perRun)) console.log(`    ${k.padEnd(16)} ${f(v)}`);
}
