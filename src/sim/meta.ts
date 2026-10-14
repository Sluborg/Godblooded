import { resolveTuning } from './tuning';
import type { GameData, RunReport } from './types';

// The meta layer between runs (docs/systems/meta.md): Essence earned from a RunReport, the Altar's
// permanent upgrades, goal unlocks, the Saga and Trials. Pure functions over a MetaState (the
// `godblooded.meta` save the game keeps) and the game data: nothing here touches a World. The
// numbers are data (`GameData.meta`); DEFAULT_META_RULES holds the spec's.

export const META_VERSION = 1;

export interface SagaEntry {
  god: string | null;
  path: string | null;
  type: string;
  kills: number;
  // How the run ended and what happened to the hero.
  ending: 'won' | 'lost' | 'abandoned';
  slain: boolean;
  runs: number;
  // The hero's name, when the sim names heroes.
  name?: string;
}

export interface MetaState {
  version: number;
  runs: number;
  wins: number;
  essence: number;
  // Ranks bought by Altar id (`id:pantheon` for a per-pantheon row).
  altar: Record<string, number>;
  unlocks: string[];
  trialsWon: string[];
  saga: SagaEntry[];
  nextSeed: number;
  // The pantheon the next run leans on (chosen at the Altar); '' for the seed's own pick.
  lean: string;
  hintsSeen: string[];
  hintsOn: boolean;
  lastBoss?: string;
}

// What an Altar rank or a Trial changes in the data a run is played on. Per rank for the Altar
// (a multiplier compounds, an amount adds), once for a Trial.
export type MetaEffect =
  | { kind: 'startGold'; add?: number; mult?: number }
  // Building cost x mult for ids that start with `match` ('temple') or are listed ('market,smithy').
  | { kind: 'buildingCost'; match: string; mult: number }
  // A tuning number 'group.key': x mult, + add, or = set.
  | { kind: 'tuning'; path: string; mult?: number; add?: number; set?: number }
  // The temples of the pantheon the row is bought for recruit in `mult` of the time.
  | { kind: 'pantheonRecruit'; mult: number };

export interface AltarDef {
  id: string;
  name: string;
  text: string;
  // Essence per rank; a rank needs the one before it.
  ranks: readonly number[];
  effects: readonly MetaEffect[];
  // One row per unlocked pantheon (Favoured).
  perPantheon?: boolean;
}

export type UnlockCondition =
  | { kind: 'finishRun' }
  | { kind: 'win' }
  | { kind: 'heroTier'; tier: number }
  | { kind: 'winOrRuns'; runs: number }
  | { kind: 'peakLevel'; level: number; pantheon?: string }
  | { kind: 'winWithPantheon'; pantheon: string }
  | { kind: 'gearLevel'; level: number }
  | { kind: 'partyLevel'; level: number }
  | { kind: 'winAllTemples' };

// A goal: when its condition holds after a run, the content it `locks` opens for good.
export interface UnlockDef {
  id: string;
  name: string;
  text: string;
  condition: UnlockCondition;
  // Content kept out of the game until this unlock: building ids, pantheons (temple and gods),
  // card families, item slots and the 'trials' feature.
  locks?: {
    buildings?: readonly string[];
    pantheons?: readonly string[];
    cardFamilies?: readonly string[];
    pantheonCards?: readonly string[];
    itemSlots?: readonly string[];
    trials?: boolean;
  };
}

export interface TrialDef {
  id: string;
  name: string;
  text: string;
  effects: readonly MetaEffect[];
}

export interface EssenceRules {
  perLair: number;
  perTier3Hero: number;
  perMinute: number;
  bossSlain: number;
  perTrial: number;
}

export interface MetaRules {
  essence: EssenceRules;
  altar: readonly AltarDef[];
  unlocks: readonly UnlockDef[];
  trials: readonly TrialDef[];
  sagaMax: number;
}

