import {
  dist,
  maxHp,
  scaleAttrs,
  speedOf,
  stepToward,
  tierValue,
  TICK_MS,
  type Stats,
} from './units';
import { dropTill } from './collector';
import { takeDamage } from './effects';
import { shareXp } from './parties';
import { earn, tally } from './runstats';
import { attackStrike, hitEvent, resolveStrike } from './strike';
import { swing } from './swing';
import { lairProtected, lairSealed } from './boss';
import { buildingDamageMult } from './roles';
import { addFavour, partyPantheons } from './favour';
import { grantLairRelic } from './relic';
import { freeNode } from './nodes';
import { targetOf, type UnitRuntime, type World } from './world';
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
    const dir = stepToward(unit.pos, to, (speedOf(stats) * TICK_MS) / 1000);
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
    const hit = resolveStrike(world, { ...attackStrike(stats), vsBuilding: true });
    hit.damage = Math.max(1, Math.round(hit.damage * buildingDamageMult(world, unit)));
    const dmg = hit.damage;
    b.hp -= dmg;
    world.events.push(hitEvent(unit.id, b.id, hit));
    if (b.hp > 0) return;
    dropTill(world, b);
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
    if (lairSealed(world, l.id)) continue;
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
  // A sealed boss lair cannot be attacked.
  if (lairSealed(world, lair.id)) return;
  unit.target = lair.id;
  if (!approach(unit, stats, lair.pos)) {
    rt.swing = undefined;
    return;
  }
  swing(world, unit, rt, stats, lair.id, () => {
    const hit = resolveStrike(world, attackStrike(stats));
    const dmg = hit.damage;
    lair.hp -= dmg;
    tally(world, unit.id, 'damage', dmg);
    world.events.push(hitEvent(unit.id, lair.id, hit));
    // A boss lair cannot fall while its boss lives, or before the boss has come out.
    if (lair.hp <= 0 && lairProtected(world, lair.id)) lair.hp = 1;
    if (lair.hp > 0) return;
    const tm = world.tuning.monster;
    world.lairs = world.lairs.filter((l) => l.id !== lair.id);
    world.lairRuntime.delete(lair.id);
    world.stats.lairsDestroyed++;
    earn(world, unit, tm.lairBounty, true);
    tally(world, unit.id, 'lairKills');
    world.lairLog.push({ lair: lair.id, type: lair.type, timeMs: world.timeMs, by: unit.id });
    world.events.push({
      kind: 'lairDestroyed',
      lair: lair.id,
      type: lair.type,
      by: unit.id,
      bounty: tm.lairBounty,
    });
    freeNode(world, lair);
    shareXp(world, unit.id, tm.lairXp);
    for (const p of partyPantheons(world, unit)) addFavour(world, p, world.tuning.favour.lairGain);
    grantLairRelic(world, unit, lair.id);
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

// Every raidEveryMs a few of the standing lairs (tuning.town.raidLairs, picked at random) send
// some of their monsters to march on the town. The boss lair of a generated map never raids.
// A raid is planned raidWarnMs ahead (a tier 2+ tower adds towerWarnAddMs) and announced with a
// `raidWarning`; a lair that tiers up sends a raid of its own (planTierRaid).
export function runRaids(world: World): void {
  const t = world.tuning.town;
  const tower = world.buildings.some((b) => b.type === 'tower' && b.tier >= 2);
  const lead = t.raidWarnMs + (tower ? t.towerWarnAddMs : 0);
  if (world.raidPlannedFor !== world.nextRaidMs && world.timeMs >= world.nextRaidMs - lead) {
    world.raidPlannedFor = world.nextRaidMs;
    const size = t.raidSize + Math.floor(world.nextRaidMs / t.raidGrowEveryMs);
    const eligible = world.lairs.filter((l) => !l.boss);
    for (let n = 0; n < t.raidLairs && eligible.length > 0; n++) {
      const [lair] = eligible.splice(Math.floor(world.rng() * eligible.length), 1);
      announceRaid(world, lair, world.nextRaidMs, size, tower && t.towerWarnAddMs > 0);
    }
  }
  const due = world.raidPlans.filter((p) => world.timeMs >= p.atMs);
  if (due.length > 0) {
    world.raidPlans = world.raidPlans.filter((p) => world.timeMs < p.atMs);
    for (const plan of due) launchRaid(world, plan);
  }
  if (world.timeMs >= world.nextRaidMs) world.nextRaidMs += t.raidEveryMs;
  // A raid with no raider left alive: the town cheers.
  for (const id of [...world.raidActive]) {
    const alive = world.units.some((u) => u.hp > 0 && world.unitRuntime.get(u.id)?.raidId === id);
    if (alive) continue;
    world.raidActive = world.raidActive.filter((r) => r !== id);
    world.gold += t.raidBeatenGold;
    world.events.push({ kind: 'raidBeaten', raid: id, gold: t.raidBeatenGold });
  }
}

// A lair that just tiered up raids once on its own (the boss lair never does).
export function planTierRaid(world: World, lair: LairState, pressure = false): void {
  const t = world.tuning.town;
  // A pressure tier-up (heroes put down at the lair) does not also send a raid.
  if (!t.raidOnTierUp || lair.boss || pressure) return;
  if (++world.tierUps % Math.max(1, t.tierRaidEvery) !== 0) return;
  const at = world.timeMs + t.raidWarnMs;
  const size =
    t.tierRaidSize > 0 ? t.tierRaidSize : t.raidSize + Math.floor(at / t.raidGrowEveryMs);
  announceRaid(world, lair, at, size, false);
}

function announceRaid(
  world: World,
  lair: LairState,
  atMs: number,
  size: number,
  early: boolean,
): void {
  const id = world.nextId++;
  world.raidPlans.push({ id, atMs, lair: lair.id, size, early });
  const hall = world.data.townHall;
  const d = dist(hall, lair.pos) || 1;
  world.events.push({
    kind: 'raidWarning',
    raid: id,
    lair: lair.id,
    size,
    inMs: Math.max(0, atMs - world.timeMs),
    from: { ...lair.pos },
    dir: { x: (lair.pos.x - hall.x) / d, y: (lair.pos.y - hall.y) / d },
    ...(early ? { early: true } : {}),
  });
}

function launchRaid(world: World, plan: { id: number; lair: number; size: number }): void {
  const lair = world.lairs.find((l) => l.id === plan.lair);
  if (!lair) {
    // The lair fell during the warning: the raid never comes.
    world.events.push({ kind: 'raidCancelled', raid: plan.id, lair: plan.lair });
    return;
  }
  if (plan.size <= 0) return;
  const def = world.data.lairs?.find((l) => l.id === lair.type);
  // A boss lair raids with its escort, never with clones of the boss.
  const mon = world.data.monsters?.find((m) => m.id === (def?.escort ?? def?.monster));
  if (!def || !mon || mon.boss) return;
  // A swarm raid has twice as many, each with half the hp.
  const swarm = mon.role === 'swarm';
  const count = swarm ? Math.round(plan.size * world.tuning.role.swarmRaidMult) : plan.size;
  const hpMult = swarm ? world.tuning.role.swarmRaidHpMult : 1;
  for (let i = 0; i < count; i++) {
    const id = world.nextId++;
    const hp = Math.max(
      1,
      Math.round(
        maxHp(scaleAttrs(mon.attrs, tierValue(world.tuning.lair.statMult, lair.tier, 1))) * hpMult,
      ),
    );
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
      raidId: plan.id,
      cooldownMs: 0,
      target: null,
      idleMs: 0,
    });
  }
  world.raidActive.push(plan.id);
  world.events.push({ kind: 'raid', lair: lair.id, size: plan.size, raid: plan.id });
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
  // Live tax collectors, looked up once per tick (the monsters that attack them are covered too).
  const collectors = world.tuning.collector.enabled
    ? world.units.filter((c) => c.kind === 'collector' && c.hp > 0)
    : [];
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
      // A monster in range, or one that is attacking a tax collector within the tower's range.
      const onCollector =
        d > range &&
        u.target !== null &&
        collectors.some((c) => c.id === u.target && dist(b.pos, c.pos) <= range);
      if ((d <= range || onCollector) && d < best) {
        foe = u;
        best = d;
      }
    }
    if (!foe) continue;
    world.towerNextMs.set(b.id, world.timeMs + tierValue(t.towerCooldownMs, b.tier, 2000));
    // Towers' one sure thing: the tier's flat damage, no dodge, no crit.
    const hit = resolveStrike(world, {
      attrs: TOWER_ATTRS,
      power: tierValue(t.towerDamage, b.tier, 0),
      canDodge: false,
      canCrit: false,
      target: targetOf(world, foe),
    });
    const taken = takeDamage(world, foe, hit.damage);
    hit.damage = taken.dealt;
    foe.hp -= taken.hp;
    world.events.push(hitEvent(b.id, foe.id, hit, taken.dealt - taken.hp));
    if (foe.hp <= 0) {
      foe.hp = 0;
      world.pendingDeaths.push({ victim: foe.id, by: b.id });
    }
  }
}
