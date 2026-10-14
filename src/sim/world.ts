import { avenge, revengeTarget, rivalPairs, vowRevenge } from './rivalry';
import { runAutosave } from './save';
import { generateMap } from './mapgen';
import { deathChance, koBonds, koGoldLost, slayHero } from './deaths';
import {
  buffOf,
  curePoison,
  fearOf,
  isBound,
  isStoned,
  isSwallowed,
  runHots,
  tauntOf,
  type UnitFx,
} from './effects';
import { armourBonus, charmEffects, weaponPower } from './items';
import { passiveRider } from './passives';
import { everyNthOf, passiveAggroMult, passiveArmour } from './passives';
import { noteFight } from './engage';
import { headCount, runBossMoves } from './bossmoves';
import { runQuirks, scavenge, stolenBy } from './quirks';
import {
  aliveMult,
  halfAttrs,
  packMult,
  prefersWeakest,
  raidSpeedMult,
  rewardShare,
  raidBuilding,
  raidChase,
  roleTurn,
  splitSwarm,
} from './roles';
import { runFavour } from './favour';
import { removeSummon, runSummon, runSummonUpkeep, summonStats } from './summons';
import { runStatuses, slowOf, healMult, type UnitStatus } from './riders';
import { attackStrike, landStrike } from './strike';
import { cancelDrink, runDrink } from './potions';
import { cancelCast, runSkill, supportEffect, tickSkill, type SkillRuntime } from './skills';
import { swing, type Area } from './swing';
import {
  bossNumbers,
  bossSealed,
  breathStrike,
  cleaveStrike,
  isBoss,
  runBosses,
  runBossSeal,
  spawnMonster,
  type BossRuntime,
} from './boss';
import { buildReport, sampleGold, tally, type HeroRecord } from './runstats';
import {
  attackBuilding,
  attackLair,
  pickLair,
  planTierRaid,
  runRaids,
  runTowers,
  upgradeBuilding,
  upgradeCost,
} from './town';
import { resolveTuning } from './tuning';
import { makeRng, type Rng } from './rng';
import {
  runParties,
  hasPendingPick,
  effectiveAttrs,
  pathStates,
  pickPath,
  pickUpgrade,
  shareXp,
  xpNext,
  type Party,
} from './parties';
import {
  heroKnockedOut,
  heroMove,
  payBounty,
  claimHunt,
  rescoreForFlag,
  runBounties,
  syncFlagView,
  syncIntent,
  adoptLair,
  committedToFlag,
  runHeroes,
  runTemples,
  type HeroRuntime,
} from './heroes';
import {
  aggroRange,
  dist,
  scaleAttrs,
  speedOf,
  stepToward,
  tierValue,
  TICK_MS,
  type Stats,
} from './units';
import type {
  BountyState,
  ConeArea,
  SkillEffect,
  GraveState,
  BuildingCore,
  Command,
  CommandResult,
  GameData,
  LairDef,
  MonsterDef,
  LairSite,
  LairState,
  RunStats,
  SimEvent,
  Snapshot,
  Tuning,
  UnitState,
  Vec2,
} from './types';

export { TICK_MS };
// Guard against a stalled tab handing us minutes of dt at once.
const MAX_TICKS_PER_STEP = 400;
// Monsters idle near their lair and wander inside this radius.

// Server-side bookkeeping per lair and unit, not part of the snapshot.
interface LairRuntime {
  nextSpawnMs: number;
  // When the lair next goes up a tier (Infinity once at the top or with growth off).
  nextTierMs: number;
  // When the wait for it began (the run start, the last timed tier-up, or an early one).
  tierFromMs?: number;
  // The boss of a boss lair has come out (once).
  bossSpawned?: boolean;
  // Heroes its monsters have knocked out since its last tier-up (pressure growth).
  kos?: number;
}
export interface UnitRuntime {
  // The lair a monster belongs to; null for heroes.
  lair: number | null;
  // Raiders march on the town instead of wandering near their lair.
  raid?: boolean;
  // Monster roles: a harrier on its way back to its lair to heal, a charger mid-charge (the way it
  // runs and the time left) and when it may charge again, a swarm half (cannot split again).
  retreat?: boolean;
  healAcc?: number;
  charge?: { dir: Vec2; ms: number; windupMs: number };
  charged?: boolean;
  chargeCdMs?: number;
  half?: boolean;
  // Quirks: regrowth paused until this time (ms), hp not yet whole, gold snatched so far.
  regenStopMs?: number;
  regenAcc?: number;
  stolen?: number;
  // The raid it belongs to (a raid is beaten when none of its raiders is left).
  raidId?: number;
  // A strike in its windup: the target and the time left before it lands.
  swing?: { target: number; ms: number; area?: Area; cone?: ConeArea };
  cooldownMs: number;
  target: Vec2 | null;
  idleMs: number;
  // Active riders on this unit (burn, chill, wither).
  status?: UnitStatus;
  // Set on a boss unit.
  boss?: BossRuntime;
  // The fight this unit is in runs until here (see engage.ts).
  fightUntilMs?: number;
  // Heroes with a path skill: cooldown and the cast in progress (see skills.ts).
  skill?: SkillRuntime;
  // Shield, mark, taunt and buffs from skills (see effects.ts).
  fx?: UnitFx;
  // Summons: effects that run on the foes around it when it ends or dies.
  summonEnd?: { radius: number; effects: readonly SkillEffect[] };
  // A potion being drunk: time left (see potions.ts).
  drink?: { ms: number };
  // The fight this unit is in: kills so far, whether its first-hit miss is spent, strikes landed.
  fight?: {
    kills: number;
    missUsed: boolean;
    strikes: number;
    revived?: boolean;
    ringUsed?: boolean;
  };
}

