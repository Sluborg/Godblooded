import { dist, TICK_MS } from './units';
import { stealJar } from './workers';
import type { World } from './world';
import type { MonsterQuirk, UnitState } from './types';

// Monster quirks (Sim 370, docs/systems/monsters-and-bosses.md): one always-on trick per monster
// row, each implemented once in the rule it belongs to.

export const quirkOf = (world: World, unit: UnitState): MonsterQuirk | undefined =>
  unit.kind === 'monster' ? world.data.monsters?.find((m) => m.id === unit.type)?.quirk : undefined;

// Regrowth: every tick a regenerating monster heals, unless a stopping hit paused it.
export function runQuirks(world: World): void {
  for (const unit of world.units) {
    if (unit.kind !== 'monster' || unit.hp <= 0 || unit.hp >= unit.maxHp) continue;
    const regen = quirkOf(world, unit)?.regen;
    const rt = world.unitRuntime.get(unit.id);
    if (!regen || !rt || world.timeMs < (rt.regenStopMs ?? 0)) continue;
    const acc = (rt.regenAcc ?? 0) + (regen.pctS * unit.maxHp * TICK_MS) / 1000;
    const whole = Math.floor(acc);
    rt.regenAcc = acc - whole;
    unit.hp = Math.min(unit.maxHp, unit.hp + whole);
  }
}

// A landed strike on a regenerating monster: a hit of the stopping type pauses it.
export function regenHit(world: World, foe: UnitState, type: string): void {
  const regen = quirkOf(world, foe)?.regen;
  if (!regen?.stopOnType || regen.stopOnType !== type) return;
  const rt = world.unitRuntime.get(foe.id);
  if (rt) rt.regenStopMs = world.timeMs + (regen.stopS ?? 0) * 1000;
}

// Snatch: a landed strike takes gold from the hero.
export function snatch(world: World, thief: UnitState, victim: UnitState): void {
  const n = quirkOf(world, thief)?.stealGold;
  const rt = world.unitRuntime.get(thief.id);
  if (n && victim.kind === 'worker' && stealJar(world, thief, victim)) return;
  if (!n || !rt || victim.kind !== 'hero' || victim.gold <= 0) return;
  const gold = Math.min(n, victim.gold);
  victim.gold -= gold;
  rt.stolen = (rt.stolen ?? 0) + gold;
  world.events.push({ kind: 'stolen', thief: thief.id, victim: victim.id, gold });
}

// The gold a dead thief carried, for whoever killed it.
export const stolenBy = (world: World, id: number): number =>
  world.unitRuntime.get(id)?.stolen ?? 0;

// Grave-cold: how many times longer a hero this killer knocks out stays down.
export function koTimeMult(world: World, killerId: number): number {
  const killer = world.units.find((u) => u.id === killerId);
  return (killer && quirkOf(world, killer)?.koMult) || 1;
}

// Scavenger: when a monster with the quirk knocks a hero out, it and its pack mates (same kind,
// within packRadius of it) heal. Another monster's kill heals nobody.
export function scavenge(world: World, killerId: number): void {
  const killer = world.units.find((u) => u.id === killerId);
  if (!killer || killer.kind !== 'monster' || !quirkOf(world, killer)?.healOnKo) return;
  const radius = world.tuning.role.packRadius;
  for (const m of world.units) {
    if (m.kind !== 'monster' || m.hp <= 0 || m.type !== killer.type) continue;
    if (m.id !== killer.id && dist(m.pos, killer.pos) > radius) continue;
    const share = quirkOf(world, m)?.healOnKo;
    if (share) m.hp = Math.min(m.maxHp, m.hp + Math.round(share * m.maxHp));
  }
}
