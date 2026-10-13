import { landStrike, attackStrike } from './strike';
import { dist, maxHp, scaleAttrs, tierValue, type Stats } from './units';
import { targetOf } from './world';
import type { Area } from './swing';
import type { World } from './world';
import type { BossMove, BossTuning, ConeArea, LairState, MonsterDef, UnitState } from './types';

// Bosses (Sim 220, docs/systems/combat.md section 7). A boss is a monster row with `boss`. It
// waits inside its lair until the lair is below tuning.boss.emergeBelow of its hp, then comes
// out and fights; the lair cannot fall while it lives. Every cleaveEvery-th strike is a cleave
// (long windup with a ground marker, undodgeable, hits every hero near the target); at enrageAt
// of its hp it enrages (faster, calls its lair's escort). Bosses cannot be crit and take chill at
// half strength. Boss knockouts rolling death is row 230.

export interface BossRuntime {
  lair: number;
  // Strikes made so far; the cleaveEvery-th one is a cleave.
  strikes: number;
  enraged: boolean;
  // Timed signature moves (bossmoves.ts): when the next one starts and the one being announced.
  nextMoveMs?: number;
  pending?: { kind: 'venom' | 'howl' | 'riddle' | 'swallow'; atMs: number; target: number };
  // Three Heads: heads left, cuts made so far, and when the cut head regrows (null: stays cut).
  heads?: number;
  cuts?: number;
  regrowAtMs?: number | null;
}

export const isBoss = (mon: MonsterDef | undefined): boolean => !!mon?.boss;

export const bossNumbers = (world: World, mon: MonsterDef): BossTuning => ({
  ...world.tuning.boss,
  ...mon.boss,
});

// Spawns a monster at its lair. A boss uses its own hp row instead of Sta * 8 + Str * 4.
export function spawnMonster(world: World, lair: LairState, mon: MonsterDef): UnitState {
  const mult = tierValue(world.tuning.lair.statMult, lair.tier, 1);
  const hp = mon.hp ? Math.round(mon.hp * mult) : maxHp(scaleAttrs(mon.attrs, mult));
  const id = world.nextId++;
  const unit: UnitState = {
    id,
    kind: 'monster',
    type: mon.id,
    tier: lair.tier,
    god: null,
    path: null,
    pos: { ...lair.pos },
    facing: { x: 0, y: 1 },
    hp,
    maxHp: hp,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  };
  world.units.push(unit);
  world.unitRuntime.set(id, { lair: lair.id, cooldownMs: 0, target: null, idleMs: 0 });
  world.events.push({ kind: 'spawned', unit: id, type: mon.id, lair: lair.id });
  return unit;
}

const bossOf = (world: World, lair: LairState) => {
  const def = world.data.lairs?.find((l) => l.id === lair.type);
  const mon = world.data.monsters?.find((m) => m.id === def?.monster);
  return def && mon && isBoss(mon) ? { def, mon } : undefined;
};

const bossUnits = (world: World, lairId: number) =>
  world.units.filter((u) => world.unitRuntime.get(u.id)?.boss?.lair === lairId && u.hp > 0);

// A boss lair is sealed until the run is old enough or enough other lairs have fallen.
export function lairSealed(world: World, lairId: number): boolean {
  if (world.bossUnsealed) return false;
  const lair = world.lairs.find((l) => l.id === lairId);
  return !!lair && !!bossOf(world, lair);
}

// Is a sealed boss lair within `radius` of a point? (Bounties there wait.)
export const nearSealedLair = (world: World, pos: { x: number; y: number }, radius: number) =>
  world.lairs.some((l) => lairSealed(world, l.id) && dist(l.pos, pos) <= radius);

// Is any boss lair still sealed? (For the snapshot.)
export const bossSealed = (world: World): boolean =>
  !world.bossUnsealed && world.lairs.some((l) => !!bossOf(world, l));

