import { attackMs, TICK_MS, type Stats } from './units';
import type { UnitRuntime, World } from './world';
import type { UnitState } from './types';

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
  resolve: () => void,
): void {
  if (rt.swing) {
    if (rt.swing.target !== targetId) {
      rt.swing = undefined;
      return;
    }
    rt.swing.ms -= TICK_MS;
    if (rt.swing.ms <= 0) {
      rt.swing = undefined;
      resolve();
    }
    return;
  }
  if (rt.cooldownMs > 0) return;
  const cycle = attackMs(stats);
  rt.cooldownMs = cycle;
  const ms = Math.min(world.tuning.combat.windupMs, cycle * 0.4);
  rt.swing = { target: targetId, ms };
  world.events.push({ kind: 'windup', attacker: unit.id, target: targetId, inMs: ms });
}
