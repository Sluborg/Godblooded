import type { World } from './world';
import type { HeroReport, RunReport, UnitState } from './types';

// Per hero and per run tallies for the end screen. Kept apart from the rules: the sim only
// counts, nothing here changes an outcome.

export interface HeroRecord {
  kills: number;
  lairKills: number;
  goldEarned: number;
  knockouts: number;
  damage: number;
  healing: number;
}

export const newRecord = (): HeroRecord => ({
  kills: 0,
  lairKills: 0,
  goldEarned: 0,
  knockouts: 0,
  damage: 0,
  healing: 0,
});

// Counts into the record of a hero; ids of monsters, buildings and unknown units are ignored.
export function tally(world: World, id: number, field: keyof HeroRecord, n = 1): void {
  const rec = world.heroRecords.get(id);
  if (rec) rec[field] += n;
}

// Gold a hero earns from the town side (monster bounty, lair bounty, bounty flags): in its
// purse and on the end screen. Shop spending is not income.
export function earn(world: World, hero: UnitState, gold: number): void {
  hero.gold += gold;
  tally(world, hero.id, 'goldEarned', gold);
}

// What makes a hero the MVP: kills plus five per lair destroyed. Ties go to damage, then gold
// earned, then the lower unit id.
const score = (r: HeroRecord) => r.kills + 5 * r.lairKills;

// Town gold sampled every tuning.stats.goldSampleMs.
export function sampleGold(world: World): void {
  const every = world.tuning.stats.goldSampleMs;
  if (every > 0 && world.timeMs >= world.goldLog.length * every) {
    world.goldLog.push({ timeMs: world.timeMs, gold: world.gold });
  }
}

// The end screen numbers; null while the run is still going.
export function buildReport(world: World): RunReport | null {
  if (world.status === 'running') return null;
  const heroes: HeroReport[] = [];
  for (const u of world.units) {
    const rec = world.heroRecords.get(u.id);
    if (u.kind !== 'hero' || !rec) continue;
    heroes.push({
      unit: u.id,
      type: u.type,
      god: u.god,
      path: u.path,
      tier: u.tier,
      ...rec,
      mvp: false,
    });
  }
  // Heroes slain for good still count in the report.
  for (const g of world.graves) {
    const rec = world.heroRecords.get(g.id);
    if (!rec) continue;
    heroes.push({
      unit: g.id,
      type: g.type,
      god: g.god,
      path: g.path,
      tier: g.tier,
      ...rec,
      slain: true,
      mvp: false,
    });
  }
  heroes.sort(
    (a, b) =>
      score(b) - score(a) || b.damage - a.damage || b.goldEarned - a.goldEarned || a.unit - b.unit,
  );
  if (heroes.length > 0 && score(heroes[0]) > 0) heroes[0].mvp = true;
  return {
    outcome: world.status,
    timeMs: world.timeMs,
    mvp: heroes.find((h) => h.mvp)?.unit ?? null,
    heroes,
    lairsCleared: world.lairLog.map((l) => ({ ...l })),
    goldHistory: goldHistory(world),
  };
}

// The sampled curve plus the final value; a sample taken at the very last instant is replaced
// by it, so timestamps only go up.
function goldHistory(world: World): { timeMs: number; gold: number }[] {
  const out = world.goldLog.map((g) => ({ ...g }));
  const last = out[out.length - 1];
  if (last && last.timeMs === world.timeMs) last.gold = world.gold;
  else out.push({ timeMs: world.timeMs, gold: world.gold });
  return out;
}
