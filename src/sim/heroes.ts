import { visitPoint } from './collision';
import { omenBounty, omenMods } from './omens';
import { payIntoTill, payTithe } from './collector';
import { hearthBuff, hearthOf, partyHurt } from './hearth';
import { escortHeldBy, escortOpenTo } from './escort';
import { bossLair, lairSealed, nearSealedLair } from './boss';
import { earn, newRecord } from './runstats';
import { baseFleeOf, fledParty, fleeThreshold, newParty, pantheonOf, TRAITS } from './parties';
import { slowOf } from './riders';
import { revengeTarget } from './rivalry';
import { emptyItems } from './items';
import { buyItem, hasItemRows, nearestShop, planShopping, type ShopStop } from './shopping';
import { clearBossStatuses, curePoison, isBound } from './effects';
import {
  hasLoyalStays,
  passiveFlagMult,
  passiveGoldMult,
  passiveKoMult,
  passiveRestMult,
  passiveReviveHp,
} from './passives';
import { koTimeMult } from './quirks';
import { dist, maxHp, speed, stepToward, tierValue, TICK_MS } from './units';
import type { World } from './world';
import type { BountyState, LairState, PartyIntent, Vec2, UnitState } from './types';

// Graybox hero life, simplified and logged in docs/decisions.md: temples recruit on a timer,
// heroes explore and hunt, flee when hurt, rest at the town hall or a shrine, shop at the
// market (the town taxes what they spend). Numbers come from GameData.tuning.hero.

export interface HeroRuntime {
  dest: Vec2 | null;
  // Max hp a Hearth Hall tier 3 added until the hero next rests (hearth.ts).
  hearthHp?: number;
  // Tithe set aside from bounties, paid into the home temple's till when the hero starts to rest.
  titheOwed?: number;
  // The bounty flag this hero is heading for.
  bounty?: number;
  // The flags its party already weighed against its goal (event `considering`): said once each.
  considered?: number[];
  // What a leader (or a hero alone) chose to do while exploring: kept for commitMs, replaced only
  // by something that scores clearly better (docs/systems/hero-ai.md section 3).
  goal?: { kind: 'flag' | 'lair' | 'explore'; id?: number; score: number; sinceMs: number };
  koMs: number;
  temple: number;
  // Sworn revenge: the monster to hunt and when the oath runs out.
  revenge?: { target: number; untilMs: number };
  // Shopping with item rows: the stops still to make (see shopping.ts).
  shop?: ShopStop[];
}

const tune = (world: World) => world.tuning.hero;
const isTemple = (type: string) => type.startsWith('temple');

// Puts a child of god `godId` on the map at `pos`. Used by temples and by tests. An id that is
// no god but a template (ClassDef) id spawns a hero of that template with no god (dev, tests).
export function spawnHero(world: World, godId: string, pos: Vec2, temple = 0): number {
  const god = world.data.gods?.find((g) => g.id === godId);
  const cls = world.data.classes?.find((c) => c.id === (god ? god.template : godId));
  if (!cls) throw new Error(`unknown god or template: ${godId}`);
  const id = world.nextId++;
  const hp = maxHp(cls.attrs);
  // A god with two builds: one of them, 50/50 from the run's seed, kept for life.
  const build = god?.builds ? god.builds[world.rng() < 0.5 ? 0 : 1] : undefined;
  world.units.push({
    id,
    kind: 'hero',
    type: cls.id,
    tier: 1,
    god: god?.id ?? null,
    path: null,
    ...(build ? { build } : {}),
    pos: { ...pos },
    facing: { x: 0, y: 1 },
    hp,
    maxHp: hp,
    target: null,
    ko: false,
    mode: 'explore',
    party: 0,
    trait: TRAITS[Math.floor(world.rng() * TRAITS.length)],
    gold: cls.startGold,
    items: emptyItems(),
    bounty: null,
  });
  world.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  world.heroRuntime.set(id, { dest: null, koMs: 0, temple });
  world.heroRecords.set(id, newRecord());
  const hero = world.units[world.units.length - 1];
  hero.party = newParty(world, id);
  world.stats.heroesArrived++;
  world.events.push({ kind: 'arrived', unit: id, type: cls.id, god: god?.id ?? null });
  return id;
}

