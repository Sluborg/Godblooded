import { isWorking } from './town';
import { visitPoint } from './collision';
import { swing } from './swing';
import { attackStrike, landStrike } from './strike';
import { dist, speed, stepToward, TICK_MS, type Stats } from './units';
import { targetOf, type UnitRuntime, type World } from './world';
import type { BuildingCore, CommandResult, UnitState } from './types';

// Guards (docs/systems/nodes.md section 3): a tower lends a guard to walk beside one gatherer.
// It fights what attacks, never strays beyond guardLeash of its gatherer, and goes home with it.
// A guard that falls is replaced by the tower after guardRelendMs.

const towers = (world: World): BuildingCore[] =>
  world.buildings.filter((b) => b.type === 'tower' && isWorking(b));

// What a guard hits with: a share of a level 1 hero's strength, a short spear, a little armour.
export function guardStats(world: World): Stats {
  const t = world.tuning.nodes;
  const cls = world.data.classes?.[0];
  const base = cls?.attrs ?? { str: 6, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 3 };
  return {
    attrs: { ...base, str: Math.max(1, Math.round(base.str * t.guardDamage)) },
    weapon: { baseAttackS: cls?.weapon.baseAttackS ?? 1, range: t.guardRange },
    armour: t.guardArmour,
  };
}

const liveGuards = (world: World, tower: number): number =>
  world.units.filter(
    (u) => u.kind === 'guard' && u.hp > 0 && world.unitRuntime.get(u.id)?.guard?.tower === tower,
  ).length;

// Guards a tower may lend: by its tier, less those out and those being replaced.
export function guardsFree(world: World, tower: BuildingCore): number {
  const t = world.tuning.nodes;
  const cap = t.guardPerTower[Math.min(Math.max(tower.tier, 1), t.guardPerTower.length) - 1] ?? 0;
  const waiting = world.guardQueue.filter((q) => q.tower === tower.id).length;
  return cap - liveGuards(world, tower.id) - waiting;
}

// A tower sends a guard out to walk beside a gatherer (guardCost gold).
export function sendGuard(world: World, gathererId: number): CommandResult {
  const t = world.tuning.nodes;
  const g = world.units.find((u) => u.id === gathererId && u.kind === 'worker' && u.hp > 0);
  if (!t.enabled || !g) return { ok: false, reason: 'no such gatherer' };
  const taken = world.units.some(
    (u) =>
      u.kind === 'guard' && u.hp > 0 && world.unitRuntime.get(u.id)?.guard?.escort === gathererId,
  );
  if (taken) return { ok: false, reason: 'already guarded' };
  const tower = towers(world)
    .filter((b) => guardsFree(world, b) > 0)
    .sort((a, b) => dist(a.pos, g.pos) - dist(b.pos, g.pos))[0];
  if (!tower) return { ok: false, reason: 'no guard to lend' };
  if (world.gold < t.guardCost) return { ok: false, reason: 'not enough gold' };
  world.gold -= t.guardCost;
  const id = world.nextId++;
  world.units.push({
    id,
    kind: 'guard',
    type: 'guard',
    tier: 1,
    god: null,
    path: null,
    pos: { x: tower.pos.x, y: tower.pos.y + 30 },
    facing: { x: 0, y: 1 },
    hp: t.guardHp,
    maxHp: t.guardHp,
    target: null,
    ko: false,
    mode: 'wander',
    party: 0,
    trait: null,
    gold: 0,
    bounty: null,
  });
  world.unitRuntime.set(id, {
    lair: null,
    cooldownMs: 0,
    target: null,
    idleMs: 0,
    guard: { escort: gathererId, tower: tower.id },
  });
  world.events.push({ kind: 'guardOut', unit: id, escort: gathererId, tower: tower.id });
  return { ok: true, id };
}

export function guardFell(world: World, unit: UnitState): void {
  const g = world.unitRuntime.get(unit.id)?.guard;
  if (g) {
    world.guardQueue.push({
      tower: g.tower,
      atMs: world.timeMs + world.tuning.nodes.guardRelendMs,
    });
  }
  world.events.push({ kind: 'guardFell', unit: unit.id, pos: { ...unit.pos } });
}

// The guard's turn: strike a foe near its gatherer, else keep beside the gatherer; with the
// gatherer gone or its trip over, walk home to the tower and rejoin its stock.
export function runGuard(world: World, unit: UnitState, rt: UnitRuntime, stats: Stats): void {
  const t = world.tuning.nodes;
  const g = rt.guard;
  if (!g) return;
  rt.cooldownMs = Math.max(0, rt.cooldownMs - TICK_MS);
  const cls = world.data.classes?.[0];
  const step = ((cls ? speed(cls.attrs) : 80) * t.speedMult * TICK_MS) / 1000;
  const escort = world.units.find((u) => u.id === g.escort && u.kind === 'worker' && u.hp > 0);
  const ert = escort && world.unitRuntime.get(escort.id)?.worker;
  const tower = world.buildings.find((b) => b.id === g.tower);
  const done = !escort || !ert || (ert.node === null && ert.phase === 'idle');
  const walk = (target: { x: number; y: number }, mult = 1) => {
    const to = visitPoint(world, target, unit.pos);
    const dir = stepToward(unit.pos, to, step * mult);
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
  };
  // A foe near the gatherer (or the guard, when it has none to guard).
  let foe: UnitState | null = null;
  let best = Infinity;
  const centre = escort ?? unit;
  for (const o of world.units) {
    if (o.kind !== 'monster' || o.hp <= 0 || o.ko) continue;
    if (dist(centre.pos, o.pos) > t.guardLeash) continue;
    const d = dist(unit.pos, o.pos);
    if (d < best) {
      foe = o;
      best = d;
    }
  }
  unit.target = foe ? foe.id : null;
  if (foe) {
    if (best > stats.weapon.range) {
      rt.swing = undefined;
      walk(foe.pos, 1.2);
    } else {
      swing(world, unit, rt, stats, foe.id, () => {
        landStrike(world, unit, foe, attackStrike(stats, targetOf(world, foe)));
      });
    }
  } else if (done) {
    // Home: to the tower (the town hall when it is gone), then off the books.
    const home = tower?.pos ?? world.buildings.find((b) => b.type === 'townhall')?.pos;
    if (!home || dist(unit.pos, visitPoint(world, home, unit.pos)) <= t.reach) {
      unit.hp = 0;
      world.events.push({ kind: 'guardHome', unit: unit.id });
      world.pendingDeaths = world.pendingDeaths.filter((d) => d.victim !== unit.id);
      return;
    }
    walk(home);
  } else if (escort && dist(unit.pos, escort.pos) > t.guardHeel) {
    walk(escort.pos);
  }
  if (rt.swing && unit.target !== rt.swing.target) rt.swing = undefined;
}
