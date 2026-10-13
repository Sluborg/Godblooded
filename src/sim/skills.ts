import { applyBuff, applyMark, applyShield, applyTaunt } from './effects';
import { applyRider, healMult } from './riders';
import { tally } from './runstats';
import { attackStrike, landStrike } from './strike';
import { dist, TICK_MS, type Stats } from './units';
import { statsOf, targetOf, type UnitRuntime, type World } from './world';
import type {
  DamageEffect,
  SkillDef,
  SkillEffect,
  SkillShape,
  SkillTrigger,
  UnitState,
  Vec2,
} from './types';

// The skill engine (Sim 240, docs/systems/paths-and-skills.md). A hero on a path with a skill
// row checks the row's trigger every tick while its cooldown is down. When it holds, the hero
// stops, winds up (`cast` event), and the effects land on the shape around the cast's point
// (`skill` event). Cooldown starts at the cast. Skills never move with their target: they land
// on the point chosen when the cast began.

// Per hero skill state, not part of the snapshot.
export interface SkillRuntime {
  cdMs: number;
  // Casts so far (every `speechEvery`th shows the skill name).
  casts: number;
  cast?: { target: number | null; point: Vec2; ms: number };
}

// What a trigger found: the foe or ally it centres on, and a point.
interface Found {
  foe?: UnitState;
  ally?: UnitState;
  point: Vec2;
  // Where a cone or line should face when the cast sits on the caster.
  aim?: Vec2;
}

// The hero's skill, with the tier 3 form merged over it from tier 3.
export function skillOf(world: World, hero: UnitState): SkillDef | undefined {
  if (hero.kind !== 'hero' || !hero.path || hero.tier < 2) return undefined;
  const def = world.data.skills?.find((s) => s.path === hero.path);
  return def && hero.tier >= 3 && def.t3 ? { ...def, ...def.t3 } : def;
}

// Cooldowns run whether or not the hero may cast right now.
export function tickSkill(rt: UnitRuntime): void {
  if (rt.skill) rt.skill.cdMs = Math.max(0, rt.skill.cdMs - TICK_MS);
}

export function cancelCast(rt: UnitRuntime): void {
  if (rt.skill) rt.skill.cast = undefined;
}

// Advances the hero's casting for this tick. True when the hero is busy casting and should not
// move or strike. `foe` is the hero's picked target, if any.
export function runSkill(
  world: World,
  hero: UnitState,
  rt: UnitRuntime,
  foe: UnitState | null,
): boolean {
  const def = skillOf(world, hero);
  if (!def) return false;
  const sr = (rt.skill ??= { cdMs: 0, casts: 0 });
  if (sr.cast) {
    sr.cast.ms -= TICK_MS;
    if (sr.cast.ms <= 0) {
      const cast = sr.cast;
      sr.cast = undefined;
      resolve(world, hero, def, cast.target, cast.point);
    }
    return true;
  }
  if (sr.cdMs > 0) return false;
  const found = evalTrigger(world, hero, def.trigger, foe, def.target === 'self');
  if (!found) return false;
  const at = centre(hero, def, found, foe);
  if (!at) return false;
  const t = world.tuning.skill;
  sr.cdMs = def.cooldownS * 1000;
  sr.casts++;
  sr.cast = { target: at.unit?.id ?? null, point: at.point, ms: t.castWindupMs };
  rt.swing = undefined;
  // A skill sitting on the caster still points at the foe: cones and lines aim along facing.
  face(hero, found.aim ?? at.unit?.pos ?? found.foe?.pos ?? at.point);
  world.events.push({
    kind: 'cast',
    skill: def.id,
    caster: hero.id,
    target: sr.cast.target,
    point: { ...at.point },
    inMs: t.castWindupMs,
    ...((sr.casts - 1) % Math.max(1, t.speechEvery) === 0 ? { say: true } : {}),
  });
  return true;
}

// Where the shape sits, from the skill's `target` and what the trigger found.
function centre(
  hero: UnitState,
  def: SkillDef,
  found: Found,
  foe: UnitState | null,
): { unit: UnitState | null; point: Vec2 } | undefined {
  switch (def.target) {
    case 'self':
      return { unit: null, point: { ...hero.pos } };
    case 'foe': {
      const f = found.foe ?? foe ?? undefined;
      return f ? { unit: f, point: { ...f.pos } } : undefined;
    }
    case 'ally':
      return found.ally ? { unit: found.ally, point: { ...found.ally.pos } } : undefined;
    case 'point':
      return { unit: null, point: { ...found.point } };
  }
}

