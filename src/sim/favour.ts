import { applyBuff, applyShield, curePoison, takeDamage } from './effects';
import { godPantheon, pantheonOf } from './parties';
import { applyRider, healMult } from './riders';
import { hitEvent, resolveStrike } from './strike';
import { dist, TICK_MS } from './units';
import { targetOf, type World } from './world';
import type { MiracleDef, MiracleEffect, SimEvent, UnitState, Vec2 } from './types';

// God favours (Sim 400, docs/systems/events.md section 3). Temples fill a bar per pantheon; a
// full bar makes the god cast its miracle by itself where its children are in the most danger.
// The player never commands one: building temples is how the bars fill.

const NO_ATTRS = { str: 0, dex: 0, sta: 0, cha: 0, per: 0, int: 0, wp: 0 };
// How close monsters count as "in the fight" when a spot is chosen.
const FIGHT_RADIUS = 250;

export const miracleOf = (world: World, pantheon: string): MiracleDef | undefined =>
  world.data.miracles?.find((m) => m.pantheon === pantheon);

// Adds to a pantheon's bar (never past max). Nothing without a miracle row for it.
export function addFavour(world: World, pantheon: string, n: number): void {
  if (!miracleOf(world, pantheon)) return;
  const max = world.tuning.favour.max;
  world.favour[pantheon] = Math.min(max, (world.favour[pantheon] ?? 0) + n);
}

const heroPantheon = (world: World, u: UnitState): string =>
  u.god ? godPantheon(world, u.god) : '';

const livingHeroes = (world: World, pantheon?: string): UnitState[] =>
  world.units.filter(
    (u) =>
      u.kind === 'hero' &&
      !u.ko &&
      u.hp > 0 &&
      (pantheon === undefined || heroPantheon(world, u) === pantheon),
  );

// The pantheons of a party's heroes (a lair cleared by the party fills each of their bars).
export function partyPantheons(world: World, unit: UnitState): Set<string> {
  const out = new Set<string>();
  const party = world.parties.get(unit.party);
  for (const id of party?.members ?? [unit.id]) {
    const m = world.units.find((u) => u.id === id);
    if (m) out.add(heroPantheon(world, m));
  }
  out.delete('');
  return out;
}

// Where the god acts: the point with the most of its heroes below dangerHp within the fight
// radius (ties: more monsters near, then nearer the town hall). With none hurt, a raid at the
// town counts as a fight: the raider nearest the town hall.
export function pickSpot(world: World, pantheon: string): Vec2 | undefined {
  const t = world.tuning.favour;
  const hurt = livingHeroes(world, pantheon).filter((h) => h.hp < t.dangerHp * h.maxHp);
  const monsters = world.units.filter((u) => u.kind === 'monster' && u.hp > 0);
  let best: { pos: Vec2; hurt: number; near: number; home: number } | undefined;
  for (const h of hurt) {
    const cand = {
      pos: { ...h.pos },
      hurt: hurt.filter((o) => dist(o.pos, h.pos) <= FIGHT_RADIUS).length,
      near: monsters.filter((m) => dist(m.pos, h.pos) <= FIGHT_RADIUS).length,
      home: dist(h.pos, world.data.townHall),
    };
    if (
      !best ||
      cand.hurt > best.hurt ||
      (cand.hurt === best.hurt &&
        (cand.near > best.near || (cand.near === best.near && cand.home < best.home)))
    ) {
      best = cand;
    }
  }
  if (best) return best.pos;
  let raider: UnitState | undefined;
  for (const m of monsters) {
    if (!world.unitRuntime.get(m.id)?.raid) continue;
    if (!raider || dist(m.pos, world.data.townHall) < dist(raider.pos, world.data.townHall)) {
      raider = m;
    }
  }
  return raider ? { ...raider.pos } : undefined;
}

// Per tick: temples fill the bars, due miracle steps run, a full bar looks for a fight each second.
export function runFavour(world: World): void {
  if (!world.data.miracles?.length) return;
  const t = world.tuning.favour;
  const gain = TICK_MS / (t.perTempleTierS * 1000);
  for (const b of world.buildings) {
    const pantheon = b.type.startsWith('temple') ? pantheonOf(world, b.type) : undefined;
    if (pantheon) addFavour(world, pantheon, gain * b.tier);
  }
  const due = world.miracleSteps.filter((s) => world.timeMs >= s.atMs);
  if (due.length > 0) {
    world.miracleSteps = world.miracleSteps.filter((s) => world.timeMs < s.atMs);
    for (const step of due) runStep(world, step);
  }
  if (world.timeMs % 1000 >= TICK_MS) return;
  for (const m of world.data.miracles) {
    if ((world.favour[m.pantheon] ?? 0) < t.max) continue;
    const spot = pickSpot(world, m.pantheon);
    const by = spot && nearestHero(world, m.pantheon, spot);
    if (!spot || !by) continue;
    world.favour[m.pantheon] = 0;
    world.events.push({
      kind: 'miracle',
      id: m.id,
      pantheon: m.pantheon,
      pos: { ...spot },
      tellMs: t.tellMs,
    });
    world.miracleSteps.push({
      atMs: world.timeMs + t.tellMs,
      id: m.id,
      pos: spot,
      by: by.id,
      effect: null,
    });
  }
}

