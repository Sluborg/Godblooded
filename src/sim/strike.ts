import { armourPct, critChance, dodgeChance, resistPct, type Stats } from './units';
import type { World } from './world';
import { applyRider } from './riders';
import { buffOf, takeDamage } from './effects';
import { charmEffects } from './items';
import { hasPassive, passiveVsTags } from './passives';
import { tally } from './runstats';
import type { Attributes, RiderId, SimEvent, UnitState } from './types';

// The one strike pipeline (Sim 180, docs/systems/combat.md section 1). Every attack of units,
// and the tower bolts, resolves here, in this order:
//   10 dodge (physical strikes the target can dodge only)   20 power
//   30 skill multiplier   40 crit   50 type multiplier   60 mitigation
//   70 round (at least 1 on a landed strike)   80 rider   90 down (the caller: hp <= 0)
// Types, riders and the boss rules arrive with their own rows and plug in at their steps.

export interface StrikeIn {
  // What the strike is made of. Without `power` it is the attacker's Str (a weapon strike).
  attrs: Attributes;
  // Flat power instead of Str (tower bolts), or a caster's Int times spellMult.
  power?: number;
  // Step 30: a skill's multiplier; a basic attack is 1.
  skillMult?: number;
  // Damage type: 'physical' (the default) is dodged and armoured; any other type cannot be
  // dodged and is resisted by Willpower. 'magic' is an untyped spell.
  type?: string;
  // The target, for dodge, type and mitigation. Lairs and buildings have none.
  target?: {
    attrs: Attributes;
    armour?: number;
    types?: Partial<Record<string, number>>;
    tags?: readonly string[];
    // Flat dodge added after the curve (buffs).
    dodgeAdd?: number;
  };
  // Flat crit chance added after the curve (buffs).
  critAdd?: number;
  // Tower bolts cannot dodge-roll (true by default for physical strikes with a target).
  canDodge?: boolean;
  // Tower bolts cannot crit.
  canCrit?: boolean;
  // The target is a building: fire deals extra.
  vsBuilding?: boolean;
  // Step 80: a rider the strike carries (skills only). Sear acts at step 50, the rest at 80.
  rider?: RiderId;
}

export interface StrikeOut {
  dodged: boolean;
  crit: boolean;
  // Whole hp to subtract; 0 when dodged.
  damage: number;
  type: string;
  // The target's type row made the strike weak (> 1) or resisted (< 1).
  weak: boolean;
  resist: boolean;
}

export function resolveStrike(world: World, s: StrikeIn): StrikeOut {
  const t = world.tuning.combat;
  const type = s.type ?? 'physical';
  const physical = type === 'physical';
  // 10 dodge
  if (
    physical &&
    s.canDodge !== false &&
    s.target &&
    world.rng() < Math.min(0.9, dodgeChance(s.target.attrs, t.dodgeK) + (s.target.dodgeAdd ?? 0))
  ) {
    return { dodged: true, crit: false, damage: 0, type, weak: false, resist: false };
  }
  // 20 power, 30 skill multiplier
  let dmg = (s.power ?? Math.max(1, s.attrs.str)) * (s.skillMult ?? 1);
  // 40 crit
  // Bosses cannot be crit.
  const bossTarget = s.target?.tags?.includes('boss');
  const crit =
    s.canCrit !== false &&
    !bossTarget &&
    world.rng() < Math.min(0.9, critChance(s.attrs, t.critK) + (s.critAdd ?? 0));
  if (crit) dmg *= t.critMult;
  // 50 type multiplier: the target's row for this type; fire hurts buildings more
  let row = s.target?.types?.[type] ?? 1;
  // sear: holy against undead and demons multiplies a weak row's bonus
  if (
    s.rider === 'sear' &&
    type === 'holy' &&
    row > 1 &&
    (s.target?.tags?.includes('undead') || s.target?.tags?.includes('demon'))
  ) {
    row = 1 + (row - 1) * world.tuning.rider.searBonusMult;
  }
  dmg *= row;
  if (s.vsBuilding && type === 'fire') dmg *= t.buildingFireMult;
  // 60 mitigation: armour takes its share off a physical strike, Willpower off any other type
  if (s.target) {
    dmg *= physical
      ? 1 - armourPct(s.target.armour ?? 0, t.armourK)
      : 1 - resistPct(s.target.attrs.wp, t.resistK);
  }
  // 70 round: a landed strike does at least 1, unless the row makes the target immune
  const out = row <= 0 ? 0 : Math.max(1, Math.round(dmg));
  return { dodged: false, crit, damage: out, type, weak: row > 1, resist: row < 1 };
}

