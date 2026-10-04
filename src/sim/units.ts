import type { Attributes, MonsterDef, Vec2 } from './types';

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
