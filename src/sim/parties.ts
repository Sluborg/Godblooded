import { curePoison } from './effects';
import { armourBonus } from './items';
import { autoPickCard, leaderOf, offerCards } from './cards';
import { addFavour } from './favour';
import { passiveAttrs } from './passives';
import { partiesHaveRivals, runRivalries } from './rivalry';
import { dist, maxHp } from './units';
import type { World } from './world';
import type {
  Attributes,
  PartyIntent,
  PathDef,
  PathState,
  TraitId,
  UnitState,
  UpgradeDef,
} from './types';

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
  // Favor path card for one hero (see PartyState.pathOffer) and the heroes still waiting.
  pathOffer: { hero: number; options: string[] } | null;
  pathQueue: number[];
  // The party's last announced intent (an `intent` event fires when it changes).
  intent?: PartyIntent;
}

export const xpNext = (world: World, level: number) => tune(world).xpPerLevel * level;

export function newParty(world: World, member: number): number {
  const id = world.nextId++;
  world.parties.set(id, {
    id,
    members: [member],
    level: 1,
    xp: 0,
    upgrades: [],
    offer: null,
    pathOffer: null,
    pathQueue: [],
  });
  return id;
}

export function hasPendingPick(world: World): boolean {
  for (const p of world.parties.values()) if (p.offer || p.pathOffer) return true;
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

// Template attributes (the path's from tier 2) plus the party's upgrades and the path bonus.
export function effectiveAttrs(world: World, unit: UnitState, base: Attributes): Attributes {
  const party = world.parties.get(unit.party);
  const path = unit.tier >= 2 ? pathDef(world, unit.path) : undefined;
  const passive = passiveAttrs(world, unit);
  const gearWp = armourBonus(world, unit).wp;
  if ((!party || party.upgrades.length === 0) && !path && !passive && !gearWp) return base;
  const a = { ...base };
  const add = (bonus: Partial<Attributes> | undefined) => {
    for (const k of Object.keys(bonus ?? {}) as (keyof Attributes)[]) a[k] += bonus?.[k] ?? 0;
  };
  for (const up of upgradeDefs(world, party?.upgrades ?? [])) add(up.effect.attr);
  if (path) add(path.attrs[unit.tier >= 3 ? 1 : 0]);
  add(passive);
  a.wp += gearWp;
  return a;
}

// The party's own flee line: the base, lowered by its upgrades, before personality.
export function baseFleeOf(world: World, unit: UnitState): number {
  const party = world.parties.get(unit.party);
  let flee = tune(world).baseFlee;
  for (const up of upgradeDefs(world, party?.upgrades ?? [])) {
    if (up.effect.flee !== undefined) flee = Math.min(flee, up.effect.flee);
  }
  return flee;
}

// Hp percent below which a hero flees: the party's upgrade, scaled by personality.
export function fleeThreshold(world: World, unit: UnitState): number {
  const flee = baseFleeOf(world, unit);
  if (unit.trait === 'brave') return flee * 0.67;
  if (unit.trait === 'coward') return flee * 1.5;
  if (unit.trait === 'proud') return Math.min(flee, tune(world).proudRetreatAt);
  return flee;
}

const bondKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
export const bond = (world: World, a: number, b: number) => world.bonds.get(bondKey(a, b)) ?? 0;

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
  while (
    party.level < tune(world).maxLevel &&
    party.xp >= xpNext(world, party.level) &&
    !party.offer &&
    !party.pathOffer
  ) {
    party.xp -= xpNext(world, party.level);
    party.level++;
    const ids = offerCards(world, party);
    if (ids.length > 0 && !tune(world).autoPick) party.offer = ids;
    world.events.push({ kind: 'levelUp', party: party.id, level: party.level, offer: ids });
    // The party picks for itself, by its leader's personality (no pause, no player choice).
    if (ids.length > 0 && tune(world).autoPick) {
      const leader = leaderOf(world, party);
      const pick = autoPickCard(world, party, ids);
      const god = world.data.upgrades?.find((u) => u.id === pick)?.god ?? leader?.god ?? undefined;
      applyUpgrade(world, party, pick, { auto: true, hero: leader?.id, god });
    }
    settleTiers(world, party);
  }
}

const pathDef = (world: World, id: string | null): PathDef | undefined =>
  id ? world.data.paths?.find((p) => p.id === id) : undefined;

// Pantheon of a building type (BuildingDef.pantheon, else `temple_<pantheon>`), if it has one.
export function pantheonOf(world: World, type: string): string | undefined {
  const def = world.data.buildings.find((d) => d.id === type);
  return def?.pantheon ?? (type.startsWith('temple_') ? type.slice(7) : undefined);
}

