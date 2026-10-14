import type { World } from './world';
import type { BuildingCore, UnitState, Vec2 } from './types';

// Units keep apart and walk around buildings (docs/decisions.md, Playtest run 2). After every
// tick's movement a pass moves overlapping units apart (a neighbour grid, no O(n^2)) and pushes
// units out of building footprints, sliding them along the edge toward where they were heading, so
// nobody stands inside a roof. Deterministic: no random numbers, a fixed order (unit order). Places
// units visit (a shop, the rest spot) are the footprint's edge, not its middle (`visitPoint`).

export function footprintOf(world: World, b: BuildingCore): readonly [number, number] {
  const t = world.tuning.collision;
  if (b.type === 'townhall') return t.hallHalf;
  return world.data.buildings.find((d) => d.id === b.type)?.footprint ?? t.buildingHalf;
}

export function unitRadius(world: World, u: UnitState): number {
  const t = world.tuning.collision;
  if (u.kind === 'hero') {
    return world.data.classes?.find((c) => c.id === u.type)?.radius ?? t.heroRadius;
  }
  if (u.kind === 'monster') {
    const mon = world.data.monsters?.find((m) => m.id === u.type);
    return mon?.radius ?? (mon?.boss ? t.bossRadius : t.monsterRadius);
  }
  return t.smallRadius;
}

// Distance from a point to a building's footprint (0 inside it).
export function gapTo(world: World, b: BuildingCore, p: Vec2): number {
  const [hw, hh] = footprintOf(world, b);
  const dx = Math.max(Math.abs(p.x - b.pos.x) - hw, 0);
  const dy = Math.max(Math.abs(p.y - b.pos.y) - hh, 0);
  return Math.hypot(dx, dy);
}

// The footprint a point sits in (inflated by `pad`), if any.
function footprintAt(
  world: World,
  p: Vec2,
  pad: number,
  except?: BuildingCore,
): BuildingCore | undefined {
  for (const b of world.buildings) {
    if (b === except) continue;
    const [hw, hh] = footprintOf(world, b);
    if (Math.abs(p.x - b.pos.x) < hw + pad && Math.abs(p.y - b.pos.y) < hh + pad) return b;
  }
  return undefined;
}