export const DEFAULT_META_RULES: MetaRules = {
  essence: { perLair: 10, perTier3Hero: 5, perMinute: 1, bossSlain: 30, perTrial: 10 },
  sagaMax: 50,
  altar: [
    {
      id: 'war-chest',
      name: 'War Chest',
      text: '+50 start gold',
      ranks: [40, 80, 120],
      effects: [{ kind: 'startGold', add: 50 }],
    },
    {
      id: 'devout-masons',
      name: 'Devout Masons',
      text: 'Temples 10% cheaper',
      ranks: [60, 120],
      effects: [{ kind: 'buildingCost', match: 'temple', mult: 0.9 }],
    },
    {
      id: 'open-hands',
      name: 'Open Hands',
      text: 'Market and smithy 10% cheaper',
      ranks: [50, 100],
      effects: [{ kind: 'buildingCost', match: 'market,smithy', mult: 0.9 }],
    },
    {
      id: 'bounty-ledger',
      name: 'Bounty Ledger',
      text: 'Bounty flags cost 10% less gold',
      ranks: [40, 80],
      effects: [{ kind: 'tuning', path: 'bounty.flagCostMult', mult: 0.9 }],
    },
    {
      id: 'hearth-fire',
      name: 'Hearth Fire',
      text: 'Knocked out heroes wake 15% sooner',
      ranks: [50, 100],
      effects: [{ kind: 'tuning', path: 'hero.koMs', mult: 0.85 }],
    },
    {
      id: 'deep-roots',
      name: 'Deep Roots',
      text: 'Town hall +20% hp',
      ranks: [60, 120],
      effects: [{ kind: 'tuning', path: 'town.townHallHp', mult: 1.2 }],
    },
    {
      id: 'watchful-eyes',
      name: 'Watchful Eyes',
      text: 'Raid warnings come 5 s earlier',
      ranks: [40, 80],
      effects: [{ kind: 'tuning', path: 'town.raidWarnMs', add: 5000 }],
    },
    {
      id: 'seasoned-blood',
      name: 'Seasoned Blood',
      text: 'The first party of each run starts with 15 XP',
      ranks: [150],
      effects: [{ kind: 'tuning', path: 'party.firstPartyXp', add: 15 }],
    },
    {
      id: 'favoured-temple',
      name: 'Favoured',
      text: "That pantheon's temple recruits 15% faster",
      ranks: [80],
      perPantheon: true,
      effects: [{ kind: 'pantheonRecruit', mult: 0.85 }],
    },
    {
      id: 'fourth-card',
      name: 'The Fourth Card',
      text: 'Party level-up offers show 4 cards',
      ranks: [200],
      effects: [{ kind: 'tuning', path: 'party.offerSize', set: 4 }],
    },
  ],
  unlocks: [
    {
      id: 'smithy',
      name: 'The Smithy',
      text: 'Heroes buy weapons and armour.',
      condition: { kind: 'finishRun' },
      locks: { buildings: ['smithy'] },
    },
    {
      id: 'skill-cards',
      name: 'Skill cards',
      text: 'Level-ups can offer skill upgrades.',
      condition: { kind: 'heroTier', tier: 2 },
      locks: { cardFamilies: ['skill'] },
    },
    {
      id: 'greek',
      name: 'The Greek gods',
      text: 'The Greek gods answer your call.',
      condition: { kind: 'winOrRuns', runs: 3 },
      locks: { pantheons: ['greek'] },
    },
    {
      id: 'egyptian',
      name: 'The Egyptian gods',
      text: 'The Egyptian gods answer your call.',
      condition: { kind: 'winWithPantheon', pantheon: 'greek' },
      locks: { pantheons: ['egyptian'] },
    },
    {
      id: 'charms',
      name: 'Charms',
      text: 'The market stocks charms.',
      condition: { kind: 'gearLevel', level: 2 },
      locks: { itemSlots: ['charm'] },
    },
    {
      id: 'favour-cards',
      name: "God's favour cards",
      text: 'The gods offer their own cards.',
      condition: { kind: 'partyLevel', level: 7 },
      locks: { cardFamilies: ['favour'] },
    },
    {
      id: 'trials',
      name: 'Trials',
      text: 'Choose a harder run for more Essence.',
      condition: { kind: 'win' },
      locks: { trials: true },
    },
  ],
  trials: [
    {
      id: 'blood-moon',
      name: 'Blood Moon',
      text: 'The first raid comes 2 minutes earlier.',
      effects: [{ kind: 'tuning', path: 'town.raidFirstMs', add: -120_000 }],
    },
    {
      id: 'restless-dead',
      name: 'Restless Dead',
      text: 'Lairs start at tier 2.',
      effects: [{ kind: 'tuning', path: 'lair.startTier', set: 2 }],
    },
    {
      id: 'thin-faith',
      name: 'Thin Faith',
      text: 'Temples recruit 25% slower.',
      effects: [{ kind: 'tuning', path: 'hero.recruitMs', mult: 1.25 }],
    },
    {
      id: 'hungry-gods',
      name: 'Hungry Gods',
      text: 'Death chances are doubled.',
      effects: [
        { kind: 'tuning', path: 'combat.bossDeathChance', mult: 2 },
        { kind: 'tuning', path: 'combat.lairDeathChance', mult: 2 },
      ],
    },
    {
      id: 'lean-years',
      name: 'Lean Years',
      text: 'Start with half the gold.',
      effects: [{ kind: 'startGold', mult: 0.5 }],
    },
  ],
};

