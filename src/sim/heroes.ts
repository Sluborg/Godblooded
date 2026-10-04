import { fledParty, fleeThreshold, newParty, TRAITS } from './parties';
import { aggroRange, dist, maxHp, speed, stepToward, TICK_MS } from './units';
import type { World } from './world';
import type { Vec2, UnitState } from './types';

// Graybox hero life, simplified and logged in docs/decisions.md: temples recruit on a timer,
// heroes explore and hunt, flee when hurt, rest at the town hall or a shrine, shop at the
// market (the town taxes what they spend). Numbers come from GameData.tuning.hero.

export interface HeroRuntime {
  dest: Vec2 | null;
  // The bounty flag this hero is heading for.
  bounty?: number;
  koMs: number;
  temple: number;
}

const tune = (world: World) => world.tuning.hero;
const isTemple = (type: string) => type.startsWith('temple');

// Puts a hero of `classId` on the map at `pos`. Used by temples and by tests.
export function spawnHero(world: World, classId: string, pos: Vec2, temple = 0): number {
  const cls = world.data.classes?.find((c) => c.id === classId);
  if (!cls) throw new Error(`unknown class: ${classId}`);
  const id = world.nextId++;
  const hp = maxHp(cls.attrs);
  world.units.push({
    id,
    kind: 'hero',
    type: cls.id,
    tier: 1,
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
    bounty: null,
  });
  world.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  world.heroRuntime.set(id, { dest: null, koMs: 0, temple });
  const hero = world.units[world.units.length - 1];
  hero.party = newParty(world, id);
  world.stats.heroesArrived++;
  world.events.push({ kind: 'arrived', unit: id, type: cls.id });
  return id;
}

// Temples call a new hero now and then, up to a few alive per temple.
export function runTemples(world: World): void {
  const classes = world.data.classes ?? [];
  if (classes.length === 0) return;
  for (const b of world.buildings) {
    if (!isTemple(b.type)) continue;
    const next = world.templeNextMs.get(b.id) ?? world.timeMs + tune(world).firstRecruitMs;
    world.templeNextMs.set(b.id, next);
    if (world.timeMs < next) continue;
    world.templeNextMs.set(b.id, world.timeMs + tune(world).recruitMs);
    let alive = 0;
    for (const rt of world.heroRuntime.values()) if (rt.temple === b.id) alive++;
    if (alive >= tune(world).maxPerTemple) continue;
    const cls = classes[Math.floor(world.rng() * classes.length)];
    spawnHero(world, cls.id, b.pos, b.id);
  }
}

// Before units act: flee when hurt, count down knockouts.
export function runHeroes(world: World): void {
  for (const unit of world.units) {
    const rt = world.heroRuntime.get(unit.id);
    if (unit.kind !== 'hero' || !rt) continue;
    if (unit.ko) {
      rt.koMs -= TICK_MS;
      if (rt.koMs <= 0) revive(world, unit, rt);
    } else if (unit.mode === 'explore' && unit.hp < unit.maxHp * fleeThreshold(world, unit)) {
      unit.mode = 'return';
      unit.target = null;
      rt.dest = null;
      fledParty(world, unit);
      world.events.push({ kind: 'fled', unit: unit.id });
    } else if (unit.mode === 'rest' || unit.mode === 'shop') {
      defend(world, unit, rt);
    }
  }
}

// A rested enough hero rejoins the fight when monsters come close to town.
function defend(world: World, unit: UnitState, rt: HeroRuntime): void {
  if (unit.hp < unit.maxHp * world.tuning.town.defendHp) return;
  const cls = world.data.classes?.find((c) => c.id === unit.type);
  const reach = cls ? aggroRange(cls.attrs) : 0;
  if (world.units.some((m) => m.kind === 'monster' && dist(unit.pos, m.pos) <= reach)) {
    unit.mode = 'explore';
    rt.dest = null;
  }
}

function revive(world: World, unit: UnitState, rt: HeroRuntime): void {
  unit.ko = false;
  unit.hp = Math.ceil(unit.maxHp * tune(world).reviveHp);
  unit.pos = { ...world.data.townHall };
  unit.mode = 'rest';
  rt.dest = null;
  world.events.push({ kind: 'revived', unit: unit.id });
}

export function heroKnockedOut(world: World, unit: UnitState): void {
  const rt = world.heroRuntime.get(unit.id);
  if (!rt) return;
  unit.mode = 'ko';
  rt.koMs = tune(world).koMs;
  rt.dest = null;
}

export function payBounty(world: World, killer: number, gold: number): void {
  const hero = world.units.find((u) => u.id === killer && u.kind === 'hero');
  if (hero) hero.gold += gold;
}

