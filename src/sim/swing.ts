import { attackMs, TICK_MS, type Stats } from './units';
import type { UnitRuntime, World } from './world';
import type { ConeArea, UnitState } from './types';

// A ground area a strike hits (a boss cleave), fixed when the windup starts.
export interface Area {
  x: number;
  y: number;
  r: number;
}

// Every strike has a windup: the attacker commits (event `windup`, `inMs` before the strike),
// stands still, then the strike resolves and emits `hit`. A swing is cancelled with no hit
// when the target changes, dies or moves out of reach, so Scene can play the full windup
// from the event and the strike from the `hit`.
export function swing(
  world: World,
  unit: UnitState,
  rt: UnitRuntime,
  stats: Stats,
  targetId: number,
  resolve: (area?: Area, cone?: ConeArea) => void,
  opts?: { windupMs?: number; area?: Area; cone?: ConeArea },
): void {
  if (rt.swing) {
    if (rt.swing.target !== targetId) {
      rt.swing = undefined;
      return;
    }
    rt.swing.ms -= TICK_MS;
    if (rt.swing.ms <= 0) {
      const { area, cone } = rt.swing;
      rt.swing = undefined;
      resolve(area, cone);
    }
    return;
  }
  if (rt.cooldownMs > 0) return;
  const cycle = attackMs(stats, world.tuning.combat.attackK);
  rt.cooldownMs = cycle;
  const ms = opts?.windupMs ?? Math.min(world.tuning.combat.windupMs, cycle * 0.4);
  rt.swing = { target: targetId, ms, area: opts?.area, cone: opts?.cone };
  world.events.push({
    kind: 'windup',
    attacker: unit.id,
    target: targetId,
    inMs: ms,
    ...(opts?.area ? { area: opts.area } : {}),
    ...(opts?.cone ? { cone: opts.cone } : {}),
  });
}