// What a unit's basic attack is made of: a weapon strike (Str, physical) or, for a caster, a
// spell (Int times spellMult) of its god's or path's type. Lairs and buildings have no `target`.
export function attackStrike(
  stats: Stats,
  target?: {
    attrs: Attributes;
    armour?: number;
    types?: Partial<Record<string, number>>;
    tags?: readonly string[];
  },
): StrikeIn {
  if (stats.spellMult !== undefined) {
    return {
      attrs: stats.attrs,
      power: Math.max(1, stats.attrs.int * stats.spellMult) + (stats.weaponPower ?? 0),
      type: stats.damageType ?? 'magic',
      target,
    };
  }
  return {
    attrs: stats.attrs,
    ...(stats.weaponPower ? { power: Math.max(1, stats.attrs.str) + stats.weaponPower } : {}),
    type: stats.damageType,
    target,
  };
}

// The `hit` event of a resolved strike.
// `absorbed`: the part of the damage a shield took (the event's damage is what reached the hp).
export function hitEvent(attacker: number, target: number, out: StrikeOut, absorbed = 0): SimEvent {
  return {
    kind: 'hit',
    attacker,
    target,
    damage: out.damage - absorbed,
    dodged: out.dodged,
    type: out.type,
    ...(absorbed > 0 ? { absorbed } : {}),
    ...(out.crit ? { crit: true } : {}),
    ...(out.weak ? { weak: true } : {}),
    ...(out.resist ? { resist: true } : {}),
  };
}

// A unit strikes a unit: the pipeline, the damage, the `hit` event, the rider (step 80) and the
// down (step 90: the caller settles deaths). Basic attacks and skills both come through here.
export function landStrike(
  world: World,
  attacker: UnitState,
  foe: UnitState,
  input: StrikeIn,
): StrikeOut {
  // A passive that makes the first strike against its owner each fight miss.
  const frt = world.unitRuntime.get(foe.id);
  // Strikes that cannot be dodged (a boss cleave, tower bolts) are not voided by it.
  if (frt && input.canDodge !== false && hasPassive(world, foe, 'firstHitMisses')) {
    const fight = (frt.fight ??= { kills: 0, missUsed: false, strikes: 0 });
    if (!fight.missUsed) {
      fight.missUsed = true;
      const miss: StrikeOut = {
        dodged: true,
        crit: false,
        damage: 0,
        type: input.type ?? 'physical',
        weak: false,
        resist: false,
      };
      world.events.push(hitEvent(attacker.id, foe.id, miss));
      return miss;
    }
  }
  const boost = buffOf(world, attacker.id, 'damage');
  const vsTag = passiveVsTags(world, attacker, input.target?.tags);
  const crit = buffOf(world, attacker.id, 'crit');
  const out = resolveStrike(world, {
    ...input,
    ...(boost || vsTag !== 1 ? { skillMult: (input.skillMult ?? 1) * (1 + boost) * vsTag } : {}),
    ...(crit ? { critAdd: crit } : {}),
  });
  // A ward-ring halves the first hit of each fight that lands on its wearer.
  const ring = foe.kind === 'hero' ? charmEffects(world, foe).firstHitMult : undefined;
  if (ring !== undefined && frt && !out.dodged && out.damage > 0) {
    const fight = (frt.fight ??= { kills: 0, missUsed: false, strikes: 0 });
    if (!fight.ringUsed) {
      fight.ringUsed = true;
      out.damage = Math.max(1, Math.round(out.damage * ring));
    }
  }
  const taken = takeDamage(world, foe, out.damage);
  out.damage = taken.dealt;
  foe.hp -= taken.hp;
  tally(world, attacker.id, 'damage', out.damage);
  world.events.push(hitEvent(attacker.id, foe.id, out, taken.dealt - taken.hp));
  if (input.rider && !out.dodged) applyRider(world, input.rider, attacker.id, foe, out);
  if (foe.hp <= 0) {
    foe.hp = 0;
    world.pendingDeaths.push({ victim: foe.id, by: attacker.id });
  }
  return out;
}