// Moves a hero that is not fighting: explore, walk home, rest, shop.
export function heroMove(world: World, unit: UnitState): void {
  const rt = world.heroRuntime.get(unit.id);
  const cls = world.data.classes?.find((c) => c.id === unit.type);
  if (!rt || !cls) return;
  const step = (to: Vec2): boolean => {
    const dir = stepToward(unit.pos, to, (speed(cls.attrs) * TICK_MS) / 1000);
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
    return dist(unit.pos, to) <= tune(world).arrive;
  };
  switch (unit.mode) {
    case 'explore': {
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
      if (step(restSpot(world, unit.pos).pos)) unit.mode = 'rest';
      break;
    }
    case 'rest': {
      const spot = restSpot(world, unit.pos);
      const rate = tune(world).restPerS * (spot.shrine ? tune(world).shrineMult : 1);
      unit.hp = Math.min(unit.maxHp, unit.hp + (unit.maxHp * rate * TICK_MS) / 1000);
      if (unit.hp >= unit.maxHp) {
        unit.mode =
          unit.gold >= tune(world).shopMinGold && findMarket(world, unit.pos) ? 'shop' : 'explore';
      }
      break;
    }
    case 'shop': {
      const market = findMarket(world, unit.pos);
      if (!market) {
        unit.mode = 'explore';
        break;
      }
      if (step(market.pos)) {
        const spent = Math.floor(unit.gold * tune(world).spendShare);
        const tax = Math.floor(spent * tune(world).taxRate);
        unit.gold -= spent;
        world.gold += tax;
        world.stats.taxCollected += tax;
        world.events.push({ kind: 'shopped', unit: unit.id, spent, tax });
        unit.mode = 'explore';
        rt.dest = null;
      }
      break;
    }
  }
}

// The party leader (first member) when it is someone else and out exploring.
function leaderOf(world: World, unit: UnitState): UnitState | undefined {
  const lead = world.units.find((u) => u.id === world.parties.get(unit.party)?.members[0]);
  return lead && lead.id !== unit.id && lead.mode === 'explore' && !lead.ko ? lead : undefined;
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

function restSpot(world: World, from: Vec2): { pos: Vec2; shrine: boolean } {
  const shrine = nearest(
    from,
    world.buildings.filter((b) => b.type === 'shrine'),
  );
  if (shrine) return { pos: shrine.pos, shrine: true };
  return { pos: world.data.townHall, shrine: false };
}

// Danger around a flag: monsters nearby, plus a lair standing close.
function flagDanger(world: World, pos: Vec2): number {
  const t = world.tuning.bounty;
  let danger = 0;
  for (const u of world.units) {
    if (u.kind === 'monster' && u.hp > 0 && dist(u.pos, pos) <= t.dangerRadius) danger++;
  }
  if (world.lairs.some((l) => dist(l.pos, pos) <= t.dangerRadius * 0.6)) danger += t.lairDanger;
  return danger;
}

// How much a hero wants a flag (null: not worth it). Gold against danger, by personality.
function flagAppetite(world: World, unit: UnitState, gold: number, pos: Vec2): number | null {
  const t = world.tuning.bounty;
  if (unit.trait === 'proud' && gold < t.proudMinGold) return null;
  const worth =
    gold *
    (unit.trait === 'greedy' ? t.greedyGoldMult : unit.trait === 'curious' ? t.curiousGoldMult : 1);
  const fear =
    unit.trait === 'brave' ? t.braveFearMult : unit.trait === 'coward' ? t.cowardFearMult : 1;
  const cost = flagDanger(world, pos) * t.costPerDanger * fear;
  return worth >= cost ? worth - cost : null;
}

// Claims flags a hero stands on once the place is clear, and once a second lets exploring
// party leaders pick the flag they like best.
export function runBounties(world: World): void {
  const t = world.tuning.bounty;
  for (const flag of [...world.bounties]) {
    const hero = world.units.find(
      (u) => u.kind === 'hero' && !u.ko && dist(u.pos, flag.pos) <= t.claimRadius,
    );
    if (!hero || flagDanger(world, flag.pos) > 0) continue;
    hero.gold += flag.gold;
    world.bounties = world.bounties.filter((b) => b.id !== flag.id);
    world.events.push({ kind: 'bountyClaimed', bounty: flag.id, unit: hero.id, gold: flag.gold });
  }
  if (world.tick % 20 === 0) chooseFlags(world);
  syncFlagView(world);
}

// What the snapshot shows: the live flag each exploring hero is heading for.
function syncFlagView(world: World): void {
  for (const unit of world.units) {
    if (unit.kind !== 'hero') continue;
    const lead = unit.mode === 'explore' && !unit.ko ? leaderOf(world, unit) : undefined;
    const id = world.heroRuntime.get((lead ?? unit).id)?.bounty;
    const live = unit.mode === 'explore' && !unit.ko && world.bounties.some((b) => b.id === id);
    unit.bounty = live && id !== undefined ? id : null;
  }
}

function chooseFlags(world: World): void {
  for (const unit of world.units) {
    const rt = world.heroRuntime.get(unit.id);
    if (unit.kind !== 'hero' || !rt || unit.ko || unit.mode !== 'explore') continue;
    if (leaderOf(world, unit)) continue;
    let best: number | undefined;
    let bestScore = 0;
    for (const flag of world.bounties) {
      const score = flagAppetite(world, unit, flag.gold, flag.pos);
      if (score !== null && score > bestScore) {
        best = flag.id;
        bestScore = score;
      }
    }
    if (best !== rt.bounty) {
      rt.bounty = best;
      rt.dest = null;
    }
  }
}