// Pantheons of the temples built so far.
function builtPantheons(world: World): Set<string> {
  const out = new Set<string>();
  for (const b of world.buildings) {
    const pantheon = pantheonOf(world, b.type);
    if (pantheon) out.add(pantheon);
  }
  return out;
}

export const godPantheon = (world: World, god: string): string =>
  world.data.gods?.find((g) => g.id === god)?.pantheon ?? '';

const pathTaken = (world: World, id: string): number | null =>
  world.units.find((u) => u.kind === 'hero' && u.path === id)?.id ?? null;

export function pathStates(world: World): PathState[] {
  const built = builtPantheons(world);
  return (world.data.paths ?? []).map((p) => {
    const pantheon = godPantheon(world, p.god);
    return {
      id: p.id,
      god: p.god,
      pantheon,
      template: p.template,
      name: p.name,
      available: built.has(pantheon),
      takenBy: pathTaken(world, p.id),
    };
  });
}

// Paths of the hero's own god that no hero holds. Heroes never leave the world, so a path is
// held for good by the sibling that took it.
function freePaths(world: World, god: string | null): string[] {
  if (!god) return [];
  return (world.data.paths ?? [])
    .filter((p) => p.god === god && pathTaken(world, p.id) === null)
    .map((p) => p.id);
}

const hasPaths = (world: World, god: string | null) =>
  !!god && !!world.data.paths?.some((p) => p.god === god);

// The tier a hero holds: by party level, but a god with paths needs one taken to pass tier 1.
function wantedTier(world: World, party: Party, unit: UnitState): number {
  const byLevel = party.level >= 6 ? 3 : party.level >= 3 ? 2 : 1;
  return unit.path || !hasPaths(world, unit.god) ? byLevel : 1;
}

function retier(world: World, party: Party): void {
  for (const id of party.members) {
    const u = world.units.find((x) => x.id === id);
    if (!u) continue;
    const tier = wantedTier(world, party, u);
    const template = (u.tier >= 1 && tier >= 2 && pathDef(world, u.path)?.template) || u.type;
    if (tier === u.tier && template === u.type) continue;
    if (tier > u.tier)
      addFavour(world, godPantheon(world, u.god ?? ''), world.tuning.favour.tierUpGain);
    u.tier = tier;
    u.type = template;
    refreshMaxHp(world, u);
    world.events.push({ kind: 'tierUp', unit: u.id, tier, path: u.path });
  }
}

function refreshMaxHp(world: World, u: UnitState): void {
  const cls = world.data.classes?.find((c) => c.id === u.type);
  if (!cls) return;
  const newMax = maxHp(effectiveAttrs(world, u, cls.attrs));
  // A lower max (a path template with fewer hp) must not take a living hero to 0 hp, which
  // would leave it alive but untargetable: it keeps at least 1 hp.
  if (!u.ko) u.hp = Math.min(newMax, Math.max(1, u.hp + newMax - u.maxHp));
  u.maxHp = newMax;
}

function takePath(world: World, party: Party, unit: UnitState, path: string): void {
  unit.path = path;
  retier(world, party);
}

// Opens the next hero's path card, or gives the path straight away when only one is free.
function nextPathOffer(world: World, party: Party): void {
  while (!party.pathOffer && party.pathQueue.length > 0) {
    const id = party.pathQueue.shift() as number;
    const hero = world.units.find((u) => u.id === id);
    if (!hero || hero.path) continue;
    const free = freePaths(world, hero.god);
    if (free.length === 1) takePath(world, party, hero, free[0]);
    else if (free.length > 1) {
      party.pathOffer = { hero: id, options: free };
      world.events.push({ kind: 'pathOffer', party: party.id, hero: id, options: [...free] });
    }
  }
}

// From party level 3: every child of a god with paths and none taken yet is queued for one
// (taken at once when exactly one is free, else a card). A hero whose god has no free path
// stays tier 1; runParties retries it every second.
function settleTiers(world: World, party: Party): void {
  if (party.level >= 3) {
    for (const id of party.members) {
      const u = world.units.find((x) => x.id === id);
      if (!u || u.path || !hasPaths(world, u.god)) continue;
      if (party.pathOffer?.hero === id || party.pathQueue.includes(id)) continue;
      party.pathQueue.push(id);
    }
    nextPathOffer(world, party);
  }
  retier(world, party);
}