export const metaRules = (data: GameData): MetaRules => data.meta ?? DEFAULT_META_RULES;

export function emptyMeta(): MetaState {
  return {
    version: META_VERSION,
    runs: 0,
    wins: 0,
    essence: 0,
    altar: {},
    unlocks: [],
    trialsWon: [],
    saga: [],
    nextSeed: 1,
    lean: '',
    hintsSeen: [],
    hintsOn: true,
  };
}

// A saved meta of any known version; anything missing or broken starts fresh (it never blocks play).
export function migrateMeta(raw: unknown): MetaState {
  const fresh = emptyMeta();
  if (typeof raw !== 'object' || raw === null) return fresh;
  const r = raw as Record<string, unknown>;
  if (!Number.isInteger(r.version) || (r.version as number) < 1) return fresh;
  if ((r.version as number) > META_VERSION) return fresh;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  const altar: Record<string, number> = {};
  if (typeof r.altar === 'object' && r.altar !== null) {
    for (const [k, v] of Object.entries(r.altar)) if (typeof v === 'number' && v > 0) altar[k] = v;
  }
  return {
    version: META_VERSION,
    runs: num(r.runs, 0),
    wins: num(r.wins, 0),
    essence: num(r.essence, 0),
    altar,
    unlocks: list(r.unlocks),
    trialsWon: list(r.trialsWon),
    saga: Array.isArray(r.saga) ? (r.saga as SagaEntry[]) : [],
    nextSeed: num(r.nextSeed, 1),
    lean: typeof r.lean === 'string' ? r.lean : '',
    hintsSeen: list(r.hintsSeen),
    hintsOn: typeof r.hintsOn === 'boolean' ? r.hintsOn : true,
    ...(typeof r.lastBoss === 'string' ? { lastBoss: r.lastBoss } : {}),
  };
}

// ---- Essence ------------------------------------------------------------------------------

export interface EssenceLine {
  what: 'lairs' | 'tier3' | 'minutes' | 'boss' | 'trials';
  count: number;
  each: number;
  total: number;
}

