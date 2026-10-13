import { DEFAULT_TUNING } from './tuning';
import type { Attributes, MonsterDef, Vec2 } from './types';

// Fixed simulation step. Scene passes frame time (times game speed); the world runs whole
// ticks, so results never depend on the frame rate.
export const TICK_MS = 50;

export interface Stats {
  attrs: Attributes;
  weapon: { baseAttackS: number; range: number };
  // Flat armour against physical strikes (0 when missing).
  armour?: number;
  // A caster's strike is a spell of Int times this (see ClassDef.spellMult).
  spellMult?: number;
  // Share of speed and attack rate lost to chill (0 when none).
  slow?: number;
  // Attack rate gained from buffs (0.5 = 50% faster).
  haste?: number;
  // The type of the basic attack (casters: their god's or path's); missing: physical or, for a
  // caster, an untyped spell.
  damageType?: string;
  // As a target: tags and the damage type to multiplier row (monsters).
  tags?: readonly string[];
  types?: Partial<Record<string, number>>;
}

// Graybox derivations from the Coda combat reference (Lead's numbers stay attributes only).
export function maxHp(a: Attributes): number {
  return a.sta * 8 + a.str * 4;
}

// World units per second. Simplified for the graybox: slow base plus dex.
export function speed(a: Attributes): number {
  return 40 + a.dex * 8;
}

export function monsterHp(def: MonsterDef): number {
  return maxHp(def.attrs);
}

// Moves `pos` toward `target` by at most `dist`. Returns the unit direction (0,0 if arrived).
export function stepToward(pos: Vec2, target: Vec2, dist: number): Vec2 {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: 0, y: 0 };
  if (len <= dist) {
    pos.x = target.x;
    pos.y = target.y;
    return { x: dx / len, y: dy / len };
  }
  pos.x += (dx / len) * dist;
  pos.y += (dy / len) * dist;
  return { x: dx / len, y: dy / len };
}

// Combat curves (docs/systems/combat.md): chances follow 0.9 * x / (x + K), never 100% and capped
// at 90%. The K values live in tuning.combat; the defaults are used when a caller has no world.
const DEFAULT_COMBAT = DEFAULT_TUNING.combat;
const curve = (x: number, k: number) => (x <= 0 ? 0 : (0.9 * x) / (x + k));

export function damage(a: Attributes): number {
  return Math.max(1, a.str);
}

// Attack time falls with Dex but never below 10% of the weapon's base time.
export function attackMs(s: Stats, k: number = DEFAULT_COMBAT.attackK): number {
  return (
    (s.weapon.baseAttackS * 1000 * (1 - curve(s.attrs.dex, k))) /
    (1 - (s.slow ?? 0)) /
    (1 + (s.haste ?? 0))
  );
}

// World units per second of a unit, chill included.
export function speedOf(s: Stats): number {
  return speed(s.attrs) * (1 - (s.slow ?? 0));
}

export function dodgeChance(a: Attributes, k: number = DEFAULT_COMBAT.dodgeK): number {
  return curve(2 * a.dex + a.per, k);
}

export function critChance(a: Attributes, k: number = DEFAULT_COMBAT.critK): number {
  return curve(a.per, k);
}

// Share of a physical strike that armour takes off.
export function armourPct(armour: number, k: number = DEFAULT_COMBAT.armourK): number {
  return curve(armour, k);
}

// Share of a non-physical strike that Willpower takes off.
export function resistPct(wp: number, k: number = DEFAULT_COMBAT.resistK): number {
  return curve(wp, k);
}

// How far a unit notices enemies.
export function aggroRange(a: Attributes): number {
  return 150 + a.per * 15;
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// The value of a per-tier tuning array for `tier` (1-based); the last entry holds above it.
export function tierValue(values: readonly number[], tier: number, fallback: number): number {
  return values[Math.min(Math.max(tier, 1), values.length) - 1] ?? fallback;
}

// A monster's attributes at a lair tier: every attribute scaled and rounded.
export function scaleAttrs(a: Attributes, mult: number): Attributes {
  if (mult === 1) return a;
  const out = { ...a };
  for (const k of Object.keys(out) as (keyof Attributes)[]) out[k] = Math.round(out[k] * mult);
  return out;
}
