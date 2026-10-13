import { addBond } from './parties';
import { passiveDeathAdd, passiveKoGoldLoss } from './passives';
import { isBoss } from './boss';
import type { World } from './world';
import type { UnitState } from './types';

// What a knockout costs and when it kills (Sim 230, docs/systems/combat.md section 6, Stefan's
// answers of 2026-10-13): the hero drops a share of its gold and each party mate likes it a
// little less; a knockout by a boss, or by a monster of a tier 3 lair, may kill for good.

// Takes the gold a knocked out hero drops (a passive such as Freyja's can set the share to 0)
// and returns how much it was.
export function koGoldLost(world: World, unit: UnitState): number {
  const share = world.tuning.combat.koGoldLoss * passiveKoGoldLoss(world, unit);
  const lost = Math.floor(unit.gold * share);
  unit.gold -= lost;
  return lost;
}

// Each party mate's bond with the fallen drops by one, like fleeing.
export function koBonds(world: World, unit: UnitState): void {
  const party = world.parties.get(unit.party);
  for (const other of party?.members ?? [])
    if (other !== unit.id) addBond(world, unit.id, other, -1);
}

// Does this killer put a knockout at risk of death? A boss, or a monster of a tier 3 lair
// (raiders do not count: they march on the town, not in a lair).
function deadly(world: World, killer: UnitState | undefined): boolean {
  if (!killer || killer.kind !== 'monster') return false;
  const mon = world.data.monsters?.find((m) => m.id === killer.type);
  if (isBoss(mon)) return true;
  const rt = world.unitRuntime.get(killer.id);
  return killer.tier >= 3 && rt?.lair !== null && rt?.lair !== undefined && !rt.raid;
}

// The chance a hero knocked out by `by` is slain, or undefined when `by` cannot kill.
export function deathChance(world: World, unit: UnitState, by: number): number | undefined {
  const killer = world.units.find((u) => u.id === by);
  if (!deadly(world, killer)) return undefined;
  const t = world.tuning.combat;
  const shrineTier = Math.max(
    0,
    ...world.buildings.filter((b) => b.type === 'shrine').map((b) => b.tier),
  );
  const party = world.parties.get(unit.party);
  const healer = (party?.members ?? []).some((id) => {
    const mate = id === unit.id ? undefined : world.units.find((u) => u.id === id);
    return (
      !!mate &&
      !mate.ko &&
      mate.hp > 0 &&
      !!world.data.classes?.find((c) => c.id === mate.type)?.heals
    );
  });
  const chance =
    t.bossDeathChance -
    t.deathShrineStep * shrineTier -
    (healer ? t.deathHealerStep : 0) +
    passiveDeathAdd(world, unit);
  return Math.max(t.deathFloor, chance);
}

// A hero is slain: it leaves the party and the map for good and a grave stays.
export function slayHero(world: World, unit: UnitState): void {
  world.graves.push({
    id: unit.id,
    type: unit.type,
    god: unit.god,
    path: unit.path,
    tier: unit.tier,
    pos: { ...unit.pos },
    timeMs: world.timeMs,
  });
  const party = world.parties.get(unit.party);
  if (party) {
    party.members = party.members.filter((id) => id !== unit.id);
    if (party.members.length === 0) world.parties.delete(party.id);
  }
  unit.hp = 0;
  world.heroRuntime.delete(unit.id);
  world.unitRuntime.delete(unit.id);
}
