import { attackMs, type Stats } from './units';
import type { UnitRuntime, World } from './world';

// First strike on engage (Sim 210, docs/systems/combat.md section 2). A unit's fight starts when
// it takes a foe after having none for fightGapMs. When two units meet fresh, the one with the
// lower Dex + Per waits firstStrikeDelay of its attack cycle: an opening edge only, no lasting
// tempo.
export function noteFight(
  world: World,
  rt: UnitRuntime,
  stats: Stats,
  foeRt: UnitRuntime | undefined,
  foeStats: Stats | undefined,
): void {
  const t = world.tuning.combat;
  const fresh = (r: UnitRuntime | undefined) => world.timeMs >= (r?.fightUntilMs ?? 0);
  const starting = fresh(rt);
  const foeFresh = fresh(foeRt);
  rt.fightUntilMs = world.timeMs + t.fightGapMs;
  if (foeRt) foeRt.fightUntilMs = Math.max(foeRt.fightUntilMs ?? 0, world.timeMs + t.fightGapMs);
  // Only when both sides are meeting for the first time: a unit joining a running fight keeps its
  // tempo.
  if (!starting || !foeFresh || !foeRt || !foeStats) return;
  const mine = stats.attrs.dex + stats.attrs.per;
  const theirs = foeStats.attrs.dex + foeStats.attrs.per;
  if (mine === theirs) return;
  const [slowRt, slowStats] = mine < theirs ? [rt, stats] : [foeRt, foeStats];
  slowRt.cooldownMs = Math.max(
    slowRt.cooldownMs,
    attackMs(slowStats, t.attackK) * t.firstStrikeDelay,
  );
}
