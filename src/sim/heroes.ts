import { dist, maxHp, speed, stepToward, TICK_MS } from './units';
import type { World } from './world';
import type { Vec2, UnitState } from './types';

// Graybox hero life, simplified and logged in docs/decisions.md (Lead may move these numbers
// into src/data/ later): temples recruit on a timer, heroes explore and hunt, flee when hurt,
// rest at the town hall or a shrine, shop at the market (the town taxes what they spend).
const FIRST_RECRUIT_MS = 5_000;
const RECRUIT_MS = 15_000;
const MAX_PER_TEMPLE = 4;
const FLEE_HP = 0.3;
const KO_MS = 10_000;
const REVIVE_HP = 0.25;
// Fraction of max hp healed per second while resting (shrines heal faster).
const REST_PER_S = 0.1;
const SHRINE_MULT = 3;
const SHOP_MIN_GOLD = 20;
const SPEND_SHARE = 0.6;
const TAX_RATE = 0.5;
const ARRIVE = 50;
const LAIR_SEARCH_RADIUS = 250;
const LAIR_SEARCH_SHARE = 0.7;

export interface HeroRuntime {
  dest: Vec2 | null;
  koMs: number;
  temple: number;
}

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
    gold: cls.startGold,
  });
  world.unitRuntime.set(id, { lair: null, cooldownMs: 0, target: null, idleMs: 0 });
  world.heroRuntime.set(id, { dest: null, koMs: 0, temple });
  world.events.push({ kind: 'arrived', unit: id, type: cls.id });
  return id;
}

// Temples call a new hero now and then, up to a few alive per temple.
export function runTemples(world: World): void {
  const classes = world.data.classes ?? [];
  if (classes.length === 0) return;
  for (const b of world.buildings) {
    if (!isTemple(b.type)) continue;
    const next = world.templeNextMs.get(b.id) ?? world.timeMs + FIRST_RECRUIT_MS;
    world.templeNextMs.set(b.id, next);
    if (world.timeMs < next) continue;
    world.templeNextMs.set(b.id, world.timeMs + RECRUIT_MS);
    let alive = 0;
    for (const rt of world.heroRuntime.values()) if (rt.temple === b.id) alive++;
    if (alive >= MAX_PER_TEMPLE) continue;
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
    } else if (unit.mode === 'explore' && unit.hp < unit.maxHp * FLEE_HP) {
      unit.mode = 'return';
      unit.target = null;
      rt.dest = null;
      world.events.push({ kind: 'fled', unit: unit.id });
    }
  }
}

function revive(world: World, unit: UnitState, rt: HeroRuntime): void {
  unit.ko = false;
  unit.hp = Math.ceil(unit.maxHp * REVIVE_HP);
  unit.pos = { ...world.data.townHall };
  unit.mode = 'rest';
  rt.dest = null;
  world.events.push({ kind: 'revived', unit: unit.id });
}

export function heroKnockedOut(world: World, unit: UnitState): void {
  const rt = world.heroRuntime.get(unit.id);
  if (!rt) return;
  unit.mode = 'ko';
  rt.koMs = KO_MS;
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
    return dist(unit.pos, to) <= ARRIVE;
  };
  switch (unit.mode) {
    case 'explore': {
      if (!rt.dest || dist(unit.pos, rt.dest) <= ARRIVE) rt.dest = exploreDest(world);
      step(rt.dest);
      break;
    }
    case 'return': {
      if (step(restSpot(world, unit.pos).pos)) unit.mode = 'rest';
      break;
    }
    case 'rest': {
      const spot = restSpot(world, unit.pos);
      const rate = REST_PER_S * (spot.shrine ? SHRINE_MULT : 1);
      unit.hp = Math.min(unit.maxHp, unit.hp + (unit.maxHp * rate * TICK_MS) / 1000);
      if (unit.hp >= unit.maxHp) {
        unit.mode = unit.gold >= SHOP_MIN_GOLD && findMarket(world, unit.pos) ? 'shop' : 'explore';
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
        const spent = Math.floor(unit.gold * SPEND_SHARE);
        const tax = Math.floor(spent * TAX_RATE);
        unit.gold -= spent;
        world.gold += tax;
        world.events.push({ kind: 'shopped', unit: unit.id, spent, tax });
        unit.mode = 'explore';
        rt.dest = null;
      }
      break;
    }
  }
}

// Mostly toward a lair (that is where the monsters are), sometimes anywhere.
function exploreDest(world: World): Vec2 {
  const { width, height } = world.data.map;
  const sites = world.lairs;
  let x: number;
  let y: number;
  if (sites.length > 0 && world.rng() < LAIR_SEARCH_SHARE) {
    const lair = sites[Math.floor(world.rng() * sites.length)];
    const a = world.rng() * Math.PI * 2;
    const r = Math.sqrt(world.rng()) * LAIR_SEARCH_RADIUS;
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