// Temples call a child of a god of their pantheon now and then, up to a few alive per temple.
export function runTemples(world: World): void {
  const gods = world.data.gods ?? [];
  if (gods.length === 0) return;
  for (const b of world.buildings) {
    if (!isTemple(b.type)) continue;
    const next = world.templeNextMs.get(b.id) ?? world.timeMs + tune(world).firstRecruitMs;
    world.templeNextMs.set(b.id, next);
    if (world.timeMs < next) continue;
    const bt = world.tuning.building;
    world.templeNextMs.set(
      b.id,
      world.timeMs + tune(world).recruitMs * tierValue(bt.templeRecruitMult, b.tier, 1),
    );
    let alive = 0;
    for (const rt of world.heroRuntime.values()) if (rt.temple === b.id) alive++;
    if (alive >= tune(world).maxPerTemple + tierValue(bt.templeCapAdd, b.tier, 0)) continue;
    // Gods of the temple's pantheon already at the cap are skipped; with none left, nobody
    // comes this cycle. A temple with no pantheon calls any god.
    const pantheon = pantheonOf(world, b.type);
    const open = gods.filter(
      (g) =>
        (pantheon === undefined || g.pantheon === pantheon) &&
        world.units.filter((u) => u.kind === 'hero' && u.god === g.id).length <
          tune(world).maxPerGod,
    );
    if (open.length === 0) continue;
    const god = open[Math.floor(world.rng() * open.length)];
    spawnHero(world, god.id, b.pos, b.id);
  }
}

// Before units act: flee when hurt, count down knockouts.
export function runHeroes(world: World): void {
  retreatParties(world);
  for (const unit of world.units) {
    const rt = world.heroRuntime.get(unit.id);
    if (unit.kind !== 'hero' || !rt) continue;
    // A hero that is no longer out exploring has no goal: it must not flash an old lair or flag
    // when it walks out again.
    if (unit.mode !== 'explore' && rt.goal) {
      rt.goal = undefined;
      rt.bounty = undefined;
      rt.considered = undefined;
    }
    if (unit.ko) {
      rt.koMs -= TICK_MS;
      if (rt.koMs <= 0) revive(world, unit, rt);
    } else if (
      unit.mode === 'explore' &&
      unit.hp < unit.maxHp * fleeThreshold(world, unit) &&
      !drinksInsteadOfFleeing(world, unit) &&
      !loyalStays(world, unit)
    ) {
      unit.mode = 'return';
      unit.target = null;
      rt.dest = null;
      fledParty(world, unit);
      world.events.push({ kind: 'fled', unit: unit.id });
    } else if (unit.mode === 'rest' || unit.mode === 'shop') {
      defend(world, unit, rt);
    } else if (unit.mode === 'explore') {
      shopTrip(world, unit, rt);
    }
  }
}

// Party retreat: when half of the members in combat (rounded up) are below the party's retreat
// line, everyone falls back together (a proud hero stays until its own line). No bond is lost.
// The retreat line sits retreatMargin above the solo flee line, so the party goes before the
// first hurt hero would have run off alone.
function retreatParties(world: World): void {
  for (const party of world.parties.values()) {
    const fighting = party.members
      .map((id) => world.units.find((u) => u.id === id))
      .filter(
        (u): u is UnitState =>
          !!u &&
          !u.ko &&
          u.mode === 'explore' &&
          u.target !== null &&
          world.units.some((m) => m.id === u.target && m.kind === 'monster' && m.hp > 0),
      );
    if (fighting.length < world.tuning.party.retreatMinFighting) continue;
    const margin = world.tuning.party.retreatMargin;
    const hurt = fighting.filter((u) => u.hp < u.maxHp * (baseFleeOf(world, u) + margin)).length;
    if (hurt < Math.ceil(fighting.length * world.tuning.party.retreatShare)) continue;
    const going: number[] = [];
    for (const u of fighting) {
      if (u.trait === 'proud' && u.hp >= u.maxHp * world.tuning.party.proudRetreatAt) continue;
      if (drinksInsteadOfFleeing(world, u)) continue;
      const rt = world.heroRuntime.get(u.id);
      if (!rt) continue;
      u.mode = 'return';
      u.target = null;
      rt.dest = null;
      going.push(u.id);
    }
    if (going.length > 0) {
      world.events.push({ kind: 'partyRetreat', party: party.id, units: going });
    }
  }
}

// Oath-Brothers: a loyal hero stays in the fight while any living party mate stands, wherever it is.
function loyalStays(world: World, unit: UnitState): boolean {
  if (unit.trait !== 'loyal' || !hasLoyalStays(world, unit)) return false;
  return (world.parties.get(unit.party)?.members ?? []).some((id) => {
    const m = id === unit.id ? undefined : world.units.find((u) => u.id === id);
    return !!m && !m.ko && m.hp > 0;
  });
}

// A hero in a fight with a potion (or already drinking one) drinks rather than runs: the drink
// starts in the units step, even when one hit took it from above the drink threshold to below
// the flee threshold. Only a hero without a potion flees.
// "In a fight" means the hero's last target is a living monster (set by the last tick): a hero
// walking to a lair or tending a mate still flees, with its potions unused.
function drinksInsteadOfFleeing(world: World, unit: UnitState): boolean {
  if (world.unitRuntime.get(unit.id)?.drink) return true;
  if (!unit.items || unit.items.potions <= 0 || unit.target === null) return false;
  return world.units.some((u) => u.id === unit.target && u.kind === 'monster' && !u.ko);
}