function face(hero: UnitState, to: Vec2): void {
  const d = dist(hero.pos, to);
  if (d > 0) hero.facing = { x: (to.x - hero.pos.x) / d, y: (to.y - hero.pos.y) / d };
}

function foesOf(world: World): UnitState[] {
  return world.units.filter((u) => u.kind === 'monster' && !u.ko && u.hp > 0);
}

function alliesOf(world: World, hero: UnitState): UnitState[] {
  const party = world.parties.get(hero.party);
  const out: UnitState[] = [];
  for (const id of party?.members ?? []) {
    const m = id === hero.id ? undefined : world.units.find((u) => u.id === id);
    if (m && !m.ko && m.hp > 0) out.push(m);
  }
  return out;
}

// A proud hero aims at the foe with the most max hp, everyone else at the nearest.
function pickFoe(hero: UnitState, from: Vec2, foes: UnitState[]): UnitState | undefined {
  let best: UnitState | undefined;
  for (const f of foes) {
    if (!best) best = f;
    else if (hero.trait === 'proud') {
      if (f.maxHp > best.maxHp) best = f;
    } else if (dist(from, f.pos) < dist(from, best.pos)) best = f;
  }
  return best;
}

function evalTrigger(
  world: World,
  hero: UnitState,
  trig: SkillTrigger,
  foe: UnitState | null,
  self: boolean,
): Found | undefined {
  if ('any' in trig) {
    for (const sub of trig.any) {
      const hit = evalTrigger(world, hero, sub, foe, self);
      if (hit) return hit;
    }
    return undefined;
  }
  switch (trig.kind) {
    case 'ready': {
      // A ready skill is for a hero in a fight (it has a foe), not one passing by or hitting a lair.
      if (!foe) return undefined;
      const near = foesOf(world).filter((f) => dist(hero.pos, f.pos) <= (trig.range ?? 300));
      const pick = pickFoe(hero, hero.pos, near);
      return pick && { foe: pick, point: { ...pick.pos } };
    }
    case 'engage': {
      const band = foesOf(world).filter((f) => {
        const d = dist(hero.pos, f.pos);
        return d >= trig.min && d <= trig.max;
      });
      const pick = pickFoe(hero, hero.pos, band);
      return pick && { foe: pick, point: { ...pick.pos } };
    }
    case 'crowd': {
      // Counted around the skill's centre: the caster, or the foe it fights. A cone opens from
      // the caster toward the foe (the nearest one when the skill sits on the caster).
      const all = foesOf(world);
      // Only for a hero in a fight (it has a foe), not one passing by.
      if (!foe) return undefined;
      const toward = foe;
      const centre = self ? hero : foe;
      const inside = all.filter((f) =>
        trig.angle === undefined
          ? dist(centre.pos, f.pos) <= trig.radius
          : inCone(hero.pos, toward.pos, trig.radius, trig.angle, f.pos),
      );
      if (inside.length < trig.n) return undefined;
      const at = self || hero.trait === 'proud' ? pickFoe(hero, hero.pos, inside) : foe;
      return { foe: at ?? undefined, point: { ...centre.pos }, aim: { ...toward.pos } };
    }
    case 'allyHurt': {
      const hurt = alliesOf(world, hero).filter(
        (a) => dist(hero.pos, a.pos) <= trig.radius && a.hp / a.maxHp < trig.below,
      );
      if (hurt.length < (trig.n ?? 1)) return undefined;
      const worst = hurt.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a));
      return { ally: worst, point: { ...worst.pos } };
    }
    case 'selfHurt': {
      const nudge = world.tuning.skill.traitNudge;
      const shift = hero.trait === 'coward' ? nudge : hero.trait === 'brave' ? -nudge : 0;
      const hurt = trig.below !== undefined && hero.hp / hero.maxHp < trig.below + shift;
      const hunted =
        trig.n !== undefined && foesOf(world).filter((f) => f.target === hero.id).length >= trig.n;
      return hurt || hunted ? { foe: foe ?? undefined, point: { ...hero.pos } } : undefined;
    }
    case 'kill': {
      // A kill by the hero or its party only, not by a party passing by.
      const mine = (by: number) => {
        const killer = world.units.find((u) => u.id === by);
        return (
          by === hero.id ||
          (killer !== undefined && killer.party !== 0 && killer.party === hero.party)
        );
      };
      const near = world.recentKills.find(
        (k) =>
          k.timeMs >= world.timeMs - world.tuning.skill.killWindowMs &&
          dist(hero.pos, k.pos) <= trig.radius &&
          mine(k.by),
      );
      return near ? { point: { ...near.pos } } : undefined;
    }
  }
}

