# Buildings

Design owns this spec. Lead turns the proposed rows into backlog rows and data. Builds on Sim
130 (building tiers: `upgrade` command, cost x1.5 and x2.5, hp x1, x1.5, x2, temple, market and
tower tier effects), `items-and-shops.md` (smithy, shop tiers), `events.md` (favour from
temples, tower raid warning) and `progression.md`.

## Bottom line

- **One table for every building:** what it does at each tier, its cost and how many may
  stand. Most of it exists in Sim already; this spec fills the gaps and makes it one list.
- **The town hall gets tiers** and becomes the gate: a building can only reach the town hall's
  tier, and each town hall tier opens 2 more plots (8, 10, 12).
- **One new building, the Hearth Hall:** heroes gather, rest and form parties there; it is the
  building that steers the "parties, not units" pillar.
- **Damage and ruins:** buildings repair slowly between raids; a destroyed building leaves a
  ruin that can be rebuilt for half its cost instead of vanishing.
- **Walls stay out** (pathing cost, little to watch); the tower remains the only defence.

## 1. The buildings

| Building    | Cost | Max             | Tier 1                                                        | Tier 2                                                                          | Tier 3                                               |
| ----------- | ---- | --------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Town hall   | free | 1               | 500 hp, 8 plots, buildings up to tier 1                       | 750 hp, 10 plots, buildings up to tier 2                                        | 1000 hp, 12 plots, buildings up to tier 3            |
| Temple (x3) | 150  | 1 each pantheon | calls its gods' children every 22 s, 7 alive; favour +1 / 4 s | recruit x0.8, +2 alive; favour x2                                               | recruit x0.6, +4 alive; favour x3                    |
| Market      | 100  | 1               | potions; tax x1                                               | greater potions, charms; tax x1.25                                              | 3 potion slots, 200 charms; tax x1.5                 |
| Smithy      | 120  | 1               | weapon and armour level 1; tax x1                             | up to level 2; tax x1.25                                                        | up to level 3; tax x1.5                              |
| Shrine      | 120  | 1               | rest x3; boss death -5 points                                 | rest x4; boss death -10 points                                                  | rest x5; boss death -15 points                       |
| Guard tower | 80   | 3               | range 300, 8 dmg / 2.0 s                                      | range 360, 14 / 1.8 s; raid warning +5 s                                        | range 420, 22 / 1.6 s; raid warning +5 s             |
| Hearth Hall | 100  | 1               | heroes rest x1.5 here; parties merge within 400 (not 250)     | bonds grow x1.5; late recruits may join parties up to level 4 (default below 3) | a resting party gets +10% max hp until it next rests |

- Numbers in plain type are today's (Sim 130 and decisions); the rest are new.
- **Upgrade cost** stays as today: cost x1.5 for tier 2, x2.5 for tier 3. Town hall: 400 for
  tier 2, 900 for tier 3 (data `upgradeCost`).
- **Shrine and boss death** is `combat.md`'s -5 points per shrine tier, listed here per tier.
- **Hearth Hall vs. shrine:** the shrine heals fast; the hall heals slower but keeps parties
  together and grows bonds. Heroes rest at the closest of the two unless their party is below
  50% hp (then the shrine).

## 2. Plots and placement

- Plots stay a fixed ring list in data (today 8). The town hall tiers unlock plots 9-10 and
  11-12 in an outer ring; locked plots show as faint outlines with a lock.
- Any building on any free plot. Building takes 5 s (a scaffold), upgrading 5 s (scaffold over
  the old picture); during it the building works at its old tier.

## 3. Damage, repair and ruins

| Rule      | Proposed                                                                        |
| --------- | ------------------------------------------------------------------------------- |
| Repair    | a building heals 1% max hp per second when no monster is within 300             |
| Ruin      | at 0 hp a building becomes a ruin on its plot (works no more); the tier is lost |
| Rebuild   | tap the ruin: rebuild at tier 1 for 50% of its cost                             |
| Clear     | or clear it for free (frees the plot)                                           |
| Town hall | at 0 hp the run is lost (today); it never becomes a ruin                        |

Heroes inside a destroyed shop or hall are pushed out, unhurt.

## 4. What the player sees

- **Tier art:** a new picture per tier (art exists for tier 1, tier 2 batch queued).
- **Scaffold** for 5 s when building or upgrading.
- **Damage:** smoke over a building below 50% hp, fire below 25%; a ruin picture (one generic
  rubble picture, tinted by the old building's colour).
- **Building card** (tap): name, tier, what it does now, what the next tier adds, the upgrade
  button with its cost (greyed with "needs town hall tier 2" when gated).
- **Locked plots:** faint outline and a lock that opens with a town hall tier-up.

## 5. Proposed data rows

| Row             | Change                                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BuildingDef     | `max` (count), `hall` (Hearth Hall flag) or per-type effect fields as today                                                                                                                                                 |
| BuildingDef     | `townhall` gets `upgradeCost` [400, 900]                                                                                                                                                                                    |
| tuning.building | `hallRestMult` 1.5, `hallMergeRange` 400, `hallBondMult` 1.5, `hallJoinBelowLevel` 5 (tier 2), `hallHpBuff` 0.1 (tier 3), `shrineRestMult` [3, 4, 5], `shrineBossDeath` [0.05, 0.1, 0.15], `towerWarnAddMs` [0, 5000, 5000] |
| tuning.town     | `townHallHp` [500, 750, 1000], `plotsByHallTier` [8, 10, 12], `buildMs` 5000, `repairPerS` 0.01, `repairSafeRange` 300, `rebuildCostMult` 0.5                                                                               |
| GameData.plots  | 12 plots (the outer 4 locked until town hall tiers)                                                                                                                                                                         |

## 6. Proposed backlog rows

### Sim

| Order | Row                                                                     |
| ----- | ----------------------------------------------------------------------- |
| 10    | Town hall tiers: upgrade, hp, plot unlocks, building tier gate          |
| 20    | Hearth Hall: rest, merge range, bonds, late joins, hp buff              |
| 30    | Build and upgrade time (5 s), repair, ruins, rebuild and clear commands |
| 40    | Shrine tier values (rest, boss death) and tower warning by tier         |

### Scene

| Order | Row                                                                    |
| ----- | ---------------------------------------------------------------------- |
| 10    | Building card with gating text; locked plots with a lock               |
| 20    | Scaffold, smoke and fire by hp, ruin picture, rebuild and clear on tap |

### Art

| Order | Row                                                                                 |
| ----- | ----------------------------------------------------------------------------------- |
| 10    | `bld_hearth-hall_t1..t3`: a long timber hall with a smoking roof, benches outside   |
| 20    | `bld_ruin`: generic rubble, tinted in code; `bld_scaffold`: timber scaffold overlay |

### Lead (data)

| Order | Row                                      |
| ----- | ---------------------------------------- |
| 10    | Building rows and tuning above; 12 plots |

## Decided (Stefan, 2026-10-13)

1. **Town hall tiers gate other buildings.**
2. **Hearth Hall** is added.
3. **Ruins stay and rebuild at half cost.**
4. **Walls:** left out.
