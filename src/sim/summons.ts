import { resolveEffectsAt } from './skills';
import { swing } from './swing';
import { attackStrike, landStrike } from './strike';
import {
  dist,
  monsterHp,
  scaleAttrs,
  speedOf,
  stepToward,
  tierValue,
  TICK_MS,
  type Stats,
} from './units';
import { statsOf, targetOf, type UnitRuntime, type World } from './world';
import type { SummonDef, SummonEffect, UnitState, Vec2 } from './types';

// Summons (Sim 270, docs/systems/paths-and-skills.md section 7): units a skill calls. They fight
// for the party (kind 'summon'), foes can target them, and kills they make count for their
// owner. A decoy taunts, a falcon strikes from the air, a thrall is a dead monster risen.

export const summonDef = (world: World, id: string): SummonDef | undefined =>
  world.data.summons?.find((s) => s.id === id);

// How far a summon follows its owner before it walks back, and how far from the owner it looks
// for a foe.
const HEEL = 60;
const LEASH = 300;

// Stats of a summon: a thrall has the dead monster's, others the owner's attributes (dodge,
// armour) and the row's strike speed.
export function summonStats(world: World, unit: UnitState): Stats | undefined {
  const sm = unit.summon;
  const def = sm && summonDef(world, sm.def);
  const owner = sm && world.units.find((u) => u.id === sm.owner);
  if (!sm || !def || !owner) return undefined;
  if (def.fromDead) {
    const mon = world.data.monsters?.find((m) => m.id === unit.type);
    if (!mon) return undefined;
    const mult = tierValue(world.tuning.lair.statMult, unit.tier, 1) * def.fromDead.share;
    return {
      weapon: mon.weapon,
      attrs: scaleAttrs(mon.attrs, mult),
      armour: Math.round((mon.armour ?? 0) * mult),
      tags: mon.tags,
      types: mon.types,
    };
  }
  const base = statsOf(world, owner);
  if (!base) return undefined;
  return {
    attrs: base.attrs,
    armour: base.armour,
    weapon: { baseAttackS: def.strike?.everyS ?? 1, range: 40 },
  };
}

// Calls `count` units of a summon row around `point`. Units this skill already called of the same
// row are replaced.
export function spawnSummons(
  world: World,
  owner: UnitState,
  eff: SummonEffect,
  point: Vec2,
  src: string,
  dead: { type: string; tier: number; pos: Vec2 }[] = [],
): void {
  const def = summonDef(world, eff.summon);
  if (!def) return;
  for (const u of [...world.units]) {
    if (
      u.summon &&
      u.summon.owner === owner.id &&
      u.summon.def === def.id &&
      u.summon.src === src
    ) {
      removeSummon(world, u, 'replaced');
    }
  }
  const count = def.fromDead ? Math.min(eff.count ?? 1, dead.length) : (eff.count ?? 1);
  for (let i = 0; i < count; i++) {
    const corpse = def.fromDead ? dead[i] : undefined;
    const at = corpse?.pos ?? point;
    const angle = (i / Math.max(1, count)) * Math.PI * 2;
    const pos =
      count > 1 ? { x: at.x + Math.cos(angle) * 20, y: at.y + Math.sin(angle) * 20 } : { ...at };
    let hp: number;
    if (corpse) {
      const mon = world.data.monsters?.find((m) => m.id === corpse.type);
      if (!mon) continue;
      const mult =
        tierValue(world.tuning.lair.statMult, corpse.tier, 1) * (def.fromDead?.share ?? 1);
      hp = monsterHp({ ...mon, attrs: scaleAttrs(mon.attrs, mult) });
    } else {
      hp = Math.max(1, Math.round(def.hp ?? (def.hpShare ?? 0.2) * owner.maxHp));
    }
    const id = world.nextId++;
    world.units.push({
      id,
      kind: 'summon',
      type: corpse ? corpse.type : def.id,
      tier: corpse ? corpse.tier : 1,
      god: owner.god,
      path: null,
      pos,
      facing: { ...owner.facing },
      hp,
      maxHp: hp,
      target: null,
      ko: false,
      mode: 'wander',
      party: owner.party,
      trait: null,
      gold: 0,
      bounty: null,
      summon: {
        owner: owner.id,
        def: def.id,
        until: eff.s !== undefined ? world.timeMs + eff.s * 1000 : null,
        src,
      },
    });
    world.unitRuntime.set(id, {
      lair: null,
      cooldownMs: 0,
      target: null,
      idleMs: 0,
      ...(eff.end ? { summonEnd: eff.end } : {}),
    });
    world.events.push({
      kind: 'summoned',
      unit: id,
      owner: owner.id,
      summon: def.id,
      skill: src,
      pos: { ...pos },
    });
  }
}