// Where a cone or line points: the cast point, or along the caster's facing when it sits on him.
function aimAt(hero: UnitState, point: Vec2): Vec2 {
  return dist(hero.pos, point) > 0
    ? point
    : { x: hero.pos.x + hero.facing.x * 100, y: hero.pos.y + hero.facing.y * 100 };
}

function norm(from: Vec2, to: Vec2): Vec2 {
  const d = dist(from, to);
  return d > 0 ? { x: (to.x - from.x) / d, y: (to.y - from.y) / d } : { x: 1, y: 0 };
}

function inCone(origin: Vec2, toward: Vec2, radius: number, angle: number, p: Vec2): boolean {
  const d = dist(origin, p);
  if (d > radius) return false;
  if (d === 0) return true;
  const a = norm(origin, toward);
  const b = norm(origin, p);
  const cos = a.x * b.x + a.y * b.y;
  return Math.acos(Math.max(-1, Math.min(1, cos))) <= (angle / 2) * (Math.PI / 180);
}

function inLine(origin: Vec2, toward: Vec2, length: number, width: number, p: Vec2): boolean {
  const dir = norm(origin, toward);
  const rx = p.x - origin.x;
  const ry = p.y - origin.y;
  const along = rx * dir.x + ry * dir.y;
  const across = Math.abs(rx * dir.y - ry * dir.x);
  return along >= 0 && along <= length && across <= width / 2;
}

// Every foe the shape reaches around `point`, with the share of the effect each gets.
export function foesInShape(
  world: World,
  hero: UnitState,
  shape: SkillShape,
  point: Vec2,
  target: UnitState | undefined,
  // Who the shape can reach: foes by default, or the caster's side for support effects.
  pool: UnitState[] = foesOf(world),
): { unit: UnitState; mult: number }[] {
  const foes = pool;
  switch (shape.kind) {
    case 'single': {
      // Anchored to the cast point: the target counts while it is still there, else the
      // nearest foe that is.
      const reach = world.tuning.skill.pointReach;
      const here =
        target &&
        pool.includes(target) &&
        target.hp > 0 &&
        !target.ko &&
        dist(point, target.pos) <= reach
          ? target
          : pickNearest(foes, point, reach);
      return here ? [{ unit: here, mult: 1 }] : [];
    }
    case 'circle':
      return foes
        .filter((f) => dist(point, f.pos) <= shape.radius)
        .map((unit) => ({ unit, mult: 1 }));
    case 'cone':
      return foes
        .filter((f) => inCone(hero.pos, aimAt(hero, point), shape.radius, shape.angle, f.pos))
        .map((unit) => ({ unit, mult: 1 }));
    case 'line':
      return foes
        .filter((f) => inLine(hero.pos, aimAt(hero, point), shape.length, shape.width ?? 40, f.pos))
        .sort((a, b) => dist(hero.pos, a.pos) - dist(hero.pos, b.pos))
        .map((unit) => ({ unit, mult: 1 }));
    case 'chain': {
      // Anchored to the cast point like `single`: a target that left it is not followed.
      const reach = world.tuning.skill.pointReach;
      let cur =
        target &&
        pool.includes(target) &&
        target.hp > 0 &&
        !target.ko &&
        dist(point, target.pos) <= reach
          ? target
          : pickNearest(foes, point, reach);
      const out: { unit: UnitState; mult: number }[] = [];
      let mult = 1;
      for (let i = 0; cur && i <= shape.jumps; i++) {
        out.push({ unit: cur, mult });
        mult *= shape.falloff;
        const hit = new Set(out.map((o) => o.unit.id));
        cur = pickNearest(
          foes.filter((f) => !hit.has(f.id)),
          cur.pos,
          shape.radius,
        );
      }
      return out;
    }
  }
}

function pickNearest(foes: UnitState[], from: Vec2, within: number): UnitState | undefined {
  let best: UnitState | undefined;
  for (const f of foes) {
    const d = dist(from, f.pos);
    if (d <= within && (!best || d < dist(from, best.pos))) best = f;
  }
  return best;
}

