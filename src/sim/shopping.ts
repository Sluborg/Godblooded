import { emptyItems, itemsOf } from './items';
import { passivePotionSlots } from './passives';
import { dist, tierValue } from './units';
import type { World } from './world';
import type { BuildingCore, HeroItems, ItemDef, UnitState, Vec2 } from './types';

// Shopping with item rows (Sim 290, docs/systems/items-and-shops.md section 3). A rested hero
// plans its buys in town from a budget, then walks to the shops that hold them. Without item rows
// in the data heroes keep the plain market spend (heroes.ts).

// One shop to visit and the items to buy there, by id.
export interface ShopStop {
  shop: 'smithy' | 'market';
  items: string[];
}

export const hasItemRows = (world: World): boolean => (world.data.items?.length ?? 0) > 0;

// The nearest built shop of a kind.
export function nearestShop(
  world: World,
  kind: 'smithy' | 'market',
  from: Vec2,
): BuildingCore | undefined {
  let best: BuildingCore | undefined;
  for (const b of world.buildings) {
    if (b.type === kind && (!best || dist(from, b.pos) < dist(from, best.pos))) best = b;
  }
  return best;
}

// The potion a market of this tier sells: its highest-tier potion row.
function potionAt(world: World, marketTier: number): ItemDef | undefined {
  let best: ItemDef | undefined;
  for (const i of world.data.items ?? []) {
    if (i.slot === 'potion' && i.shopTier <= marketTier && (!best || i.shopTier > best.shopTier)) {
      best = i;
    }
  }
  return best;
}

// A charm to buy: among the market's charms the hero can afford, the dearest (one drawn when
// several tie). With a charm already it only swaps for a dearer one of at least charmSwapPrice.
function charmToBuy(
  world: World,
  held: string | null,
  marketTier: number,
  budget: number,
): ItemDef | undefined {
  const items = world.data.items ?? [];
  const cur = held ? items.find((i) => i.id === held) : undefined;
  const floor = held ? Math.max(world.tuning.hero.charmSwapPrice, (cur?.price ?? 0) + 1) : 0;
  const fits = items.filter(
    (i) =>
      i.slot === 'charm' &&
      i.id !== held &&
      i.shopTier <= marketTier &&
      i.price <= budget &&
      i.price >= floor,
  );
  if (fits.length === 0) return undefined;
  const top = Math.max(...fits.map((i) => i.price));
  const best = fits.filter((i) => i.price === top);
  return best.length === 1 ? best[0] : best[Math.floor(world.rng() * best.length)];
}

// The next level of weapon or armour a smithy of this tier sells.
function nextLevel(
  world: World,
  slot: 'weapon' | 'armour',
  have: number,
  smithyTier: number,
): ItemDef | undefined {
  return world.data.items?.find(
    (i) => i.slot === slot && i.level === have + 1 && i.shopTier <= smithyTier,
  );
}

function shareOf(world: World, unit: UnitState): number {
  const t = world.tuning.hero;
  return unit.trait === 'greedy'
    ? t.greedySpend
    : unit.trait === 'proud'
      ? t.proudSpend
      : t.spendShare;
}

