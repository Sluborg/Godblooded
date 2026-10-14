import {
  applyBuff,
  applyFear,
  applyPoison,
  applyStone,
  applySwallow,
  isSwallowed,
  takeDamage,
} from './effects';
import { spawnMonster } from './boss';
import { baseFleeOf, effectiveAttrs } from './parties';
import { dist } from './units';
import { statsOf, type World } from './world';
import type { BossMove, MonsterDef, TimedMove, UnitState } from './types';

// The signature moves of the bosses (monsters-and-bosses.md section 3): venom, howl, riddle,
// swallow on a timer, and the Hydra's heads. Fire Breath is in boss.ts (it rides a strike).

type TimedKind = 'venom' | 'howl' | 'riddle' | 'swallow';
const TIMED: TimedKind[] = ['venom', 'howl', 'riddle', 'swallow'];

const bossDef = (world: World, unit: UnitState): MonsterDef | undefined =>
  world.data.monsters?.find((m) => m.id === unit.type);

const livingHeroes = (world: World): UnitState[] =>
  world.units.filter((u) => u.kind === 'hero' && !u.ko && u.hp > 0 && !isSwallowed(world, u.id));

// Heroes within the boss's weapon range: where its moves can reach.
function inReach(world: World, boss: UnitState): UnitState[] {
  const range = statsOf(world, boss)?.weapon.range ?? 0;
  return livingHeroes(world).filter((h) => dist(boss.pos, h.pos) <= range + 20);
}

// Per tick: timed moves start and resolve, poison and swallow tick, heads grow back.
export function runBossMoves(world: World): void {
  for (const boss of world.units) {
    const brt = world.unitRuntime.get(boss.id)?.boss;
    if (!brt || boss.hp <= 0) continue;
    const mon = bossDef(world, boss);
    const move = mon?.move;
    if (!mon || !move) continue;
    for (const kind of TIMED) {
      const def = move[kind] as (TimedMove & Record<string, number>) | undefined;
      if (def) timed(world, boss, brt, kind, def);
    }
    if (move.heads) hydra(world, boss, brt, move.heads);
  }
  statusTicks(world);
}

function timed(
  world: World,
  boss: UnitState,
  brt: NonNullable<ReturnType<typeof bossRuntime>>,
  kind: TimedKind,
  def: TimedMove,
): void {
  const every = (brt.enraged ? def.enragedEveryS : def.everyS) * 1000;
  brt.nextMoveMs ??= world.timeMs + every;
  if (brt.pending) {
    // One move at a time: the others wait while this one is announced.
    if (brt.pending.kind !== kind || world.timeMs < brt.pending.atMs) return;
    const target = world.units.find((u) => u.id === brt.pending?.target);
    brt.pending = undefined;
    brt.nextMoveMs = world.timeMs + every;
    if (kind === 'howl') {
      howl(world, boss, def as never);
    } else if (target && target.kind === 'hero' && !target.ko && target.hp > 0) {
      if (kind === 'venom') venom(world, boss, target, def as never);
      else if (kind === 'riddle') riddle(world, boss, target, def as never);
      else swallow(world, boss, target, def as never);
    }
    return;
  }
  if (world.timeMs < brt.nextMoveMs) return;
  const reach = inReach(world, boss);
  if (reach.length === 0) return;
  let target: UnitState;
  if (kind === 'riddle') {
    // The one with the lowest Int.
    target = reach.reduce((a, b) => (intOf(world, b) < intOf(world, a) ? b : a));
  } else if (kind === 'howl') {
    target = reach[0];
  } else {
    // The one with the most hp.
    target = reach.reduce((a, b) => (b.hp > a.hp ? b : a));
  }
  brt.pending = { kind, atMs: world.timeMs + def.windupMs, target: target.id };
  world.events.push({
    kind: 'windup',
    attacker: boss.id,
    target: target.id,
    inMs: def.windupMs,
    move: kind,
  });
}

const bossRuntime = (world: World, id: number) => world.unitRuntime.get(id)?.boss;

const intOf = (world: World, hero: UnitState): number => {
  const cls = world.data.classes?.find((c) => c.id === hero.type);
  return cls ? effectiveAttrs(world, hero, cls.attrs).int : 0;
};

function venom(
  world: World,
  boss: UnitState,
  target: UnitState,
  v: NonNullable<BossMove['venom']>,
) {
  for (const h of livingHeroes(world)) {
    if (h.id === target.id || dist(h.pos, target.pos) <= v.radius) {
      applyPoison(world, h, v.dotPct, v.s, boss.id);
    }
  }
}

