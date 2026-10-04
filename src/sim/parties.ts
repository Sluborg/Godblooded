import { dist, maxHp } from './units';
import type { World } from './world';
import type { Attributes, TraitId, UnitState, UpgradeDef } from './types';

// Graybox parties, simplified and logged in docs/decisions.md. Every hero belongs to a party
// from arrival (a party of one). Parties of level 1 merge when they meet; after the first
// level up a party keeps its members. The party shares XP, levels up together and the player
// picks one of 3 upgrades. Tiers go up at party levels 3 and 6. Numbers come from
// GameData.tuning.party.

const tune = (world: World) => world.tuning.party;

export const TRAITS: readonly TraitId[] = [
  'brave',
  'coward',
  'greedy',
  'proud',
  'loyal',
  'vengeful',
  'curious',
];

export interface Party {
  id: number;
  members: number[];
  level: number;
  xp: number;
  upgrades: string[];
  offer: string[] | null;
}

export const xpNext = (world: World, level: number) => tune(world).xpPerLevel * level;

export function newParty(world: World, member: number): number {
  const id = world.nextId++;
  world.parties.set(id, { id, members: [member], level: 1, xp: 0, upgrades: [], offer: null });
  return id;
}

export function hasPendingPick(world: World): boolean {
  for (const p of world.parties.values()) if (p.offer) return true;
  return false;
}

function upgradeDefs(world: World, ids: readonly string[]): UpgradeDef[] {
  const out: UpgradeDef[] = [];
  for (const id of ids) {
    const def = world.data.upgrades?.find((u) => u.id === id);
    if (def) out.push(def);
  }
  return out;
}

// Class attributes plus the party's upgrades.
export function effectiveAttrs(world: World, unit: UnitState, base: Attributes): Attributes {
  const party = world.parties.get(unit.party);
  if (!party || party.upgrades.length === 0) return base;
  const a = { ...base };
  for (const up of upgradeDefs(world, party.upgrades)) {
    for (const k of Object.keys(up.effect.attr ?? {}) as (keyof Attributes)[]) {
      a[k] += up.effect.attr?.[k] ?? 0;
    }
  }
  return a;
}

// Hp percent below which a hero flees: the party's upgrade, scaled by personality.
export function fleeThreshold(world: World, unit: UnitState): number {
  const party = world.parties.get(unit.party);
  let flee = tune(world).baseFlee;
  for (const up of upgradeDefs(world, party?.upgrades ?? [])) {
    if (up.effect.flee !== undefined) flee = Math.min(flee, up.effect.flee);
  }
  if (unit.trait === 'brave') return flee * 0.67;
  if (unit.trait === 'coward') return flee * 1.5;
  return flee;
}

const bondKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
const bond = (world: World, a: number, b: number) => world.bonds.get(bondKey(a, b)) ?? 0;

export function addBond(world: World, a: number, b: number, delta: number): void {
  const v = Math.max(-3, Math.min(tune(world).bondCap, bond(world, a, b) + delta));
  world.bonds.set(bondKey(a, b), v);
}

// A kill by a party member: the whole party gains the XP and its members bond.
export function shareXp(world: World, killer: number, xp: number): void {
  const hero = world.units.find((u) => u.id === killer && u.kind === 'hero');
  const party = hero && world.parties.get(hero.party);
  if (!party || xp <= 0) return;
  for (let i = 0; i < party.members.length; i++) {
    for (let j = i + 1; j < party.members.length; j++) {
      addBond(world, party.members[i], party.members[j], 1);
    }
  }
  party.xp += xp;
  while (party.xp >= xpNext(world, party.level) && !party.offer) {
    party.xp -= xpNext(world, party.level);
    party.level++;
    retier(world, party);
    const ids = offerIds(world);
    if (ids.length > 0) party.offer = ids;
    world.events.push({ kind: 'levelUp', party: party.id, level: party.level, offer: ids });
  }
}

function offerIds(world: World): string[] {
  const pool = (world.data.upgrades ?? []).map((u) => u.id);
  const picked: string[] = [];
  while (picked.length < tune(world).offerSize && pool.length > 0) {
    picked.push(...pool.splice(Math.floor(world.rng() * pool.length), 1));
  }
  return picked;
}

