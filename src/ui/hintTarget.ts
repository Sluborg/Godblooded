import type { Snapshot, Vec2 } from '../sim/api';
import type { HintTarget } from './hints';

// Where a hint's pulse goes in the world (pure; a `ui` target is a HUD button, found by the HUD).
// `unit` is the sim id the triggering event named (a unit, a lair or a building, ids are shared).
export function hintTargetPos(
  target: HintTarget,
  snap: Pick<Snapshot, 'plots' | 'buildings' | 'units' | 'lairs' | 'bounties'>,
  unit: number | null,
  at: Vec2 | null = null,
): Vec2 | null {
  switch (target.kind) {
    case 'plot':
      return snap.plots.find((p) => !p.occupied)?.pos ?? null;
    case 'building': {
      const b =
        snap.buildings.find((x) => x.id === unit) ??
        snap.buildings.find((x) => x.type === target.type);
      return b?.pos ?? null;
    }
    case 'unit':
      return snap.units.find((u) => u.id === unit)?.pos ?? null;
    case 'monster':
      return snap.units.find((u) => u.id === unit && u.kind === 'monster')?.pos ?? null;
    case 'lair':
      return (snap.lairs.find((l) => l.id === unit) ?? snap.lairs[0])?.pos ?? null;
    case 'flag':
      return snap.bounties[snap.bounties.length - 1]?.pos ?? null;
    case 'spot':
      return at;
    default:
      return null;
  }
}

// A monster a hero can see: the closest monster within `range` of any hero (its id), or null.
export function monsterSeenBy(units: Pick<Snapshot, 'units'>['units'], range = 300): number | null {
  const heroes = units.filter((u) => u.kind === 'hero' && !u.ko);
  let best: number | null = null;
  let bestD = range;
  for (const m of units)
    if (m.kind === 'monster')
      for (const h of heroes) {
        const d = Math.hypot(m.pos.x - h.pos.x, m.pos.y - h.pos.y);
        if (d <= bestD) {
          bestD = d;
          best = m.id;
        }
      }
  return best;
}

// The id of a building the town can afford to upgrade right now, or null.
export function upgradeAffordable(
  buildings: Pick<Snapshot, 'buildings'>['buildings'],
  gold: number,
): number | null {
  return buildings.find((b) => b.upgradeCost !== null && gold >= b.upgradeCost)?.id ?? null;
}

// The h-smithy condition: a market stands, no smithy does, and the living heroes carry this much
// gold between them with nothing to buy.
export const IDLE_GOLD = 100;

export function idleGold(
  snap: Pick<Snapshot, 'buildings' | 'units'>,
  minGold = IDLE_GOLD,
): boolean {
  const has = (type: string) => snap.buildings.some((b) => b.type === type);
  if (!has('market') || has('smithy')) return false;
  const carried = snap.units
    .filter((u) => u.kind === 'hero' && !u.ko)
    .reduce((sum, u) => sum + u.gold, 0);
  return carried >= minGold;
}

// The b-till condition: the first building whose till reached `minTill` (its id and spot), or null.
export function firstTill(
  buildings: Pick<Snapshot, 'buildings'>['buildings'],
  minTill: number,
): { id: number; pos: Vec2 } | null {
  const b = buildings.find((x) => (x.till ?? 0) >= minTill);
  return b ? { id: b.id, pos: b.pos } : null;
}
