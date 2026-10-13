import { hasPassive } from './passives';
import { attackMs, type Stats } from './units';
import type { UnitRuntime, World } from './world';
import type { UnitState } from './types';

// First strike on engage (Sim 210, docs/systems/combat.md section 2). A unit's fight starts when
// it takes a foe after having none for fightGapMs. When two units meet fresh, the one with the
// lower Dex + Per waits firstStrikeDelay of its attack cycle: an opening edge only, no lasting
// tempo.
export function noteFight(
  world: World,
  unit: UnitState,
  rt: UnitRuntime,
  stats: Stats,
  foe: UnitState,
  foeRt: UnitRuntime | undefined,
  foeStats: Stats | undefined,
): void {
  const t = world.tuning.combat;
  const fresh = (r: UnitRuntime | undefined) => world.timeMs >= (r?.fightUntilMs ?? 0);
  const starting = fresh(rt);
  const foeFresh = fresh(foeRt);
  // A fresh fight resets what passives count per fight.
  if (starting) rt.fight = { kills: 0, missUsed: false, strikes: 0 };
  if (foeRt && foeFresh) foeRt.fight = { kills: 0, missUsed: false, strikes: 0 };
  rt.fightUntilMs = world.timeMs + t.fightGapMs;
  if (foeRt) foeRt.fightUntilMs = Math.max(foeRt.fightUntilMs ?? 0, world.timeMs + t.fightGapMs);
  // Only when both sides are meeting for the first time: a unit joining a running fight keeps its
  // tempo.
  if (!starting || !foeFresh || !foeRt || !foeStats) return;
  // A passive that wins the first strike decides it; otherwise the lower Dex + Per waits.
  const mineWins = hasPassive(world, unit, 'firstStrike');
  const theirsWins = hasPassive(world, foe, 'firstStrike');
  const mine = stats.attrs.dex + stats.attrs.per;
  const theirs = foeStats.attrs.dex + foeStats.attrs.per;
  let meSlow: boolean;
  if (mineWins !== theirsWins) meSlow = theirsWins;
  else if (mine === theirs) return;
  else meSlow = mine < theirs;
  const [slowRt, slowStats] = meSlow ? [rt, stats] : [foeRt, foeStats];
  slowRt.cooldownMs = Math.max(
    slowRt.cooldownMs,
    attackMs(slowStats, t.attackK) * t.firstStrikeDelay,
  );
}
