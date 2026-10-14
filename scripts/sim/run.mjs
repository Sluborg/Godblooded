// Headless balance sim: plays seeded runs of the graybox with a simple bot (builds, picks the
// first upgrade offered, buys building tiers) and reports run length, win rate and deaths.
//   npm run sim -- --runs 100 --seed 1 --max-min 30 [--data path.json] [--json] [--no-upgrade]
//     [--flags [--flag-gold 40] [--no-lair-flag]]
// --flags adds Design's probe B: once a minute, with town gold of 60 or more, a flag of
// --flag-gold (40) gold on open ground about 150 from a hero out exploring; the report counts
// flags placed and claimed.
// --hunt (implies --flags, 50 gold unless --flag-gold): the probe flag goes on a living monster
// 350 to 900 from the nearest hero instead (skipped while there is none, no other probe flag
// open), and the report adds how soon a party headed for it and how many were paid. --no-lair-flag turns the bot's own 50 gold lair flag off.
// --data takes a JSON file that overrides GRAYBOX fields (top level; `tuning` groups are
// merged one by one), so data passes can be tried without editing src/data.
import { readFileSync } from 'node:fs';
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
// The bot buys building tiers unless --no-upgrade is given.
const UPGRADE = !args.includes('--no-upgrade');
const HUNT = args.includes('--hunt');
const FLAGS = args.includes('--flags') || HUNT;
const FLAG_GOLD = opt('flag-gold', HUNT ? 50 : 40);
const LAIR_FLAG = !args.includes('--no-lair-flag');
const dataIdx = args.indexOf('--data');
const dataFile = dataIdx >= 0 ? args[dataIdx + 1] : undefined;

const server = await createServer({
  configFile: false,
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
});

