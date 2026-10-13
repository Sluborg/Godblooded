import {
  dist,
  maxHp,
  scaleAttrs,
  speed,
  stepToward,
  tierValue,
  TICK_MS,
  type Stats,
} from './units';
import { shareXp } from './parties';
import { earn, tally } from './runstats';
import { resolveStrike } from './strike';
import { swing } from './swing';
import type { UnitRuntime, World } from './world';
import type { BuildingCore, CommandResult, LairState, UnitState, Vec2 } from './types';

// The town side of a run, simplified and logged in docs/decisions.md: heroes can destroy
// lairs, raiders march on the town and can destroy buildings, the run is won when the last
// lair falls and lost when the town hall does. Numbers come from GameData.tuning.

// Nearest building to `from` (raiders go for whatever stands closest).
export function nearestBuilding(world: World, from: Vec2): BuildingCore | undefined {
  let best: BuildingCore | undefined;
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
  b: BuildingCore,
): void {
  unit.target = b.id;
  if (!approach(unit, stats, b.pos)) {
    rt.swing = undefined;
    return;
  }
  swing(world, unit, rt, stats, b.id, () => {
    const hit = resolveStrike(world, { attrs: stats.attrs, canDodge: false });
    const dmg = hit.damage;
    b.hp -= dmg;
    world.events.push({
      kind: 'hit',
      attacker: unit.id,
      target: b.id,
      damage: dmg,
      dodged: false,
      ...(hit.crit ? { crit: true } : {}),
    });
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
    const hit = resolveStrike(world, { attrs: stats.attrs, canDodge: false });
    const dmg = hit.damage;
    lair.hp -= dmg;
    tally(world, unit.id, 'damage', dmg);
    world.events.push({
      kind: 'hit',
      attacker: unit.id,
      target: lair.id,
      damage: dmg,
      dodged: false,
      ...(hit.crit ? { crit: true } : {}),
    });
    if (lair.hp > 0) return;
    const tm = world.tuning.monster;
    world.lairs = world.lairs.filter((l) => l.id !== lair.id);
    world.lairRuntime.delete(lair.id);
    world.stats.lairsDestroyed++;
    earn(world, unit, tm.lairBounty);
    tally(world, unit.id, 'lairKills');
    world.lairLog.push({ lair: lair.id, type: lair.type, timeMs: world.timeMs, by: unit.id });
    world.events.push({
      kind: 'lairDestroyed',
      lair: lair.id,
      type: lair.type,
      by: unit.id,
      bounty: tm.lairBounty,
    });
    shareXp(world, unit.id, tm.lairXp);
    // A generated map is won by its boss lair; a fixed one when the last lair falls.
    const won =
      world.bossLair !== null
        ? lair.id === world.bossLair
        : (world.data.lairSites?.length ?? 0) > 0 && world.lairs.length === 0;
    if (won) {
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
      const hp = maxHp(scaleAttrs(mon.attrs, tierValue(world.tuning.lair.statMult, lair.tier, 1)));
      world.units.push({
        id,
        kind: 'monster',
        type: mon.id,
        tier: lair.tier,
        god: null,
        path: null,
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

// Gold the next tier of a building costs; null for the town hall and at the top tier.
export function upgradeCost(world: World, b: BuildingCore): number | null {
  const t = world.tuning.building;
  const def = world.data.buildings.find((d) => d.id === b.type);
  if (!def || b.type === 'townhall' || b.tier >= t.maxTier) return null;
  return (
    def.upgradeCost?.[b.tier - 1] ?? Math.round(def.cost * tierValue(t.upgradeCostMult, b.tier, 1))
  );
}

// The `upgrade` command: pay for the next tier. Hp goes up by the difference, damage stays.
export function upgradeBuilding(world: World, id: number): CommandResult {
  const b = world.buildings.find((x) => x.id === id);
  if (!b) return { ok: false, reason: 'unknown building' };
  if (b.type === 'townhall') return { ok: false, reason: 'cannot upgrade the town hall' };
  const cost = upgradeCost(world, b);
  if (cost === null) return { ok: false, reason: 'already at the top tier' };
  if (world.gold < cost) return { ok: false, reason: 'not enough gold' };
  world.gold -= cost;
  b.tier++;
  const maxHp = Math.round(
    world.tuning.town.buildingHp * tierValue(world.tuning.building.hpMult, b.tier, 1),
  );
  b.hp += maxHp - b.maxHp;
  b.maxHp = maxHp;
  world.events.push({ kind: 'upgraded', building: b.id, type: b.type, tier: b.tier });
  return { ok: true, id: b.id };
}

const TOWER_ATTRS = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };

// Towers shoot the nearest monster in range on their own cooldown, by building tier.
export function runTowers(world: World): void {
  const t = world.tuning.building;
  for (const b of world.buildings) {
    if (b.type !== 'tower') continue;
    const next = world.towerNextMs.get(b.id) ?? 0;
    if (world.timeMs < next) continue;
    const range = tierValue(t.towerRange, b.tier, 0);
    let foe: UnitState | undefined;
    let best = Infinity;
    for (const u of world.units) {
      if (u.kind !== 'monster' || u.hp <= 0) continue;
      const d = dist(b.pos, u.pos);
      if (d <= range && d < best) {
        foe = u;
        best = d;
      }
    }
    if (!foe) continue;
    world.towerNextMs.set(b.id, world.timeMs + tierValue(t.towerCooldownMs, b.tier, 2000));
    // Towers' one sure thing: the tier's flat damage, no dodge, no crit.
    const dmg = resolveStrike(world, {
      attrs: TOWER_ATTRS,
      power: tierValue(t.towerDamage, b.tier, 0),
      canDodge: false,
      canCrit: false,
    }).damage;
    foe.hp -= dmg;
    world.events.push({ kind: 'hit', attacker: b.id, target: foe.id, damage: dmg, dodged: false });
    if (foe.hp <= 0) {
      foe.hp = 0;
      world.pendingDeaths.push({ victim: foe.id, by: b.id });
    }
  }
}
