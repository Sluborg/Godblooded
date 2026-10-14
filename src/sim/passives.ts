import { charmEffects } from './items';
import { dist } from './units';
import type { World } from './world';
import type {
  Attributes,
  BuffStat,
  PassiveDef,
  PassiveEffect,
  PassiveKeys,
  RiderId,
  UnitState,
} from './types';

// God passives (Sim 260, docs/systems/paths-and-skills.md section 5). A passive is a set of keys
// on GodDef; each key is implemented once, where its rule lives (stats, strikes, resting,
// knockouts, aggro, first strike). This module finds which passives apply to a unit and folds
// the numeric keys.

// The passive effects that apply to a hero: its own god's, and the 'mates' and 'party' effects
// of living party mates in range. A party effect of one passive counts once however many mates
// carry it.
// Lookups by id over the content rows, built once per GameData (it does not change in a run).
interface Index {
  anyPassive: boolean;
  gods: Map<string, PassiveDef | undefined>;
  keys: Map<string, PassiveKeys | undefined>;
}
const indexes = new WeakMap<object, Index>();
function indexOf(world: World): Index {
  let ix = indexes.get(world.data);
  if (!ix) {
    ix = {
      anyPassive: !!world.data.gods?.some((g) => g.passive),
      gods: new Map(),
      keys: new Map(),
    };
    for (const g of world.data.gods ?? []) if (!ix.gods.has(g.id)) ix.gods.set(g.id, g.passive);
    for (const u of world.data.upgrades ?? []) {
      if (!ix.keys.has(u.id)) ix.keys.set(u.id, u.effect.keys);
    }
    indexes.set(world.data, ix);
  }
  return ix;
}

const NONE: PassiveEffect[] = [];

export function passivesFor(world: World, unit: UnitState): PassiveEffect[] {
  if (unit.kind !== 'hero') return NONE;
  const cards = cardEffects(world, unit);
  if (!indexOf(world).anyPassive && cards.length === 0) return NONE;
  const out = new Map<string, PassiveEffect>();
  const own = passiveOf(world, unit);
  own?.effects.forEach((e, i) => {
    if (e.scope !== 'mates') out.set(`${own.id}:${i}`, e);
  });
  if (unit.party !== 0) {
    for (const id of world.parties.get(unit.party)?.members ?? []) {
      if (id === unit.id) continue;
      const mate = world.units.find((u) => u.id === id);
      const def = mate && !mate.ko && mate.hp > 0 ? passiveOf(world, mate) : undefined;
      if (!mate || !def) continue;
      def.effects.forEach((e, i) => {
        if (e.scope !== 'self' && dist(mate.pos, unit.pos) <= (e.range ?? Infinity)) {
          out.set(`${def.id}:${i}`, e);
        }
      });
    }
  }
  return [...out.values(), ...cards];
}

// The cards the hero's party has taken that carry keys: each copy counts, for the whole party.
function cardEffects(world: World, unit: UnitState): PassiveEffect[] {
  const upgrades = world.parties.get(unit.party)?.upgrades;
  if (!upgrades || upgrades.length === 0) return NONE;
  const ix = indexOf(world);
  const out: PassiveEffect[] = [];
  for (const id of upgrades) {
    const keys = ix.keys.get(id);
    if (keys) out.push({ scope: 'party', keys });
  }
  return out;
}

function passiveOf(world: World, hero: UnitState): PassiveDef | undefined {
  return hero.god === null ? undefined : indexOf(world).gods.get(hero.god);
}

// Folds one numeric key over the unit's passives.
function sum(world: World, unit: UnitState, pick: (k: PassiveKeys) => number | undefined): number {
  let total = 0;
  for (const p of passivesFor(world, unit)) total += pick(p.keys) ?? 0;
  return total;
}

function product(
  world: World,
  unit: UnitState,
  pick: (k: PassiveKeys) => number | undefined,
): number {
  let total = 1;
  for (const p of passivesFor(world, unit)) total *= pick(p.keys) ?? 1;
  return total;
}