// What a run pays (won or lost), line by line for the end screen's count-up.
export function essenceFor(
  data: GameData,
  report: RunReport,
  trials: readonly string[] = [],
  firstWinDone = true,
): { lines: EssenceLine[]; total: number } {
  const r = metaRules(data).essence;
  const lines: EssenceLine[] = [];
  const add = (what: EssenceLine['what'], count: number, each: number) => {
    if (count > 0 && each > 0) lines.push({ what, count, each, total: count * each });
  };
  add('lairs', report.lairsCleared.length, r.perLair);
  add('tier3', report.heroes.filter((h) => h.tier >= 3).length, r.perTier3Hero);
  add('minutes', Math.floor(report.timeMs / 60_000), r.perMinute);
  add('boss', report.outcome === 'won' ? 1 : 0, r.bossSlain);
  // Trials pay only for a run won with them, and only once Trials are open.
  if (report.outcome === 'won' && firstWinDone) add('trials', trials.length, r.perTrial);
  return { lines, total: lines.reduce((a, l) => a + l.total, 0) };
}

// ---- Unlocks ------------------------------------------------------------------------------

// Does a condition hold after this run? `meta` already counts the run.
function holds(c: UnlockCondition, meta: MetaState, report: RunReport): boolean {
  const won = report.outcome === 'won';
  const peak = report.facts.peakLevel;
  switch (c.kind) {
    case 'finishRun':
      return meta.runs >= 1;
    case 'win':
      return meta.wins >= 1;
    case 'heroTier':
      return report.heroes.some((h) => h.tier >= c.tier);
    case 'winOrRuns':
      return meta.wins >= 1 || meta.runs >= c.runs;
    case 'peakLevel':
      return c.pantheon
        ? (peak[c.pantheon] ?? 0) >= c.level
        : Object.values(peak).some((l) => l >= c.level);
    case 'winWithPantheon':
      return won && report.facts.heroPantheons.includes(c.pantheon);
    case 'gearLevel':
      return report.facts.gear2 && c.level <= 2;
    case 'partyLevel':
      return Object.values(peak).some((l) => l >= c.level);
    case 'winAllTemples': {
      const all = new Set(data0pantheons(report));
      return won && all.size >= 3;
    }
  }
}

const data0pantheons = (report: RunReport): string[] => report.facts.templePantheons;

// ---- Altar --------------------------------------------------------------------------------

const altarKey = (def: AltarDef, pantheon?: string) =>
  def.perPantheon ? `${def.id}:${pantheon ?? ''}` : def.id;

export const altarRank = (meta: MetaState, def: AltarDef, pantheon?: string): number =>
  meta.altar[altarKey(def, pantheon)] ?? 0;

// Essence the next rank costs; null at the top rank.
export function altarCost(meta: MetaState, def: AltarDef, pantheon?: string): number | null {
  return def.ranks[altarRank(meta, def, pantheon)] ?? null;
}

export type BuyResult = { ok: true; meta: MetaState } | { ok: false; reason: string };

export function buyRank(data: GameData, meta: MetaState, id: string, pantheon?: string): BuyResult {
  const def = metaRules(data).altar.find((a) => a.id === id);
  if (!def) return { ok: false, reason: 'unknown upgrade' };
  if (def.perPantheon && !(pantheon && pantheonsOf(data, meta).includes(pantheon))) {
    return { ok: false, reason: 'pantheon not unlocked' };
  }
  const cost = altarCost(meta, def, pantheon);
  if (cost === null) return { ok: false, reason: 'already at the top rank' };
  if (meta.essence < cost) return { ok: false, reason: 'not enough essence' };
  const key = altarKey(def, pantheon);
  return {
    ok: true,
    meta: {
      ...meta,
      essence: meta.essence - cost,
      altar: { ...meta.altar, [key]: altarRank(meta, def, pantheon) + 1 },
    },
  };
}

// Return to the gods: every rank refunded in full.
export function refundAltar(data: GameData, meta: MetaState): MetaState {
  let back = 0;
  for (const [key, ranks] of Object.entries(meta.altar)) {
    const def = metaRules(data).altar.find((a) => a.id === key.split(':')[0]);
    if (!def) continue;
    for (let i = 0; i < ranks; i++) back += def.ranks[i] ?? 0;
  }
  return { ...meta, essence: meta.essence + back, altar: {} };
}

// ---- Content and effects on the data -------------------------------------------------------