// A summon leaves the map: its end effects run (unless its owner is gone), a respawn is queued
// when it died and its row asks for one.
export function removeSummon(
  world: World,
  unit: UnitState,
  reason: 'expired' | 'died' | 'orphaned' | 'replaced',
): void {
  const sm = unit.summon;
  if (!sm || unit.hp < 0) return;
  const owner = world.units.find((u) => u.id === sm.owner);
  const rt = world.unitRuntime.get(unit.id);
  unit.hp = -1;
  world.events.push({ kind: 'unsummoned', unit: unit.id, owner: sm.owner, reason });
  if (owner && rt?.summonEnd && (reason === 'expired' || reason === 'died')) {
    resolveEffectsAt(
      world,
      owner,
      unit.pos,
      rt.summonEnd.radius,
      rt.summonEnd.effects,
      `${sm.src}:end`,
    );
  }
  const def = summonDef(world, sm.def);
  if (reason === 'died' && owner && def?.respawnS) {
    world.respawns.push({
      atMs: world.timeMs + def.respawnS * 1000,
      owner: owner.id,
      summon: def.id,
      src: sm.src,
      end: rt?.summonEnd,
    });
  }
  world.unitRuntime.delete(unit.id);
}

// Each tick: respawns come due, summons end with their time or their owner, a decoy taunts.
export function runSummonUpkeep(world: World): void {
  const due = world.respawns.filter((r) => world.timeMs >= r.atMs);
  if (due.length > 0) {
    world.respawns = world.respawns.filter((r) => world.timeMs < r.atMs);
    for (const r of due) {
      const owner = world.units.find((u) => u.id === r.owner);
      if (!owner || owner.ko || owner.hp <= 0) continue;
      spawnSummons(
        world,
        owner,
        { kind: 'summon', summon: r.summon, ...(r.end ? { end: r.end } : {}) },
        owner.pos,
        r.src,
      );
    }
  }
  for (const unit of [...world.units]) {
    const sm = unit.summon;
    if (unit.kind !== 'summon' || !sm || unit.hp < 0) continue;
    const owner = world.units.find((u) => u.id === sm.owner);
    if (!owner || owner.ko || owner.hp <= 0) removeSummon(world, unit, 'orphaned');
    else if (sm.until !== null && world.timeMs >= sm.until) removeSummon(world, unit, 'expired');
  }
  // A decoy: foes near it go for it (bosses ignore it).
  for (const unit of world.units) {
    const taunt = unit.summon && summonDef(world, unit.summon.def)?.taunt;
    if (!taunt || unit.hp <= 0) continue;
    for (const foe of world.units) {
      if (foe.kind !== 'monster' || foe.hp <= 0 || dist(foe.pos, unit.pos) > taunt.radius) continue;
      if (statsOf(world, foe)?.tags?.includes('boss')) continue;
      const frt = world.unitRuntime.get(foe.id);
      if (frt) (frt.fx ??= {}).taunt = { by: unit.id, until: world.timeMs + 2 * TICK_MS };
    }
  }
}

// A summon's turn: strike the nearest foe in reach, else walk back to its owner.
export function runSummon(world: World, unit: UnitState, rt: UnitRuntime, stats: Stats): void {
  const sm = unit.summon;
  const def = sm && summonDef(world, sm.def);
  const owner = sm && world.units.find((u) => u.id === sm.owner);
  if (!sm || !def || !owner) return;
  let foe: UnitState | null = null;
  let best = Infinity;
  if (def.strike || def.fromDead) {
    for (const o of world.units) {
      if (o.kind !== 'monster' || o.hp <= 0 || o.ko) continue;
      const d = dist(unit.pos, o.pos);
      if (d < best && dist(owner.pos, o.pos) <= LEASH) {
        foe = o;
        best = d;
      }
    }
  }
  unit.target = foe ? foe.id : null;
  const speed = (speedOf(stats) * TICK_MS) / 1000;
  if (foe) {
    if (best > stats.weapon.range) {
      rt.swing = undefined;
      const dir = stepToward(unit.pos, foe.pos, speed);
      if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
    } else {
      swing(world, unit, rt, stats, foe.id, () => {
        const input = attackStrike(stats, targetOf(world, foe));
        if (def.strike && !def.fromDead) {
          const ownerStats = statsOf(world, owner);
          if (!ownerStats) return;
          const ownerInput = attackStrike(ownerStats, targetOf(world, foe));
          landStrike(world, unit, foe, {
            ...ownerInput,
            skillMult: def.strike.mult,
            ...(def.strike.sure ? { canDodge: false } : {}),
          });
        } else {
          landStrike(world, unit, foe, input);
        }
      });
    }
  } else if (dist(unit.pos, owner.pos) > HEEL) {
    const dir = stepToward(unit.pos, owner.pos, speed);
    if (dir.x !== 0 || dir.y !== 0) unit.facing = dir;
  }
  if (rt.swing && unit.target !== rt.swing.target) rt.swing = undefined;
}