export interface World {
  readonly data: GameData;
  readonly seed: number;
  readonly rng: Rng;
  timeMs: number;
  tick: number;
  accumulatorMs: number;
  gold: number;
  status: Snapshot['status'];
  nextId: number;
  buildings: BuildingCore[];
  lairs: LairState[];
  units: UnitState[];
  lairRuntime: Map<number, LairRuntime>;
  unitRuntime: Map<number, UnitRuntime>;
  heroRuntime: Map<number, HeroRuntime>;
  templeNextMs: Map<number, number>;
  towerNextMs: Map<number, number>;
  // When a pair of rivals may argue again, by pair key.
  argueNextMs: Map<string, number>;
  // Run time of the next autosave event (0: not set yet).
  nextAutosaveMs: number;
  tuning: Tuning;
  parties: Map<number, Party>;
  bonds: Map<string, number>;
  pendingDeaths: { victim: number; by: number }[];
  // Where heroes were slain.
  graves: GraveState[];
  // Monster and lair types a hero has already seen (the `discovered` event fires once each).
  seen: string[];
  // God favour bars by pantheon, and the miracle steps still to run (the landing, spread strikes).
  favour: Record<string, number>;
  miracleSteps: { atMs: number; id: string; pos: Vec2; by: number; effect: number | null }[];
  // Monsters that died lately, for `kill` skill triggers.
  recentKills: { pos: Vec2; timeMs: number; by: number; type: string; tier: number }[];
  // Summons waiting to be called again (a falcon that died).
  respawns: {
    atMs: number;
    owner: number;
    summon: string;
    src: string;
    end?: { radius: number; effects: readonly SkillEffect[] };
  }[];
  nextRaidMs: number;
  // Raids announced and still to arrive, the timed raid already planned for, and raids on the way.
  raidPlans: { id: number; atMs: number; lair: number; size: number; early: boolean }[];
  raidPlannedFor: number;
  raidActive: number[];
  // Tier-ups seen so far that could have raided (for tuning.town.tierRaidEvery).
  tierUps: number;
  stats: RunStats;
  bounties: BountyState[];
  // Generated map: the boss lair that wins the run and the pantheons the map leans on.
  bossLair: number | null;
  // The seal on the boss lairs has broken (runBossSeal).
  bossUnsealed: boolean;
  mapLean: string[];
  // End screen tallies (src/sim/runstats.ts).
  heroRecords: Map<number, HeroRecord>;
  lairLog: { lair: number; type: string; timeMs: number; by: number }[];
  goldLog: { timeMs: number; gold: number }[];
  events: SimEvent[];
}

export function createWorld(seed: number, data: GameData): World {
  const world: World = {
    data,
    seed,
    rng: makeRng(seed),
    timeMs: 0,
    tick: 0,
    accumulatorMs: 0,
    gold: data.startGold,
    status: 'running',
    nextId: 1,
    buildings: [],
    lairs: [],
    units: [],
    lairRuntime: new Map(),
    unitRuntime: new Map(),
    heroRuntime: new Map(),
    templeNextMs: new Map(),
    towerNextMs: new Map(),
    argueNextMs: new Map(),
    nextAutosaveMs: 0,
    tuning: resolveTuning(data),
    parties: new Map(),
    bonds: new Map(),
    pendingDeaths: [],
    graves: [],
    seen: [],
    favour: {},
    miracleSteps: [],
    recentKills: [],
    respawns: [],
    nextRaidMs: 0,
    raidPlans: [],
    raidPlannedFor: -1,
    raidActive: [],
    tierUps: 0,
    stats: {
      monstersKilled: 0,
      lairsDestroyed: 0,
      heroesArrived: 0,
      knockouts: 0,
      buildingsLost: 0,
      taxCollected: 0,
    },
    bounties: [],
    bossLair: null,
    bossUnsealed: false,
    mapLean: [],
    heroRecords: new Map(),
    lairLog: [],
    goldLog: [{ timeMs: 0, gold: data.startGold }],
    events: [],
  };
  world.buildings.push({
    id: world.nextId++,
    type: 'townhall',
    tier: 1,
    pos: { ...data.townHall },
    plot: null,
    hp: world.tuning.town.townHallHp,
    maxHp: world.tuning.town.townHallHp,
  });
  world.nextRaidMs = world.tuning.town.raidFirstMs;
  let sites: readonly LairSite[] = data.lairSites ?? [];
  let bossIndex = -1;
  if (sites.length === 0 && data.mapRules) {
    const map = generateMap(seed, data);
    sites = map.sites;
    bossIndex = map.bossIndex;
    world.mapLean = map.lean;
  }
  for (const [i, site] of sites.entries()) {
    const def = data.lairs?.find((l) => l.id === site.lair);
    if (!def) throw new Error(`lair site names unknown lair: ${site.lair}`);
    const id = world.nextId++;
    const lt = world.tuning.lair;
    const hp = Math.round(def.hp * tierValue(lt.hpMult, 1, 1));
    world.lairs.push({
      id,
      type: def.id,
      boss: i === bossIndex,
      tier: 1,
      pos: { ...site.pos },
      hp,
      maxHp: hp,
    });
    const every = lt.tierUpEveryMs;
    if (i === bossIndex) world.bossLair = id;
    // Staggered clock: the nearer to the town, the earlier the first tier-up.
    const rank = sites.filter(
      (o) => dist(o.pos, data.townHall) < dist(site.pos, data.townHall),
    ).length;
    const first = site.firstTierUpMs ?? (lt.firstTierUpMs || every) + rank * lt.tierUpStaggerMs;
    world.lairRuntime.set(id, {
      nextSpawnMs: def.spawnS * 1000 * tierValue(lt.spawnMult, 1, 1),
      nextTierMs: every > 0 && world.tuning.lair.maxTier > 1 ? first : Infinity,
    });
  }
  return world;
}

