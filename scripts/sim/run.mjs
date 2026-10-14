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
// --m3 turns the celestial nodes on (tuning.nodes.enabled) and lets the bot play them: it hires
// gatherers at the town hall when a node is free, sends them out (the richest node first), lends
// them a tower guard, posts a 25 gold escort bounty with --m3-escort, and spends Ambrosia on a
// Recall of the fallen, then a temple tier, then an Offering. The report adds Ambrosia gathered
// and spent, nodes freed, defiled and sprouted, and the gatherers and guards lost.
// --hall-tiers turns the town hall tiers on (tuning.town.hallTiers): the bot upgrades the hall too.
// --ruins turns ruins on (a destroyed building leaves a ruin); the bot rebuilds them when it can.
// --first-run plays the gentler first run (data.firstRun overrides apply, the clock waits for the
// first temple), to tune data.firstRun.
// --replay-check replays every run from its replay code and reports how many replays equal the
// original run report (the determinism check; also tries the code through `npm run replay`).
// --altar none|half|full plays with the Altar bought to that level (every upgrade at half its ranks, or
// all of them) and every unlock open, to measure the win rate at the three Altar levels.
// --trials a,b plays with those Trials (ids from meta.ts).
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
// --human: a player who builds a few buildings at the start and then only watches: no upgrades,
// no flags, no lair flag. --build a,b,c sets the buildings (default temple_aesir,tower,shrine).
const HUMAN = args.includes('--human');
// --profile: steps one 50 ms tick at a time and times step() and snapshot(); the report adds ms per
// tick (p50/p95/p99/max) for the whole run and for minutes 14-18 (late-game load).
const PROFILE = args.includes('--profile');
const windowAt = args.indexOf('--window');
const WINDOW = (windowAt >= 0 ? args[windowAt + 1] : '14,18').split(',').map(Number);
// --hints (with --human): builds in the order the hints give: the temple at once, a market about 20 s
// after the first hero arrives, a shrine after the first hero flees or falls, a tower once a
// raid is announced or at 6:00. Cards and paths are picked after a 5-15 s think (one in ten is
// left to the auto-pick). Overrides --build.
const HINTS = args.includes('--hints');
const buildIdx = args.indexOf('--build');
const BUILD_ARG = buildIdx >= 0 ? args[buildIdx + 1].split(',') : undefined;
// The bot buys building tiers unless --no-upgrade is given.
const UPGRADE = !args.includes('--no-upgrade') && !HUMAN;
const HALL_TIERS = args.includes('--hall-tiers');
const RUINS = args.includes('--ruins');
const FIRST_RUN = args.includes('--first-run');
const REPLAY_CHECK = args.includes('--replay-check');
const altarIdx = args.indexOf('--altar');
const ALTAR = altarIdx >= 0 ? args[altarIdx + 1] : undefined;
const trialsIdx = args.indexOf('--trials');
const TRIALS = trialsIdx >= 0 ? args[trialsIdx + 1].split(',') : [];
const HUNT = args.includes('--hunt');
const FLAGS = args.includes('--flags') || HUNT;
const FLAG_GOLD = opt('flag-gold', HUNT ? 50 : 40);
const LAIR_FLAG = !args.includes('--no-lair-flag') && !HUMAN;
const M3 = args.includes('--m3');
const M3_ESCORT = args.includes('--m3-escort');
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
  const data0 = dataFile ? withOverride(base, JSON.parse(readFileSync(dataFile, 'utf8'))) : base;
  const data1 = M3 ? withOverride(data0, { tuning: { nodes: { enabled: true } } }) : data0;
  const data2 = HALL_TIERS ? withOverride(data1, { tuning: { town: { hallTiers: true } } }) : data1;
  const dataBase = RUINS ? withOverride(data2, { tuning: { town: { ruins: true } } }) : data2;
  // --altar / --trials: the data the meta layer would hand the run.
  let GRAYBOX = dataBase;
  if (ALTAR || TRIALS.length > 0) {
    const meta = sim.emptyMeta();
    const rules = sim.metaRules(dataBase);
    meta.unlocks = rules.unlocks.map((u) => u.id);
    if (ALTAR === 'half' || ALTAR === 'full') {
      for (const def of rules.altar) {
        const ranks = ALTAR === 'full' ? def.ranks.length : Math.ceil(def.ranks.length / 2);
        if (def.perPantheon) {
          for (const p of sim.pantheonsOf(dataBase, meta)) meta.altar[`${def.id}:${p}`] = ranks;
        } else meta.altar[def.id] = ranks;
      }
    }
    GRAYBOX = sim.playData(dataBase, meta, TRIALS);
  }
  // The smithy joins the order once the data has one (heroes then buy weapons and armour).
  const BUILD_ORDER = ['temple_aesir', 'market', 'shrine', 'tower'];
  if (GRAYBOX.buildings.some((b) => b.id === 'smithy')) BUILD_ORDER.splice(2, 0, 'smithy');
  if (HUMAN)
    BUILD_ORDER.splice(
      0,
      BUILD_ORDER.length,
      ...(BUILD_ARG ?? ['temple_aesir', 'tower', 'shrine']),
    );
  const DT = PROFILE ? 50 : 100;
  const samples = { all: [], late: [] };
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
      seen: { arrivedMs: null, hurtMs: null, raidMs: null },
    };
    const w = sim.createWorld(seed0 + r, GRAYBOX, { firstRun: FIRST_RUN });
    let snap = sim.snapshot(w);
    let timeout = false;
    // Minutes of the first boss emerge and the first blow to or from a boss (null: never).
    let firstLairMin = null;
    let bossOutMin = null;
    // --hints: when the first hero arrived, and the first flee or fall, and a raid warning.
    const seen = flagRun.seen;
    const think = new Map();
    let rngState = (seed0 + r) * 2654435761 + 1;
    const rand = () => {
      rngState = (rngState * 1103515245 + 12345) % 2147483648;
      return rngState / 2147483648;
    };
    const m3 = {
      ambrosiaGathered: 0,
      ambrosiaSpent: 0,
      gatherersHired: 0,
      gatherersLost: 0,
      guardsSent: 0,
      guardsLost: 0,
      escortsPaid: 0,
      nodesFreed: 0,
      nodesDefiled: 0,
      nodesCleansed: 0,
      lairsSprouted: 0,
      recalls: 0,
      templeTiers: 0,
      offerings: 0,
    };
    const defiledOnce = new Set();
    let lairsBy10 = 0;
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
        if (e.kind === 'jarHome') m3.ambrosiaGathered += e.amount;
        if (e.kind === 'ambrosiaSpent') {
          m3.ambrosiaSpent += e.cost;
          if (e.what === 'recall') m3.recalls++;
          else if (e.what === 'temple') m3.templeTiers++;
          else m3.offerings++;
        }
        if (e.kind === 'gathererHired') m3.gatherersHired++;
        if (e.kind === 'workerFell') m3.gatherersLost++;
        if (e.kind === 'guardFell') m3.guardsLost++;
        if (e.kind === 'guardOut') m3.guardsSent++;
        if (e.kind === 'bountyClaimed' && e.escort) m3.escortsPaid++;
        if (e.kind === 'nodeDefiled') {
          m3.nodesDefiled++;
          defiledOnce.add(e.node);
        }
        if (e.kind === 'nodeFreed') {
          if (defiledOnce.delete(e.node)) m3.nodesCleansed++;
          else m3.nodesFreed++;
        }
        if (e.kind === 'lairSprouted') m3.lairsSprouted++;
        if (e.kind === 'lairDestroyed') firstLairMin ??= sn.timeMs / 60_000;
        if (e.kind === 'arrived') seen.arrivedMs ??= sn.timeMs;
        if (e.kind === 'fled' || e.kind === 'knockout') seen.hurtMs ??= sn.timeMs;
        if (e.kind === 'raidWarning') seen.raidMs ??= sn.timeMs;
        if (e.kind === 'lairDestroyed' && sn.timeMs <= 600_000) lairsBy10++;
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
      const t0 = PROFILE ? performance.now() : 0;
      sim.step(w, DT);
      const t1 = PROFILE ? performance.now() : 0;
      snap = sim.snapshot(w);
      if (PROFILE) {
        const t2 = performance.now();
        const sample = { step: t1 - t0, snap: t2 - t1 };
        samples.all.push(sample);
        if (w.timeMs >= WINDOW[0] * 60_000 && w.timeMs < WINDOW[1] * 60_000)
          samples.late.push(sample);
      }
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
          headgear: avg('headgear'),
          offhand: avg('offhand'),
          heroes: heroes.length,
          carried: heroes.reduce((a, u) => a + (u.gold ?? 0), 0),
          geared:
            heroes.length === 0
              ? 0
              : heroes.filter(
                  (u) =>
                    (u.items?.weapon ?? 0) +
                      (u.items?.armour ?? 0) +
                      (u.items?.headgear ?? 0) +
                      (u.items?.offhand ?? 0) >
                    0,
                ).length / heroes.length,
        };
      }
      // A human thinks 5-15 s over a card (one in ten is never tapped: the auto-pick decides).
      const ready = (id) => {
        if (!HINTS) return true;
        if (!think.has(id))
          think.set(id, rand() < 0.1 ? Infinity : snap.timeMs + 5000 + rand() * 10_000);
        return snap.timeMs >= think.get(id);
      };
      const pathCard = snap.parties.find((p) => p.pathOffer);
      if (pathCard) {
        if (ready(`path${pathCard.id}`)) {
          sim.command(w, {
            kind: 'pickPath',
            party: pathCard.id,
            path: pathCard.pathOffer.options[0],
          });
        }
      } else if (snap.parties.some((p) => p.offer)) {
        const p = snap.parties.find((x) => x.offer);
        if (ready(`card${p.id}:${p.level}`)) {
          sim.command(w, { kind: 'pickUpgrade', party: p.id, upgrade: undefined });
        }
      }
      if (t % 5000 === 0) {
        botTurn(w, snap);
        if (M3) m3Turn(w, snap);
      }
    }
    snap = sim.snapshot(w);
    watch(snap);
    let replayOk = null;
    let replayCode = null;
    if (REPLAY_CHECK) {
      const original = sim.runReport(w);
      replayCode = original.replay;
      const again = sim.runReport(sim.runReplay(original.replay, GRAYBOX).world);
      replayOk = JSON.stringify(original) === JSON.stringify(again);
      if (!replayOk) {
        const keys = Object.keys(original).filter(
          (k) => JSON.stringify(original[k]) !== JSON.stringify(again[k]),
        );
        console.error(`replay differs (seed ${seed0 + r}): ${keys.join(', ')}; ticks ${w.tick}`);
      }
    }
    const fun = sim.runReport(w).fun;
    results.push({
      replayOk,
      ...(replayCode ? { replayCode } : {}),
      seed: seed0 + r,
      outcome: timeout ? 'timeout' : snap.status,
      minutes: snap.timeMs / 60_000,
      bossOutMin,
      firstLairMin,
      bossFightMin,
      lairsBy10,
      lostBy10: !timeout && snap.status === 'lost' && snap.timeMs <= 600_000,
      flagsPlaced: flagRun.placed,
      flagsClaimed: flagRun.claimed,
      huntPlaced: flagRun.huntPlaced,
      huntClaimed: flagRun.huntClaimed,
      probes: [...flagRun.probes.values()],
      ...(M3 ? { ...m3, ambrosiaLeft: Math.round(snap.ambrosia) } : {}),
      castShare: fun.castShareAfter6,
      typesShare: fun.typesShareTier2,
      decisionsPerMin: fun.decisionsPerMin,
      decisionMinuteShare: fun.decisionMinuteShare,
      quietS: fun.longestQuietMs / 1000,
      quietAtS: fun.longestQuietAtMs / 1000,
      fights: fun.fights,
      gold3: goldAt[180_000],
      gold5: goldAt[300_000],
      weapon8: gear8?.weapon ?? null,
      armour8: gear8?.armour ?? null,
      headgear8: gear8?.headgear ?? null,
      offhand8: gear8?.offhand ?? null,
      geared8: gear8?.geared ?? null,
      carried8: gear8?.carried ?? null,
      ...snap.stats,
      heroes: snap.units.filter((u) => u.kind === 'hero').length,
      maxPartyLevel: Math.max(1, ...snap.parties.map((p) => p.level)),
    });
  }

  // Build temple, market, shrine, tower as gold allows; with gold to spare, put a 50 gold flag
  // on the lair nearest the town hall (one flag at a time).
  // The buildings a player following the hints has asked for by now.
  function hintOrder(snap) {
    const s = flagRun.seen;
    const out = ['temple_aesir'];
    if (s.arrivedMs !== null && snap.timeMs >= s.arrivedMs + 20_000) {
      out.push('market');
      // The smithy hint follows the market: the bot builds it next after it.
      if (GRAYBOX.buildings.some((b) => b.id === 'smithy')) out.push('smithy');
    }
    if (s.hurtMs !== null) out.push('shrine');
    if (s.raidMs !== null || snap.timeMs >= 360_000) out.push('tower');
    return out;
  }

  // The M3 bot: gatherers out to the richest free node, a guard beside each, Ambrosia spent as
  // it comes (a recall, then a temple tier, then an Offering).
  function m3Turn(w, snap) {
    const nodes = w.tuning.nodes;
    const free = snap.nodes.filter((n) => n.state === 'freed' && n.pool >= nodes.carry);
    const cmd = (c) => sim.command(w, c);
    if (
      free.length > 0 &&
      snap.workers.length < snap.gathererCap &&
      snap.gold >= nodes.gathererCost + 50
    ) {
      cmd({ kind: 'hireGatherer' });
    }
    const richest = [...free].sort((a, b) => b.pool - a.pool)[0];
    for (const wk of snap.workers) {
      if (wk.node === null && wk.phase === 'idle' && richest)
        cmd({ kind: 'sendGatherer', node: richest.id });
    }
    for (const wk of snap.workers) {
      if (wk.node === null) continue;
      if (snap.gold >= nodes.guardCost + 80) cmd({ kind: 'sendGuard', unit: wk.unit });
      if (M3_ESCORT && snap.gold >= 25 + 120) cmd({ kind: 'placeEscort', unit: wk.unit, gold: 25 });
    }
    const temples = snap.buildings.filter((b) => b.type.startsWith('temple'));
    const pantheonOf = (type) => type.slice(type.indexOf('_') + 1);
    const godPantheon = (god) => GRAYBOX.gods?.find((g) => g.id === god)?.pantheon;
    for (const g of snap.graves ?? []) {
      if (g.recalled || snap.ambrosia < nodes.recallCost) continue;
      const t = temples.find((b) => pantheonOf(b.type) === godPantheon(g.god));
      if (t && cmd({ kind: 'recallFallen', building: t.id, grave: g.id }).ok) return;
    }
    const low = [...temples].sort((a, b) => a.tier - b.tier)[0];
    if (low && cmd({ kind: 'upgradeWithAmbrosia', building: low.id }).ok) return;
    if (temples[0]) cmd({ kind: 'offering', building: temples[0].id });
  }

  function botTurn(w, snap) {
    const order = HINTS ? hintOrder(snap) : BUILD_ORDER;
    for (const type of order) {
      if (snap.buildings.some((b) => b.type === type)) continue;
      const plot = snap.plots.find((p) => !p.occupied);
      if (!plot) break;
      sim.command(w, { kind: 'build', type, plot: plot.id });
    }
    for (const ruin of snap.ruins ?? []) {
      const def = GRAYBOX.buildings.find((d) => d.id === ruin.type);
      if (def && snap.gold >= def.cost * w.tuning.town.rebuildCostMult + 60) {
        sim.command(w, { kind: 'rebuildRuin', ruin: ruin.id });
      }
    }
    // With gold to spare, buy the next tier of a temple, tower or market (cheapest first).
    if (UPGRADE) {
      const ups = snap.buildings
        .filter((b) => b.upgradeCost !== null && !b.upgradeGate && b.upgradeCost + 150 <= snap.gold)
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
        const near =
          at &&
          Math.hypot(nearest.pos.x - at.x, nearest.pos.y - at.y) <= w.tuning.monster.lairAggro;
        const foe = snap.units.some(
          (u) =>
            u.kind === 'monster' &&
            Math.hypot(u.pos.x - nearest.pos.x, u.pos.y - nearest.pos.y) <=
              w.tuning.ai.stickyFoeRange,
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
  if (PROFILE) {
    const q = (a, p) => {
      const v = [...a].sort((x, y) => x - y);
      return v.length === 0 ? 0 : v[Math.min(v.length - 1, Math.floor(p * v.length))];
    };
    const line = (name, list) => {
      const st = list.map((s) => s.step);
      const sn = list.map((s) => s.snap);
      const both = list.map((s) => s.step + s.snap);
      const f = (n) => n.toFixed(3);
      return `  ${name.padEnd(18)} ticks ${String(list.length).padStart(7)}  step p50 ${f(q(st, 0.5))} p95 ${f(q(st, 0.95))} p99 ${f(q(st, 0.99))} max ${f(Math.max(0, ...st))}  snapshot p50 ${f(q(sn, 0.5))} p95 ${f(q(sn, 0.95))}  both p95 ${f(q(both, 0.95))} ms`;
    };
    console.log('Tick cost (ms per 50 ms tick):');
    console.log(line('whole runs', samples.all));
    console.log(line(`minutes ${WINDOW[0]}-${WINDOW[1]}`, samples.late));
  }
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
    firstLair: bossTimes(results, 'firstLairMin'),
    bossOut: bossTimes(results, 'bossOutMin'),
    bossFight: bossTimes(results, 'bossFightMin'),
    pacing: {
      gold3: meanOf(results, 'gold3'),
      gold5: meanOf(results, 'gold5'),
      weapon8: meanOf(results, 'weapon8'),
      armour8: meanOf(results, 'armour8'),
      headgear8: meanOf(results, 'headgear8'),
      offhand8: meanOf(results, 'offhand8'),
      geared8: meanOf(results, 'geared8'),
      carried8: meanOf(results, 'carried8'),
    },
    m3: M3
      ? Object.fromEntries(
          [
            'ambrosiaGathered',
            'ambrosiaSpent',
            'ambrosiaLeft',
            'gatherersHired',
            'gatherersLost',
            'guardsSent',
            'guardsLost',
            'escortsPaid',
            'nodesFreed',
            'nodesDefiled',
            'nodesCleansed',
            'lairsSprouted',
            'recalls',
            'templeTiers',
            'offerings',
          ].map((k) => [k, mean(results, k)]),
        )
      : null,
    replayCheck: REPLAY_CHECK
      ? { identical: results.filter((r) => r.replayOk).length, of: results.length }
      : null,
    fun: {
      fights: mean(results, 'fights'),
      castShare: meanOf(results, 'castShare'),
      typesShare: meanOf(results, 'typesShare'),
      decisionsPerMin: mean(results, 'decisionsPerMin'),
      decisionMinuteShare: meanOf(results, 'decisionMinuteShare'),
      quiet: (() => {
        const v = results.map((r) => r.quietS).sort((a, b) => a - b);
        const at = results.map((r) => r.quietAtS).sort((a, b) => a - b);
        return {
          p50: pct(v, 0.5),
          p90: pct(v, 0.9),
          max: v[v.length - 1] ?? 0,
          atP50: pct(at, 0.5),
        };
      })(),
    },
    probes: results.flatMap((r) => r.probes ?? []),
    flags: {
      placed: meanOf(results, 'flagsPlaced'),
      claimed: meanOf(results, 'flagsClaimed'),
      huntPlaced: meanOf(results, 'huntPlaced'),
      huntClaimed: meanOf(results, 'huntClaimed'),
    },
    lostBy10: results.filter((r) => r.lostBy10).length,
    noLairBy10: results.filter((r) => r.lairsBy10 === 0).length,
    spread: Object.fromEntries(
      ['lairsDestroyed', 'taxCollected', 'knockouts', 'monstersKilled'].map((k) => {
        const v = results.map((r) => r[k]).sort((a, b) => a - b);
        return [k, { p10: pct(v, 0.1), median: pct(v, 0.5), p90: pct(v, 0.9) }];
      }),
    ),
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
    ['first lair down', rep.firstLair],
    ['boss out', rep.bossOut],
    ['boss fight', rep.bossFight],
  ]) {
    console.log(
      `  ${name} (min): reached ${(b.reached * 100).toFixed(0)}%  p10 ${f(b.p10)}  median ${f(b.median)}  p90 ${f(b.p90)}`,
    );
  }
  const n = (x) => (x === null ? '-' : f(x));
  console.log(
    `  town gold: 3:00 ${n(rep.pacing.gold3)}  5:00 ${n(rep.pacing.gold5)}   hero gear level at 8:00: weapon ${n(rep.pacing.weapon8)}  armour ${n(rep.pacing.armour8)}  headgear ${n(rep.pacing.headgear8)}  off-hand ${n(rep.pacing.offhand8)}  with any gear ${rep.pacing.geared8 === null ? '-' : `${(rep.pacing.geared8 * 100).toFixed(0)}%`}  gold carried by heroes at 8:00 ${n(rep.pacing.carried8)}`,
  );
  if (rep.m3) {
    const m = rep.m3;
    console.log(
      `  M3 per run: Ambrosia gathered ${f(m.ambrosiaGathered)}, spent ${f(m.ambrosiaSpent)}, left ${f(m.ambrosiaLeft)}; buys: recalls ${f(m.recalls)}, temple tiers ${f(m.templeTiers)}, offerings ${f(m.offerings)}`,
    );
    console.log(
      `    nodes freed ${f(m.nodesFreed)}, defiled ${f(m.nodesDefiled)}, cleansed ${f(m.nodesCleansed)}, lairs sprouted ${f(m.lairsSprouted)}; gatherers hired ${f(m.gatherersHired)} lost ${f(m.gatherersLost)}; guards sent ${f(m.guardsSent)} lost ${f(m.guardsLost)}; escorts paid ${f(m.escortsPaid)}`,
    );
  }
  if (rep.replayCheck) {
    console.log(
      `  replay check: ${rep.replayCheck.identical} of ${rep.replayCheck.of} replays equal the original run report`,
    );
  }
  {
    const u = rep.fun;
    const p = (x) => (x === null ? '-' : `${(x * 100).toFixed(0)}%`);
    console.log(
      `  fun checks: skill cast in ${p(u.castShare)} of fights after 6:00 (target 60%), 2+ damage types in ${p(u.typesShare)} of tier 2 fights; ${f(u.fights)} fights a run; decisions ${f(u.decisionsPerMin)} per min, one in ${p(u.decisionMinuteShare)} of minutes; longest quiet gap p50 ${f(u.quiet.p50)} s, p90 ${f(u.quiet.p90)} s, max ${f(u.quiet.max)} s (target under 60); the longest ends at about ${f(u.quiet.atP50 / 60)} min (median)`,
    );
  }
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
  console.log(
    `  by 10:00: lost ${rep.lostBy10} of ${rep.runs} runs, no lair down in ${rep.noLairBy10} of ${rep.runs} runs`,
  );
  console.log('  per run (mean; p10 / median / p90 where shown):');
  for (const [k, v] of Object.entries(rep.perRun)) {
    const sp = rep.spread[k];
    console.log(
      `    ${k.padEnd(16)} ${f(v)}${sp ? `   (${f(sp.p10)} / ${f(sp.median)} / ${f(sp.p90)})` : ''}`,
    );
  }
}
