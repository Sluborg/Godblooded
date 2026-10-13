import { landStrike, attackStrike } from './strike';
import { dist, scaleAttrs, speedOf, stepToward, TICK_MS, type Stats } from './units';
import { targetOf, type UnitRuntime, type World } from './world';
import type { MonsterDef, MonsterRole, UnitState } from './types';

// Monster roles (Sim 360, docs/systems/monsters-and-bosses.md section 1). Brute is the default
// behaviour; the others change who a monster goes for, how it opens a fight, and how it dies.

export const monsterDef = (world: World, unit: UnitState): MonsterDef | undefined =>
  world.data.monsters?.find((m) => m.id === unit.type);

export const roleOf = (world: World, unit: UnitState): MonsterRole =>
  unit.kind === 'monster' ? (monsterDef(world, unit)?.role ?? 'brute') : 'brute';

// Walking speed of a raider: harriers and swarms are quicker on the march.
export function raidSpeedMult(world: World, unit: UnitState, rt: UnitRuntime): number | undefined {
  if (!rt.raid) return undefined;
  const role = roleOf(world, unit);
  return role === 'harrier' || role === 'swarm' ? world.tuning.role.raidSpeedMult : undefined;
}

// Stats of a swarm half: half the attributes.
export function halfAttrs(world: World, rt: UnitRuntime, attrs: Stats['attrs']): Stats['attrs'] {
  return rt.half ? scaleAttrs(attrs, world.tuning.role.swarmSplitShare) : attrs;
}

// A pack hits harder for every other pack mate close by.
export function packMult(world: World, unit: UnitState): number {
  if (roleOf(world, unit) !== 'pack') return 1;
  const t = world.tuning.role;
  let mates = 0;
  for (const o of world.units) {
    if (o.id === unit.id || o.kind !== 'monster' || o.hp <= 0) continue;
    if (dist(o.pos, unit.pos) <= t.packRadius && o.type === unit.type) mates++;
  }
  return 1 + Math.min(t.packMax, t.packBonus * mates);
}

// Does a swarm lair keep more alive?
export function aliveMult(world: World, monster: MonsterDef): number {
  return monster.role === 'swarm' ? world.tuning.role.swarmAliveMult : 1;
}

// A swarm that dies splits once into two halves where it fell.
export function splitSwarm(world: World, unit: UnitState, rt: UnitRuntime | undefined): void {
  if (!rt || rt.half || roleOf(world, unit) !== 'swarm') return;
  const share = world.tuning.role.swarmSplitShare;
  const into: number[] = [];
  for (const side of [-1, 1]) {
    const id = world.nextId++;
    const hp = Math.max(1, Math.round(unit.maxHp * share));
    world.units.push({
      ...unit,
      id,
      pos: { x: unit.pos.x + side * 12, y: unit.pos.y },
      hp,
      maxHp: hp,
      target: null,
    });
    world.unitRuntime.set(id, {
      lair: rt.lair,
      ...(rt.raid ? { raid: true } : {}),
      ...(rt.raidId !== undefined ? { raidId: rt.raidId } : {}),
      cooldownMs: 0,
      target: null,
      idleMs: 0,
      half: true,
    });
    into.push(id);
  }
  world.events.push({ kind: 'split', unit: unit.id, into });
}

// Share of the reward a unit pays (a swarm half pays half).
export const rewardShare = (world: World, rt: UnitRuntime | undefined): number =>
  rt?.half ? world.tuning.role.swarmSplitShare : 1;

// The target a harrier picks: the hero with the least hp (the caller passes the candidates).
export const prefersWeakest = (world: World, unit: UnitState): boolean =>
  roleOf(world, unit) === 'harrier';

// A role's own turn. True when it took the unit's turn (retreating or charging).
export function roleTurn(
  world: World,
  unit: UnitState,
  rt: UnitRuntime,
  stats: Stats,
  foe: UnitState | null,
): boolean {
  const role = roleOf(world, unit);
  if (role === 'harrier') return harrierTurn(world, unit, rt, stats);
  if (role === 'charger') return chargerTurn(world, unit, rt, stats, foe);
  return false;
}

