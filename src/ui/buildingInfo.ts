import { DEFAULT_TUNING } from '../sim/api';
import type { BuildingTuning } from '../sim/types';

// Text for the building panel. Numbers come from the sim's tuning table (display only: the sim
// decides what a building does).
const NAMES: Record<string, string> = {
  townhall: 'Town hall',
  temple_aesir: 'Aesir temple',
  temple_greek: 'Greek temple',
  temple_egyptian: 'Egyptian temple',
};

export function buildingName(type: string): string {
  if (NAMES[type]) return NAMES[type];
  const s = type.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// The last entry of a per-tier array holds for higher tiers.
function at(arr: readonly number[], tier: number): number {
  return arr[Math.min(Math.max(tier, 1), arr.length) - 1] ?? 0;
}

export function buildingEffect(
  type: string,
  tier: number,
  t: BuildingTuning = DEFAULT_TUNING.building,
): string {
  if (type.startsWith('temple')) {
    const recruit = Math.round(at(t.templeRecruitMult, tier) * 100);
    return `Recruits at ${recruit}% of base time, +${at(t.templeCapAdd, tier)} heroes allowed`;
  }
  if (type === 'market')
    return `Tax x${at(t.marketTaxMult, tier)}, up to ${at(t.marketStock, tier)} gold per visit`;
  if (type === 'tower')
    return `Range ${at(t.towerRange, tier)}, ${at(t.towerDamage, tier)} damage every ${(at(t.towerCooldownMs, tier) / 1000).toFixed(1)} s`;
  if (type === 'shrine') return 'Wounded heroes rest here';
  if (type === 'townhall') return 'The heart of the town. If it falls, the run is lost.';
  return '';
}

// One-line preview of what the next tier adds (empty at the top tier).
export function nextTierEffect(
  type: string,
  tier: number,
  t: BuildingTuning = DEFAULT_TUNING.building,
): string {
  if (tier >= t.maxTier) return '';
  const e = buildingEffect(type, tier + 1, t);
  return e ? `Next tier: ${e}` : `Next tier: ${Math.round(at(t.hpMult, tier + 1) * 100)}% hp`;
}