export function step(world: World, dtMs: number): void {
  if (world.status !== 'running' || dtMs <= 0) return;
  world.accumulatorMs += dtMs;
  let ticks = 0;
  // The run slows to `offerSlowdown` of its speed while a party has a pick pending (0: it
  // waits). A tick then costs TICK_MS / slowdown of real time.
  const slow = world.tuning.party.offerSlowdown;
  for (;;) {
    const pending = hasPendingPick(world);
    if (pending && slow <= 0) {
      world.accumulatorMs = 0;
      return;
    }
    const cost = pending ? TICK_MS / slow : TICK_MS;
    if (world.accumulatorMs + 1e-6 < cost || ticks >= MAX_TICKS_PER_STEP) break;
    world.accumulatorMs -= cost;
    runTick(world);
    ticks++;
  }
  if (world.accumulatorMs >= TICK_MS) world.accumulatorMs = 0;
}

function runTick(world: World): void {
  world.tick++;
  world.timeMs += TICK_MS;
  runAutosave(world);
  sampleGold(world);
  runTemples(world);
  runTowers(world);
  // Tower victims leave now, before the lairs count their monsters or the units act.
  settleDeaths(world);
  runStatuses(world);
  runHots(world, (by, unit, amount) => {
    const gain = Math.min(Math.round(amount * healMult(world, unit.id)), unit.maxHp - unit.hp);
    if (gain <= 0) return;
    unit.hp += gain;
    tally(world, by, 'healing', gain);
    curePoison(world, unit.id);
    world.events.push({ kind: 'heal', healer: by, target: unit.id, amount: gain });
  });
  // Burn victims leave now, before heroes flee or units act on a dead unit's turn.
  settleDeaths(world);
  runBossSeal(world);
  runBosses(world);
  runBossMoves(world);
  runLairs(world);
  runRaids(world);
  runHeroes(world);
  runSummonUpkeep(world);
  runBounties(world);
  runQuirks(world);
  runFavour(world);
  runParties(world);
  runUnits(world);
  syncIntent(world);
  // Combat, heroes and the economy hook in here (Sim backlog 30 and up).
}

// A lair goes up a tier: tougher hp, and its next spawns are bigger, faster and stronger.
function tierUpLair(
  world: World,
  lair: LairState,
  rt: LairRuntime,
  def: LairDef,
  pressure = false,
): void {
  const t = world.tuning.lair;
  lair.tier++;
  const maxHp = Math.round(def.hp * tierValue(t.hpMult, lair.tier, 1));
  lair.hp += maxHp - lair.maxHp;
  lair.maxHp = maxHp;
  rt.kos = 0;
  // An early (pressure) tier-up restarts the clock from now; a timed one keeps its rhythm.
  rt.tierFromMs = pressure ? world.timeMs : rt.nextTierMs;
  rt.nextTierMs =
    lair.tier >= t.maxTier
      ? Infinity
      : pressure
        ? world.timeMs + t.tierUpEveryMs
        : rt.nextTierMs + t.tierUpEveryMs;
  world.events.push({
    kind: 'lairTierUp',
    lair: lair.id,
    tier: lair.tier,
    ...(pressure ? { pressure: true } : {}),
  });
  planTierRaid(world, lair, pressure);
}

// Living monsters of a lair (raiders it sent out do not count), and how many it keeps.
function aliveAt(world: World, lairId: number): number {
  return world.units.filter((u) => {
    const r = world.unitRuntime.get(u.id);
    return r?.lair === lairId && !r.raid && u.hp > 0;
  }).length;
}

function capOf(world: World, lair: LairState, def: LairDef, mon: MonsterDef): number {
  const lt = world.tuning.lair;
  return (def.maxAlive + tierValue(lt.maxAliveAdd, lair.tier, 0)) * aliveMult(world, mon);
}

function runLairs(world: World): void {
  const lt = world.tuning.lair;
  for (const lair of world.lairs) {
    const rt = world.lairRuntime.get(lair.id);
    const def = world.data.lairs?.find((l) => l.id === lair.type);
    if (!rt || !def) continue;
    if (world.timeMs >= rt.nextTierMs && lair.tier < lt.maxTier) tierUpLair(world, lair, rt, def);
    else if (
      lt.pressureKos > 0 &&
      (rt.kos ?? 0) >= lt.pressureKos &&
      lair.tier < lt.maxTier &&
      rt.nextTierMs !== Infinity
    ) {
      tierUpLair(world, lair, rt, def, true);
    }
    if (world.timeMs < rt.nextSpawnMs) continue;
    rt.nextSpawnMs = world.timeMs + def.spawnS * 1000 * tierValue(lt.spawnMult, lair.tier, 1);
    const alive = aliveAt(world, lair.id);
    // A lair whose monster is a boss spawns nothing regular unless it has an escort.
    const mon = world.data.monsters?.find((m) => m.id === (def.escort ?? def.monster));
    if (!mon || isBoss(mon)) continue;
    const cap = capOf(world, lair, def, mon);
    if (alive >= cap) continue;
    // The guards of a boss lair stand until the boss comes out; only the enrage call adds more.
    if (rt.bossSpawned) continue;
    spawnMonster(world, lair, mon);
  }
}

export function statsOf(world: World, unit: UnitState): Stats | undefined {
  const base = unitStats(world, unit);
  // Bound: cannot move, attacks take twice as long.
  if (base && isBound(world, unit.id)) {
    return { ...base, rooted: true, attackMult: (base.attackMult ?? 1) * 2 };
  }
  return base;
}

