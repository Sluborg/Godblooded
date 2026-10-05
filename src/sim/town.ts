import { damage, dist, maxHp, speed, stepToward, TICK_MS, type Stats } from './units';
import { shareXp } from './parties';
import { swing } from './swing';
import type { UnitRuntime, World } from './world';
import type { BuildingState, LairState, UnitState, Vec2 } from './types';

// The town side of a run, simplified and logged in docs/decisions.md: heroes can destroy
// lairs, raiders march on the town and can destroy buildings, the run is won when the last
// lair falls and lost when the town hall does. Numbers come from GameData.tuning.

// Nearest building to `from` (raiders go for whatever stands closest).
export function nearestBuilding(world: World, from: Vec2): BuildingState | undefined {
  let best: BuildingState | undefined;
  let bestD = Infinity;
  for (const b of world.buildings) {
    const d = dist(from, b.pos);
    if (d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

// Walks `unit` into weapon range of `to`; true once close enough to swing.
function approach(unit: UnitState, stats: Stats, to: Vec2): boolean {
  const d = dist(unit.pos, to);
  if (d > stats.weapon.range) {
    const dir = stepToward(unit.pos, to, (speed(stats.attrs) * TICK_MS) / 1000);
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
    return false;
  }
  if (d > 0) unit.facing = { x: (to.x - unit.pos.x) / d, y: (to.y - unit.pos.y) / d };
  return true;
}

// A raider hits a building. Destroyed buildings vanish and free their plot.
export function attackBuilding(
  world: World,
  unit: UnitState,
  rt: UnitRuntime,
  stats: Stats,
  b: BuildingState,
): void {
  unit.target = b.id;
  if (!approach(unit, stats, b.pos)) {
    rt.swing = undefined;
    return;
  }
  swing(world, unit, rt, stats, b.id, () => {
    const dmg = damage(stats.attrs);
    b.hp -= dmg;
    world.events.push({ kind: 'hit', attacker: unit.id, target: b.id, damage: dmg, dodged: false });
    if (b.hp > 0) return;
    world.buildings = world.buildings.filter((x) => x.id !== b.id);
    world.stats.buildingsLost++;
    world.events.push({ kind: 'buildingDestroyed', building: b.id, type: b.type });
    if (b.type === 'townhall') {
      world.status = 'lost';
      world.events.push({ kind: 'lost' });
    }
  });
}

// Nearest lair a hero would storm (inside the lair aggro range).
export function pickLair(world: World, unit: UnitState): LairState | null {
  let best: LairState | null = null;
  let bestD = world.tuning.monster.lairAggro;
  for (const l of world.lairs) {
    const d = dist(unit.pos, l.pos);
    if (d <= bestD) {
      best = l;
      bestD = d;
    }
  }
  return best;
}

// A hero hits a lair. A destroyed lair pays the hero and shares xp with the party; the run is
// won when the last lair falls.
export function attackLair(
  world: World,
  unit: UnitState,
  rt: UnitRuntime,
  stats: Stats,
  lair: LairState,
): void {
  unit.target = lair.id;
  if (!approach(unit, stats, lair.pos)) {
    rt.swing = undefined;
    return;
  }
  swing(world, unit, rt, stats, lair.id, () => {
    const dmg = damage(stats.attrs);
    lair.hp -= dmg;
    world.events.push({
      kind: 'hit',
      attacker: unit.id,
      target: lair.id,
      damage: dmg,
      dodged: false,
    });
    if (lair.hp > 0) return;
    const tm = world.tuning.monster;
    world.lairs = world.lairs.filter((l) => l.id !== lair.id);
    world.lairRuntime.delete(lair.id);
    world.stats.lairsDestroyed++;
    unit.gold += tm.lairBounty;
    world.events.push({
      kind: 'lairDestroyed',
      lair: lair.id,
      type: lair.type,
      by: unit.id,
      bounty: tm.lairBounty,
    });
    shareXp(world, unit.id, tm.lairXp);
    if ((world.data.lairSites?.length ?? 0) > 0 && world.lairs.length === 0) {
      world.status = 'won';
      world.events.push({ kind: 'won' });
    }
  });
}

// Every raidEveryMs each lair sends a few of its monsters to march on the town.
export function runRaids(world: World): void {
  const t = world.tuning.town;
  if (world.timeMs < world.nextRaidMs) return;
  world.nextRaidMs += t.raidEveryMs;
  const size = t.raidSize + Math.floor(world.timeMs / t.raidGrowEveryMs);
  for (const lair of world.lairs) {
    const def = world.data.lairs?.find((l) => l.id === lair.type);
    const mon = world.data.monsters?.find((m) => m.id === def?.monster);
    if (!def || !mon) continue;
    for (let i = 0; i < size; i++) {
      const id = world.nextId++;
      const hp = maxHp(mon.attrs);
      world.units.push({
        id,
        kind: 'monster',
        type: mon.id,
        tier: lair.tier,
        pos: { x: lair.pos.x + i * 8, y: lair.pos.y },
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
      });
      world.unitRuntime.set(id, {
        lair: lair.id,
        raid: true,
        cooldownMs: 0,
        target: null,
        idleMs: 0,
      });
    }
    world.events.push({ kind: 'raid', lair: lair.id, size });
  }
}