// A rested hero with gold goes shopping. With item rows it first plans its buys and walks to
// the shops that hold them; without, it spends a share at the market.
function wantsToShop(world: World, unit: UnitState, rt: HeroRuntime): boolean {
  rt.shop = undefined;
  if (unit.gold < tune(world).shopMinGold) return false;
  if (!hasItemRows(world)) return !!findMarket(world, unit.pos);
  const plan = planShopping(world, unit);
  if (plan.length === 0) return false;
  rt.shop = plan;
  return true;
}

// An exploring hero with enough gold and no fight on walks to the shops (tuning.hero.shopTripGold)
// instead of waiting to be hurt enough to rest. Every 20 ticks per hero. Only a party's leader
// (or a hero alone) goes, and not while heading for a flag or a lair; the party goes with it.
function shopTrip(world: World, unit: UnitState, rt: HeroRuntime): void {
  const t = tune(world);
  if (t.shopTripGold < 0 || unit.target !== null || unit.gold < t.shopMinGold) return;
  if (!hasItemRows(world) || (world.timeMs / TICK_MS + unit.id) % 20 !== 0) return;
  const lead = leaderOf(world, unit);
  if (lead && lead.id !== unit.id) return;
  if (rt.goal?.kind === 'flag' || rt.goal?.kind === 'lair') return;
  if (t.shopTripGold > 0 && unit.gold < t.shopTripGold) return;
  const plan = planShopping(world, unit);
  if (plan.length === 0) return;
  if (t.shopTripGold === 0 && !plan.some((s) => s.shop === 'smithy')) return;
  rt.shop = plan;
  unit.mode = 'shop';
  rt.dest = null;
}

// Walks to the next planned shop, buys there, and moves on; done when the plan is.
function visitShops(
  world: World,
  unit: UnitState,
  rt: HeroRuntime,
  step: (to: Vec2) => boolean,
): void {
  const stop = rt.shop?.[0];
  const shop = stop && nearestShop(world, stop.shop, unit.pos);
  if (!stop || !shop) {
    // The shop is gone (or the plan is): skip the stop.
    rt.shop = rt.shop?.slice(1);
    if (!rt.shop?.length) finishShopping(unit, rt);
    return;
  }
  if (!step(shop.pos)) return;
  const bt = world.tuning.building;
  for (const id of stop.items) {
    const price = buyItem(world, unit, id, shop.tier);
    if (price === 0) continue;
    const tax = Math.floor(price * tune(world).taxRate * tierValue(bt.shopTaxMult, shop.tier, 1));
    payIntoTill(world, shop.id, tax);
    world.events.push({ kind: 'shopped', unit: unit.id, spent: price, tax, item: id });
  }
  rt.shop = rt.shop?.slice(1);
  if (!rt.shop?.length) finishShopping(unit, rt);
}

function finishShopping(unit: UnitState, rt: HeroRuntime): void {
  rt.shop = undefined;
  unit.mode = 'explore';
  rt.dest = null;
}

// A rested enough hero rejoins the fight when a monster comes within defendRange of the town hall,
// or within defendBuildingRange of any building (a raider stands at the plot it attacks).
function defend(world: World, unit: UnitState, rt: HeroRuntime): void {
  if (unit.hp < unit.maxHp * world.tuning.town.defendHp) return;
  const { defendRange, defendBuildingRange } = world.tuning.town;
  const hall = world.data.townHall;
  const threatened = world.units.some(
    (m) =>
      m.kind === 'monster' &&
      m.hp > 0 &&
      (dist(hall, m.pos) <= defendRange ||
        world.buildings.some((b) => dist(b.pos, m.pos) <= defendBuildingRange)),
  );
  if (!threatened) return;
  unit.mode = 'explore';
  rt.dest = null;
  world.events.push({ kind: 'defend', unit: unit.id });
}

// Pays what the hero set aside from its bounties (collector.ts).
function payOwedTithe(world: World, unit: UnitState, rt: HeroRuntime): void {
  const owed = rt.titheOwed ?? 0;
  if (owed <= 0) return;
  rt.titheOwed = 0;
  payTithe(world, unit, owed);
}

function revive(world: World, unit: UnitState, rt: HeroRuntime): void {
  unit.ko = false;
  unit.hp = Math.ceil(unit.maxHp * Math.max(tune(world).reviveHp, passiveReviveHp(world, unit)));
  unit.pos = { ...world.data.townHall };
  unit.mode = 'rest';
  payOwedTithe(world, unit, rt);
  rt.dest = null;
  world.events.push({ kind: 'revived', unit: unit.id });
}

