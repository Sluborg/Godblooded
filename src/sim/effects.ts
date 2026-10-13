import { passiveBuff } from './passives';
import type { World } from './world';
import type { BuffStat, UnitState } from './types';

// Statuses that skills put on units (Sim 250): shield, mark, taunt and buffs. They live in the
// unit's runtime, end by the clock, and are read where they matter: damage taken (landStrike),
// stats (statsOf, targetOf) and target picking.

export interface UnitFx {
  // Absorbs damage until spent or `until`.
  shield?: { hp: number; until: number };
  // Damage taken x (1 + pct).
  mark?: { pct: number; until: number };
  // Monsters with this go for `by`.
  taunt?: { by: number; until: number };
  buffs?: { stat: BuffStat; amount: number; until: number }[];
}

function fxOf(world: World, id: number): UnitFx | undefined {
  return world.unitRuntime.get(id)?.fx;
}

function slot(world: World, id: number): UnitFx | undefined {
  const rt = world.unitRuntime.get(id);
  return rt && (rt.fx ??= {});
}

export function applyShield(world: World, unit: UnitState, hp: number, s: number): void {
  const fx = slot(world, unit.id);
  if (!fx || hp <= 0) return;
  // A weaker recast does not wipe out a stronger shield that is still up.
  const old = fx.shield;
  if (old && world.timeMs < old.until && old.hp > hp) return;
  const until = world.timeMs + s * 1000;
  fx.shield = { hp, until };
  world.events.push({ kind: 'status', unit: unit.id, status: 'shield', until });
}

export function applyMark(world: World, unit: UnitState, pct: number, s: number): void {
  const fx = slot(world, unit.id);
  if (!fx) return;
  const until = world.timeMs + s * 1000;
  fx.mark = { pct, until };
  world.events.push({ kind: 'status', unit: unit.id, status: 'mark', until });
}

export function applyTaunt(world: World, unit: UnitState, by: number, s: number): void {
  const fx = slot(world, unit.id);
  if (!fx) return;
  const until = world.timeMs + s * 1000;
  fx.taunt = { by, until };
  world.events.push({ kind: 'status', unit: unit.id, status: 'taunt', until });
}

export function applyBuff(
  world: World,
  unit: UnitState,
  stat: BuffStat,
  amount: number,
  s: number,
): void {
  const fx = slot(world, unit.id);
  if (!fx) return;
  const until = world.timeMs + s * 1000;
  fx.buffs = [...(fx.buffs ?? []).filter((b) => b.stat !== stat), { stat, amount, until }];
  world.events.push({ kind: 'status', unit: unit.id, status: 'buff', until });
}

// The sum of the unit's running buffs of a stat (0 when none).
export function buffOf(world: World, id: number, stat: BuffStat): number {
  const unit = world.units.find((u) => u.id === id);
  let sum = unit ? passiveBuff(world, unit, stat) : 0;
  for (const b of fxOf(world, id)?.buffs ?? []) {
    if (b.stat === stat && world.timeMs < b.until) sum += b.amount;
  }
  return sum;
}

// A strike of `damage` on the unit after its mark (`dealt`, what the hit shows) and its shield
// (`hp`, what is subtracted). The shield soaks first and is spent as it does.
export function takeDamage(
  world: World,
  unit: UnitState,
  damage: number,
): { dealt: number; hp: number } {
  const fx = fxOf(world, unit.id);
  if (!fx || damage <= 0) return { dealt: damage, hp: damage };
  let dealt = damage;
  if (fx.mark && world.timeMs < fx.mark.until) {
    dealt = Math.max(1, Math.round(dealt * (1 + fx.mark.pct)));
  }
  let hp = dealt;
  const sh = fx.shield;
  if (sh && world.timeMs < sh.until) {
    const soaked = Math.min(sh.hp, hp);
    sh.hp -= soaked;
    hp -= soaked;
    if (sh.hp <= 0) fx.shield = undefined;
  }
  return { dealt, hp };
}

// The unit a taunted monster must go for, if the taunter still stands.
export function tauntOf(world: World, unit: UnitState): UnitState | undefined {
  const t = fxOf(world, unit.id)?.taunt;
  if (!t || world.timeMs >= t.until) return undefined;
  const by = world.units.find((u) => u.id === t.by);
  return by && !by.ko && by.hp > 0 ? by : undefined;
}
