import type { UnitState, Vec2 } from '../sim/api';

// Watch camera: picks the most interesting fight and eases toward it. Pure, so it is unit
// tested; MapScene feeds it the snapshot and moves the camera.

// Units fighting within this distance of each other count as one fight.
export const FIGHT_RADIUS = 260;
// A new fight must beat the one being watched by this factor, and the watched one must have been
// held for MIN_HOLD_MS, before the camera moves on (so it does not flick between fights).
export const SWITCH_FACTOR = 1.5;
export const MIN_HOLD_MS = 3000;

export interface Fight {
  // Lowest unit id in the fight, stable while the same units fight.
  key: number;
  members: number[];
  center: Vec2;
  score: number;
}

function engaged(u: UnitState, byId: Map<number, UnitState>): boolean {
  if (u.ko || u.target === null) return false;
  const t = byId.get(u.target);
  return t !== undefined && !t.ko;
}

// Every group of units in combat. Score: bodies in the fight, plus weight for high tiers
// (a boss or a tier 3 hero is worth watching) and for a hero close to falling.
export function findFights(units: readonly UnitState[]): Fight[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const fighters = units.filter((u) => engaged(u, byId));
  const groups: UnitState[][] = [];
  for (const u of fighters) {
    const near = groups.filter((g) =>
      g.some((m) => Math.hypot(m.pos.x - u.pos.x, m.pos.y - u.pos.y) <= FIGHT_RADIUS),
    );
    const merged: UnitState[] = [u];
    for (const g of near) {
      merged.push(...g);
      groups.splice(groups.indexOf(g), 1);
    }
    groups.push(merged);
  }
  return groups.map((g) => {
    let score = 0;
    for (const u of g) {
      score += 1 + (u.tier - 1) * 1.5;
      if (u.kind === 'hero' && u.hp / u.maxHp < 0.3) score += 1;
    }
    const cx = g.reduce((s, u) => s + u.pos.x, 0) / g.length;
    const cy = g.reduce((s, u) => s + u.pos.y, 0) / g.length;
    return {
      key: Math.min(...g.map((u) => u.id)),
      members: g.map((u) => u.id),
      center: { x: cx, y: cy },
      score,
    };
  });
}

export class WatchDirector {
  private key: number | null = null;
  private heldMs = 0;

  // The fight to look at this frame, or null when nothing is fighting (the camera stays put).
  update(units: readonly UnitState[], dtMs: number): Fight | null {
    const fights = findFights(units);
    this.heldMs += dtMs;
    const best = fights.reduce<Fight | null>((a, f) => (a && a.score >= f.score ? a : f), null);
    const current = this.key === null ? undefined : fights.find((f) => f.key === this.key);
    if (!best) {
      this.key = null;
      return null;
    }
    if (!current) {
      this.key = best.key;
      this.heldMs = 0;
      return best;
    }
    if (
      best.key !== current.key &&
      this.heldMs >= MIN_HOLD_MS &&
      best.score >= current.score * SWITCH_FACTOR
    ) {
      this.key = best.key;
      this.heldMs = 0;
      return best;
    }
    return current;
  }

  reset(): void {
    this.key = null;
    this.heldMs = 0;
  }
}

// Exponential ease: covers about 63% of the gap every `halfLifeMs`-ish time constant.
export function easeToward(cur: Vec2, target: Vec2, dtMs: number, tauMs = 400): Vec2 {
  const k = 1 - Math.exp(-Math.max(0, dtMs) / tauMs);
  return { x: cur.x + (target.x - cur.x) * k, y: cur.y + (target.y - cur.y) * k };
}