export function heroKnockedOut(world: World, unit: UnitState, by?: number): void {
  const rt = world.heroRuntime.get(unit.id);
  if (!rt) return;
  unit.mode = 'ko';
  clearBossStatuses(world, unit.id);
  rt.koMs =
    tune(world).koMs * passiveKoMult(world, unit) * (by === undefined ? 1 : koTimeMult(world, by));
  rt.dest = null;
}

export function payBounty(world: World, killer: number, gold: number): void {
  const hero = world.units.find((u) => u.id === killer && u.kind === 'hero');
  if (hero) earn(world, hero, gold, true);
}

// Moves a hero that is not fighting: explore, walk home, rest, shop.
export function heroMove(world: World, unit: UnitState): void {
  const rt = world.heroRuntime.get(unit.id);
  const cls = world.data.classes?.find((c) => c.id === unit.type);
  if (!rt || !cls) return;
  const step = (target: Vec2): boolean => {
    // A building is visited at its edge, not in its middle.
    const to = visitPoint(world, target, unit.pos);
    const dir = stepToward(
      unit.pos,
      to,
      (speed(cls.attrs) *
        (1 - slowOf(world, unit.id)) *
        (isBound(world, unit.id) ? 0 : 1) *
        (omenMods(world).moveSpeed ?? 1) *
        TICK_MS) /
        1000,
    );
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
    // At a building's edge it is there when it touches it, not 50 units short.
    return (
      dist(unit.pos, to) <=
      (to === target ? tune(world).arrive : world.tuning.collision.visitMargin * 2)
    );
  };
  switch (unit.mode) {
    case 'explore': {
      const avenger = revengeTarget(world, unit);
      if (avenger) {
        // An oath comes before the party and the flags.
        rt.dest = avenger.pos;
        step(rt.dest);
        break;
      }
      // A loyal hero stands over a knocked out party mate and fights what comes near.
      const fallen =
        unit.trait === 'loyal'
          ? world.parties
              .get(unit.party)
              ?.members.map((id) => world.units.find((u) => u.id === id))
              .find((m) => m && m.id !== unit.id && m.ko)
          : undefined;
      if (fallen) {
        if (dist(unit.pos, fallen.pos) > world.tuning.trait.loyalGuardRange) {
          rt.dest = fallen.pos;
          step(rt.dest);
        }
        break;
      }
      const lead = leaderOf(world, unit);
      const flag =
        rt.bounty === undefined ? undefined : world.bounties.find((b) => b.id === rt.bounty);
      if (lead) {
        // Followers go where their leader goes.
        rt.dest = world.heroRuntime.get(lead.id)?.dest ?? lead.pos;
      } else if (flag) {
        rt.dest = flag.pos;
      } else if (!rt.dest || dist(unit.pos, rt.dest) <= tune(world).arrive) {
        rt.dest = exploreDest(world);
      }
      step(rt.dest);
      break;
    }
    case 'return': {
      const spot = restSpot(world, unit.pos, unit);
      if (step(spot.pos)) {
        unit.mode = 'rest';
        payOwedTithe(world, unit, rt);
        hearthBuff(world, unit, rt, spot.hearth);
      }
      break;
    }
    case 'rest': {
      const spot = restSpot(world, unit.pos, unit);
      const rate =
        tune(world).restPerS *
        (spot.shrine ? tune(world).shrineMult : 1) *
        (spot.hearth ? world.tuning.building.hallRestMult : 1) *
        passiveRestMult(world, unit);
      curePoison(world, unit.id);
      unit.hp = Math.min(unit.maxHp, unit.hp + (unit.maxHp * rate * TICK_MS) / 1000);
      if (unit.hp >= unit.maxHp) {
        unit.mode = wantsToShop(world, unit, rt) ? 'shop' : 'explore';
      }
      break;
    }
    case 'shop': {
      if (rt.shop) {
        visitShops(world, unit, rt, step);
        break;
      }
      const market = findMarket(world, unit.pos);
      if (!market) {
        unit.mode = 'explore';
        break;
      }
      if (step(market.pos)) {
        const bt = world.tuning.building;
        const spent = Math.min(
          Math.floor(unit.gold * tune(world).spendShare),
          tierValue(bt.marketStock, market.tier, Infinity),
        );
        const tax = Math.floor(
          spent * tune(world).taxRate * tierValue(bt.marketTaxMult, market.tier, 1),
        );
        unit.gold -= spent;
        payIntoTill(world, market.id, tax);
        world.events.push({ kind: 'shopped', unit: unit.id, spent, tax });
        unit.mode = 'explore';
        rt.dest = null;
      }
      break;
    }
  }
}

// The party leader: the first member out exploring (the same one syncIntent shows), when it is
// someone else.
function leaderOf(world: World, unit: UnitState): UnitState | undefined {
  const party = world.parties.get(unit.party);
  for (const id of party?.members ?? []) {
    const m = world.units.find((u) => u.id === id);
    if (m && !m.ko && m.mode === 'explore') return m.id === unit.id ? undefined : m;
  }
  return undefined;
}

