import { makeRng, type Rng } from './rng';
import type { GameData, LairSite, MapRules } from './types';

// The map of a run (Sim 150): lairs laid out from the seed by the rows in GameData.mapRules.
// Its own random stream, so the layout of a seed never depends on what the rest of the sim
// draws, and the same seed always gives the same map.

export interface GeneratedMap {
  // Lair sites in lair-id order; the boss lair is last.
  sites: LairSite[];
  // Index into `sites` of the boss lair.
  bossIndex: number;
  // The pantheons this run leans on.
  lean: string[];
}

const PLACE_TRIES = 300;
const BOSS_CANDIDATES = 40;

export function generateMap(seed: number, data: GameData): GeneratedMap {
  const rules = data.mapRules;
  if (!rules) throw new Error('no mapRules');
  for (const e of rules.pool) {
    if (!data.lairs?.some((l) => l.id === e.lair))
      throw new Error(`map pool names unknown lair: ${e.lair}`);
  }
  if (!data.lairs?.some((l) => l.id === rules.boss)) {
    throw new Error(`map boss names unknown lair: ${rules.boss}`);
  }
  const rng = makeRng((seed ^ 0x5bd1e995) >>> 0);
  for (let i = 0; i < 4; i++) rng();

  const count = Math.max(
    1,
    rules.lairs[0] + Math.floor(rng() * (rules.lairs[1] - rules.lairs[0] + 1)),
  );
  const lean = pickLean(rng, rules);
  const placed: { x: number; y: number }[] = [];

  // The boss goes where it is farthest from the town.
  const boss = farthestFromTown(rng, rules, data);
  placed.push(boss);

  const sites: LairSite[] = [];
  const bag: { lair: string; weight: number }[] = [];
  const refill = () => {
    bag.length = 0;
    for (const e of rules.pool) {
      bag.push({
        lair: e.lair,
        weight: (e.weight ?? 1) * (lean.includes(e.pantheon) ? rules.leanWeight : 1),
      });
    }
  };
  for (let i = 0; i < count - 1; i++) {
    if (bag.length === 0) refill();
    if (bag.length === 0) break;
    const pick = drawWeighted(rng, bag);
    const [entry] = bag.splice(pick, 1);
    const pos = place(rng, rules, data, placed);
    placed.push(pos);
    sites.push({ lair: entry.lair, pos });
  }
  sites.push({ lair: rules.boss, pos: boss });
  return { sites, bossIndex: sites.length - 1, lean };
}

function pickLean(rng: Rng, rules: MapRules): string[] {
  const pantheons = [...new Set(rules.pool.map((e) => e.pantheon))];
  const out: string[] = [];
  while (out.length < Math.min(rules.leanCount, pantheons.length)) {
    out.push(...pantheons.splice(Math.floor(rng() * pantheons.length), 1));
  }
  return out;
}

function drawWeighted(rng: Rng, bag: readonly { weight: number }[]): number {
  const total = bag.reduce((a, b) => a + Math.max(0, b.weight), 0);
  if (total <= 0) return Math.floor(rng() * bag.length);
  let r = rng() * total;
  for (let i = 0; i < bag.length; i++) {
    r -= Math.max(0, bag[i].weight);
    if (r < 0) return i;
  }
  return bag.length - 1;
}

const randomPoint = (rng: Rng, rules: MapRules, data: GameData) => ({
  x: rules.margin + rng() * Math.max(0, data.map.width - 2 * rules.margin),
  y: rules.margin + rng() * Math.max(0, data.map.height - 2 * rules.margin),
});

const distTo = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

function farthestFromTown(rng: Rng, rules: MapRules, data: GameData) {
  let best = randomPoint(rng, rules, data);
  for (let i = 1; i < BOSS_CANDIDATES; i++) {
    const p = randomPoint(rng, rules, data);
    if (distTo(p, data.townHall) > distTo(best, data.townHall)) best = p;
  }
  return best;
}

// A spot clear of the town and the other lairs; when the map is too crowded for the rules, the
// roomiest spot of the tries.
function place(
  rng: Rng,
  rules: MapRules,
  data: GameData,
  placed: readonly { x: number; y: number }[],
) {
  let best = randomPoint(rng, rules, data);
  let bestRoom = -Infinity;
  for (let i = 0; i < PLACE_TRIES; i++) {
    const p = randomPoint(rng, rules, data);
    const room = Math.min(
      distTo(p, data.townHall) - rules.minTownDist,
      ...placed.map((q) => distTo(p, q) - rules.minLairDist),
    );
    if (room >= 0) return p;
    if (room > bestRoom) {
      best = p;
      bestRoom = room;
    }
  }
  return best;
}
