# Items and shops

Design owns this spec. Lead turns the proposed rows into backlog rows and data. Builds on
`docs/systems/combat.md` (armour, power, crit, resist) and today's economy (decision
2026-10-04 "Graybox hero life": heroes spend 60% of their gold at the market, the town taxes
50% of it).

## Bottom line

- **Heroes buy four things:** a weapon level, an armour level, healing potions and one charm.
  No inventory screen, no loot tables: every hero has the same four slots.
- **Item level capped by shop tier.** A tier 1 smithy sells level 1 gear, tier 2 up to level 2,
  tier 3 up to level 3; heroes climb one level per purchase. Upgrading a shop is how the player buys power for heroes nobody commands.
- **The town lives on tax.** A hero pays the item's price; the town keeps the shop's tax share
  (50% at tier 1, more at higher tiers); the rest vanishes. Same Majesty loop as today, but
  heroes now spend on something that shows.
- **Two shops:** the **smithy** (weapons, armour) and the **market** (potions, charms). The
  alchemist from the first design draft folds into the market.
- **Gear reads on the map:** weapon level as a glow on the weapon, armour level as the outline,
  a flask pip for potions. A tap on a hero shows the four slots.

## 1. Slots

| Slot    | Holds                           | Buys at | Effect                                                            |
| ------- | ------------------------------- | ------- | ----------------------------------------------------------------- |
| weapon  | level 0 to 3                    | smithy  | adds to power (Str for weapon templates, spell power for casters) |
| armour  | level 0 to 3                    | smithy  | adds armour and Willpower by kit (below)                          |
| potions | 0 to 2 (3 with a tier 3 market) | market  | drunk in a fight below the flee threshold plus 10 points          |
| charm   | one charm or none               | market  | a small special bonus (table below)                               |

- **Level 0** is what a hero arrives with. Buying the next level replaces the old one (no
  selling, no stash).
- **Kit** comes from the hidden template: heavy (warrior, paladin), light (rogue, ranger), robe
  (wizard, healer). The same armour level gives a heavy kit more armour and a robe more
  Willpower.
- **Knockout** keeps all gear (`combat.md`: it costs carried gold). **Death** loses it.

## 2. Item rows

### Weapons (smithy)

| Level | Name (weapon kits) | Name (casters) | Power | Price | Smithy tier |
| ----- | ------------------ | -------------- | ----- | ----- | ----------- |
| 1     | Tempered           | Carved focus   | +2    | 20    | 1           |
| 2     | Master-forged      | Runed focus    | +4    | 150   | 2           |
| 3     | Godsteel           | Star focus     | +7    | 320   | 3           |

Level 1 is 20 gold (first draft 60) so heroes own gear by 8:00 (Balance, 2026-10-14; `pacing-review.md` 5).

### Armour (smithy)

| Level | Price | Heavy: armour / Wp | Light: armour / Wp | Robe: armour / Wp | Smithy tier |
| ----- | ----- | ------------------ | ------------------ | ----------------- | ----------- |
| 1     | 20    | +4 / 0             | +2 / +1            | 0 / +2            | 1           |
| 2     | 130   | +8 / +1            | +4 / +2            | +1 / +4           | 2           |
| 3     | 280   | +13 / +2           | +7 / +3            | +2 / +7           | 3           |

With `combat.md` K 20, a paladin (base 10) goes from 30% to 48% physical mitigation with
level 3 armour; a wizard's magic resist (Wp 5) goes from 13% to 26%.

### Potions (market)

| Id      | Heals      | Price | Market tier |
| ------- | ---------- | ----- | ----------- |
| healing | 40% max hp | 20    | 1           |
| greater | 70% max hp | 40    | 2           |

- A hero drinks one in a fight when below its flee threshold plus 10 points (a 30% fleer
  drinks at 40%), takes 0.5 s, and fights on. With no potion left it flees as today.
- Coward heroes drink at plus 25 points. Berserkers (never flee) drink at 30%.
- A tier 2 market sells only greater potions; a hero holding small ones keeps them.

### Charms (market, tier 2 and up)

| Id         | Effect                             | Price | Market tier |
| ---------- | ---------------------------------- | ----- | ----------- |
| hawk-eye   | +8% crit chance                    | 90    | 2           |
| fox-tail   | +6% dodge                          | 90    | 2           |
| ember-ward | fire and frost hit 25% softer      | 90    | 2           |
| grave-ward | death hits 40% softer; no wither   | 90    | 2           |
| bloodstone | heal 2% max hp per kill            | 200   | 3           |
| ward-ring  | the first hit each fight is halved | 200   | 3           |

Charms are generic, not per pantheon: pantheon flavour lives in passives and skills
(`paths-and-skills.md`). A hero swaps a charm only for a 200 one.

## 3. Shopping rules

1. **When:** after resting in town, a hero with at least `shopMinGold` (20) goes shopping, as
   today. It first plans its buys in town (steps 2 and 3), then walks to the shops that hold
   them: the market first when the plan has a potion, else the nearest; each shop once.
2. **Budget:** today's `spendShare` (60%) of carried gold, by trait: greedy 35% (hoards),
   proud 80% (wants the best). The rest stays carried (and is at risk on a knockout).
3. **What first:** it walks this list in order and plans every item it can still afford from
   the budget:
   1. a potion, if it holds none;
   2. the next weapon or armour level (the cheaper of the two; proud: weapon first, coward:
      armour first);
   3. a charm, if it has none;
   4. a second potion (third at a tier 3 market).