function retier(world: World, party: Party): void {
  const tier = party.level >= 6 ? 3 : party.level >= 3 ? 2 : 1;
  for (const id of party.members) {
    const u = world.units.find((x) => x.id === id);
    if (u) u.tier = tier;
  }
}

export function pickUpgrade(
  world: World,
  partyId: number,
  upgrade: string,
): { ok: true; id: number } | { ok: false; reason: string } {
  const party = world.parties.get(partyId);
  if (!party) return { ok: false, reason: 'unknown party' };
  if (!party.offer) return { ok: false, reason: 'no pick pending' };
  if (!party.offer.includes(upgrade)) return { ok: false, reason: 'not offered' };
  const def = world.data.upgrades?.find((u) => u.id === upgrade);
  party.offer = null;
  party.upgrades.push(upgrade);
  for (const id of party.members) {
    const u = world.units.find((x) => x.id === id);
    const cls = u && world.data.classes?.find((c) => c.id === u.type);
    if (!u || !cls) continue;
    const newMax = maxHp(effectiveAttrs(world, u, cls.attrs));
    if (!u.ko) u.hp += newMax - u.maxHp;
    u.maxHp = newMax;
    if (def?.effect.healPct && !u.ko) {
      u.hp = Math.min(u.maxHp, u.hp + (u.maxHp * def.effect.healPct) / 100);
    }
  }
  world.events.push({ kind: 'upgradePicked', party: partyId, upgrade });
  return { ok: true, id: partyId };
}

// Fleeing costs trust: the party mates like the runner a little less.
export function fledParty(world: World, unit: UnitState): void {
  const party = world.parties.get(unit.party);
  if (!party) return;
  for (const other of party.members) if (other !== unit.id) addBond(world, unit.id, other, -1);
}

// Level 1 parties that meet while exploring may join up, more likely with a bond or a loyal
// member. Runs once a second.
export function runParties(world: World): void {
  if (world.tick % tune(world).mergeEveryTicks !== 0) return;
  const ids = [...world.parties.keys()].sort((a, b) => a - b);
  for (const aId of ids) {
    const a = world.parties.get(aId);
    if (!a || !mergeable(world, a)) continue;
    const leaderA = world.units.find((u) => u.id === a.members[0]);
    if (!leaderA) continue;
    let best: Party | null = null;
    let bestD = tune(world).mergeRange;
    for (const bId of ids) {
      const b = world.parties.get(bId);
      if (!b || b.id <= a.id || !mergeable(world, b)) continue;
      if (a.members.length + b.members.length > tune(world).maxParty) continue;
      const leaderB = world.units.find((u) => u.id === b.members[0]);
      const d = leaderB ? dist(leaderA.pos, leaderB.pos) : Infinity;
      if (d <= bestD) {
        best = b;
        bestD = d;
      }
    }
    if (best && world.rng() < mergeChance(world, a, best)) merge(world, a, best);
  }
}

function mergeable(world: World, p: Party): boolean {
  if (p.level > 1 || p.upgrades.length > 0 || p.offer) return false;
  return p.members.every((id) => {
    const u = world.units.find((x) => x.id === id);
    return !!u && !u.ko && u.mode === 'explore';
  });
}

function mergeChance(world: World, a: Party, b: Party): number {
  let sum = 0;
  let n = 0;
  for (const x of a.members) {
    for (const y of b.members) {
      sum += bond(world, x, y);
      n++;
    }
  }
  const loyal = [...a.members, ...b.members].some(
    (id) => world.units.find((u) => u.id === id)?.trait === 'loyal',
  );
  return Math.min(1, 0.3 + 0.1 * Math.max(0, sum / n) + (loyal ? 0.2 : 0));
}

function merge(world: World, into: Party, from: Party): void {
  for (const id of from.members) {
    into.members.push(id);
    const u = world.units.find((x) => x.id === id);
    if (u) u.party = into.id;
  }
  world.parties.delete(from.id);
  world.events.push({ kind: 'partyFormed', party: into.id, members: [...into.members] });
}