function unitStats(world: World, unit: UnitState): Stats | undefined {
  if (unit.kind === 'summon') return summonStats(world, unit);
  if (unit.kind === 'hero') {
    const cls = world.data.classes?.find((c) => c.id === unit.type);
    return (
      cls && {
        weapon: cls.weapon,
        attrs: effectiveAttrs(world, unit, cls.attrs),
        armour: scaled(
          cls.armour,
          buffOf(world, unit.id, 'armour'),
          passiveArmour(world, unit) + armourBonus(world, unit).armour,
        ),
        weaponPower: weaponPower(world, unit),
        types: charmTypes(world, unit),
        spellMult: cls.spellMult,
        slow: slowOf(world, unit.id),
        haste: buffOf(world, unit.id, 'attackSpeed'),
        damageType: cls.spellMult === undefined ? undefined : heroDamageType(world, unit),
      }
    );
  }
  const mon = world.data.monsters?.find((m) => m.id === unit.type);
  const mult = tierValue(world.tuning.lair.statMult, unit.tier, 1);
  const mrt = world.unitRuntime.get(unit.id);
  const bossRt = mrt?.boss;
  const raidSpeed = mrt ? raidSpeedMult(world, unit, mrt) : undefined;
  return (
    mon && {
      weapon: mon.weapon,
      attrs: mrt ? halfAttrs(world, mrt, scaleAttrs(mon.attrs, mult)) : scaleAttrs(mon.attrs, mult),
      ...(raidSpeed ? { speedMult: raidSpeed } : {}),
      armour: Math.round((mon.armour ?? 0) * mult),
      tags: isBoss(mon) ? [...(mon.tags ?? []), 'boss'] : mon.tags,
      types: mon.types,
      slow: slowOf(world, unit.id),
      attackMult: bossRt?.enraged ? bossNumbers(world, mon).enrageAttackMult : undefined,
    }
  );
}

// A bloodstone heals its wearer a share of max hp for each kill.
function healOnKill(world: World, id: number): void {
  const hero = world.units.find((u) => u.id === id);
  const share = hero && hero.kind === 'hero' ? charmEffects(world, hero).healOnKill : undefined;
  if (!hero || !share || hero.ko || hero.hp <= 0) return;
  const amount = Math.min(
    Math.round(share * hero.maxHp * healMult(world, hero.id)),
    hero.maxHp - hero.hp,
  );
  if (amount <= 0) return;
  hero.hp += amount;
  tally(world, hero.id, 'healing', amount);
  curePoison(world, hero.id);
  world.events.push({ kind: 'heal', healer: hero.id, target: hero.id, amount });
}

// A charm that softens damage types is a type row on the hero (0.75 for fire 0.25 softer).
function charmTypes(world: World, unit: UnitState): Partial<Record<string, number>> | undefined {
  const softer = charmEffects(world, unit).softer;
  if (!softer) return undefined;
  const row: Partial<Record<string, number>> = {};
  for (const [type, cut] of Object.entries(softer)) row[type] = 1 - (cut ?? 0);
  return row;
}

// A caster hero strikes with its path's type, else its god's (weapon templates are physical).
function heroDamageType(world: World, unit: UnitState): string | undefined {
  const path = unit.path ? world.data.paths?.find((p) => p.id === unit.path) : undefined;
  return path?.damageType ?? world.data.gods?.find((g) => g.id === unit.god)?.damageType;
}

const scaled = (armour: number | undefined, buff: number, flat = 0) =>
  armour === undefined && flat === 0 ? undefined : ((armour ?? 0) + flat) * (1 + buff);

// What a strike needs to know about a unit it hits.
export function targetOf(world: World, unit: UnitState) {
  const st = statsOf(world, unit);
  return (
    st && {
      attrs: st.attrs,
      armour: st.armour,
      types: st.types,
      tags: st.tags,
      dodgeAdd: buffOf(world, unit.id, 'dodge'),
    }
  );
}