4. **Tax:** the town gets `price x taxRate x shop tier multiplier` per item (`taxRate` 0.55,
   Balance 2026-10-14; today's
   `marketTaxMult` 1, 1.25, 1.5, now also on the smithy). The event `shopped` carries the
   item id.
5. **Stock:** a shop of tier t sells every level up to t, so a hero arriving late with level 0
   gear buys level 1 first, then 2, at their own prices (one level per purchase, several per
   visit if the budget allows).
6. **No stock caps:** today's `marketStock` (a spend cap per visit) goes; the budget and the
   item prices do that job now.
7. **Lair relic:** when a party destroys a lair, its leader gets a free charm (the best one it
   lacks). A small, visible reward for the big fight.

## 4. Gold flow (one run, rough)

| Flow         | Source                            | Rough size per run |
| ------------ | --------------------------------- | ------------------ |
| Heroes earn  | kill bounties, flags, lair bounty | 300-600 per hero   |
| Heroes spend | items, 60% budget per visit       | 200-450 per hero   |
| Town earns   | tax on items (50-75%)             | 1500-3000 total    |
| Town spends  | buildings, upgrades, bounty flags | all of it          |
| Town starts  | `startGold` 480                   |                    |

A hero who reaches party level 6 should own about level 2 weapon and armour with a tier 2
smithy, and level 3 of one with a tier 3 smithy. Lead checks this with the Sim bot (new
stat: average weapon and armour level at run end).

## 5. What the player sees

- **On the map:** weapon level 2 a steel shimmer on the weapon point, level 3 a glow in the
  hero's damage type colour; armour level as the outline (none, iron grey, bronze, gold); one
  small flask pip per potion over the health bar.
- **Shopping:** the hero walks in, a coin pops over the shop with the tax (`+12`), and a small
  item icon rises over the hero as it walks out.
- **Drinking:** the flask pip empties, a green swirl, a heal number.
- **Hero card** (tap a hero): god, path, tier, trait, the four slots with icons, gold carried.
  Read only, one panel, landscape.
- **Shop card** (tap a shop): its tier, what it sells now, what the next tier unlocks. The
  upgrade button stays where it is.

## 6. Proposed data rows

### ItemDef (new table)

| Field    | Example                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id       | `armour-2`                                                                                                                                                   |
| slot     | `weapon` / `armour` / `potion` / `charm`                                                                                                                     |
| level    | 2 (weapon and armour), else omitted                                                                                                                          |
| price    | 130                                                                                                                                                          |
| shop     | `smithy` / `market`                                                                                                                                          |
| shopTier | 2                                                                                                                                                            |
| effects  | per kit for armour: `{ heavy: { armour: 8, wp: 1 }, light: {...}, robe: {...} }`; weapons `{ power: 4 }`; potions `{ healPct: 70 }`; charms `{ crit: 0.08 }` |

### Other rows

| Row             | Change                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ClassDef        | `kit`: `heavy` / `light` / `robe`                                                                                       |
| BuildingDef     | `smithy` (cost 120, proposed)                                                                                           |
| tuning.hero     | `potionMax` [2, 2, 3] by market tier, `potionDrinkAdd` 0.1, `cowardDrinkAdd` 0.25, `greedySpend` 0.35, `proudSpend` 0.8 |
| tuning.building | `shopTaxMult` replaces `marketTaxMult` (same values, both shops); `marketStock` removed                                 |
| UnitState       | `items: { weapon, armour, potions, charm }` in the snapshot                                                             |

If a run is ever saved mid-run, the hero shape changes: bump the save version and migrate
(heroes without items get level 0 and no potions).

## 7. Proposed backlog rows

### Sim

| Order | Row                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------- |
| 10    | Items: ItemDef, hero slots, weapon power and armour by kit into the combat pipeline            |
| 20    | Shopping: smithy then market, budget by trait, buy order, tax per item, `shopped` with item id |
| 30    | Potions: drink rule, coward and berserker offsets                                              |
| 40    | Charms and the lair relic                                                                      |
| 50    | Run stats: average weapon and armour level, items bought, tax by shop                          |

### Scene

| Order | Row                                                                                |
| ----- | ---------------------------------------------------------------------------------- |
| 10    | Gear on the map: weapon shimmer and glow, armour outline colour, potion pips       |
| 20    | Shopping feedback: tax coin over the shop, item icon over the hero, drinking swirl |
| 30    | Hero card on tap (god, path, tier, trait, four slots, gold), read only             |
| 40    | Shop card on tap: tier, what it sells, what the next tier unlocks                  |

### Art

| Order | Row                                                                                       |
| ----- | ----------------------------------------------------------------------------------------- |
| 10    | Item icons in the U2 UI kit style: sword, focus, armour, potion, greater potion, 6 charms |

### Lead

| Order | Row                                                                                    |
| ----- | -------------------------------------------------------------------------------------- |
| 10    | Data: item rows, kits on templates, smithy building row                                |
| 20    | Balance pass with items: same win and run length targets, gear level check (section 4) |

## Decided (Stefan, 2026-10-13)

1. **Two shops:** smithy and market.
2. **Charms** generic.
3. **Lair relic:** kept.
4. **Hero card on tap:** kept.