function howl(world: World, boss: UnitState, h: NonNullable<BossMove['howl']>) {
  for (const hero of livingHeroes(world)) {
    if (dist(boss.pos, hero.pos) > h.radius || hero.hp >= hero.maxHp * h.belowHp) continue;
    // The bold are not shaken.
    if (hero.trait === 'brave' || hero.trait === 'proud' || baseFleeOf(world, hero) <= 0) continue;
    applyFear(world, hero, boss.pos, h.fleeS);
  }
  const brt = bossRuntime(world, boss.id);
  const lair = brt && world.lairs.find((l) => l.id === brt.lair);
  const def = lair && world.data.lairs?.find((l) => l.id === lair.type);
  const guard = world.data.monsters?.find((m) => m.id === def?.escort);
  if (lair && guard && !guard.boss) {
    // The call tops the lair's guard up to maxAlive plus the call, it does not pile up.
    const alive = world.units.filter(
      (u) => u.hp > 0 && world.unitRuntime.get(u.id)?.lair === lair.id && u.type === guard.id,
    ).length;
    const cap = (def?.maxAlive ?? 0) + h.calls;
    for (let i = 0; i < Math.min(h.calls, cap - alive); i++) spawnMonster(world, lair, guard);
  }
}

function riddle(
  world: World,
  boss: UnitState,
  target: UnitState,
  r: NonNullable<BossMove['riddle']>,
) {
  const answered = intOf(world, target) >= r.intAtLeast;
  if (answered) applyBuff(world, target, 'damage', r.buff, r.buffS);
  else applyStone(world, target, r.stoneS);
  world.events.push({ kind: 'riddle', boss: boss.id, target: target.id, answered });
}

function swallow(
  world: World,
  boss: UnitState,
  target: UnitState,
  s: NonNullable<BossMove['swallow']>,
) {
  // Freed once the boss has lost freePct of its max hp from here.
  const freeAtHp = boss.hp - s.freePct * boss.maxHp;
  applySwallow(world, target, s.s, boss.id, s.dotPct, freeAtHp);
}

// Poison and swallow pay out each second as death damage credited to the boss (a knockout
// that way counts as a boss knockout); a swallowed hero comes back when time runs out or the
// boss has taken enough.
function statusTicks(world: World): void {
  for (const hero of world.units) {
    if (hero.kind !== 'hero' || hero.ko || hero.hp <= 0) continue;
    const fx = world.unitRuntime.get(hero.id)?.fx;
    if (!fx) continue;
    const pay = (pctS: number, by: number) => {
      // Stone halves it and a shield soaks it, like any other damage.
      hero.hp -= takeDamage(world, hero, Math.max(1, Math.round(pctS * hero.maxHp))).hp;
      if (hero.hp <= 0) {
        hero.hp = 0;
        world.pendingDeaths.push({ victim: hero.id, by });
      }
    };
    const poison = fx.poison;
    if (poison) {
      if (world.timeMs >= poison.until) fx.poison = undefined;
      else if (world.timeMs >= poison.nextMs) {
        poison.nextMs += 1000;
        pay(poison.pctS, poison.by);
      }
    }
    const sw = fx.swallow;
    if (sw) {
      const boss = world.units.find((u) => u.id === sw.by);
      if (world.timeMs >= sw.until || !boss || boss.hp <= 0 || boss.hp <= sw.freeAtHp) {
        fx.swallow = undefined;
      } else if (world.timeMs >= sw.nextMs) {
        sw.nextMs += 1000;
        pay(sw.pctS, sw.by);
      }
    }
  }
}

function hydra(
  world: World,
  boss: UnitState,
  brt: NonNullable<ReturnType<typeof bossRuntime>>,
  h: NonNullable<BossMove['heads']>,
): void {
  brt.heads ??= h.count;
  brt.cuts ??= 0;
  // A new cut when hp passes the next line.
  const line = h.cutAt[brt.cuts];
  if (line !== undefined && boss.hp <= boss.maxHp * line) {
    brt.cuts++;
    brt.heads = Math.max(1, brt.heads - 1);
    // A second cut while one head is growing back queues behind it, none is forgotten.
    brt.regrowing = (brt.regrowing ?? 0) + 1;
    brt.regrowAtMs ??= world.timeMs + (brt.enraged ? h.enragedRegrowS : h.regrowS) * 1000;
    world.events.push({ kind: 'bossHeads', unit: boss.id, heads: brt.heads });
  }
  if (brt.regrowAtMs != null && world.timeMs >= brt.regrowAtMs) {
    brt.heads = Math.min(h.count, (brt.heads ?? 0) + 1);
    brt.regrowing = Math.max(0, (brt.regrowing ?? 1) - 1);
    brt.regrowAtMs =
      brt.regrowing > 0 ? world.timeMs + (brt.enraged ? h.enragedRegrowS : h.regrowS) * 1000 : null;
    world.events.push({ kind: 'bossHeads', unit: boss.id, heads: brt.heads });
  }
}

// A hit of the stopping type (fire) on a Hydra that is regrowing a head keeps the head cut.
export function hydraHit(world: World, boss: UnitState, type: string): void {
  const mon = bossDef(world, boss);
  const brt = bossRuntime(world, boss.id);
  const heads = mon?.move?.heads;
  if (!heads || !brt || brt.regrowAtMs == null || type !== heads.stopType) return;
  brt.regrowAtMs = null;
  brt.regrowing = 0;
}

// How many heroes a Hydra's strike reaches now (1 for any other monster).
export function headCount(world: World, unit: UnitState): number {
  const brt = bossRuntime(world, unit.id);
  return bossDef(world, unit)?.move?.heads ? (brt?.heads ?? 1) : 1;
}