function runUnits(world: World): void {
  for (const unit of world.units) {
    const rt = world.unitRuntime.get(unit.id);
    const stats = statsOf(world, unit);
    if (!rt || !stats) continue;
    if (unit.ko) {
      rt.swing = undefined;
      cancelCast(rt);
      cancelDrink(rt);
      continue;
    }
    rt.cooldownMs = Math.max(0, rt.cooldownMs - TICK_MS);
    tickSkill(rt);
    if (unit.kind === 'summon') {
      runSummon(world, unit, rt, stats);
      continue;
    }
    if (unit.kind === 'hero') {
      // Swallowed or turned to stone: no actions at all.
      if (isSwallowed(world, unit.id) || isStoned(world, unit.id)) {
        rt.swing = undefined;
        cancelCast(rt);
        cancelDrink(rt);
        unit.target = null;
        continue;
      }
      // Frightened: runs from the point it fears.
      const from = fearOf(world, unit.id);
      if (from) {
        rt.swing = undefined;
        cancelCast(rt);
        unit.target = null;
        const away = { x: unit.pos.x * 2 - from.x, y: unit.pos.y * 2 - from.y };
        const dir = stepToward(unit.pos, away, (speedOf(stats) * TICK_MS) / 1000);
        if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
        const { width, height } = world.data.map;
        unit.pos.x = Math.min(width, Math.max(0, unit.pos.x));
        unit.pos.y = Math.min(height, Math.max(0, unit.pos.y));
        continue;
      }
    }
    // Raiders have no lair leash: they march on the town.
    const home = rt.raid ? undefined : world.lairs.find((l) => l.id === rt.lair);
    // Heroes that are fleeing, resting or shopping do not pick fights.
    const busy = unit.kind === 'hero' && unit.mode !== 'explore';
    // A healer tends a hurt party mate before it attacks anything.
    const ally = busy ? null : healTarget(world, unit);
    const foe = busy || ally ? null : pickTarget(world, unit, stats, home?.pos);
    unit.target = ally ? ally.id : foe ? foe.id : null;
    if (unit.kind === 'hero' && foe) noteSeen(world, unit, 'monster', foe.type, foe.pos);
    // A monster's role may take its turn (a harrier running home, a charger charging).
    if (unit.kind === 'monster' && roleTurn(world, unit, rt, stats, foe)) continue;
    // A hero with a skill ready casts instead of its next strike or step.
    let casting = false;
    if (unit.kind === 'hero') {
      if (busy) {
        cancelCast(rt);
        cancelDrink(rt);
      } else if (runDrink(world, unit, rt, foe)) {
        // Drinking comes before casting, striking and moving.
        cancelCast(rt);
        casting = true;
      } else {
        casting = runSkill(world, unit, rt, foe);
      }
    }
    if (casting) {
      rt.swing = undefined;
    } else if (ally) {
      heal(world, unit, rt, stats, ally);
    } else if (foe) {
      noteFight(world, unit, rt, stats, foe, world.unitRuntime.get(foe.id), statsOf(world, foe));
      fight(world, unit, rt, stats, foe);
    } else if (unit.kind === 'hero') {
      // A hero under oath goes for its monster, not for a lair on the way.
      // A hero committed to a flag does not drop it for a lair on the way (the lair competes by score).
      const lair =
        busy || revengeTarget(world, unit) || committedToFlag(world, unit)
          ? null
          : pickLair(world, unit);
      if (lair) {
        adoptLair(world, unit, lair);
        noteSeen(world, unit, 'lair', lair.type, lair.pos);
        attackLair(world, unit, rt, stats, lair);
      } else heroMove(world, unit);
    } else if (rt.raid) {
      const chase = raidChase(world, unit);
      if (chase) {
        // A harrier raider heads for a resting hero; its aggro picks the target once close.
        const dir = stepToward(unit.pos, chase, (speedOf(stats) * TICK_MS) / 1000);
        if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
      } else {
        const b = raidBuilding(world, unit);
        if (b) attackBuilding(world, unit, rt, stats, b);
      }
    } else if (home) {
      wander(world, unit, rt, stats, home.pos);
    }
    // A swing belongs to its target: a new target, or none, cancels it.
    if (rt.swing && unit.target !== rt.swing.target) rt.swing = undefined;
  }
  settleDeaths(world);
}

// Nearest living enemy inside aggro range (and the leash, for monsters).
function pickTarget(world: World, unit: UnitState, stats: Stats, home?: Vec2): UnitState | null {
  // A taunted monster goes for its taunter.
  if (unit.kind === 'monster') {
    // Not past its leash: a taunted monster does not leave its lair for the taunter.
    const taunter = tauntOf(world, unit);
    if (taunter && (!home || dist(home, taunter.pos) <= world.tuning.monster.leash)) return taunter;
  }
  const reach = aggroRange(stats.attrs) * passiveAggroMult(world, unit);
  // A hero with a sworn enemy in sight goes for it first.
  const sworn = unit.kind === 'hero' ? revengeTarget(world, unit) : undefined;
  if (sworn && !sworn.ko && dist(unit.pos, sworn.pos) <= reach) return sworn;
  let best: UnitState | null = null;
  let bestD = Infinity;
  const weakest = unit.kind === 'monster' && prefersWeakest(world, unit);
  for (const other of world.units) {
    // Monsters fight heroes and summons; heroes and summons fight monsters.
    if ((other.kind === 'monster') === (unit.kind === 'monster') || other.ko || other.hp <= 0) {
      continue;
    }
    // A swallowed hero is out of the fight.
    if (other.kind === 'hero' && isSwallowed(world, other.id)) continue;
    // Nothing on foot can reach a flier.
    if (other.kind === 'summon' && stats.weapon.range <= 60 && flies(world, other)) continue;
    const d = dist(unit.pos, other.pos);
    if (d > reach) continue;
    // A harrier picks the weakest hero in reach, anything else the nearest.
    const score = weakest ? other.hp : d;
    if (score >= bestD) continue;
    if (home && dist(home, other.pos) > world.tuning.monster.leash) continue;
    best = other;
    bestD = score;
  }
  return best;
}

// The most hurt party mate in heal range, for a healer hero.
function healTarget(world: World, unit: UnitState): UnitState | null {
  if (unit.kind !== 'hero' || !world.data.classes?.find((c) => c.id === unit.type)?.heals) {
    return null;
  }
  const party = world.parties.get(unit.party);
  const t = world.tuning.combat;
  let best: UnitState | null = null;
  let bestFrac = t.healBelow;
  for (const id of party?.members ?? []) {
    const m = id === unit.id ? undefined : world.units.find((u) => u.id === id);
    if (!m || m.ko || m.hp <= 0 || dist(unit.pos, m.pos) > t.healRange) continue;
    const frac = m.hp / m.maxHp;
    if (frac < bestFrac) {
      best = m;
      bestFrac = frac;
    }
  }
  return best;
}

function heal(world: World, unit: UnitState, rt: UnitRuntime, stats: Stats, ally: UnitState): void {
  const d = dist(unit.pos, ally.pos);
  if (d > 0) unit.facing = { x: (ally.pos.x - unit.pos.x) / d, y: (ally.pos.y - unit.pos.y) / d };
  swing(world, unit, rt, stats, ally.id, () => {
    const gain = Math.round(
      world.tuning.combat.healPower * (stats.attrs.int + stats.attrs.wp) * healMult(world, ally.id),
    );
    const amount = Math.min(gain, ally.maxHp - ally.hp);
    if (amount <= 0 || ally.ko) return;
    ally.hp += amount;
    tally(world, unit.id, 'healing', amount);
    curePoison(world, ally.id);
    world.events.push({ kind: 'heal', healer: unit.id, target: ally.id, amount });
  });
}