function nearestHero(world: World, pantheon: string, pos: Vec2): UnitState | undefined {
  let best: UnitState | undefined;
  for (const h of livingHeroes(world, pantheon)) {
    if (!best || dist(h.pos, pos) < dist(best.pos, pos)) best = h;
  }
  return best;
}

// One scheduled piece of a miracle: the landing (effect null) or one strike of a spread effect.
function runStep(world: World, step: World['miracleSteps'][number]): void {
  const def = world.data.miracles?.find((m) => m.id === step.id);
  if (!def) return;
  // The beneficiary stands in for the god; if it is gone another hero of the pantheon takes over.
  const by =
    world.units.find((u) => u.id === step.by && u.hp > 0) ??
    nearestHero(world, def.pantheon, step.pos);
  if (!by) return;
  if (step.effect !== null) {
    strikeOne(world, def, def.effects[step.effect], step.pos, by);
    return;
  }
  def.effects.forEach((effect, i) => {
    if (effect.kind === 'damage' && effect.strikes !== undefined) {
      const n = Math.max(1, effect.strikes);
      const gap = ((effect.overS ?? 0) * 1000) / n;
      for (let k = 0; k < n; k++) {
        if (k === 0) strikeOne(world, def, effect, step.pos, by);
        else {
          world.miracleSteps.push({
            atMs: world.timeMs + Math.round(k * gap),
            id: def.id,
            pos: step.pos,
            by: by.id,
            effect: i,
          });
        }
      }
    } else {
      applyEffect(world, def, effect, step.pos, by);
    }
  });
}

const inReach = (u: UnitState, pos: Vec2, radius: number) =>
  u.hp > 0 && !u.ko && dist(u.pos, pos) <= radius;

function targetsOf(world: World, def: MiracleDef, effect: MiracleEffect, pos: Vec2): UnitState[] {
  const kind = effect.to === 'foes' ? 'monster' : 'hero';
  return world.units.filter((u) => {
    if (u.kind !== kind || !inReach(u, pos, def.radius)) return false;
    if (!effect.tag) return true;
    return !!world.data.monsters?.find((m) => m.id === u.type)?.tags?.includes(effect.tag);
  });
}

// One strike of a spread damage effect: a random foe in reach.
function strikeOne(
  world: World,
  def: MiracleDef,
  effect: MiracleEffect,
  pos: Vec2,
  by: UnitState,
): void {
  const pool = targetsOf(world, def, effect, pos);
  if (pool.length === 0) return;
  hurt(world, effect, pool[Math.floor(world.rng() * pool.length)], by);
}

function applyEffect(
  world: World,
  def: MiracleDef,
  effect: MiracleEffect,
  pos: Vec2,
  by: UnitState,
): void {
  for (const unit of targetsOf(world, def, effect, pos)) {
    switch (effect.kind) {
      case 'damage':
        hurt(world, effect, unit, by);
        break;
      case 'heal': {
        const gain = Math.round((effect.pct ?? 0) * unit.maxHp * healMult(world, unit.id));
        const amount = Math.min(gain, unit.maxHp - unit.hp);
        if (amount <= 0) break;
        unit.hp += amount;
        curePoison(world, unit.id);
        world.events.push({ kind: 'heal', healer: 0, target: unit.id, amount, source: 'miracle' });
        break;
      }
      case 'shield':
        applyShield(world, unit, Math.round((effect.pct ?? 0) * unit.maxHp), effect.s ?? 0);
        break;
      case 'buff':
        if (effect.stat) applyBuff(world, unit, effect.stat, effect.buff ?? 0, effect.s ?? 0);
        break;
    }
  }
}

// Flat spell damage: no dodge, no crit, mitigated by Willpower, credited to the hero `by`.
function hurt(world: World, effect: MiracleEffect, foe: UnitState, by: UnitState): void {
  const out = resolveStrike(world, {
    attrs: NO_ATTRS,
    power: effect.amount ?? 0,
    type: effect.type ?? 'magic',
    target: targetOf(world, foe),
    canDodge: false,
    canCrit: false,
    ...(effect.rider ? { rider: effect.rider } : {}),
  });
  const taken = takeDamage(world, foe, out.damage);
  foe.hp -= taken.hp;
  // The god's doing, not the hero's: no attacker unit, so Scene plays no swing.
  world.events.push({
    ...hitEvent(0, foe.id, { ...out, damage: taken.dealt }, taken.dealt - taken.hp),
    source: 'miracle',
  } as SimEvent);
  if (effect.rider) applyRider(world, effect.rider, by.id, foe, out);
  if (foe.hp <= 0) {
    foe.hp = 0;
    world.pendingDeaths.push({ victim: foe.id, by: by.id, via: 'miracle' });
  }
}
