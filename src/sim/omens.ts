import { bonusCard, shareXp } from './parties';
import { rescoreForFlag } from './heroes';
import { dist, maxHp, scaleAttrs, tierValue } from './units';
import type { World } from './world';
import type { OmenDef, OmenMods, OmenView, UnitState, Vec2 } from './types';

// Omens (docs/systems/events.md section 2): a small deck of short situations. The first comes at
// tuning.events.omenFirstMs, then one every omenEveryMs (a seeded draw between the two), announced
// omenLeadMs ahead. At most one at a time; the same omen waits for omenNoRepeat others; the run's
// lean pantheon weighs its omens leanWeight times more. Nothing here runs without data.omens.

const NO_MODS: OmenMods = {};

export const omenDef = (world: World, id: string): OmenDef | undefined =>
  world.data.omens?.find((o) => o.id === id);

// What the active omen changes (nothing while none is on).
export function omenMods(world: World): OmenMods {
  const cur = world.omen.current;
  if (!cur || !cur.started) return NO_MODS;
  return omenDef(world, cur.id)?.mods ?? NO_MODS;
}

// A strike's damage multiplier from the active omen: monsters (Red Sky), undead monsters (Eclipse
// of Ra) and a damage type (frost, holy).
export function omenDamageMult(
  world: World,
  attacker: UnitState,
  type: string | undefined,
): number {
  const m = omenMods(world);
  if (m === NO_MODS) return 1;
  let mult = 1;
  if (attacker.kind === 'monster') {
    mult *= m.monsterDamage ?? 1;
    if (m.undeadDamage !== undefined) {
      const tags = world.data.monsters?.find((x) => x.id === attacker.type)?.tags;
      if (tags?.includes('undead')) mult *= m.undeadDamage;
    }
  }
  mult *= m.typeDamage?.[type ?? 'physical'] ?? 1;
  return mult;
}

// Gold a bounty flag pays now (Red Sky doubles it).
export const omenBounty = (world: World, gold: number): number =>
  Math.round(gold * (omenMods(world).bountyMult ?? 1));

function draw(world: World): OmenDef | undefined {
  const deck = world.data.omens ?? [];
  if (deck.length === 0) return undefined;
  const t = world.tuning.events;
  const recent = world.omen.recent.slice(-t.omenNoRepeat);
  let pool = deck.filter((o) => !recent.includes(o.id));
  if (pool.length === 0) pool = [...deck];
  const weight = (o: OmenDef) =>
    Math.max(0, o.weight) * (o.pantheon && world.mapLean.includes(o.pantheon) ? t.leanWeight : 1);
  const total = pool.reduce((a, o) => a + weight(o), 0);
  if (total <= 0) return pool[0];
  let roll = world.rng() * total;
  for (const o of pool) {
    roll -= weight(o);
    if (roll < 0) return o;
  }
  return pool[pool.length - 1];
}

export function runOmens(world: World): void {
  if (!world.data.omens || world.data.omens.length === 0) return;
  const t = world.tuning.events;
  const om = world.omen;
  const now = world.timeMs;
  if (om.nextMs < 0) om.nextMs = t.omenFirstMs;
  const cur = om.current;
  if (!cur) {
    // Announced omenLeadMs ahead of its start.
    const lead = t.omenLeadMs;
    if (now < om.nextMs - lead) return;
    const def = draw(world);
    if (!def) return;
    const startMs = Math.max(now, om.nextMs);
    om.current = { id: def.id, startMs, endMs: startMs + def.durationMs, started: false };
    om.recent.push(def.id);
    if (om.recent.length > 16) om.recent.shift();
    world.events.push({ kind: 'omen', omen: def.id, inMs: startMs - now });
    return;
  }
  if (!cur.started && now >= cur.startMs) {
    cur.started = true;
    world.events.push({ kind: 'omenStart', omen: cur.id, durationMs: cur.endMs - cur.startMs });
    const def = omenDef(world, cur.id);
    if (def) begin(world, def, cur);
  }
  const def = cur.started ? omenDef(world, cur.id) : undefined;
  if (def && cur.started) {
    tickStar(world, cur);
    // An omen that lasts until its monsters are dead ends when they are.
    if (def.untilKilled && cur.spawned && cur.spawned.length > 0) {
      const alive = world.units.some((u) => cur.spawned?.includes(u.id) && u.hp > 0);
      if (!alive) cur.endMs = Math.min(cur.endMs, now);
    }
  }
  if (cur.started && now >= cur.endMs) {
    if (def?.contest) awardContest(world, def, cur);
    world.events.push({ kind: 'omenEnd', omen: cur.id });
    om.current = null;
    const [lo, hi] = t.omenEveryMs;
    om.nextMs = now + lo + Math.floor(world.rng() * (hi - lo + 1));
  }
}

export function omenSnapshot(world: World): OmenView | null {
  const cur = world.omen.current;
  const def = cur && omenDef(world, cur.id);
  if (!cur || !def) return null;
  const announced = !cur.started;
  return {
    id: def.id,
    name: def.name,
    text: def.text,
    phase: announced ? 'announced' : 'active',
    msLeft: Math.max(0, (announced ? cur.startMs : cur.endMs) - world.timeMs),
    ...(cur.star ? { star: { ...cur.star.pos } } : {}),
  };
}