function fight(world: World, unit: UnitState, rt: UnitRuntime, stats: Stats, foe: UnitState): void {
  const d = dist(unit.pos, foe.pos);
  if (d > stats.weapon.range) {
    rt.swing = undefined;
    const dir = stepToward(unit.pos, foe.pos, (speedOf(stats) * TICK_MS) / 1000);
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
    return;
  }
  if (d > 0) unit.facing = { x: (foe.pos.x - unit.pos.x) / d, y: (foe.pos.y - unit.pos.y) / d };
  const mon = rt.boss ? world.data.monsters?.find((m) => m.id === unit.type) : undefined;
  const boss = mon && rt.boss ? { n: bossNumbers(world, mon), rt: rt.boss } : undefined;
  // Every cleaveEvery-th strike of a boss is a cleave: long windup, a marked ground area.
  const breath = mon?.move?.breath;
  const cleave = boss && !mon?.move && (boss.rt.strikes + 1) % boss.n.cleaveEvery === 0;
  // A boss with a Fire Breath breathes every everyN-th strike (enragedEveryN once enraged).
  const breathing =
    boss &&
    breath &&
    (boss.rt.strikes + 1) % Math.max(1, boss.rt.enraged ? breath.enragedEveryN : breath.everyN) ===
      0;
  const cone: ConeArea | undefined =
    breathing && breath
      ? {
          from: { x: unit.pos.x, y: unit.pos.y },
          // On top of the target there is no direction to aim: use the way the boss faces.
          dir:
            d > 0
              ? { x: (foe.pos.x - unit.pos.x) / d, y: (foe.pos.y - unit.pos.y) / d }
              : { ...unit.facing },
          range: breath.range,
          angleDeg: breath.angleDeg,
        }
      : undefined;
  swing(
    world,
    unit,
    rt,
    stats,
    foe.id,
    (area, hitCone) => {
      if (boss) boss.rt.strikes++;
      if (hitCone && breath) breathStrike(world, unit, stats, hitCone, breath);
      else if (cleave && area) cleaveStrike(world, unit, foe, stats, area);
      else {
        const input = attackStrike(stats, targetOf(world, foe));
        const rider = unit.kind === 'hero' ? passiveRider(world, unit) : undefined;
        const pack = unit.kind === 'monster' ? packMult(world, unit) : 1;
        landStrike(world, unit, foe, {
          ...input,
          ...(rider ? { rider } : {}),
          ...(pack !== 1 ? { skillMult: (input.skillMult ?? 1) * pack } : {}),
        });
        // A Hydra strikes with every head it has: the nearest other heroes in reach too.
        const heads = headCount(world, unit);
        if (heads > 1) {
          const others = world.units
            .filter(
              (o) =>
                o.kind === 'hero' &&
                o.id !== foe.id &&
                !o.ko &&
                o.hp > 0 &&
                !isSwallowed(world, o.id) &&
                dist(unit.pos, o.pos) <= stats.weapon.range + 20,
            )
            .sort((a, b) => dist(unit.pos, a.pos) - dist(unit.pos, b.pos))
            .slice(0, heads - 1);
          for (const o of others) {
            landStrike(world, unit, o, attackStrike(stats, targetOf(world, o)));
          }
        }
      }
      // A passive that adds effects to every nth strike.
      const nth = everyNthOf(world, unit);
      if (nth && foe.hp > 0) {
        const fightState = (rt.fight ??= { kills: 0, missUsed: false, strikes: 0 });
        if (++fightState.strikes % nth.n === 0) {
          for (const effect of nth.effects) supportEffect(world, unit, stats, effect, foe);
        }
      }
    },
    cone && breath
      ? { windupMs: breath.windupMs, cone }
      : cleave && boss
        ? {
            windupMs: boss.n.cleaveWindupMs,
            area: { x: foe.pos.x, y: foe.pos.y, r: boss.n.cleaveRadius },
          }
        : undefined,
  );
}

