import { dist, TICK_MS } from './units';
import type { World } from './world';
import type { BuildingCore, CommandResult } from './types';

// Ruins and repair (docs/systems/buildings.md section 3), behind tuning.town.ruins. A destroyed
// building (never the town hall) leaves a ruin on its plot; tapping it rebuilds the building at
// tier 1 for half its cost, or clears the plot for nothing. Standing buildings slowly mend while
// no monster is near.

export function leaveRuin(world: World, b: BuildingCore): void {
  if (!world.tuning.town.ruins || b.type === 'townhall' || b.plot === null) return;
  const ruin = { id: world.nextId++, type: b.type, plot: b.plot, pos: { ...b.pos } };
  world.ruins.push(ruin);
  world.events.push({
    kind: 'ruinLeft',
    ruin: ruin.id,
    type: ruin.type,
    plot: ruin.plot,
    pos: { ...ruin.pos },
  });
}

export function rebuildRuin(world: World, id: number): CommandResult {
  const ruin = world.ruins.find((r) => r.id === id);
  if (!ruin) return { ok: false, reason: 'no such ruin' };
  const def = world.data.buildings.find((d) => d.id === ruin.type);
  if (!def) return { ok: false, reason: 'unknown building' };
  const cost = Math.round(def.cost * world.tuning.town.rebuildCostMult);
  if (world.gold < cost) return { ok: false, reason: 'not enough gold' };
  world.gold -= cost;
  world.ruins = world.ruins.filter((r) => r.id !== id);
  const buildingId = world.nextId++;
  world.buildings.push({
    id: buildingId,
    type: ruin.type,
    tier: 1,
    pos: { ...ruin.pos },
    plot: ruin.plot,
    hp: world.tuning.town.buildingHp,
    maxHp: world.tuning.town.buildingHp,
  });
  world.events.push({ kind: 'built', building: buildingId, type: ruin.type });
  return { ok: true, id: buildingId };
}

export function clearRuin(world: World, id: number): CommandResult {
  if (!world.ruins.some((r) => r.id === id)) return { ok: false, reason: 'no such ruin' };
  world.ruins = world.ruins.filter((r) => r.id !== id);
  world.events.push({ kind: 'ruinCleared', ruin: id });
  return { ok: true, id };
}

// Buildings heal repairPerS of their max hp a second when no monster is within repairSafeRange.
export function runRepair(world: World): void {
  const t = world.tuning.town;
  if (!t.ruins || t.repairPerS <= 0) return;
  const monsters = world.units.filter((u) => u.kind === 'monster' && u.hp > 0);
  for (const b of world.buildings) {
    if (b.hp >= b.maxHp) continue;
    if (monsters.some((m) => dist(m.pos, b.pos) <= t.repairSafeRange)) continue;
    b.hp = Math.min(b.maxHp, b.hp + (b.maxHp * t.repairPerS * TICK_MS) / 1000);
  }
}