type Current = NonNullable<World['omen']['current']>;

const townHall = (world: World): Vec2 =>
  world.buildings.find((b) => b.type === 'townhall')?.pos ?? world.data.townHall;

// A point at a random angle between two distances from the town hall.
function ringPoint(world: World, from: number, to: number): Vec2 {
  const c = townHall(world);
  const a = world.rng() * Math.PI * 2;
  const d = from + world.rng() * (to - from);
  return { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d };
}

// What an omen does when it starts: its monsters, its star, its contest.
function begin(world: World, def: OmenDef, cur: Current): void {
  if (def.spawn) spawnOmenMonsters(world, def, cur);
  if (def.star) {
    const pos = ringPoint(world, 500, 900);
    cur.star = { pos, xp: def.star.xp, range: def.star.range ?? 100 };
    world.events.push({ kind: 'starFallen', omen: def.id, pos: { ...pos } });
  }
  if (def.contest) {
    cur.kills0 = {};
    for (const [id, rec] of world.heroRecords) cur.kills0[id] = rec.kills;
  }
}

function spawnOmenMonsters(world: World, def: OmenDef, cur: Current): void {
  const sp = def.spawn;
  if (!sp) return;
  const regular = (world.data.monsters ?? []).filter((m) => !m.boss);
  const mon =
    sp.monster === 'strongest'
      ? regular.reduce<(typeof regular)[number] | undefined>(
          (a, b) => (!a || maxHp(b.attrs) > maxHp(a.attrs) ? b : a),
          undefined,
        )
      : world.data.monsters?.find((m) => m.id === sp.monster);
  if (!mon) return;
  const plots = world.data.plots ?? [];
  const at: Vec2 =
    sp.at === 'plot' && plots.length > 0
      ? { ...plots[Math.floor(world.rng() * plots.length)] }
      : ringPoint(world, 400, 600);
  const lt = world.tuning.lair;
  const raidId = sp.raid ? world.nextId++ : undefined;
  if (raidId !== undefined) world.raidActive.push(raidId);
  const units: number[] = [];
  for (let i = 0; i < sp.count; i++) {
    const id = world.nextId++;
    const base = maxHp(scaleAttrs(mon.attrs, tierValue(lt.statMult, 1, 1)));
    const hp = sp.elite ? Math.round(base * lt.eliteHpMult) : base;
    world.units.push({
      id,
      kind: 'monster',
      type: mon.id,
      tier: 1,
      ...(sp.elite ? { elite: true as const } : {}),
      god: null,
      path: null,
      pos: { x: at.x + i * 8, y: at.y },
      facing: { x: 0, y: 1 },
      hp,
      maxHp: hp,
      target: null,
      ko: false,
      mode: 'wander',
      party: 0,
      trait: null,
      gold: 0,
      bounty: null,
    });
    world.unitRuntime.set(id, {
      lair: null,
      cooldownMs: 0,
      target: null,
      idleMs: 0,
      ...(raidId !== undefined ? { raid: true, raidId } : { roam: { ...at } }),
    });
    units.push(id);
    world.events.push({
      kind: 'spawned',
      unit: id,
      type: mon.id,
      lair: -1,
      ...(sp.elite ? { elite: true as const } : {}),
    });
    if (sp.bounty) {
      const flag = world.nextId++;
      world.bounties.push({
        id: flag,
        pos: { x: at.x + i * 8, y: at.y },
        gold: sp.bounty,
        placedMs: world.timeMs,
        target: id,
      });
      world.events.push({ kind: 'bountyPlaced', bounty: flag, gold: sp.bounty, target: id });
    }
  }
  cur.spawned = units;
  world.events.push({ kind: 'omenSpawn', omen: def.id, units });
  if (sp.bounty) rescoreForFlag(world);
}

// The first party to reach a fallen star gets its XP.
function tickStar(world: World, cur: Current): void {
  const star = cur.star;
  if (!star) return;
  const hero = world.units.find(
    (u) => u.kind === 'hero' && !u.ko && u.hp > 0 && dist(u.pos, star.pos) <= star.range,
  );
  if (!hero) return;
  delete cur.star;
  shareXp(world, hero.id, star.xp);
  world.events.push({ kind: 'starFound', omen: cur.id, party: hero.party, xp: star.xp });
}

// The party with the most kills while the omen lasted gets a bonus card (a tie goes to the party
// that was out first).
function awardContest(world: World, def: OmenDef, cur: Current): void {
  const base = cur.kills0 ?? {};
  let best: { party: number; kills: number } | undefined;
  for (const party of [...world.parties.values()].sort((a, b) => a.id - b.id)) {
    let kills = 0;
    for (const id of party.members) {
      const rec = world.heroRecords.get(id);
      if (rec) kills += rec.kills - (base[id] ?? 0);
    }
    if (kills > 0 && (!best || kills > best.kills)) best = { party: party.id, kills };
  }
  const party = best && world.parties.get(best.party);
  if (party && bonusCard(world, party)) {
    world.events.push({ kind: 'bonusCard', omen: def.id, party: party.id });
  }
}
