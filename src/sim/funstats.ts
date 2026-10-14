import type { World } from './world';
import type { FightRecord, FunStats, UnitState } from './types';

// The numbers behind M2's fun checks (docs/systems/content-roadmap.md section 2): a record per
// fight of a party (start, end, any skill cast, the damage types its heroes and summons dealt),
// the times of the player's decisions and the longest quiet stretch. Read-only bookkeeping: nothing
// in the sim looks at it.

const SIX_MIN = 6 * 60_000;

// Events already looked at, per world (the snapshot hands out the events array and starts a new
// one, so the position is only valid for the array it was taken on).
const seen = new WeakMap<World, { events: unknown; index: number }>();

const heroOf = (world: World, unit: UnitState | undefined): UnitState | undefined => {
  if (!unit) return undefined;
  if (unit.kind === 'hero') return unit;
  const owner = unit.kind === 'summon' ? unit.summon?.owner : undefined;
  return owner === undefined ? undefined : world.units.find((u) => u.id === owner);
};

// Called at the end of every tick.
export function trackFightStats(world: World): void {
  const now = world.timeMs;
  const open = new Map<number, FightRecord>();
  for (const f of world.fights) if (f.open) open.set(f.party, f);
  // Parties in a fight: any living member whose own fight is still running.
  for (const party of world.parties.values()) {
    let active = false;
    let tier2 = false;
    for (const id of party.members) {
      const u = world.units.find((x) => x.id === id);
      if (!u || u.ko || u.hp <= 0) continue;
      if (u.tier >= 2) tier2 = true;
      if ((world.unitRuntime.get(id)?.fightUntilMs ?? 0) > now) active = true;
    }
    const rec = open.get(party.id);
    if (active && !rec) {
      const f: FightRecord = {
        party: party.id,
        startMs: now,
        endMs: now,
        open: true,
        cast: false,
        types: [],
        tier2,
      };
      world.fights.push(f);
      open.set(party.id, f);
    } else if (active && rec) {
      rec.endMs = now;
    } else if (rec) {
      delete rec.open;
      open.delete(party.id);
    }
  }
  // A fight whose party is gone (merged away) is over.
  for (const [id, rec] of open) {
    if (!world.parties.has(id)) delete rec.open;
  }
  // Skill casts and damage types, from this tick's events.
  const prev = seen.get(world);
  let from = prev && prev.events === world.events ? prev.index : 0;
  if (from > world.events.length) from = 0;
  let levelUp = false;
  for (let i = from; i < world.events.length; i++) {
    const e = world.events[i];
    if (e.kind === 'levelUp') levelUp = true;
    if (e.kind !== 'skill' && e.kind !== 'hit') continue;
    const who = world.units.find((u) => u.id === (e.kind === 'skill' ? e.caster : e.attacker));
    const hero = heroOf(world, who);
    const rec = hero && open.get(hero.party);
    if (!rec) continue;
    if (e.kind === 'skill') rec.cast = true;
    else if (!e.dodged && !rec.types.includes(e.type)) rec.types.push(e.type);
  }
  seen.set(world, { events: world.events, index: world.events.length });
  // The quiet gap, from the first hero's arrival: a fight, a level-up or a raid ends it.
  const q = world.quiet;
  if (world.stats.heroesArrived === 0) return;
  if (q.lastMs < 0) q.lastMs = now;
  if (open.size > 0 || levelUp || world.raidActive.length > 0) {
    q.lastMs = now;
    return;
  }
  const gap = now - q.lastMs;
  if (gap > q.longestMs) {
    q.longestMs = gap;
    q.atMs = now;
  }
}

const share = (num: number, den: number): number | null => (den > 0 ? num / den : null);

export function funStats(world: World): FunStats {
  const late = world.fights.filter((f) => f.startMs >= SIX_MIN);
  const tier2 = world.fights.filter((f) => f.tier2);
  const minutes = Math.floor(world.timeMs / 60_000);
  let withDecision = 0;
  for (let m = 0; m < minutes; m++) {
    if (world.decisionsAt.some((t) => t >= m * 60_000 && t < (m + 1) * 60_000)) withDecision++;
  }
  return {
    fights: world.fights.length,
    castShareAfter6: share(late.filter((f) => f.cast).length, late.length),
    typesShareTier2: share(tier2.filter((f) => f.types.length >= 2).length, tier2.length),
    decisions: world.decisionsAt.length,
    decisionsPerMin: world.timeMs > 0 ? world.decisionsAt.length / (world.timeMs / 60_000) : 0,
    decisionMinuteShare: share(withDecision, minutes),
    longestQuietMs: world.quiet.longestMs,
    longestQuietAtMs: world.quiet.atMs,
  };
}
