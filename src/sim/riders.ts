import { resolveStrike, hitEvent, type StrikeOut } from './strike';
import { takeDamage } from './effects';
import { tally } from './runstats';
import { dist } from './units';
import type { UnitRuntime, World } from './world';
import { targetOf } from './world';
import type { RiderId, UnitState } from './types';

// Riders (Sim 210, docs/systems/combat.md section 3): extra effects a strike can carry. Skills
// carry them (the paths-and-skills spec); a basic attack never does. They do not stack: a new
// one refreshes the timer. Sear acts inside the strike (step 50, see strike.ts), the others
// are applied here at step 80.

export interface UnitStatus {
  burn?: { left: number; nextMs: number; tick: number; by: number };
  chill?: { untilMs: number; slow: number };
  wither?: { untilMs: number };
}

const statusOf = (rt: UnitRuntime): UnitStatus => (rt.status ??= {});

// Step 80: the rider of a landed strike takes hold on its target.
export function applyRider(
  world: World,
  rider: RiderId,
  attacker: number,
  target: UnitState,
  out: StrikeOut,
): void {
  const t = world.tuning.rider;
  const rt = world.unitRuntime.get(target.id);
  if (!rt || out.dodged) return;
  switch (rider) {
    case 'burn':
      statusOf(rt).burn = {
        left: t.burnTicks,
        nextMs: world.timeMs + t.burnEveryMs,
        tick: Math.max(1, Math.round(out.damage * t.burnShare)),
        by: attacker,
      };
      break;
    case 'chill': {
      const mon = world.data.monsters?.find((m) => m.id === target.type);
      const boss = !!mon?.boss || mon?.tags?.includes('boss');
      statusOf(rt).chill = {
        untilMs: world.timeMs + t.chillMs,
        slow: t.chillSlow * (boss ? t.chillBossMult : 1),
      };
      break;
    }
    case 'wither':
      statusOf(rt).wither = { untilMs: world.timeMs + t.witherMs };
      break;
    case 'arc':
      arc(world, attacker, target, out);
      return;
    case 'sear':
      return;
  }
  world.events.push({ kind: 'rider', target: target.id, rider, by: attacker });
}

// Lightning jumps to the nearest other foe of the target within arcRadius for a share of the hit.
function arc(world: World, attacker: number, target: UnitState, out: StrikeOut): void {
  const t = world.tuning.rider;
  let next: UnitState | undefined;
  let best = Infinity;
  for (const u of world.units) {
    if (u.id === target.id || u.kind !== target.kind || u.ko || u.hp <= 0) continue;
    const d = dist(u.pos, target.pos);
    if (d <= t.arcRadius && d < best) {
      next = u;
      best = d;
    }
  }
  const dest = next && targetOf(world, next);
  if (!next || !dest) return;
  const jump = resolveStrike(world, {
    attrs: dest.attrs,
    power: out.damage * t.arcShare,
    type: 'lightning',
    canDodge: false,
    canCrit: false,
    target: dest,
  });
  const taken = takeDamage(world, next, jump.damage);
  jump.damage = taken.dealt;
  next.hp -= taken.hp;
  tally(world, attacker, 'damage', taken.dealt);
  world.events.push(hitEvent(attacker, next.id, jump, taken.dealt - taken.hp));
  if (next.hp <= 0) {
    next.hp = 0;
    world.pendingDeaths.push({ victim: next.id, by: attacker });
  }
}

// Every tick: burn ticks land, expired chill and wither fall away.
export function runStatuses(world: World): void {
  for (const unit of world.units) {
    const rt = world.unitRuntime.get(unit.id);
    const st = rt?.status;
    if (!rt || !st) continue;
    if (st.chill && world.timeMs >= st.chill.untilMs) st.chill = undefined;
    if (st.wither && world.timeMs >= st.wither.untilMs) st.wither = undefined;
    const burn = st.burn;
    if (burn && !unit.ko && unit.hp > 0 && world.timeMs >= burn.nextMs) {
      const taken = takeDamage(world, unit, burn.tick);
      unit.hp -= taken.hp;
      tally(world, burn.by, 'damage', taken.dealt);
      world.events.push({
        kind: 'hit',
        attacker: burn.by,
        target: unit.id,
        damage: taken.hp,
        dodged: false,
        type: 'fire',
        tick: true,
        ...(taken.dealt > taken.hp ? { absorbed: taken.dealt - taken.hp } : {}),
      });
      burn.left--;
      burn.nextMs += world.tuning.rider.burnEveryMs;
      if (unit.hp <= 0) {
        unit.hp = 0;
        world.pendingDeaths.push({ victim: unit.id, by: burn.by });
      }
      if (burn.left <= 0) st.burn = undefined;
    } else if (burn && (unit.ko || unit.hp <= 0)) {
      st.burn = undefined;
    }
  }
}

// Share of speed and attack rate a unit loses to chill.
export function slowOf(world: World, id: number): number {
  const chill = world.unitRuntime.get(id)?.status?.chill;
  return chill && world.timeMs < chill.untilMs ? chill.slow : 0;
}

// Healing on a withered unit is cut.
export function healMult(world: World, id: number): number {
  const w = world.unitRuntime.get(id)?.status?.wither;
  return w && world.timeMs < w.untilMs ? world.tuning.rider.witherHealMult : 1;
}
