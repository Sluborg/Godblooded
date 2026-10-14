import { dist } from './units';
import type { World } from './world';
import type { Snapshot, UnitState, Vec2 } from './types';

// Discovery (docs/systems/hero-ai.md section 3), behind tuning.ai.discovery. Lairs start in the fog
// (all but those within startDiscovered of the town hall); a lair is discovered when a hero comes
// within discoverRange of it. The map is a grid of cells; a hero within exploreRange of a cell's
// centre explores it. Heroes only score discovered lairs, and explore heads for the nearest
// unexplored cell.

const on = (world: World): boolean => world.tuning.ai.discovery;

export const isDiscovered = (world: World, lair: { discovered?: boolean }): boolean =>
  !on(world) || lair.discovered !== false;

export function gridOf(world: World): { cell: number; cols: number; rows: number } {
  const cell = Math.max(1, world.tuning.ai.cellSize);
  const { width, height } = world.data.map;
  return {
    cell,
    cols: Math.max(1, Math.ceil(width / cell)),
    rows: Math.max(1, Math.ceil(height / cell)),
  };
}

// How far a hero sees: Odin's favour (discoverMult) widens it.
function sightMult(world: World, hero: UnitState): number {
  let mult = 1;
  const party = world.parties.get(hero.party);
  for (const id of party?.upgrades ?? []) {
    const keys = world.data.upgrades?.find((u) => u.id === id)?.effect.keys;
    if (keys?.discoverMult) mult *= keys.discoverMult;
  }
  return mult;
}

export function revealLair(world: World, lairId: number, unit?: number): void {
  const lair = world.lairs.find((l) => l.id === lairId);
  if (!lair || lair.discovered !== false) return;
  lair.discovered = true;
  world.events.push({ kind: 'lairFound', lair: lair.id, unit: unit ?? 0, pos: { ...lair.pos } });
}

// Once a second: heroes find lairs and explore cells.
export function runDiscovery(world: World): void {
  if (!on(world) || world.tick % 20 !== 0) return;
  const t = world.tuning.ai;
  const { cell, cols, rows } = gridOf(world);
  const known = new Set(world.exploredCells);
  for (const u of world.units) {
    if (u.kind !== 'hero' || u.ko || u.hp <= 0) continue;
    const mult = sightMult(world, u);
    for (const lair of world.lairs) {
      if (lair.discovered === false && dist(u.pos, lair.pos) <= t.discoverRange * mult) {
        revealLair(world, lair.id, u.id);
      }
    }
    const reach = t.exploreRange * mult;
    const x0 = Math.max(0, Math.floor((u.pos.x - reach) / cell));
    const x1 = Math.min(cols - 1, Math.floor((u.pos.x + reach) / cell));
    const y0 = Math.max(0, Math.floor((u.pos.y - reach) / cell));
    const y1 = Math.min(rows - 1, Math.floor((u.pos.y + reach) / cell));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const index = cy * cols + cx;
        if (known.has(index)) continue;
        const centre = { x: (cx + 0.5) * cell, y: (cy + 0.5) * cell };
        if (dist(u.pos, centre) <= reach) {
          known.add(index);
          world.exploredCells.push(index);
        }
      }
    }
  }
}

// The nearest unexplored cell's centre from a point, if any is left.
export function nearestFog(world: World, from: Vec2): Vec2 | undefined {
  const { cell, cols, rows } = gridOf(world);
  const known = new Set(world.exploredCells);
  let best: Vec2 | undefined;
  let bestD = Infinity;
  for (let i = 0; i < cols * rows; i++) {
    if (known.has(i)) continue;
    const p = { x: ((i % cols) + 0.5) * cell, y: (Math.floor(i / cols) + 0.5) * cell };
    const d = dist(from, p);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}

export function fogLeft(world: World): boolean {
  const { cols, rows } = gridOf(world);
  return on(world) && world.exploredCells.length < cols * rows;
}

export function fogView(world: World): Snapshot['fog'] {
  if (!on(world)) return null;
  const { cell, cols, rows } = gridOf(world);
  return { cell, cols, rows, explored: [...world.exploredCells] };
}