const allPantheons = (data: GameData): string[] => [
  ...new Set((data.gods ?? []).map((g) => g.pantheon)),
];

const owned = (meta: MetaState, id: string) => meta.unlocks.includes(id);

// Pantheons the player may use now (not locked behind an unlock they lack).
export function pantheonsOf(data: GameData, meta: MetaState): string[] {
  const locked = new Set<string>();
  for (const u of metaRules(data).unlocks) {
    if (!owned(meta, u.id)) for (const p of u.locks?.pantheons ?? []) locked.add(p);
  }
  return allPantheons(data).filter((p) => !locked.has(p));
}

// The game data with the content the player has not unlocked left out.
export function dataFor(data: GameData, meta: MetaState): GameData {
  const lockedBuildings = new Set<string>();
  const lockedPantheons = new Set<string>();
  const lockedFamilies = new Set<string>();
  const lockedSlots = new Set<string>();
  for (const u of metaRules(data).unlocks) {
    if (owned(meta, u.id)) continue;
    u.locks?.buildings?.forEach((b) => lockedBuildings.add(b));
    u.locks?.pantheons?.forEach((p) => lockedPantheons.add(p));
    u.locks?.cardFamilies?.forEach((f) => lockedFamilies.add(f));
    u.locks?.itemSlots?.forEach((s) => lockedSlots.add(s));
  }
  const pantheonOfBuilding = (b: { id: string; pantheon?: string }) =>
    b.pantheon ?? (b.id.startsWith('temple_') ? b.id.slice(7) : undefined);
  return {
    ...data,
    buildings: data.buildings.filter((b) => {
      if (lockedBuildings.has(b.id)) return false;
      const p = pantheonOfBuilding(b);
      return !(p && lockedPantheons.has(p));
    }),
    ...(data.gods ? { gods: data.gods.filter((g) => !lockedPantheons.has(g.pantheon)) } : {}),
    ...(data.upgrades
      ? {
          upgrades: data.upgrades.filter(
            (u) =>
              !(u.family && lockedFamilies.has(u.family)) &&
              !(u.needs?.pantheon && lockedPantheons.has(u.needs.pantheon)),
          ),
        }
      : {}),
    ...(data.items ? { items: data.items.filter((i) => !lockedSlots.has(i.slot)) } : {}),
  };
}

// Is a feature (Trials) open?
export const trialsOpen = (data: GameData, meta: MetaState): boolean =>
  !metaRules(data).unlocks.some((u) => u.locks?.trials && !owned(meta, u.id));

type Overrides = NonNullable<GameData['tuning']>;

// One effect applied `times` over to the data (a rank count, or 1 for a Trial).
function applyEffect(data: GameData, e: MetaEffect, times: number, pantheon?: string): GameData {
  if (times <= 0) return data;
  switch (e.kind) {
    case 'startGold': {
      let gold = data.startGold;
      for (let i = 0; i < times; i++) gold = Math.round(gold * (e.mult ?? 1) + (e.add ?? 0));
      return { ...data, startGold: gold };
    }
    case 'buildingCost': {
      const ids = e.match.split(',');
      const hits = (id: string) =>
        ids.some((m) => id === m || (ids.length === 1 && id.startsWith(m)));
      const mult = e.mult ** times;
      return {
        ...data,
        buildings: data.buildings.map((b) =>
          hits(b.id) ? { ...b, cost: Math.max(1, Math.round(b.cost * mult)) } : b,
        ),
      };
    }
    case 'pantheonRecruit': {
      if (!pantheon) return data;
      const base = resolveTuning(data);
      const prev = base.hero.pantheonRecruitMult[pantheon] ?? 1;
      return withTuning(data, {
        hero: {
          pantheonRecruitMult: {
            ...base.hero.pantheonRecruitMult,
            [pantheon]: prev * e.mult ** times,
          },
        },
      });
    }
    case 'tuning': {
      const [group, key] = e.path.split('.');
      const base = resolveTuning(data) as unknown as Record<string, Record<string, number>>;
      let v = base[group]?.[key];
      if (typeof v !== 'number') return data;
      for (let i = 0; i < times; i++) {
        if (e.set !== undefined) v = e.set;
        else v = v * (e.mult ?? 1) + (e.add ?? 0);
      }
      return withTuning(data, { [group]: { [key]: v } } as Overrides);
    }
  }
}