// Mostly toward a lair (that is where the monsters are), sometimes anywhere.
function exploreDest(world: World): Vec2 {
  const { width, height } = world.data.map;
  const sites = world.lairs;
  let x: number;
  let y: number;
  if (sites.length > 0 && world.rng() < tune(world).lairSearchShare) {
    const lair = sites[Math.floor(world.rng() * sites.length)];
    const a = world.rng() * Math.PI * 2;
    const r = Math.sqrt(world.rng()) * tune(world).lairSearchRadius;
    x = lair.pos.x + Math.cos(a) * r;
    y = lair.pos.y + Math.sin(a) * r;
  } else {
    x = world.rng() * width;
    y = world.rng() * height;
  }
  return { x: Math.min(width, Math.max(0, x)), y: Math.min(height, Math.max(0, y)) };
}

function nearest<T extends { pos: Vec2 }>(from: Vec2, list: readonly T[]): T | undefined {
  let best: T | undefined;
  let bestD = Infinity;
  for (const item of list) {
    const d = dist(from, item.pos);
    if (d < bestD) {
      best = item;
      bestD = d;
    }
  }
  return best;
}

function findMarket(world: World, from: Vec2) {
  return nearest(
    from,
    world.buildings.filter((b) => b.type === 'market'),
  );
}

function restSpot(
  world: World,
  from: Vec2,
  unit?: UnitState,
): { pos: Vec2; shrine: boolean; hearth: boolean } {
  const shrine = nearest(
    from,
    world.buildings.filter((b) => b.type === 'shrine'),
  );
  const hearth = hearthOf(world, from);
  // With both, the closer one; a party below half its hp takes the shrine (hearth.ts).
  if (shrine && hearth && !(unit && partyHurt(world, unit))) {
    if (dist(from, hearth.pos) < dist(from, shrine.pos)) {
      return { pos: hearth.pos, shrine: false, hearth: true };
    }
  } else if (hearth && !shrine) {
    return { pos: hearth.pos, shrine: false, hearth: true };
  }
  if (shrine) return { pos: shrine.pos, shrine: true, hearth: false };
  return { pos: world.data.townHall, shrine: false, hearth: false };
}

// Danger around a flag: monsters nearby, plus a lair standing close.
// A hunt flag's own target is what the hero is paid to kill, not danger: only others count.
function flagDanger(world: World, pos: Vec2, except?: number): number {
  const t = world.tuning.bounty;
  let danger = 0;
  for (const u of world.units) {
    if (u.id === except) continue;
    if (u.kind === 'monster' && u.hp > 0 && dist(u.pos, pos) <= t.dangerRadius) danger++;
  }
  if (world.lairs.some((l) => dist(l.pos, pos) <= t.dangerRadius * 0.6)) danger += t.lairDanger;
  return danger;
}

// The gold side of an option for this hero: trait multipliers on gold and on fear.
const goldMult = (world: World, unit: UnitState) => {
  const t = world.tuning.bounty;
  return unit.trait === 'greedy'
    ? t.greedyGoldMult
    : unit.trait === 'curious'
      ? t.curiousGoldMult
      : 1;
};
const fearMult = (world: World, unit: UnitState) => {
  const t = world.tuning.bounty;
  return unit.trait === 'brave' ? t.braveFearMult : unit.trait === 'coward' ? t.cowardFearMult : 1;
};

// Score of a flag for this hero (null: not worth it): gold against danger and distance.
function flagScore(world: World, unit: UnitState, flag: BountyState): number | null {
  const t = world.tuning.bounty;
  if (!escortOpenTo(world, unit, flag)) return null;
  if (unit.trait === 'proud' && flag.gold < t.proudMinGold) return null;
  const walk = t.flagDistanceCost >= 0 ? t.flagDistanceCost : world.tuning.ai.distanceCost;
  const score =
    flag.gold * goldMult(world, unit) * passiveFlagMult(world, unit) +
    t.flagBonus -
    flagDanger(world, flag.pos, flag.target) * t.costPerDanger * fearMult(world, unit) -
    dist(unit.pos, flag.pos) * walk;
  return score > 0 ? score : null;
}

// Score of storming a lair: its gold and half its xp against the danger around it and the walk.
function lairScore(world: World, unit: UnitState, lair: LairState): number | null {
  const t = world.tuning.bounty;
  const tm = world.tuning.monster;
  let monsters = 0;
  for (const u of world.units) {
    if (u.kind === 'monster' && u.hp > 0 && dist(u.pos, lair.pos) <= t.dangerRadius) monsters++;
  }
  const reward = tierValue(world.tuning.lair.rewardMult, lair.tier, 1);
  const score =
    tm.lairBounty * reward +
    tm.lairXp * world.tuning.ai.lairXpWeight -
    (t.lairDanger + monsters) * t.costPerDanger * fearMult(world, unit) -
    dist(unit.pos, lair.pos) * world.tuning.ai.distanceCost;
  const call = bossCall(world, unit, lair);
  const total = call ? Math.max(score + call.bonus, call.floor ?? 0) : score;
  return total > 0 ? total : null;
}

