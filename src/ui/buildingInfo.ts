import { DEFAULT_TUNING } from '../sim/api';
import type { BuildingTuning, ItemDef } from '../sim/types';
import { GRAYBOX } from '../data/graybox';

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

// The best row of a slot a shop of this tier sells (a tier 2 market sells only the greater potion,
// a tier 2 smithy weapon and armour level 2).
function sold(
  items: readonly ItemDef[],
  shop: 'smithy' | 'market',
  slot: ItemDef['slot'],
  tier: number,
): ItemDef | undefined {
  const rows = items.filter((i) => i.shop === shop && i.slot === slot && i.shopTier <= tier);
  return rows.sort((a, b) => b.shopTier - a.shopTier)[0];
}

export function buildingEffect(
  type: string,
  tier: number,
  t: BuildingTuning = DEFAULT_TUNING.building,
  items: readonly ItemDef[] = GRAYBOX.items ?? [],
): string {
  if (type.startsWith('temple')) {
    const recruit = Math.round(at(t.templeRecruitMult, tier) * 100);
    return `Recruits at ${recruit}% of base time, +${at(t.templeCapAdd, tier)} heroes allowed`;
  }
  if (type === 'market') {
    const tax = `Tax x${at(t.marketTaxMult, tier)}`;
    const potion = sold(items, 'market', 'potion', tier);
    if (potion) return `${tax}. Sells ${potion.name ?? potion.id} for ${potion.price} gold`;
    return `${tax}, up to ${at(t.marketStock, tier)} gold per visit`;
  }
  if (type === 'smithy') {
    const weapon = sold(items, 'smithy', 'weapon', tier);
    const armour = sold(items, 'smithy', 'armour', tier);
    if (!weapon && !armour) return '';
    const parts = [
      weapon ? `weapon level ${weapon.level ?? 1} for ${weapon.price}` : '',
      armour ? `armour level ${armour.level ?? 1} for ${armour.price}` : '',
    ].filter(Boolean);
    return `Sells ${parts.join(', ')} gold`;
  }
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
  items: readonly ItemDef[] = GRAYBOX.items ?? [],
): string {
  if (tier >= t.maxTier) return '';
  const e = buildingEffect(type, tier + 1, t, items);
  return e ? `Next tier: ${e}` : `Next tier: ${Math.round(at(t.hpMult, tier + 1) * 100)}% hp`;
}