function withTuning(data: GameData, over: Overrides): GameData {
  const out: Record<string, unknown> = { ...data.tuning };
  for (const [g, v] of Object.entries(over))
    out[g] = { ...(out[g] as object | undefined), ...(v as object) };
  return { ...data, tuning: out as Overrides };
}

// The game data a run is played on: content filtered by unlocks, the Altar's ranks, the chosen
// Trials, and the lean the player picked.
export function playData(
  data: GameData,
  meta: MetaState,
  trials: readonly string[] = [],
  opts: { devUnlockAll?: boolean } = {},
): GameData {
  const rules = metaRules(data);
  let out = opts.devUnlockAll ? data : dataFor(data, meta);
  for (const def of rules.altar) {
    if (def.perPantheon) {
      for (const p of pantheonsOf(
        data,
        opts.devUnlockAll ? { ...meta, unlocks: rules.unlocks.map((u) => u.id) } : meta,
      )) {
        for (const e of def.effects) out = applyEffect(out, e, altarRank(meta, def, p), p);
      }
    } else {
      for (const e of def.effects) out = applyEffect(out, e, altarRank(meta, def));
    }
  }
  if (trialsOpen(data, meta) || opts.devUnlockAll) {
    for (const id of trials) {
      for (const e of rules.trials.find((t) => t.id === id)?.effects ?? []) {
        out = applyEffect(out, e, 1);
      }
    }
  }
  // The pantheon the player leans the next run on (only if it is open to them).
  if (out.mapRules && meta.lean && pantheonsOf(data, meta).includes(meta.lean)) {
    out = { ...out, mapRules: { ...out.mapRules, forceLean: meta.lean } };
  }
  return out;
}

// ---- After a run --------------------------------------------------------------------------

export interface RunOutcome {
  meta: MetaState;
  essence: { lines: EssenceLine[]; total: number };
  // Unlocks this run opened, in rule order.
  newUnlocks: UnlockDef[];
  // Heroes written into the Saga.
  saga: SagaEntry[];
}

// Folds a finished run into the meta state: counters, Essence, goal unlocks, the Saga, Trials won,
// the next seed and the boss it had (so the next run's differs).
export function applyRun(
  data: GameData,
  meta: MetaState,
  report: RunReport,
  trials: readonly string[] = [],
): RunOutcome {
  const rules = metaRules(data);
  const won = report.outcome === 'won';
  const essence = essenceFor(data, report, trials, trialsOpen(data, meta));
  const next: MetaState = {
    ...meta,
    runs: meta.runs + 1,
    wins: meta.wins + (won ? 1 : 0),
    essence: meta.essence + essence.total,
    nextSeed: meta.nextSeed + 1,
    trialsWon: won ? [...new Set([...meta.trialsWon, ...trials])] : meta.trialsWon,
    ...(report.facts.boss ? { lastBoss: report.facts.boss } : {}),
  };
  const newUnlocks = rules.unlocks.filter(
    (u) => !owned(next, u.id) && holds(u.condition, next, report),
  );
  next.unlocks = [...next.unlocks, ...newUnlocks.map((u) => u.id)];
  const saga: SagaEntry[] = report.heroes
    .filter((h) => h.tier >= 3)
    .map((h) => ({
      god: h.god,
      path: h.path,
      type: h.type,
      kills: h.kills,
      ending: report.outcome,
      slain: !!h.slain,
      runs: next.runs,
      ...(h.name ? { name: h.name } : {}),
    }));
  next.saga = [...saga, ...meta.saga].slice(0, rules.sagaMax);
  return { meta: next, essence, newUnlocks, saga };
}
