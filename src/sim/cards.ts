import type { Party } from './parties';
import type { World } from './world';
import type { CardNeeds, CardRarity, UnitState, UpgradeDef } from './types';

// Card offers (Sim 320, docs/systems/progression.md section 2). A level-up offers `offerSize`
// different cards the party can use: rarity by party level, one card fitted to the party, stat
// cards stacking up to 3 times, a god's favour at the favour level.

const RARITIES: CardRarity[] = ['common', 'rare', 'epic'];

const rarityOf = (c: UpgradeDef): CardRarity => c.rarity ?? 'common';

// How often a party has taken a card.
const taken = (party: Party, id: string) => party.upgrades.filter((u) => u === id).length;

// Times a party may take a card: stats 3, other families 1, no family: as often as offered.
function stackLimit(c: UpgradeDef): number {
  if (c.stack !== undefined) return c.stack;
  if (!c.family) return Infinity;
  return c.family === 'stats' ? 3 : 1;
}

function meets(world: World, members: UnitState[], needs: CardNeeds | undefined): boolean {
  if (!needs) return true;
  const cls = (u: UnitState) => world.data.classes?.find((c) => c.id === u.type);
  const pantheonOf = (u: UnitState) => world.data.gods?.find((g) => g.id === u.god)?.pantheon;
  return members.some(
    (u) =>
      (needs.god === undefined || u.god === needs.god) &&
      (needs.path === undefined || u.path === needs.path) &&
      (needs.pantheon === undefined || pantheonOf(u) === needs.pantheon) &&
      (needs.template === undefined || u.type === needs.template) &&
      (needs.tier === undefined || u.tier >= needs.tier) &&
      (!needs.caster || cls(u)?.spellMult !== undefined) &&
      (!needs.healer || !!cls(u)?.heals),
  );
}

// The cards this party could be offered now.
function eligible(world: World, party: Party): UpgradeDef[] {
  const members = party.members
    .map((id) => world.units.find((u) => u.id === id))
    .filter((u): u is UnitState => !!u);
  return (world.data.upgrades ?? []).filter(
    (c) => taken(party, c.id) < stackLimit(c) && meets(world, members, c.needs),
  );
}

// One card by rarity weights for the party's level; rarities with no card left are skipped.
function draw(world: World, level: number, pool: UpgradeDef[]): UpgradeDef {
  const w = world.tuning.party.rarity;
  const weights = level >= 6 ? w.high : level >= 4 ? w.mid : w.low;
  const live = RARITIES.map((r, i) => ({
    r,
    weight: pool.some((c) => rarityOf(c) === r) ? (weights[i] ?? 0) : 0,
  }));
  const total = live.reduce((n, x) => n + x.weight, 0);
  let rarity: CardRarity | undefined;
  if (total > 0) {
    let roll = world.rng() * total;
    for (const x of live) {
      if (x.weight > 0 && roll < x.weight) {
        rarity = x.r;
        break;
      }
      roll -= x.weight;
    }
    rarity ??= live.filter((x) => x.weight > 0).pop()?.r;
  }
  // A band with no weighted card left (all zero): any card of the pool.
  const same = rarity ? pool.filter((c) => rarityOf(c) === rarity) : pool;
  return same[Math.floor(world.rng() * same.length)];
}

const isFitted = (c: UpgradeDef) => c.family === 'pantheon' || c.family === 'skill';

// The ids to offer for the party's new level (empty when nothing is left to offer).
export function offerCards(world: World, party: Party): string[] {
  const size = world.tuning.party.offerSize;
  const all = eligible(world, party);
  const favours = all.filter((c) => c.family === 'favour');
  const pool = all.filter((c) => c.family !== 'favour');
  const out: UpgradeDef[] = [];
  if (party.level === world.tuning.party.favourLevel && favours.length > 0) {
    // The god's favour cards; topped up with epics when the party has fewer gods than slots.
    out.push(...favours.slice(0, size));
    const epics = pool.filter((c) => rarityOf(c) === 'epic');
    for (const c of [...epics, ...pool.filter((c) => rarityOf(c) !== 'epic')]) {
      if (out.length >= size) break;
      if (!out.includes(c)) out.push(c);
    }
    return shuffle(world, out.slice(0, size)).map((c) => c.id);
  }
  const rest = [...pool];
  while (out.length < size && rest.length > 0) {
    const card = draw(world, party.level, rest);
    rest.splice(rest.indexOf(card), 1);
    out.push(card);
  }
  // At least one card fitted to the party (a pantheon or skill card it can use), when there is one.
  if (out.length > 0 && !out.some(isFitted)) {
    const fitted = rest.filter(isFitted);
    if (fitted.length > 0) {
      out[out.length - 1] = fitted[Math.floor(world.rng() * fitted.length)];
    }
  }
  return out.map((c) => c.id);
}

// The party's leader for picks and barks: the first member, or the next one that is not knocked out.
export function leaderOf(world: World, party: Party): UnitState | undefined {
  const members = party.members
    .map((id) => world.units.find((u) => u.id === id))
    .filter((u): u is UnitState => !!u);
  return members.find((u) => !u.ko) ?? members[0];
}

// The tags a leader's trait looks for in an offer (level-ups.md section 3).
function wantedTags(trait: UnitState['trait'], cards: UpgradeDef[]): string[] {
  switch (trait) {
    case 'brave':
    case 'proud':
      return ['attack'];
    case 'coward':
      return ['defence'];
    case 'greedy':
      return cards.some((c) => c.pickTag === 'gold') ? ['gold'] : ['attack'];
    case 'curious':
      return ['sight'];
    case 'loyal':
      return ['sustain'];
    case 'vengeful':
      return ['attack', 'nerve'];
    default:
      return [];
  }
}

// The card a party takes by itself: a weighted draw on the seeded RNG. Every card weighs 1,
// times `traitPickWeight` when it matches the leader's trait (a pickTag it looks for; for loyal
// and proud also the cards its own god offers).
export function autoPickCard(world: World, party: Party, ids: string[]): string {
  const cards = ids
    .map((id) => world.data.upgrades?.find((u) => u.id === id))
    .filter((c): c is UpgradeDef => !!c);
  if (cards.length === 0) return ids[0];
  const leader = leaderOf(world, party);
  const tags = wantedTags(leader?.trait ?? null, cards);
  const ownGod = leader?.trait === 'loyal' || leader?.trait === 'proud';
  const boost = world.tuning.party.traitPickWeight;
  const weights = cards.map((c) => {
    const match =
      (c.pickTag !== undefined && tags.includes(c.pickTag)) ||
      (ownGod && c.god !== undefined && c.god === leader?.god);
    return match ? boost : 1;
  });
  let roll = world.rng() * weights.reduce((n, x) => n + x, 0);
  for (const [i, w] of weights.entries()) {
    if (roll < w) return cards[i].id;
    roll -= w;
  }
  return cards[cards.length - 1].id;
}

function shuffle<T>(world: World, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(world.rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