// Below the flee line a harrier runs to its lair, heals there (only there), and comes back when
// it is well. A raider has no lair to run to and keeps fighting.
function harrierTurn(world: World, unit: UnitState, rt: UnitRuntime, stats: Stats): boolean {
  const t = world.tuning.role;
  const lair = rt.lair === null || rt.raid ? undefined : world.lairs.find((l) => l.id === rt.lair);
  if (!lair) {
    rt.retreat = false;
    return false;
  }
  if (!rt.retreat && unit.hp < t.harrierFleeHp * unit.maxHp) rt.retreat = true;
  if (!rt.retreat) return false;
  rt.swing = undefined;
  unit.target = null;
  if (dist(unit.pos, lair.pos) > 40) {
    const dir = stepToward(unit.pos, lair.pos, (speedOf(stats) * TICK_MS) / 1000);
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
    return true;
  }
  const acc = (rt.healAcc ?? 0) + (t.harrierHealPctS * unit.maxHp * TICK_MS) / 1000;
  const whole = Math.floor(acc);
  rt.healAcc = acc - whole;
  unit.hp = Math.min(unit.maxHp, unit.hp + whole);
  if (unit.hp >= t.harrierReturnHp * unit.maxHp) rt.retreat = false;
  return true;
}

// From chargeMin to chargeMax away a charger runs at its target in a straight line; the first
// strike is chargeMult x and knocks the target back; then it fights as a brute.
function chargerTurn(
  world: World,
  unit: UnitState,
  rt: UnitRuntime,
  stats: Stats,
  foe: UnitState | null,
): boolean {
  const t = world.tuning.role;
  rt.chargeCdMs = Math.max(0, (rt.chargeCdMs ?? 0) - TICK_MS);
  if (!rt.charge) {
    // A rooted charger cannot run (speed 0 would never end the charge).
    if (!foe || (rt.chargeCdMs ?? 0) > 0 || foe.kind === 'summon' || speedOf(stats) <= 0) {
      return false;
    }
    const d = dist(unit.pos, foe.pos);
    if (d < t.chargeMin || d > t.chargeMax) return false;
    const dir = { x: (foe.pos.x - unit.pos.x) / d, y: (foe.pos.y - unit.pos.y) / d };
    rt.charge = { dir, ms: ((d + 40) / (speedOf(stats) * t.chargeSpeedMult)) * 1000 };
    rt.swing = undefined;
    world.events.push({ kind: 'charge', unit: unit.id, to: { ...foe.pos } });
  }
  const charge = rt.charge;
  if (!charge) return false;
  unit.facing = charge.dir;
  const step = (speedOf(stats) * t.chargeSpeedMult * TICK_MS) / 1000;
  unit.pos.x += charge.dir.x * step;
  unit.pos.y += charge.dir.y * step;
  charge.ms -= TICK_MS;
  // The first hero in reach takes the blow.
  let hit: UnitState | undefined;
  const { width, height } = world.data.map;
  unit.pos.x = Math.min(width, Math.max(0, unit.pos.x));
  unit.pos.y = Math.min(height, Math.max(0, unit.pos.y));
  for (const o of world.units) {
    if (o.kind !== 'hero' || o.ko || o.hp <= 0) continue;
    const d = dist(unit.pos, o.pos);
    if (d <= stats.weapon.range && (!hit || o === foe || d < dist(unit.pos, hit.pos))) hit = o;
  }
  if (hit) {
    landStrike(world, unit, hit, {
      ...attackStrike(stats, targetOf(world, hit)),
      skillMult: t.chargeMult,
    });
    const d = dist(unit.pos, hit.pos) || 1;
    hit.pos = {
      x: Math.min(
        width,
        Math.max(0, hit.pos.x + ((hit.pos.x - unit.pos.x) / d) * t.chargeKnockback),
      ),
      y: Math.min(
        height,
        Math.max(0, hit.pos.y + ((hit.pos.y - unit.pos.y) / d) * t.chargeKnockback),
      ),
    };
  }
  if (hit || charge.ms <= 0) {
    rt.charge = undefined;
    rt.chargeCdMs = t.chargeCooldownMs;
  }
  unit.target = foe ? foe.id : null;
  return true;
}