// What a hero would buy now, in order, and where. Empty when it cannot afford anything or the
// shops it needs are not built.
export function planShopping(world: World, unit: UnitState): ShopStop[] {
  const smithy = nearestShop(world, 'smithy', unit.pos);
  const market = nearestShop(world, 'market', unit.pos);
  let budget = Math.floor(unit.gold * shareOf(world, unit));
  const have: HeroItems = { ...itemsOf(unit) };
  const bought: { item: ItemDef; shop: 'smithy' | 'market' }[] = [];
  const potion = market ? potionAt(world, market.tier) : undefined;
  const potionMax = market
    ? tierValue(world.tuning.hero.potionMax, market.tier, 2) + passivePotionSlots(world, unit)
    : 0;
  const buyPotion = () => {
    if (!potion || have.potions >= potionMax || potion.price > budget) return false;
    budget -= potion.price;
    have.potions++;
    bought.push({ item: potion, shop: 'market' });
    return true;
  };
  // The next weapon or armour level that fits the budget: the cheaper (proud: weapon, coward: armour).
  const pickGear = (): ItemDef | undefined => {
    if (!smithy) return undefined;
    const w = nextLevel(world, 'weapon', have.weapon, smithy.tier);
    const a = nextLevel(world, 'armour', have.armour, smithy.tier);
    const fits = [w, a].filter((i): i is ItemDef => !!i && i.price <= budget);
    if (fits.length === 0) return undefined;
    let pick = fits.reduce((x, y) => (y.price < x.price ? y : x));
    if (fits.length === 2 && unit.trait === 'proud') pick = w!;
    if (fits.length === 2 && unit.trait === 'coward') pick = a!;
    return pick;
  };
  const buyGear = (pick: ItemDef): void => {
    budget -= pick.price;
    if (pick.slot === 'weapon') have.weapon++;
    else have.armour++;
    bought.push({ item: pick, shop: 'smithy' });
  };
  // 0: a hero with no gear at all buys its first piece before its first potion, if it can pay
  // for it (else the potion comes first as usual)
  if (have.weapon === 0 && have.armour === 0) {
    const first = pickGear();
    if (first) buyGear(first);
  }
  // 1: a potion if it holds none
  if (have.potions === 0) buyPotion();
  // 2: the next weapon or armour level, the cheaper first (proud: weapon, coward: armour)
  for (let pick = pickGear(); pick; pick = pickGear()) buyGear(pick);
  // 3: a charm, if it has none (or a dearer one worth the swap)
  if (market) {
    const charm = charmToBuy(world, have.charm, market.tier, budget);
    if (charm) {
      budget -= charm.price;
      have.charm = charm.id;
      bought.push({ item: charm, shop: 'market' });
    }
  }
  // 4: more potions up to the market's cap
  while (buyPotion()) {
    /* keep buying while it fits */
  }
  if (bought.length === 0) return [];
  // The market first when the plan has a potion, else the nearest shop; each shop once.
  const kinds = [...new Set(bought.map((b) => b.shop))];
  const nearestKind = (k: 'smithy' | 'market') => nearestShop(world, k, unit.pos);
  kinds.sort((x, y) => {
    if (kinds.includes('market') && (x === 'market') !== (y === 'market')) {
      return x === 'market' ? -1 : 1;
    }
    return dist(unit.pos, nearestKind(x)!.pos) - dist(unit.pos, nearestKind(y)!.pos);
  });
  return kinds.map((shop) => ({
    shop,
    items: bought.filter((b) => b.shop === shop).map((b) => b.item.id),
  }));
}

// Buys one planned item if the hero can still pay and it still fits; returns the price paid
// (0 when skipped).
export function buyItem(world: World, unit: UnitState, id: string, shopTier: number): number {
  const item = world.data.items?.find((i) => i.id === id);
  if (!item || item.shopTier > shopTier || unit.gold < item.price) return 0;
  const items = (unit.items ??= emptyItems());
  switch (item.slot) {
    case 'weapon':
      if (item.level !== items.weapon + 1) return 0;
      items.weapon = item.level;
      break;
    case 'armour':
      if (item.level !== items.armour + 1) return 0;
      items.armour = item.level;
      break;
    case 'potion':
      if (
        items.potions >=
        tierValue(world.tuning.hero.potionMax, shopTier, 2) + passivePotionSlots(world, unit)
      ) {
        return 0;
      }
      items.potions++;
      (items.flasks ??= []).push(item.id);
      break;
    case 'charm': {
      const cur = items.charm ? world.data.items?.find((i) => i.id === items.charm) : undefined;
      if (
        items.charm !== null &&
        (item.price < world.tuning.hero.charmSwapPrice || item.price <= (cur?.price ?? 0))
      ) {
        return 0;
      }
      items.charm = item.id;
      break;
    }
  }
  unit.gold -= item.price;
  return item.price;
}
