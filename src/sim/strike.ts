import { armourPct, critChance, dodgeChance, resistPct, type Stats } from './units';
import type { World } from './world';
import type { Attributes } from './types';

// The one strike pipeline (Sim 180, docs/systems/combat.md section 1). Every attack of units,
// and the tower bolts, resolves here, in this order:
//   10 dodge (physical strikes the target can dodge only)   20 power
//   30 skill multiplier   40 crit   50 type multiplier   60 mitigation
//   70 round (at least 1 on a landed strike)   80 rider   90 down (the caller: hp <= 0)
// Types, riders and the boss rules arrive with their own rows and plug in at their steps.

export interface StrikeIn {
  // What the strike is made of. Without `power` it is the attacker's Str (a weapon strike).
  attrs: Attributes;
  // Flat power instead of Str (tower bolts).
  power?: number;
  // Step 30: a skill's multiplier; a basic attack is 1.
  skillMult?: number;
  // The target, for dodge and mitigation. Buildings and lairs have none.
  target?: { attrs: Attributes; armour?: number };
  // Physical strikes can be dodged; a tower bolt or a spell skips step 10.
  canDodge?: boolean;
  // Tower bolts cannot crit.
  canCrit?: boolean;
  // A spell: it cannot be dodged and is resisted by the target's Willpower, not its armour.
  spell?: boolean;
}

export interface StrikeOut {
  dodged: boolean;
  crit: boolean;
  // Whole hp to subtract; 0 when dodged.
  damage: number;
}

export function resolveStrike(world: World, s: StrikeIn): StrikeOut {
  const t = world.tuning.combat;
  // 10 dodge
  if (
    !s.spell &&
    s.canDodge !== false &&
    s.target &&
    world.rng() < dodgeChance(s.target.attrs, t.dodgeK)
  ) {
    return { dodged: true, crit: false, damage: 0 };
  }
  // 20 power, 30 skill multiplier
  let dmg = (s.power ?? Math.max(1, s.attrs.str)) * (s.skillMult ?? 1);
  // 40 crit
  const crit = s.canCrit !== false && world.rng() < critChance(s.attrs, t.critK);
  if (crit) dmg *= t.critMult;
  // 50 type multiplier: every strike is physical until damage types arrive
  // 60 mitigation: armour takes its share off a physical strike, Willpower off a spell
  if (s.target) {
    dmg *= s.spell
      ? 1 - resistPct(s.target.attrs.wp, t.resistK)
      : 1 - armourPct(s.target.armour ?? 0, t.armourK);
  }
  // 70 round
  return { dodged: false, crit, damage: Math.max(1, Math.round(dmg)) };
}

// What a unit's basic attack is made of: a weapon strike (Str, dodgeable, armoured) or, for a
// caster, a spell (Int times spellMult, undodgeable, resisted by Willpower). Buildings and lairs
// have no `target`: they dodge and mitigate nothing.
export function attackStrike(
  stats: Stats,
  target?: { attrs: Attributes; armour?: number },
): StrikeIn {
  if (stats.spellMult !== undefined) {
    return {
      attrs: stats.attrs,
      power: Math.max(1, stats.attrs.int * stats.spellMult),
      spell: true,
      target,
    };
  }
  return { attrs: stats.attrs, target, canDodge: target !== undefined };
}