try {
  const sim = await server.ssrLoadModule('/src/sim/api.ts');
  const { GRAYBOX: base } = await server.ssrLoadModule('/src/data/graybox.ts');
  const GRAYBOX = dataFile ? withOverride(base, JSON.parse(readFileSync(dataFile, 'utf8'))) : base;
  // The smithy joins the order once the data has one (heroes then buy weapons and armour).
  const BUILD_ORDER = ['temple_aesir', 'market', 'shrine', 'tower'];
  if (GRAYBOX.buildings.some((b) => b.id === 'smithy')) BUILD_ORDER.splice(2, 0, 'smithy');
  const DT = 100;
  const results = [];

  let flagRun = null;
  for (let r = 0; r < runs; r++) {
    flagRun = {
      placed: 0,
      claimed: 0,
      huntPlaced: 0,
      huntClaimed: 0,
      nextMs: 60_000,
      // --hunt probe flags by id: placed at, seconds until a party headed for it, paid or not
      probes: new Map(),
    };
    const w = sim.createWorld(seed0 + r, GRAYBOX);
    let snap = sim.snapshot(w);
    let timeout = false;
    // Minutes of the first boss emerge and the first blow to or from a boss (null: never).
    let bossOutMin = null;
    let bossFightMin = null;
    const bossIds = new Set();
    // Town gold at 3:00 and 5:00, and mean hero gear levels at 8:00 (all hero units, knocked out too;
    // geared: the share with a weapon or armour level) (null: the run ended first).
    const goldAt = { 180_000: null, 300_000: null };
    let gear8 = null;
    const watch = (sn) => {
      for (const e of sn.events ?? []) {
        if (e.kind === 'bountyClaimed') {
          flagRun.claimed++;
          if (e.hunt) flagRun.huntClaimed++;
        }
        if (e.kind === 'bountyPlaced' && e.target !== undefined) flagRun.huntPlaced++;
        const probe = (id) => flagRun.probes.get(id);
        if (e.kind === 'intent' && e.intent.kind === 'flag' && probe(e.intent.target)) {
          const p = probe(e.intent.target);
          p.headedS ??= (sn.timeMs - p.at) / 1000;
        }
        if (e.kind === 'bountyClaimed' && probe(e.bounty)) probe(e.bounty).paid = !!e.hunt;
        if (e.kind === 'bossEmerged') {
          bossIds.add(e.unit);
          bossOutMin ??= sn.timeMs / 60_000;
        } else if (e.kind === 'hit' && (bossIds.has(e.attacker) || bossIds.has(e.target))) {
          bossFightMin ??= sn.timeMs / 60_000;
        }
      }
    };
    for (let t = 0; snap.status === 'running'; t += DT) {
      if (t > maxMin * 60_000) {
        timeout = true;
        break;
      }
      sim.step(w, DT);
      snap = sim.snapshot(w);
      watch(snap);
      for (const at of Object.keys(goldAt)) {
        if (goldAt[at] === null && snap.timeMs >= Number(at)) goldAt[at] = snap.gold;
      }
      if (gear8 === null && snap.timeMs >= 480_000) {
        const heroes = snap.units.filter((u) => u.kind === 'hero');
        const avg = (key) =>
          heroes.length === 0
            ? 0
            : heroes.reduce((a, u) => a + (u.items?.[key] ?? 0), 0) / heroes.length;
        gear8 = {
          weapon: avg('weapon'),
          armour: avg('armour'),
          heroes: heroes.length,
          geared:
            heroes.length === 0
              ? 0
              : heroes.filter((u) => (u.items?.weapon ?? 0) + (u.items?.armour ?? 0) > 0).length /
                heroes.length,
        };
      }
      const pathCard = snap.parties.find((p) => p.pathOffer);
      if (pathCard) {
        sim.command(w, {
          kind: 'pickPath',
          party: pathCard.id,
          path: pathCard.pathOffer.options[0],
        });
      } else if (snap.parties.some((p) => p.offer)) {
        const p = snap.parties.find((x) => x.offer);
        sim.command(w, { kind: 'pickUpgrade', party: p.id, upgrade: p.offer[0] });
      }
      if (t % 5000 === 0) botTurn(w, snap);
    }
    snap = sim.snapshot(w);
    watch(snap);
    results.push({
      seed: seed0 + r,
      outcome: timeout ? 'timeout' : snap.status,
      minutes: snap.timeMs / 60_000,
      bossOutMin,
      bossFightMin,
      flagsPlaced: flagRun.placed,
      flagsClaimed: flagRun.claimed,
      huntPlaced: flagRun.huntPlaced,
      huntClaimed: flagRun.huntClaimed,
      probes: [...flagRun.probes.values()],
      gold3: goldAt[180_000],
      gold5: goldAt[300_000],
      weapon8: gear8?.weapon ?? null,
      armour8: gear8?.armour ?? null,
      geared8: gear8?.geared ?? null,
      ...snap.stats,
      heroes: snap.units.filter((u) => u.kind === 'hero').length,
      maxPartyLevel: Math.max(1, ...snap.parties.map((p) => p.level)),
    });
  }

  // Build temple, market, shrine, tower as gold allows; with gold to spare, put a 50 gold flag
  // on the lair nearest the town hall (one flag at a time).
  function botTurn(w, snap) {
    for (const type of BUILD_ORDER) {
      if (snap.buildings.some((b) => b.type === type)) continue;
      const plot = snap.plots.find((p) => !p.occupied);
      if (!plot) break;
      sim.command(w, { kind: 'build', type, plot: plot.id });
    }
    // With gold to spare, buy the next tier of a temple, tower or market (cheapest first).
    if (UPGRADE) {
      const ups = snap.buildings
        .filter((b) => b.upgradeCost !== null && b.upgradeCost + 150 <= snap.gold)
        .sort((a, b) => a.upgradeCost - b.upgradeCost);
      if (ups.length > 0) sim.command(w, { kind: 'upgrade', building: ups[0].id });
    }
    // Why no party heads for a probe flag 5 s after it was placed: what the party of the hero
    // nearest to it was doing then.
    for (const [id, p] of flagRun.probes) {
      if (p.why !== undefined || snap.timeMs - p.at < 5000) continue;
      if (p.headedS !== null) {
        p.why = 'headed';
        continue;
      }
      const flag = snap.bounties.find((b) => b.id === id);
      const heroes = snap.units.filter((u) => u.kind === 'hero');
      if (!flag || heroes.length === 0) {
        p.why = flag ? 'no hero' : 'flag gone';
        continue;
      }
      const d = (u) => Math.hypot(u.pos.x - flag.pos.x, u.pos.y - flag.pos.y);
      const nearest = heroes.reduce((a, b) => (d(b) < d(a) ? b : a));
      const party = snap.parties.find((q) => q.id === nearest.party);
      if (nearest.ko) p.why = 'knocked out';
      else if (nearest.mode === 'rest') p.why = 'resting';
      else if (nearest.mode === 'shop') p.why = 'shopping';
      else if (nearest.mode === 'return') p.why = 'retreating';
      else if (party?.intent.kind === 'lair') {
        const at = party.intent.pos;
        const near = at && Math.hypot(nearest.pos.x - at.x, nearest.pos.y - at.y) <= 350;
        const foe = snap.units.some(
          (u) =>
            u.kind === 'monster' &&
            Math.hypot(u.pos.x - nearest.pos.x, u.pos.y - nearest.pos.y) <= 100,
        );
        p.why = !near
          ? 'walking to a lair'
          : foe
            ? 'at its lair, mid-fight'
            : 'at its lair, no foe near';
      } else if (party?.intent.kind === 'flag') p.why = 'on another flag';
      else if (party?.intent.kind === 'revenge') p.why = 'sworn revenge';
      else if (nearest.target !== null) p.why = 'in a fight, flag not worth it';
      else p.why = 'exploring, flag not worth it';
    }
    if (HUNT && snap.timeMs >= flagRun.nextMs && snap.gold >= FLAG_GOLD + 10) {
      const open = [...flagRun.probes.keys()].some((id) => snap.bounties.some((b) => b.id === id));
      const heroes = snap.units.filter((u) => u.kind === 'hero' && !u.ko);
      const near = (m) =>
        Math.min(...heroes.map((h) => Math.hypot(h.pos.x - m.pos.x, h.pos.y - m.pos.y)));
      const prey = open
        ? undefined
        : snap.units.find((u) => u.kind === 'monster' && near(u) >= 350 && near(u) <= 900);
      if (heroes.length > 0 && prey) {
        const r = sim.command(w, { kind: 'placeBounty', pos: prey.pos, gold: FLAG_GOLD });
        if (r.ok) {
          flagRun.placed++;
          flagRun.nextMs = snap.timeMs + 60_000;
          flagRun.probes.set(r.id, { at: snap.timeMs, headedS: null, paid: false, why: undefined });
        }
      }
    } else if (FLAGS && !HUNT && snap.timeMs >= flagRun.nextMs && snap.gold >= 60) {
      const hero = snap.units.find((u) => u.kind === 'hero' && u.mode === 'explore' && !u.ko);
      if (hero) {
        flagRun.nextMs = snap.timeMs + 60_000;
        const a = flagRun.placed * 2.4;
        const m = GRAYBOX.map;
        const pos = {
          x: Math.min(m.width - 1, Math.max(1, hero.pos.x + Math.cos(a) * 150)),
          y: Math.min(m.height - 1, Math.max(1, hero.pos.y + Math.sin(a) * 150)),
        };
        if (sim.command(w, { kind: 'placeBounty', pos, gold: FLAG_GOLD }).ok) flagRun.placed++;
      }
    }
    if (LAIR_FLAG && snap.gold > 150 && snap.bounties.length === 0 && snap.lairs.length > 0) {
      const hall = GRAYBOX.townHall;
      const near = [...snap.lairs].sort(
        (a, b) =>
          Math.hypot(a.pos.x - hall.x, a.pos.y - hall.y) -
          Math.hypot(b.pos.x - hall.x, b.pos.y - hall.y),
      )[0];
      sim.command(w, { kind: 'placeBounty', pos: near.pos, gold: 50 });
    }
  }

  const report = summarize(results);
  if (json) console.log(JSON.stringify({ runs, seed0, maxMin, report, results }, null, 2));
  else print(report);
} finally {
  await server.close();
}

