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
  // 1: a potion if it holds none
  if (have.potions === 0) buyPotion();
  // 2: the next weapon or armour level, the cheaper first (proud: weapon, coward: armour)
  while (smithy) {
    const w = nextLevel(world, 'weapon', have.weapon, smithy.tier);
    const a = nextLevel(world, 'armour', have.armour, smithy.tier);
    const fits = [w, a].filter((i): i is ItemDef => !!i && i.price <= budget);
    if (fits.length === 0) break;
    let pick = fits.reduce((x, y) => (y.price < x.price ? y : x));
    if (fits.length === 2 && unit.trait === 'proud') pick = w!;
    if (fits.length === 2 && unit.trait === 'coward') pick = a!;
    budget -= pick.price;
    if (pick.slot === 'weapon') have.weapon++;
    else have.armour++;
    bought.push({ item: pick, shop: 'smithy' });
  }
  // 4: more potions up to the market's cap (charms, step 3, wait for Sim 310)
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
      items.potionId = item.id;
      break;
    case 'charm':
      return 0;
  }
  unit.gold -= item.price;
  return item.price;
}