function resolve(
  world: World,
  hero: UnitState,
  def: SkillDef,
  targetId: number | null,
  point: Vec2,
): void {
  if (hero.ko || hero.hp <= 0) return;
  const target = targetId === null ? undefined : world.units.find((u) => u.id === targetId);
  const stats = statsOf(world, hero);
  const effects = def.effects.filter((e) => (e.on ?? 'cast') === 'cast');
  // A dash comes first: the shapes that follow sit where the caster lands.
  let from: Vec2 | undefined;
  if (effects.some((e) => e.kind === 'dash')) {
    from = { ...hero.pos };
    dash(world, hero, point);
  }
  const foes = foesInShape(world, hero, def.shape, point, target);
  let side: { unit: UnitState; mult: number }[] | undefined;
  const allies = () =>
    (side ??= foesInShape(world, hero, def.shape, point, target, [hero, ...alliesOf(world, hero)]));
  const touched = new Set<number>();
  for (const effect of effects) {
    const to = effect.to ?? defaultTo(effect.kind);
    const hits = to === 'foes' ? foes : to === 'allies' ? allies() : [{ unit: hero, mult: 1 }];
    for (const h of hits) {
      if (h.unit.hp <= 0 || h.unit.ko) continue;
      if (effect.kind === 'damage') {
        if (stats) damage(world, hero, stats, effect, h.unit, h.mult);
      } else {
        supportEffect(world, hero, stats, effect, h.unit);
      }
      touched.add(h.unit.id);
    }
  }
  world.events.push({
    kind: 'skill',
    skill: def.id,
    caster: hero.id,
    hits: [...touched],
    point: { ...point },
    ...(from ? { from } : {}),
  });
}

function defaultTo(kind: SkillEffect['kind']): 'foes' | 'allies' | 'self' {
  switch (kind) {
    case 'heal':
    case 'shield':
    case 'buff':
      return 'allies';
    case 'dash':
      return 'self';
    default:
      return 'foes';
  }
}

// The caster steps to the point, stopping a melee reach short of it.
function dash(world: World, hero: UnitState, point: Vec2): void {
  const d = dist(hero.pos, point);
  const stop = 20;
  if (d <= stop) return;
  const k = (d - stop) / d;
  const { width, height } = world.data.map;
  hero.pos = {
    x: Math.min(width, Math.max(0, hero.pos.x + (point.x - hero.pos.x) * k)),
    y: Math.min(height, Math.max(0, hero.pos.y + (point.y - hero.pos.y) * k)),
  };
  face(hero, point);
}

// Every effect other than damage and dash.
export function supportEffect(
  world: World,
  hero: UnitState,
  stats: Stats | undefined,
  effect: SkillEffect,
  unit: UnitState,
): void {
  switch (effect.kind) {
    case 'heal': {
      if (!stats) return;
      const gain = Math.round(
        world.tuning.combat.healPower *
          (stats.attrs.int + stats.attrs.wp) *
          effect.mult *
          healMult(world, unit.id),
      );
      const amount = Math.min(gain, unit.maxHp - unit.hp);
      if (amount <= 0) return;
      unit.hp += amount;
      tally(world, hero.id, 'healing', amount);
      world.events.push({ kind: 'heal', healer: hero.id, target: unit.id, amount });
      return;
    }
    case 'shield': {
      const hp =
        effect.pct !== undefined
          ? effect.pct * unit.maxHp
          : stats
            ? (effect.mult ?? 1) * (stats.attrs.int + stats.attrs.wp)
            : 0;
      applyShield(world, unit, Math.round(hp), effect.s);
      return;
    }
    case 'buff':
      applyBuff(world, unit, effect.stat, effect.amount, effect.s);
      return;
    case 'mark':
      applyMark(world, unit, effect.pct, effect.s);
      return;
    case 'taunt':
      // Bosses ignore taunt.
      if (!statsOf(world, unit)?.tags?.includes('boss')) applyTaunt(world, unit, hero.id, effect.s);
      return;
    case 'stagger': {
      const rt = world.unitRuntime.get(unit.id);
      if (!rt) return;
      rt.swing = undefined;
      rt.cooldownMs = Math.max(rt.cooldownMs, world.tuning.combat.windupMs);
      cancelCast(rt);
      return;
    }
  }
}

function damage(
  world: World,
  hero: UnitState,
  stats: Stats,
  effect: DamageEffect,
  foe: UnitState,
  share: number,
): void {
  const base = attackStrike(stats, targetOf(world, foe));
  const type = effect.type ?? base.type;
  if (effect.mult === 0) {
    if (effect.rider) {
      applyRider(world, effect.rider, hero.id, foe, {
        dodged: false,
        crit: false,
        damage: 0,
        type: type ?? 'physical',
        weak: false,
        resist: false,
      });
    }
    return;
  }
  landStrike(world, hero, foe, {
    ...base,
    type,
    skillMult: effect.mult * share,
    ...(effect.sure ? { canDodge: false } : {}),
    ...(effect.rider ? { rider: effect.rider } : {}),
  });
}