// Every tick: the seal breaks at sealUntilMs or after sealLairs lairs have fallen.
export function runBossSeal(world: World): void {
  if (world.bossUnsealed) return;
  // An old save with the boss already out never reseals.
  if ([...world.lairRuntime.values()].some((r) => r.bossSpawned)) {
    world.bossUnsealed = true;
    return;
  }
  const t = world.tuning.boss;
  const by =
    world.timeMs >= t.sealUntilMs
      ? 'time'
      : world.stats.lairsDestroyed >= t.sealLairs
        ? 'lairs'
        : undefined;
  if (!by) return;
  world.bossUnsealed = true;
  for (const lair of world.lairs) {
    if (bossOf(world, lair)) world.events.push({ kind: 'bossLairUnsealed', lair: lair.id, by });
  }
}

// A boss lair stands while its boss lives, and until the boss has come out.
export function lairProtected(world: World, lairId: number): boolean {
  const lair = world.lairs.find((l) => l.id === lairId);
  if (!lair || !bossOf(world, lair)) return false;
  return !world.lairRuntime.get(lairId)?.bossSpawned || bossUnits(world, lairId).length > 0;
}

// Every tick: bosses come out of their lairs, and enrage.
export function runBosses(world: World): void {
  for (const lair of world.lairs) {
    const found = bossOf(world, lair);
    const lrt = world.lairRuntime.get(lair.id);
    if (!found || !lrt || lairSealed(world, lair.id)) continue;
    const n = bossNumbers(world, found.mon);
    if (!lrt.bossSpawned && lair.hp < lair.maxHp * n.emergeBelow) {
      lrt.bossSpawned = true;
      const unit = spawnMonster(world, lair, found.mon);
      const rt = world.unitRuntime.get(unit.id);
      if (rt) rt.boss = { lair: lair.id, strikes: 0, enraged: false };
      world.events.push({ kind: 'bossEmerged', unit: unit.id, lair: lair.id });
    }
    for (const boss of bossUnits(world, lair.id)) {
      const brt = world.unitRuntime.get(boss.id)?.boss;
      if (!brt || brt.enraged || boss.hp > boss.maxHp * n.enrageAt) continue;
      brt.enraged = true;
      world.events.push({ kind: 'enraged', unit: boss.id });
      const escort = world.data.monsters?.find((m) => m.id === found.def.escort);
      if (escort && !isBoss(escort)) {
        for (let i = 0; i < n.enrageCalls; i++) spawnMonster(world, lair, escort);
      }
    }
  }
}

// The cleave: the target takes the hit (undodgeable), every other living hero within the marked
// area takes cleaveShare of it.
export function cleaveStrike(
  world: World,
  boss: UnitState,
  foe: UnitState,
  stats: Stats,
  area: Area,
): void {
  const mon = world.data.monsters?.find((m) => m.id === boss.type);
  const n = mon ? bossNumbers(world, mon) : world.tuning.boss;
  landStrike(world, boss, foe, { ...attackStrike(stats, targetOf(world, foe)), canDodge: false });
  for (const u of world.units) {
    if (u.kind !== 'hero' || u.ko || u.hp <= 0 || u.id === foe.id) continue;
    if (dist(u.pos, area) > area.r) continue;
    landStrike(world, boss, u, {
      ...attackStrike(stats, targetOf(world, u)),
      canDodge: false,
      skillMult: n.cleaveShare,
    });
  }
}

// The breath: every living hero inside the cone takes mult x the boss's strike as fire (or the
// move's type), undodgeable, with the move's rider (burn).
export function breathStrike(
  world: World,
  boss: UnitState,
  stats: Stats,
  cone: ConeArea,
  move: NonNullable<NonNullable<BossMove['breath']>>,
): void {
  const half = ((move.angleDeg / 2) * Math.PI) / 180;
  for (const u of world.units) {
    if (u.kind !== 'hero' || u.ko || u.hp <= 0) continue;
    const d = dist(cone.from, u.pos);
    if (d > cone.range) continue;
    // Straight at the boss counts as inside; otherwise the angle to the axis must fit.
    if (d > 0) {
      const cos = ((u.pos.x - cone.from.x) * cone.dir.x + (u.pos.y - cone.from.y) * cone.dir.y) / d;
      if (Math.acos(Math.max(-1, Math.min(1, cos))) > half) continue;
    }
    landStrike(world, boss, u, {
      ...attackStrike(stats, targetOf(world, u)),
      type: move.type,
      skillMult: move.mult,
      canDodge: false,
      ...(move.rider ? { rider: move.rider } : {}),
    });
  }
}