function settleDeaths(world: World): void {
  const settled = new Set<number>();
  const slainIds = new Set<number>();
  for (const { victim, by } of world.pendingDeaths) {
    const unit = world.units.find((u) => u.id === victim);
    if (!unit || unit.ko || settled.has(victim)) continue;
    settled.add(victim);
    if (unit.kind === 'summon') {
      removeSummon(world, unit, 'died');
    } else if (unit.kind === 'hero') {
      unit.target = null;
      world.stats.knockouts++;
      tally(world, unit.id, 'knockouts');
      const goldLost = koGoldLost(world, unit);
      koBonds(world, unit);
      // A boss, or a tier 3 lair monster, may kill for good (no roll for anyone else).
      const chance = deathChance(world, unit, by);
      const slain = chance !== undefined && world.rng() < chance;
      if (slain) {
        world.events.push({
          kind: 'slain',
          unit: unit.id,
          by,
          type: unit.type,
          god: unit.god,
          pos: { ...unit.pos },
          ...(goldLost > 0 ? { goldLost } : {}),
        });
        slayHero(world, unit);
        slainIds.add(unit.id);
      } else {
        unit.ko = true;
        heroKnockedOut(world, unit, by);
        world.events.push({
          kind: 'knockout',
          unit: unit.id,
          by,
          ...(goldLost > 0 ? { goldLost } : {}),
        });
      }
      // A lair's monsters count the heroes they put down (pressure growth).
      const lairId = world.unitRuntime.get(by)?.lair;
      const lrt =
        lairId === null || lairId === undefined ? undefined : world.lairRuntime.get(lairId);
      if (lrt) lrt.kos = (lrt.kos ?? 0) + 1;
      scavenge(world, by);
      vowRevenge(world, unit, by);
    } else {
      const mon = world.data.monsters?.find((m) => m.id === unit.type);
      const mrt = world.unitRuntime.get(unit.id);
      const reward =
        tierValue(world.tuning.lair.rewardMult, unit.tier, 1) * rewardShare(world, mrt);
      const bounty = Math.round((mon?.bounty ?? 0) * reward);
      const xp = Math.round((mon?.xp ?? 0) * reward);
      world.events.push({ kind: 'died', unit: unit.id, type: unit.type, by, bounty, xp });
      // Only `kill` triggers read this; keep it to the window and only when skills exist.
      if (world.data.skills?.length) {
        const from = world.timeMs - world.tuning.skill.killWindowMs;
        world.recentKills = world.recentKills.filter((k) => k.timeMs >= from);
        world.recentKills.push({
          pos: { ...unit.pos },
          timeMs: world.timeMs,
          by,
          type: unit.type,
          tier: unit.tier,
        });
      }
      world.stats.monstersKilled++;
      avenge(world, unit.id);
      tally(world, by, 'kills');
      const krt = world.unitRuntime.get(by);
      if (krt?.fight) krt.fight.kills++;
      healOnKill(world, by);
      payBounty(world, by, bounty + stolenBy(world, unit.id));
      claimHunt(world, unit.id, by);
      shareXp(world, by, xp);
      splitSwarm(world, unit, mrt);
    }
  }
  world.pendingDeaths = [];
  world.units = world.units.filter((u) => {
    const gone = (u.kind !== 'hero' && u.hp <= 0) || slainIds.has(u.id);
    if (gone) world.unitRuntime.delete(u.id);
    return !gone;
  });
}

// The first time a hero sees a kind of monster or lair, the world says so once (hint triggers).
function noteSeen(
  world: World,
  hero: UnitState,
  what: 'monster' | 'lair',
  type: string,
  pos: Vec2,
): void {
  const key = `${what}:${type}`;
  if (world.seen.includes(key)) return;
  world.seen.push(key);
  world.events.push({ kind: 'discovered', what, type, unit: hero.id, pos: { ...pos } });
}

function flies(world: World, unit: UnitState): boolean {
  return !!unit.summon && !!world.data.summons?.find((s) => s.id === unit.summon?.def)?.flies;
}

function wander(world: World, unit: UnitState, rt: UnitRuntime, stats: Stats, home: Vec2): void {
  if (!rt.target) {
    rt.idleMs -= TICK_MS;
    if (rt.idleMs > 0) return;
    rt.target = wanderPoint(world, home);
  }
  const dir = stepToward(unit.pos, rt.target, (speedOf(stats) * TICK_MS) / 1000);
  if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
  if (unit.pos.x === rt.target.x && unit.pos.y === rt.target.y) {
    const tm = world.tuning.monster;
    rt.target = null;
    rt.idleMs = tm.idleMinMs + world.rng() * (tm.idleMaxMs - tm.idleMinMs);
  }
}

function wanderPoint(world: World, center: Vec2): Vec2 {
  const { width, height } = world.data.map;
  const angle = world.rng() * Math.PI * 2;
  const r = Math.sqrt(world.rng()) * world.tuning.monster.wanderRadius;
  return {
    x: Math.min(width, Math.max(0, center.x + Math.cos(angle) * r)),
    y: Math.min(height, Math.max(0, center.y + Math.sin(angle) * r)),
  };
}

export { spawnHero } from './heroes';