// The boss call (hero-ai.md 5c): from the unsealing the boss lair scores as if a flag stood on it,
// and with no normal lair left, a healthy party's score for it is at least explore + switchMin.
function bossCall(
  world: World,
  unit: UnitState,
  lair: LairState,
): { bonus: number; floor?: number } | undefined {
  const ai = world.tuning.ai;
  if (!world.bossUnsealed || ai.bossCallBonus <= 0 || bossLair(world)?.id !== lair.id) {
    return undefined;
  }
  const normalStands = world.lairs.some((l) => l.id !== lair.id);
  const members =
    unit.party !== 0 ? (world.parties.get(unit.party)?.members ?? [unit.id]) : [unit.id];
  const healthy = members.every((id) => {
    const m = world.units.find((u) => u.id === id);
    return !m || (!m.ko && m.hp > m.maxHp * ai.bossCallHp);
  });
  return {
    bonus: ai.bossCallBonus,
    ...(!normalStands && healthy ? { floor: ai.exploreValue + ai.switchMin } : {}),
  };
}

// Hunt flags follow their monster; flags on open ground are claimed by a hero standing on one once
// no monster is near it. Once a second exploring party leaders pick the flag they like best.
export function runBounties(world: World): void {
  const t = world.tuning.bounty;
  for (const flag of [...world.bounties]) {
    // An escort bounty follows its gatherer and is paid when the jar is home (escort.ts).
    if (flag.escort !== undefined) continue;
    if (flag.target !== undefined) {
      const prey = world.units.find(
        (u) => u.id === flag.target && u.kind === 'monster' && u.hp > 0,
      );
      if (prey) flag.pos = { ...prey.pos };
      else releaseFlag(flag);
      continue;
    }
    const hero = world.units.find(
      (u) => u.kind === 'hero' && !u.ko && dist(u.pos, flag.pos) <= t.claimRadius,
    );
    if (!hero || monsterNear(world, flag.pos, t.claimClearRadius) || lairNear(world, flag.pos))
      continue;
    earn(world, hero, Math.round(omenBounty(world, flag.gold) * passiveGoldMult(world, hero)));
    world.bounties = world.bounties.filter((b) => b.id !== flag.id);
    world.events.push({ kind: 'bountyClaimed', bounty: flag.id, unit: hero.id, gold: flag.gold });
  }
  if (world.tick % 20 === 0) chooseGoals(world);
}

// A lair standing close to a flag keeps it from being claimed (as in flagDanger).
const lairNear = (world: World, pos: Vec2): boolean =>
  world.lairs.some((l) => dist(l.pos, pos) <= world.tuning.bounty.dangerRadius * 0.6);

const monsterNear = (world: World, pos: Vec2, r: number): boolean =>
  world.units.some((u) => u.kind === 'monster' && u.hp > 0 && dist(u.pos, pos) <= r);

// A hunt flag whose monster died to something that is no hero (a tower, a miracle) or vanished
// drops where it fell and becomes a flag on open ground: same gold, no refund.
function releaseFlag(flag: BountyState): void {
  delete flag.target;
}

// A monster died: a hunt flag on it is paid to the hero that landed the kill (a summon's kill
// pays its owner, a miracle's kill the hero it is credited to). A kill with no hero credited (a
// tower) pays nobody: the flag stays on the ground.
export function claimHunt(world: World, victim: number, by: number): void {
  const killer = world.units.find((u) => u.id === by);
  const heroId = killer?.kind === 'summon' ? killer.summon?.owner : by;
  const hero = world.units.find((u) => u.id === heroId && u.kind === 'hero');
  for (const flag of world.bounties.filter((b) => b.target === victim)) {
    if (!hero) {
      releaseFlag(flag);
      continue;
    }
    earn(world, hero, Math.round(omenBounty(world, flag.gold) * passiveGoldMult(world, hero)));
    world.bounties = world.bounties.filter((b) => b.id !== flag.id);
    world.events.push({
      kind: 'bountyClaimed',
      bounty: flag.id,
      unit: hero.id,
      gold: flag.gold,
      hunt: true,
    });
  }
}

// A new flag: every exploring leader weighs it this tick.
export function rescoreForFlag(world: World): void {
  chooseGoals(world);
}

