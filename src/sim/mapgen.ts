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
  const known = (id: string, what: string) => {
    const lair = data.lairs?.find((l) => l.id === id);
    if (!lair) throw new Error(`${what} names unknown lair: ${id}`);
    if (!data.monsters?.some((m) => m.id === lair.monster)) {
      throw new Error(`${what} lair ${id} names unknown monster: ${lair.monster}`);
    }
  };
  for (const e of rules.pool) known(e.lair, 'map pool');
  known(rules.boss, 'map boss');
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
  const far = (p: { x: number; y: number }) => distTo(p, data.townHall);
  const farthest = (list: { x: number; y: number }[]) =>
    list.reduce((best, p) => (far(p) > far(best) ? p : best));
  const samples = Array.from({ length: BOSS_CANDIDATES }, () => randomPoint(rng, rules, data));
  const valid = (list: { x: number; y: number }[]) =>
    list.filter((p) => far(p) >= rules.minTownDist);
  if (valid(samples).length > 0) return farthest(valid(samples));
  // The minimum distance only fits near the corners: look harder, corners included.
  const m = rules.margin;
  const corners = [
    { x: m, y: m },
    { x: data.map.width - m, y: m },
    { x: m, y: data.map.height - m },
    { x: data.map.width - m, y: data.map.height - m },
  ];
  const more = Array.from({ length: BOSS_CANDIDATES * 5 }, () => randomPoint(rng, rules, data));
  const pool = [...samples, ...more, ...corners];
  const ok = valid(pool);
  // Relaxed only when no spot at all is that far from the town.
  return farthest(ok.length > 0 ? ok : pool);
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
