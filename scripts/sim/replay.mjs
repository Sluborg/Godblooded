// Replays a run from its replay code (the end screen's "Copy replay code") headless and prints the
// run report and the key moments.
//   npm run replay -- <code> [--data file.json] [--m3] [--json]
// --data / --m3 must match what the run was played with (the code carries a hash of the game
// data and the tool says when it differs).
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const dataIdx = args.indexOf('--data');
const code = args.find((a, i) => !a.startsWith('--') && (dataIdx < 0 || i !== dataIdx + 1));
if (!code) {
  console.error('usage: npm run replay -- <replay code> [--data file.json] [--m3] [--json]');
  process.exit(2);
}
const json = args.includes('--json');

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const sim = await server.ssrLoadModule('/src/sim/api.ts');
  const { GRAYBOX: base } = await server.ssrLoadModule('/src/data/graybox.ts');
  let data = base;
  if (dataIdx >= 0) {
    const over = JSON.parse(readFileSync(args[dataIdx + 1], 'utf8'));
    data = { ...base, ...over, tuning: mergeTuning(base.tuning, over.tuning) };
  }
  if (args.includes('--m3')) {
    data = { ...data, tuning: mergeTuning(data.tuning, { nodes: { enabled: true } }) };
  }
  const moments = [];
  const mm = (w) =>
    `${Math.floor(w.timeMs / 60_000)}:${String(Math.floor(w.timeMs / 1000) % 60).padStart(2, '0')}`;
  const KEY = new Set([
    'built',
    'upgraded',
    'bountyPlaced',
    'bountyClaimed',
    'bountyCancelled',
    'lairDestroyed',
    'bossEmerged',
    'enraged',
    'raid',
    'raidWarning',
    'knockout',
    'slain',
    'buildingDestroyed',
    'nodeFreed',
    'nodeDefiled',
    'lairSprouted',
    'won',
    'lost',
  ]);
  const {
    world,
    code: rc,
    dataMatches,
  } = sim.runReplay(code, data, (w, events) => {
    for (const e of events) if (KEY.has(e.kind)) moments.push(`${mm(w)}  ${describe(e)}`);
  });
  const report = sim.runReport(world);
  if (json) {
    console.log(
      JSON.stringify(
        { seed: rc.seed, dataMatches, commands: rc.log.length, report, moments },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `Replay: seed ${rc.seed}, ${rc.log.length} commands, ${rc.end} ticks${dataMatches ? '' : '  (WARNING: game data differs from the run; results may differ)'}`,
    );
    console.log(
      `  outcome ${report.outcome} at ${(report.timeMs / 60_000).toFixed(1)} min; lairs cleared ${report.lairsCleared.length}; heroes ${report.heroes.length}; tax banked ${report.taxBanked}`,
    );
    console.log('Key moments:');
    for (const m of moments) console.log(`  ${m}`);
    console.log('Heroes (damage, kills, knockouts):');
    for (const h of report.heroes.slice(0, 12)) {
      console.log(
        `  ${h.mvp ? '*' : ' '} ${h.type}${h.god ? ` (${h.god})` : ''}${h.slain ? ' [slain]' : ''}: dmg ${h.damage}, kills ${h.kills}, KO ${h.knockouts}, gold ${h.goldEarned}`,
      );
    }
  }
} finally {
  await server.close();
}

function describe(e) {
  const { kind, ...rest } = e;
  const bits = Object.entries(rest)
    .filter(([, v]) => typeof v !== 'object')
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  return bits ? `${kind} (${bits})` : kind;
}

function mergeTuning(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = { ...(a[k] ?? {}), ...v };
  return out;
}
