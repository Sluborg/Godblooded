import type { World } from './world';
import type { OmenDef, OmenMods, OmenView, UnitState } from './types';

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
  }
  if (cur.started && now >= cur.endMs) {
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
  };
}