function withOverride(base, over) {
  const merged = { ...base, ...over };
  if (base.tuning || over.tuning) {
    merged.tuning = {};
    for (const group of new Set([
      ...Object.keys(base.tuning ?? {}),
      ...Object.keys(over.tuning ?? {}),
    ])) {
      merged.tuning[group] = { ...base.tuning?.[group], ...over.tuning?.[group] };
    }
  }
  return merged;
}

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function mean(list, key) {
  return list.length === 0 ? 0 : list.reduce((a, r) => a + r[key], 0) / list.length;
}

// Mean over the runs that have the value (null when none do).
function meanOf(results, key) {
  const v = results.map((r) => r[key]).filter((x) => x !== null);
  return v.length === 0 ? null : v.reduce((a, x) => a + x, 0) / v.length;
}

// Share of runs that reached the moment, and its p10, median and p90 in minutes.
function bossTimes(results, key) {
  const t = results
    .map((r) => r[key])
    .filter((x) => x !== null)
    .sort((a, b) => a - b);
  return {
    reached: results.length === 0 ? 0 : t.length / results.length,
    p10: pct(t, 0.1),
    median: pct(t, 0.5),
    p90: pct(t, 0.9),
  };
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
    bossOut: bossTimes(results, 'bossOutMin'),
    bossFight: bossTimes(results, 'bossFightMin'),
    pacing: {
      gold3: meanOf(results, 'gold3'),
      gold5: meanOf(results, 'gold5'),
      weapon8: meanOf(results, 'weapon8'),
      armour8: meanOf(results, 'armour8'),
      geared8: meanOf(results, 'geared8'),
    },
    probes: results.flatMap((r) => r.probes ?? []),
    flags: {
      placed: meanOf(results, 'flagsPlaced'),
      claimed: meanOf(results, 'flagsClaimed'),
      huntPlaced: meanOf(results, 'huntPlaced'),
      huntClaimed: meanOf(results, 'huntClaimed'),
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
  console.log(
    `Balance sim: ${rep.runs} runs (seed ${seed0}.., cap ${maxMin} min${dataFile ? `, data ${dataFile}` : ''})`,
  );
  console.log(
    `  won ${rep.won}  lost ${rep.lost}  timeout ${rep.timeout}  win rate ${(rep.winRate * 100).toFixed(0)}%`,
  );
  console.log(
    `  run length (min, ended runs): mean ${f(rep.minutes.mean)}  p10 ${f(rep.minutes.p10)}  median ${f(rep.minutes.median)}  p90 ${f(rep.minutes.p90)}`,
  );
  for (const [name, b] of [
    ['boss out', rep.bossOut],
    ['boss fight', rep.bossFight],
  ]) {
    console.log(
      `  ${name} (min): reached ${(b.reached * 100).toFixed(0)}%  p10 ${f(b.p10)}  median ${f(b.median)}  p90 ${f(b.p90)}`,
    );
  }
  const n = (x) => (x === null ? '-' : f(x));
  console.log(
    `  town gold: 3:00 ${n(rep.pacing.gold3)}  5:00 ${n(rep.pacing.gold5)}   hero gear level at 8:00: weapon ${n(rep.pacing.weapon8)}  armour ${n(rep.pacing.armour8)}  with any gear ${rep.pacing.geared8 === null ? '-' : `${(rep.pacing.geared8 * 100).toFixed(0)}%`}`,
  );
  if (FLAGS) {
    const share = rep.flags.placed > 0 ? rep.flags.claimed / rep.flags.placed : 0;
    const hp = rep.flags.huntPlaced;
    const ground = rep.flags.placed - hp;
    const groundClaimed = rep.flags.claimed - rep.flags.huntClaimed;
    console.log(
      `  probe flags (${FLAG_GOLD} gold): placed ${f(rep.flags.placed)}  claimed ${f(rep.flags.claimed)} per run  (${(share * 100).toFixed(0)}% of placed; claims include the lair flag unless --no-lair-flag)`,
    );
    const pct = (a, b) => (b > 0 ? `${((a / b) * 100).toFixed(0)}%` : '-');
    console.log(
      `    of which hunt (placed within 60 of a monster): placed ${f(hp)} claimed ${f(rep.flags.huntClaimed)} (${pct(rep.flags.huntClaimed, hp)}); ground: placed ${f(ground)} claimed ${f(groundClaimed)} (${pct(groundClaimed, ground)})`,
    );
  }
  if (HUNT) {
    const all = rep.probes;
    const headed = all
      .filter((p) => p.headedS !== null)
      .map((p) => p.headedS)
      .sort((a, b) => a - b);
    const paid = all.filter((p) => p.paid).length;
    const pct = (a, b) => (b > 0 ? `${((a / b) * 100).toFixed(0)}%` : '-');
    console.log(
      `  hunt probe (${FLAG_GOLD} gold on a monster 350-900 from the nearest hero): ${all.length} flags; a party headed for it in ${pct(headed.length, all.length)}, median ${headed.length ? f(headed[Math.floor(headed.length / 2)]) : '-'} s, within 5 s ${pct(headed.filter((s) => s <= 5).length, all.length)}; paid as a hunt ${pct(paid, all.length)} (a flag a tower kill turned into a ground flag, claimed later, counts as not paid as a hunt)`,
    );
  }
  if (HUNT) {
    const why = new Map();
    for (const p of rep.probes) if (p.why) why.set(p.why, (why.get(p.why) ?? 0) + 1);
    const list = [...why.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`);
    console.log(`  at 5 s after placing, the nearest hero's party was: ${list.join(', ') || '-'}`);
  }
  console.log('  per run (mean):');
  for (const [k, v] of Object.entries(rep.perRun)) console.log(`    ${k.padEnd(16)} ${f(v)}`);
}