export function command(world: World, cmd: Command): CommandResult {
  if (world.status !== 'running') return { ok: false, reason: 'run over' };
  switch (cmd.kind) {
    case 'build': {
      const def = world.data.buildings.find((b) => b.id === cmd.type);
      if (!def) return { ok: false, reason: 'unknown building' };
      const at = Number.isInteger(cmd.plot) ? world.data.plots?.[cmd.plot] : undefined;
      if (!at) return { ok: false, reason: 'unknown plot' };
      if (world.buildings.some((b) => b.plot === cmd.plot)) {
        return { ok: false, reason: 'plot taken' };
      }
      if (world.gold < def.cost) return { ok: false, reason: 'not enough gold' };
      world.gold -= def.cost;
      const id = world.nextId++;
      world.buildings.push({
        id,
        type: def.id,
        tier: 1,
        pos: { ...at },
        plot: cmd.plot,
        hp: world.tuning.town.buildingHp,
        maxHp: world.tuning.town.buildingHp,
      });
      world.events.push({ kind: 'built', building: id, type: def.id });
      return { ok: true, id };
    }
    case 'upgrade':
      return upgradeBuilding(world, cmd.building);
    case 'pickUpgrade':
      return pickUpgrade(world, cmd.party, cmd.upgrade);
    case 'pickPath':
      return pickPath(world, cmd.party, cmd.path);
    case 'placeBounty': {
      if (!inMap(world, cmd.pos)) return { ok: false, reason: 'off map' };
      if (!Number.isInteger(cmd.gold) || cmd.gold <= 0) return { ok: false, reason: 'bad amount' };
      if (world.gold < cmd.gold) return { ok: false, reason: 'not enough gold' };
      world.gold -= cmd.gold;
      const id = world.nextId++;
      // On a monster (within huntSnap): a hunt flag bound to the nearest one. A flag on a lair
      // stays a lair flag, whatever guards stand around it.
      const snap = world.tuning.bounty.huntSnap;
      const onLair = world.lairs.some((l) => dist(l.pos, cmd.pos) <= snap);
      let prey: UnitState | undefined;
      for (const u of onLair ? [] : world.units) {
        if (u.kind !== 'monster' || u.hp <= 0) continue;
        const d = dist(u.pos, cmd.pos);
        if (d <= snap && (!prey || d < dist(prey.pos, cmd.pos))) prey = u;
      }
      world.bounties.push({
        id,
        pos: prey ? { ...prey.pos } : { ...cmd.pos },
        gold: cmd.gold,
        placedMs: world.timeMs,
        ...(prey ? { target: prey.id } : {}),
      });
      world.events.push({
        kind: 'bountyPlaced',
        bounty: id,
        gold: cmd.gold,
        ...(prey ? { target: prey.id } : {}),
      });
      rescoreForFlag(world);
      return { ok: true, id };
    }
    case 'cancelBounty': {
      const flag = world.bounties.find((b) => b.id === cmd.bounty);
      if (!flag) return { ok: false, reason: 'unknown bounty' };
      world.bounties = world.bounties.filter((b) => b.id !== flag.id);
      const refund = Math.floor(flag.gold * world.tuning.bounty.cancelRefund);
      world.gold += refund;
      world.events.push({ kind: 'bountyCancelled', bounty: flag.id, gold: flag.gold, refund });
      return { ok: true, id: flag.id };
    }
    case 'raiseBounty': {
      const flag = world.bounties.find((b) => b.id === cmd.bounty);
      if (!flag) return { ok: false, reason: 'unknown bounty' };
      if (!Number.isInteger(cmd.gold) || cmd.gold <= 0) return { ok: false, reason: 'bad amount' };
      if (world.gold < cmd.gold) return { ok: false, reason: 'not enough gold' };
      world.gold -= cmd.gold;
      flag.gold += cmd.gold;
      // A raised flag is news again: it may break a commitment for a while, and is weighed now.
      flag.placedMs = world.timeMs;
      rescoreForFlag(world);
      world.events.push({
        kind: 'bountyRaised',
        bounty: flag.id,
        gold: cmd.gold,
        total: flag.gold,
      });
      return { ok: true, id: flag.id };
    }
  }
}

function inMap(world: World, p: { x: number; y: number }): boolean {
  const { width, height } = world.data.map;
  return p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height;
}

// Copies out the state; the returned object never aliases the live world. Drains events.
// A lair as the snapshot shows it: the tier-up clock (ms left and the length of the current wait,
// for the growth ring) and the guards (alive, kept, ms to the next spawn; null when full).
function lairView(world: World, l: LairState): LairState {
  const rt = world.lairRuntime.get(l.id);
  const def = world.data.lairs?.find((d) => d.id === l.type);
  const at = rt?.nextTierMs;
  const timed = at !== undefined && Number.isFinite(at) && l.tier < world.tuning.lair.maxTier;
  const mon = world.data.monsters?.find((m) => m.id === (def?.escort ?? def?.monster));
  const alive = aliveAt(world, l.id);
  const cap = def && mon && !isBoss(mon) ? capOf(world, l, def, mon) : 0;
  return {
    ...l,
    pos: { ...l.pos },
    nextTierMs: timed ? Math.max(0, at - world.timeMs) : null,
    tierSpanMs: timed ? Math.max(1, at - (rt?.tierFromMs ?? 0)) : null,
    alive,
    maxAlive: cap,
    nextSpawnMs: rt && alive < cap ? Math.max(0, rt.nextSpawnMs - world.timeMs) : null,
  };
}

export function snapshot(world: World): Snapshot {
  syncFlagView(world);
  const events = world.events;
  world.events = [];
  return {
    timeMs: world.timeMs,
    tick: world.tick,
    gold: world.gold,
    status: world.status,
    stats: { ...world.stats },
    plots: (world.data.plots ?? []).map((pos, id) => {
      const b = world.buildings.find((x) => x.plot === id);
      return { id, pos: { ...pos }, occupied: !!b, building: b ? b.id : null };
    }),
    buildings: world.buildings.map((b) => ({
      ...b,
      pos: { ...b.pos },
      upgradeCost: upgradeCost(world, b),
    })),
    parties: [...world.parties.values()].map((p) => ({
      id: p.id,
      members: [...p.members],
      level: p.level,
      xp: p.xp,
      xpNext: xpNext(world, p.level),
      upgrades: [...p.upgrades],
      offer: p.offer ? [...p.offer] : null,
      pathOffer: p.pathOffer ? { hero: p.pathOffer.hero, options: [...p.pathOffer.options] } : null,
      intent: p.intent ? { ...p.intent } : { kind: 'explore' },
    })),
    paths: pathStates(world),
    lairs: world.lairs.map((l) => lairView(world, l)),
    units: world.units.map((u) => ({
      ...u,
      pos: { ...u.pos },
      facing: { ...u.facing },
      ...(u.items ? { items: { ...u.items } } : {}),
      ...(u.summon ? { summon: { ...u.summon } } : {}),
    })),
    bounties: world.bounties.map((b) => ({ ...b, pos: { ...b.pos } })),
    favour: (world.data.miracles ?? []).map((m) => ({
      pantheon: m.pantheon,
      value: world.favour[m.pantheon] ?? 0,
      max: world.tuning.favour.max,
    })),
    graves: world.graves.map((g) => ({ ...g, pos: { ...g.pos } })),
    rivals: rivalPairs(world),
    map: { lean: [...world.mapLean], boss: world.bossLair, sealed: bossSealed(world) },
    report: buildReport(world),
    events,
  };
}