export function pickPath(
  world: World,
  partyId: number,
  path: string,
): { ok: true; id: number } | { ok: false; reason: string } {
  const party = world.parties.get(partyId);
  if (!party) return { ok: false, reason: 'unknown party' };
  const offer = party.pathOffer;
  if (!offer) return { ok: false, reason: 'no path pick pending' };
  if (!offer.options.includes(path)) return { ok: false, reason: 'not offered' };
  const hero = world.units.find((u) => u.id === offer.hero);
  party.pathOffer = null;
  if (!hero) {
    nextPathOffer(world, party);
    return { ok: false, reason: 'unknown hero' };
  }
  if (!freePaths(world, hero.god).includes(path)) {
    // Taken by another hero since the card opened: deal the hero a fresh card.
    party.pathQueue.unshift(hero.id);
    nextPathOffer(world, party);
    return { ok: false, reason: 'path taken' };
  }
  takePath(world, party, hero, path);
  nextPathOffer(world, party);
  return { ok: true, id: partyId };
}

export function pickUpgrade(
  world: World,
  partyId: number,
  upgrade: string,
): { ok: true; id: number } | { ok: false; reason: string } {
  const party = world.parties.get(partyId);
  if (!party) return { ok: false, reason: 'unknown party' };
  if (party.pathOffer) return { ok: false, reason: 'pick a path first' };
  if (!party.offer) return { ok: false, reason: 'no pick pending' };
  if (!party.offer.includes(upgrade)) return { ok: false, reason: 'not offered' };
  party.offer = null;
  applyUpgrade(world, party, upgrade, {});
  return { ok: true, id: partyId };
}

// A party takes a card: it joins the party's upgrades, max hp refreshes, healing cards heal.
function applyUpgrade(
  world: World,
  party: Party,
  upgrade: string,
  by: { auto?: boolean; hero?: number; god?: string },
): void {
  const def = world.data.upgrades?.find((u) => u.id === upgrade);
  party.upgrades.push(upgrade);
  for (const id of party.members) {
    const u = world.units.find((x) => x.id === id);
    if (!u) continue;
    refreshMaxHp(world, u);
    if (def?.effect.healPct && !u.ko) {
      u.hp = Math.min(u.maxHp, u.hp + (u.maxHp * def.effect.healPct) / 100);
      curePoison(world, u.id);
    }
  }
  world.events.push({
    kind: 'upgradePicked',
    party: party.id,
    upgrade,
    ...(by.auto ? { auto: true } : {}),
    ...(by.hero !== undefined ? { hero: by.hero } : {}),
    ...(by.god !== undefined ? { god: by.god } : {}),
  });
}

// Fleeing costs trust: the party mates like the runner a little less.
export function fledParty(world: World, unit: UnitState): void {
  const party = world.parties.get(unit.party);
  if (!party) return;
  for (const other of party.members) if (other !== unit.id) addBond(world, unit.id, other, -1);
}

// A bonus card for a party outside a level-up (an omen's prize): offered, or picked by the party
// as at a level-up. Nothing while a pick is pending.
export function bonusCard(world: World, party: Party): boolean {
  if (party.offer || party.pathOffer) return false;
  const ids = offerCards(world, party);
  if (ids.length === 0) return false;
  if (!tune(world).autoPick) {
    party.offer = ids;
    return true;
  }
  const leader = leaderOf(world, party);
  const pick = autoPickCard(world, party, ids);
  const god = world.data.upgrades?.find((u) => u.id === pick)?.god ?? leader?.god ?? undefined;
  applyUpgrade(world, party, pick, { auto: true, hero: leader?.id, god });
  return true;
}

// Level 1 parties that meet while exploring may join up, more likely with a bond or a loyal
// member. Runs once a second.
export function runParties(world: World): void {
  // A save from before auto-pick may hold an open upgrade offer: the party takes it itself.
  if (tune(world).autoPick) {
    for (const p of world.parties.values()) {
      if (!p.offer) continue;
      const leader = leaderOf(world, p);
      const pick = autoPickCard(world, p, p.offer);
      p.offer = null;
      const god = world.data.upgrades?.find((u) => u.id === pick)?.god ?? leader?.god ?? undefined;
      applyUpgrade(world, p, pick, { auto: true, hero: leader?.id, god });
    }
  }
  if (world.tick % tune(world).mergeEveryTicks !== 0) return;
  runRivalries(world);
  const ids = [...world.parties.keys()].sort((a, b) => a - b);
  for (const id of ids) {
    const p = world.parties.get(id);
    if (p && p.level >= 3 && !p.offer && !p.pathOffer) settleTiers(world, p);
  }
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
      if (partiesHaveRivals(world, a, b)) continue;
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