// What the snapshot shows: the live flag each exploring hero is heading for. Called when a
// snapshot is built, after every change of the tick (knockouts, party merges) has landed.
export function syncFlagView(world: World): void {
  for (const unit of world.units) {
    if (unit.kind !== 'hero') continue;
    const lead = unit.mode === 'explore' && !unit.ko ? leaderOf(world, unit) : undefined;
    const id = world.heroRuntime.get((lead ?? unit).id)?.bounty;
    const live = unit.mode === 'explore' && !unit.ko && world.bounties.some((b) => b.id === id);
    unit.bounty = live && id !== undefined ? id : null;
  }
}

// Once a second every exploring party leader (or lone hero) scores its options and keeps the
// best, holding a choice for commitMs and switching only for a clearly better one.
function chooseGoals(world: World): void {
  const ai = world.tuning.ai;
  for (const unit of world.units) {
    const rt = world.heroRuntime.get(unit.id);
    if (unit.kind !== 'hero' || !rt || unit.ko || unit.mode !== 'explore') continue;
    if (leaderOf(world, unit)) continue;
    // What the current goal is worth now (null: it is gone).
    const cur = rt.goal;
    let curScore: number | null = null;
    if (cur?.kind === 'flag') {
      const flag = world.bounties.find((b) => b.id === cur.id);
      curScore = flag ? flagScore(world, unit, flag) : null;
      // A party that took an escort walks with the gatherer until it is home.
      if (flag && escortHeldBy(world, unit, flag)) curScore = 1e6;
    } else if (cur?.kind === 'lair') {
      const lair = world.lairs.find((l) => l.id === cur.id);
      curScore = lair ? lairScore(world, unit, lair) : null;
    } else if (cur?.kind === 'explore') {
      curScore = Math.max(
        1,
        ai.exploreValue - (rt.dest ? dist(unit.pos, rt.dest) * ai.exploreDistanceCost : 0),
      );
    }
    // A lair goal stays while the party walks to that lair, and while it is at the lair (within
    // lairAggro of it) with a foe in reach (mid-fight), whatever the guards now do to its score;
    // a party at its lair with no foe near re-scores like an explorer. An explore goal holds
    // nothing and any better option pre-empts it; every other goal holds for commitMs.
    const exploring = cur?.kind === 'explore';
    const goalLair = cur?.kind === 'lair' ? world.lairs.find((l) => l.id === cur.id) : undefined;
    const midFight = partyMidFight(world, unit, ai.stickyFoeRange);
    const atLair = !!goalLair && dist(unit.pos, goalLair.pos) <= world.tuning.monster.lairAggro;
    const walkingToLair = !!goalLair && rt.dest !== null && dist(rt.dest, goalLair.pos) <= 1;
    if (goalLair && ((atLair && midFight) || (walkingToLair && !atLair))) {
      curScore = Math.max(curScore ?? 0, ai.exploreValue + ai.switchMin);
    }
    const isFresh = (b: BountyState): boolean =>
      b.placedMs !== undefined && world.timeMs - b.placedMs < world.tuning.bounty.freshFlagMs;
    // A flag placed or raised in the last freshFlagMs (other than the goal) may break the
    // commitment: the party scores everything and switches only if it beats the goal by the
    // margin.
    // A party mid-fight is never pulled away for a flag (it finishes the fight first).
    const freshFlag =
      !midFight &&
      world.bounties.some((b) => isFresh(b) && !(cur?.kind === 'flag' && cur.id === b.id));
    if (
      cur &&
      curScore !== null &&
      !exploring &&
      !freshFlag &&
      world.timeMs - cur.sinceMs < ai.commitMs
    ) {
      cur.score = curScore;
      considerFlags(world, unit, rt, curScore);
      continue;
    }
    // The best option now; explore is always there (score at least 1).
    let best: NonNullable<HeroRuntime['goal']> = {
      kind: 'explore',
      score: Math.max(1, ai.exploreValue),
      sinceMs: world.timeMs,
    };
    for (const flag of world.bounties) {
      // A flag next to a sealed boss lair waits: nobody can claim it yet.
      if (nearSealedLair(world, flag.pos, world.tuning.bounty.dangerRadius)) continue;
      if (midFight && isFresh(flag)) continue;
      const score = flagScore(world, unit, flag);
      if (score !== null && score > best.score) {
        best = { kind: 'flag', id: flag.id, score, sinceMs: world.timeMs };
      }
    }
    for (const lair of world.lairs) {
      // A sealed boss lair cannot be attacked yet.
      if (lairSealed(world, lair.id)) continue;
      const score = lairScore(world, unit, lair);
      if (score !== null && score > best.score) {
        best = { kind: 'lair', id: lair.id, score, sinceMs: world.timeMs };
      }
    }
    // Keep the current goal unless the best beats it by the margin.
    if (cur && curScore !== null) {
      const margin = Math.max(ai.switchMin, ai.switchMargin * Math.abs(curScore));
      // The hold started when the goal was chosen; keeping it does not restart the clock.
      if (best.kind === cur.kind && best.id === cur.id) {
        cur.score = curScore;
        considerFlags(world, unit, rt, curScore);
        continue;
      }
      if (!exploring && best.score < curScore + margin) {
        cur.score = curScore;
        considerFlags(world, unit, rt, curScore);
        continue;
      }
    }
    rt.goal = best;
    rt.bounty = best.kind === 'flag' ? best.id : undefined;
    if (best.kind === 'lair') {
      rt.dest = { ...(world.lairs.find((l) => l.id === best.id)?.pos ?? unit.pos) };
    } else if (best.kind === 'flag') {
      rt.dest = null;
    }
  }
}