export function passiveAttrs(world: World, unit: UnitState): Partial<Attributes> | undefined {
  let out: Partial<Attributes> | undefined;
  for (const p of passivesFor(world, unit)) {
    for (const k of Object.keys(p.keys.attr ?? {}) as (keyof Attributes)[]) {
      out ??= {};
      out[k] = (out[k] ?? 0) + (p.keys.attr?.[k] ?? 0);
    }
  }
  return out;
}

export const passiveArmour = (world: World, unit: UnitState) => sum(world, unit, (k) => k.armour);
export const passiveRestMult = (world: World, unit: UnitState) =>
  product(world, unit, (k) => k.restMult);
export const passiveKoMult = (world: World, unit: UnitState) =>
  product(world, unit, (k) => k.koMult);
export const passiveKoGoldLoss = (world: World, unit: UnitState) =>
  product(world, unit, (k) => k.koGoldLoss);
// Added to the death chance of a hero (Anubis: -0.1 for the party).
export const passiveDeathAdd = (world: World, unit: UnitState) =>
  sum(world, unit, (k) => k.bossDeathAdd);
export const passiveAggroMult = (world: World, unit: UnitState) =>
  product(world, unit, (k) => k.aggroMult);
export const passivePotionSlots = (world: World, unit: UnitState) =>
  sum(world, unit, (k) => k.potionSlots);
export const passiveCooldownMult = (world: World, unit: UnitState) =>
  product(world, unit, (k) => k.cooldownMult);
export const passiveRangeMult = (world: World, unit: UnitState) =>
  product(world, unit, (k) => k.rangeMult);

// The rider the hero's basic strikes carry, if a card or passive gives one.
export function passiveRider(world: World, unit: UnitState): RiderId | undefined {
  for (const p of passivesFor(world, unit)) if (p.keys.rider) return p.keys.rider;
  return undefined;
}

export const passiveHealTaken = (world: World, unit: UnitState) =>
  product(world, unit, (k) => k.healTakenMult);

export function hasPassive(
  world: World,
  unit: UnitState,
  key: 'firstStrike' | 'firstHitMisses',
): boolean {
  return passivesFor(world, unit).some((p) => p.keys[key]);
}

// Damage multiplier of the attacker's passives against a target's tags.
export function passiveVsTags(
  world: World,
  unit: UnitState,
  tags: readonly string[] | undefined,
): number {
  let mult = 1;
  for (const p of passivesFor(world, unit)) {
    for (const t of tags ?? []) mult *= p.keys.vsTag?.[t] ?? 1;
  }
  return mult;
}

// The buff-stat share of a unit's passives: flat dodge and crit, a stack per kill this fight,
// and a buff while below a share of max hp. Folded into buffOf (effects.ts).
export function passiveBuff(world: World, unit: UnitState, stat: BuffStat): number {
  let total = 0;
  // Kill stacks last while the fight does, not into the next one.
  const rt = world.unitRuntime.get(unit.id);
  const kills = rt && world.timeMs < (rt.fightUntilMs ?? 0) ? (rt.fight?.kills ?? 0) : 0;
  if (stat === 'dodge' || stat === 'crit') total += charmEffects(world, unit)[stat] ?? 0;
  for (const p of passivesFor(world, unit)) {
    const k = p.keys;
    if (stat === 'dodge') total += k.dodge ?? 0;
    if (stat === 'crit') total += k.crit ?? 0;
    if (k.onKillStack?.stat === stat) {
      total += k.onKillStack.per * Math.min(kills, k.onKillStack.max);
    }
    if (k.belowHp?.stat === stat && unit.hp / unit.maxHp < k.belowHp.below) {
      total += k.belowHp.amount;
    }
  }
  return total;
}

// The first `everyNth` rule among the unit's passives, if any.
export function everyNthOf(world: World, unit: UnitState): PassiveKeys['everyNth'] {
  for (const p of passivesFor(world, unit)) if (p.keys.everyNth) return p.keys.everyNth;
  return undefined;
}