// A place to walk to for a destination: unchanged if it is clear of buildings, else the point on
// the footprint's edge (plus the visit margin) on the side the visitor comes from.
export function visitPoint(world: World, to: Vec2, from: Vec2): Vec2 {
  const t = world.tuning.collision;
  if (!t.enabled) return to;
  const b = footprintAt(world, to, 0);
  if (!b) return to;
  const [hw, hh] = footprintOf(world, b);
  const dx = from.x - b.pos.x;
  let dy = from.y - b.pos.y;
  if (dx === 0 && dy === 0) dy = 1;
  // Where the ray from the middle toward the visitor leaves the footprint.
  const sx = dx === 0 ? Infinity : hw / Math.abs(dx);
  const sy = dy === 0 ? Infinity : hh / Math.abs(dy);
  const s = Math.min(sx, sy);
  const len = Math.hypot(dx, dy);
  const m = t.visitMargin;
  const direct = {
    x: b.pos.x + dx * s + (dx / len) * m,
    y: b.pos.y + dy * s + (dy / len) * m,
  };
  // Another building may stand right there (two close together): then the nearest clear side.
  if (!footprintAt(world, direct, 8, b)) return direct;
  const sides: Vec2[] = [
    { x: b.pos.x + hw + m, y: b.pos.y },
    { x: b.pos.x - hw - m, y: b.pos.y },
    { x: b.pos.x, y: b.pos.y + hh + m },
    { x: b.pos.x, y: b.pos.y - hh - m },
    { x: b.pos.x + hw + m, y: b.pos.y + hh + m },
    { x: b.pos.x - hw - m, y: b.pos.y + hh + m },
    { x: b.pos.x + hw + m, y: b.pos.y - hh - m },
    { x: b.pos.x - hw - m, y: b.pos.y - hh - m },
  ].filter((c) => !footprintAt(world, c, 8, b));
  let best = direct;
  let bestD = Infinity;
  for (const c of sides) {
    const d = Math.hypot(c.x - from.x, c.y - from.y);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

// How close counts as arrived: `reach` for a plain destination, a touch for a building's edge.
export const arrival = (world: World, plain: boolean, reach: number): number =>
  plain ? reach : world.tuning.collision.visitMargin * 2;

// Positions at the start of the tick, per world (a unit's step is what it slides along).
const before = new WeakMap<World, Map<number, Vec2>>();

export function notePositions(world: World): void {
  if (!world.tuning.collision.enabled) return;
  let m = before.get(world);
  if (!m) before.set(world, (m = new Map()));
  m.clear();
  for (const u of world.units) m.set(u.id, { x: u.pos.x, y: u.pos.y });
}

// A deterministic direction for two units on the very same spot (golden angle by id).
function spread(id: number): Vec2 {
  const a = id * 2.399963;
  return { x: Math.cos(a), y: Math.sin(a) };
}

export function runCollision(world: World): void {
  const t = world.tuning.collision;
  if (!t.enabled) return;
  const prev = before.get(world);
  const units = world.units.filter((u) => u.hp > 0 || u.kind === 'hero');
  const { width, height } = world.data.map;
  // 1. Out of the buildings, sliding toward where the unit was heading.
  for (const u of units) {
    if (u.ko && u.kind === 'hero') continue;
    const r = unitRadius(world, u);
    const b = footprintAt(world, u.pos, r);
    if (!b) continue;
    const [hw, hh] = footprintOf(world, b);
    const ex = hw + r;
    const ey = hh + r;
    const dx = u.pos.x - b.pos.x;
    const dy = u.pos.y - b.pos.y;
    const depthX = ex - Math.abs(dx);
    const depthY = ey - Math.abs(dy);
    // Out along the shallower axis.
    const pushX = depthX <= depthY;
    const sign = pushX ? (dx === 0 ? spread(u.id).x : dx) : dy === 0 ? spread(u.id).y : dy;
    const edge = pushX
      ? { x: b.pos.x + Math.sign(sign) * ex, y: u.pos.y }
      : { x: u.pos.x, y: b.pos.y + Math.sign(sign) * ey };
    // Slide along the edge, to the side of the building's middle the unit is already on (a steady
    // side, so it does not flip back and forth), as far as it was going to step.
    const pv = prev?.get(u.id);
    const step = pv ? Math.hypot(u.pos.x - pv.x, u.pos.y - pv.y) : 0;
    const steady = pushX
      ? dy === 0
        ? Math.sign(spread(u.id).y)
        : Math.sign(dy)
      : dx === 0
        ? Math.sign(spread(u.id).x)
        : Math.sign(dx);
    // Along the edge the way the unit was walking, if it was walking that way at all (a corner
    // between the unit and its goal); head-on at the middle it keeps its steady side.
    const along = pv ? (pushX ? u.pos.y - pv.y : u.pos.x - pv.x) : 0;
    const side = Math.abs(along) > step * 0.25 ? Math.sign(along) : steady;
    const slide = step * 0.8;
    // (In place: other code keeps references to a unit's position.)
    u.pos.x = edge.x + (pushX ? 0 : side * slide);
    u.pos.y = edge.y + (pushX ? side * slide : 0);
  }
  // 2. Apart from each other: a grid of cells, each unit looks at its own and the next cells.
  const cell = t.cell;
  const grid = new Map<number, UnitState[]>();
  const key = (cx: number, cy: number) => cx * 73856093 + cy * 19349663;
  for (const u of units) {
    if (u.ko && u.kind === 'hero') continue;
    const k = key(Math.floor(u.pos.x / cell), Math.floor(u.pos.y / cell));
    const list = grid.get(k);
    if (list) list.push(u);
    else grid.set(k, [u]);
  }
  const radii = new Map<number, number>();
  const rad = (u: UnitState): number => {
    let r = radii.get(u.id);
    if (r === undefined) radii.set(u.id, (r = unitRadius(world, u)));
    return r;
  };
  const shift = new Map<number, Vec2>();
  for (const a of units) {
    if (a.ko && a.kind === 'hero') continue;
    const cx = Math.floor(a.pos.x / cell);
    const cy = Math.floor(a.pos.y / cell);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const list = grid.get(key(cx + ox, cy + oy));
        if (!list) continue;
        for (const b of list) {
          // Each pair once (the lower id handles it).
          if (b.id <= a.id) continue;
          let dx = b.pos.x - a.pos.x;
          let dy = b.pos.y - a.pos.y;
          const min = rad(a) + rad(b);
          if (Math.abs(dx) >= min || Math.abs(dy) >= min) continue;
          let d = Math.hypot(dx, dy);
          if (d >= min) continue;
          if (d < 1e-6) {
            const s = spread(a.id + b.id);
            dx = s.x;
            dy = s.y;
            d = 1;
          }
          const push = Math.min(t.maxPush, ((min - d) * t.relax) / 2);
          const nx = dx / d;
          const ny = dy / d;
          const sa = shift.get(a.id) ?? { x: 0, y: 0 };
          const sb = shift.get(b.id) ?? { x: 0, y: 0 };
          sa.x -= nx * push;
          sa.y -= ny * push;
          sb.x += nx * push;
          sb.y += ny * push;
          shift.set(a.id, sa);
          shift.set(b.id, sb);
        }
      }
    }
  }
  for (const u of units) {
    const s = shift.get(u.id);
    if (!s) continue;
    const cap = t.maxPush;
    const len = Math.hypot(s.x, s.y);
    const k = len > cap ? cap / len : 1;
    u.pos.x += s.x * k;
    u.pos.y += s.y * k;
  }
  // 3. Pushing may not put anyone back inside a building or off the map.
  for (const u of units) {
    if (u.ko && u.kind === 'hero') continue;
    const r = unitRadius(world, u);
    const b = shift.has(u.id) ? footprintAt(world, u.pos, r) : undefined;
    if (b) {
      const [hw, hh] = footprintOf(world, b);
      const dx = u.pos.x - b.pos.x;
      const dy = u.pos.y - b.pos.y;
      if (hw + r - Math.abs(dx) <= hh + r - Math.abs(dy)) {
        u.pos.x = b.pos.x + (dx < 0 ? -1 : 1) * (hw + r);
      } else {
        u.pos.y = b.pos.y + (dy < 0 ? -1 : 1) * (hh + r);
      }
    }
    u.pos.x = Math.min(width, Math.max(0, u.pos.x));
    u.pos.y = Math.min(height, Math.max(0, u.pos.y));
  }
}