// Is any living member of the unit's party within range of a living monster?
function partyMidFight(world: World, unit: UnitState, range: number): boolean {
  const ids = world.parties.get(unit.party)?.members ?? [unit.id];
  return ids.some((id) => {
    const m = world.units.find((u) => u.id === id);
    return (
      !!m &&
      !m.ko &&
      world.units.some((f) => f.kind === 'monster' && f.hp > 0 && dist(f.pos, m.pos) <= range)
    );
  });
}

// The party keeps its goal but a flag scores at least considerShare of it: say so once per party
// and flag (event `considering`), so the player sees the party weighing it.
function considerFlags(world: World, unit: UnitState, rt: HeroRuntime, curScore: number): void {
  const share = world.tuning.bounty.considerShare;
  // Forget the flags that are gone, so the memory stays small.
  rt.considered = rt.considered?.filter((id) => world.bounties.some((b) => b.id === id));
  for (const flag of world.bounties) {
    if (rt.goal?.kind === 'flag' && rt.goal.id === flag.id) continue;
    if (rt.considered?.includes(flag.id)) continue;
    if (nearSealedLair(world, flag.pos, world.tuning.bounty.dangerRadius)) continue;
    const score = flagScore(world, unit, flag);
    if (score === null || score < curScore * share) continue;
    rt.considered = [...(rt.considered ?? []), flag.id];
    world.events.push({ kind: 'considering', party: unit.party, bounty: flag.id });
  }
}

// What a party is doing, from its leader's mode and goal; an `intent` event when it changes.
export function syncIntent(world: World): void {
  for (const party of world.parties.values()) {
    // The leader the followers follow: the first member out exploring, else the first one up.
    const up = party.members
      .map((id) => world.units.find((u) => u.id === id))
      .filter((u): u is UnitState => !!u && !u.ko);
    const lead = up.find((u) => u.mode === 'explore') ?? up[0];
    if (!lead) continue;
    const rt = world.heroRuntime.get(lead.id);
    let intent: PartyIntent;
    if (lead.mode === 'return') intent = { kind: 'retreat' };
    else if (lead.mode === 'rest') intent = { kind: 'rest' };
    else if (lead.mode === 'shop') intent = { kind: 'shop' };
    else if (lead.mode === 'explore') {
      const sworn = revengeTarget(world, lead);
      if (sworn) intent = { kind: 'revenge', target: sworn.id, pos: { ...sworn.pos } };
      else if (rt?.goal?.kind === 'flag') {
        const flag = world.bounties.find((b) => b.id === rt.goal?.id);
        intent = flag
          ? {
              kind: flag.escort !== undefined ? 'escort' : 'flag',
              target: flag.id,
              pos: { ...flag.pos },
            }
          : { kind: 'explore' };
      } else if (rt?.goal?.kind === 'lair') {
        const l = world.lairs.find((x) => x.id === rt.goal?.id);
        intent = l ? { kind: 'lair', target: l.id, pos: { ...l.pos } } : { kind: 'explore' };
      } else intent = { kind: 'explore' };
    } else continue;
    const prev = party.intent;
    if (prev && prev.kind === intent.kind && prev.target === intent.target) continue;
    party.intent = intent;
    world.events.push({ kind: 'intent', party: party.id, intent });
  }
}

// Is this hero (or its leader) committed to a bounty flag that still stands?
export function committedToFlag(world: World, unit: UnitState): boolean {
  const lead = leaderOf(world, unit) ?? unit;
  const goal = world.heroRuntime.get(lead.id)?.goal;
  return goal?.kind === 'flag' && world.bounties.some((b) => b.id === goal.id);
}

// A hero (or its party's leader) that takes on a lair makes it the party's goal, so the intent
// stays "lair" for as long as the fight lasts.
export function adoptLair(world: World, unit: UnitState, lair: LairState): void {
  const lead = leaderOf(world, unit) ?? unit;
  const rt = world.heroRuntime.get(lead.id);
  if (!rt || (rt.goal?.kind === 'lair' && rt.goal.id === lair.id)) return;
  // No hold: a clearly better option (a rich flag) may still take the party away.
  rt.goal = {
    kind: 'lair',
    id: lair.id,
    score: 0,
    sinceMs: world.timeMs - world.tuning.ai.commitMs,
  };
}
