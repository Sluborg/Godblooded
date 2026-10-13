# Hero AI

Design owns this spec. Lead turns the proposed rows into backlog rows. It audits how a
Godblood decides today (`src/sim/heroes.ts`, `parties.ts`, `world.ts`, `rivalry.ts`, read
2026-10-13) and proposes changes that make the decisions readable on screen. Pillar 2:
personality you can see.

## Bottom line

- **Today the logic is sound but invisible.** Heroes choose flags, lairs, revenge and retreat
  every second, but the only cue is a text label in the party panel. Destinations are random,
  bounty choice ignores distance, and a hero can flip between flags.
- **Fix 1, show intent:** an intent icon over each party's banner (flag, lair, skull, coin,
  bed, compass) and an `intent` event whenever it changes. The cheapest and biggest win.
- **Fix 2, choose by score, then commit:** one scoring rule for every option (flag, lair,
  explore, shop, rest) with distance and danger in it, and a commitment rule so a hero does
  not change its mind every second.
- **Fix 3, every trait does two visible things.** Today curious is a weaker greedy, loyal does
  nothing after level 1, and proud does nothing without flags.
- **Fix 4, the party retreats together** when half of it is hurt, with a horn; the coward
  still runs alone, earlier, and everyone can see it.

## 1. Audit: what Sim does today

| Area        | Today                                                                                                                             | Problem for the watcher                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Modes       | wander, explore, return (flee), rest, shop, ko; defend is rest or shop back to explore                                            | fine; no event when a mode changes                |
| Flee        | hp below 30% (brave x0.67, coward x1.5, upgrades lower it), per hero; bond -1 with each mate                                      | a party splits silently                           |
| Explore     | 70% a random point near a random lair (boss included), else anywhere                                                              | heroes walk past a near lair to a far one         |
| Target      | sworn target first, else nearest enemy within 150 + Per x 15                                                                      | fine                                              |
| Lair attack | any lair within 350 with no foe nearby, overriding flag and leader                                                                | a hero drops its flag for a lair, no cue          |
| Bounty      | score = gold x (greedy 1.5, curious 1.2) - danger x 15 x (brave 0.5, coward 2); proud skips under 40; every 1 s; distance ignored | heroes cross the map; flags flip as monsters move |
| Parties     | leader = first member; followers copy its destination; merge at level 1 within 250 by chance (loyal +0.2)                         | fine; party choices are the leader's alone        |
| Rivalry     | bond at -2 or less: rivals, refuse merges, `argue` within 200 (flavour only)                                                      | `argue` is not shown                              |
| Revenge     | vengeful hero with bond 3+ to a knocked out mate swears an oath for 90 s: beelines to the monster                                 | `revenge` and `avenged` are not shown             |
| Defend      | a resting hero above 50% hp rejoins if any monster is within its aggro range                                                      | not tied to raids; no event                       |
| Traits      | random at spawn; brave, coward, greedy, proud, curious only change numbers                                                        | hard to read without cues                         |

Events with speech today: arrived, fled, revived, shopped, knockout, died. Events with no
picture: argue, revenge, avenged, partyFormed, bountyClaimed.

## 2. Fix 1: show intent

| Intent  | When                            | Icon over the party banner | Speech (one in three) |
| ------- | ------------------------------- | -------------------------- | --------------------- |
| flag    | heading for a bounty            | coin over a flag           | "Gold!" / trait line  |
| lair    | heading for or attacking a lair | crossed swords             | "To the lair!"        |
| revenge | under an oath                   | red skull                  | "For {name}!"         |
| explore | walking to an explore point     | compass                    | none                  |
| retreat | the party returns hurt          | broken shield              | "Fall back!"          |
| shop    | going to a shop                 | coin bag                   | none                  |
| rest    | resting                         | bed (small, dim)           | none                  |
| defend  | rejoining to defend the town    | tower                      | "The town!"           |

- **Event** `intent { party, kind, target?, pos? }` whenever the party leader's intent changes;
  the snapshot carries `party.intent` for Scene.
- A tapped hero (party card open) also draws a thin dotted line to the intent's target (today
  only flags have lines).

## 3. Fix 2: choose by score, then commit

Every option a party leader (or a hero alone) can take gets one score; the highest wins.

| Option  | Value                                            | Minus                                                         |
| ------- | ------------------------------------------------ | ------------------------------------------------------------- |
| flag    | gold x trait gold mult                           | danger x 15 x trait fear mult + distance x 0.05               |
| lair    | lair bounty (60, x reward mult) + lair XP x 0.5  | lair danger (3 + monsters near) x 15 x fear + distance x 0.05 |
| explore | 20 (a fog point: 30; curious x2)                 | distance x 0.02                                               |
| shop    | gold carried x 0.3 (only with 20+ gold, in town) | 0                                                             |
| rest    | (1 - hp share) x 100 (only below 70% hp)         | 0                                                             |

- **Commit:** once chosen, an option holds for at least 6 s, and is replaced only by one
  scoring at least 25% higher. Flags no longer flip each second.
- **Distance** (world units) is now part of every choice: a 100-gold flag 1500 away is worth
  about a 25-gold flag next door.
- **Explore picks the nearest unexplored lair first**, then fog, never a random spot across
  the map.
- **A lair within 350 no longer overrides** a committed flag; it competes by score.
- Re-scoring runs every 1 s as today; the same seeded RNG breaks ties.

## 4. Fix 3: two visible behaviours per trait

| Trait    | Today                                | Proposed (both visible)                                                                                    |
| -------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| brave    | flees at x0.67; flag fear x0.5       | keeps both; **charges first:** walks ahead of its party into a fight (+20% speed for 3 s on engage)        |
| coward   | flees at x1.5; flag fear x2          | keeps both; **hangs back:** stops 60 behind the party's front in a fight; drinks potions earlier (items)   |
| greedy   | flag gold x1.5                       | keeps it; **grabs the bounty:** races to a dying flagged monster; spends 35% at shops (items)              |
| proud    | skips flags under 40                 | keeps it; **picks the biggest foe** (most max hp in range); refuses a retreat until 20% hp                 |
| curious  | flag gold x1.2                       | **drops the gold bonus;** explore scores x2 for fog and new places; walks to omens and fallen stars first  |
| loyal    | merge chance +0.2                    | keeps it; **guards the fallen:** stands over a knocked out party mate and fights whatever comes near       |
| vengeful | oath for 90 s on a friend's knockout | keeps it; **the oath shows:** red skull intent, a shout with the friend's name, "avenged" shout at the end |

- **Trait shown at arrival:** the first speech line of a new hero names the trait in voice
  ("Gold first, glory after." for greedy).
- **Traits by god (OPEN 2):** today random. Proposal: each god weights two traits x2 (Ares
  brave and proud, Loki greedy and curious, Freyja loyal and brave, Odin curious and proud,
  Thor brave and vengeful), so a god's children feel alike without being the same.

## 5. Fix 4: retreat as a party

- **Party retreat:** when half the party (rounded up) is below its flee threshold, or the
  leader flees, the whole party returns together (intent "retreat", a horn note). No bond
  loss for a party retreat.
- **The coward still runs alone** at its higher threshold, earlier than the party; that solo
  flee keeps today's bond -1, and it is the moment the player remembers.
- **Proud** stays until 20% even in a party retreat (and catches up after).

## 6. Smaller fixes

| Today                                                                   | Proposed                                                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| defend fires for any monster near a resting hero                        | defend only when a monster is within 400 of a building; event `defend`           |
| any hero can claim a flag another chose                                 | unchanged (Majesty-like), but the claim shows the claimer's name in the coin pop |
| `argue`, `revenge`, `avenged`, `partyFormed`, `bountyClaimed` not shown | speech lines and a small effect for each (Scene)                                 |
| traits only in the party panel                                          | trait icon on the hero card and the arrival line                                 |

## 7. Proposed data rows

| Row          | Fields                                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tuning.ai    | `distanceCost` 0.05, `exploreDistanceCost` 0.02, `commitMs` 6000, `switchMargin` 0.25, `exploreValue` 20, `fogValue` 30, `lairXpWeight` 0.5, `restBelow` 0.7, `shopGoldWeight` 0.3 |
| tuning.party | `retreatShare` 0.5, `braveChargeSpeed` 1.2, `braveChargeMs` 3000, `cowardHangBack` 60, `proudRetreatAt` 0.2                                                                        |
| TraitDef     | new table: `id`, `goldMult`, `fearMult`, `fleeMult`, `exploreMult`, `behaviours` (keys above), `arrivalLine`                                                                       |
| GodDef       | `traitWeights` (optional; OPEN 2)                                                                                                                                                  |
| events       | `intent`, `defend`, `partyRetreat`                                                                                                                                                 |

## 8. Proposed backlog rows

### Sim

| Order | Row                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------- |
| 10    | `intent` on the party in the snapshot and as an event                                                    |
| 20    | Score-and-commit choice (flag, lair, explore, shop, rest) with distance; explore nearest unexplored lair |
| 30    | Party retreat; coward solo flee keeps the bond cost                                                      |
| 40    | Trait behaviours: brave charge, coward hang back, proud biggest foe, curious fog, loyal guard            |
| 50    | Defend tied to buildings; `defend` event                                                                 |
| 60    | TraitDef as data; optional god trait weights                                                             |

### Scene

| Order | Row                                                                                 |
| ----- | ----------------------------------------------------------------------------------- |
| 10    | Intent icon over the party banner; dotted line to the target for a tapped party     |
| 20    | Speech and effects for argue, revenge, avenged, partyFormed, bountyClaimed, retreat |
| 30    | Arrival line naming the trait; trait icon on the hero card                          |

### Art

| Order | Row                                                  |
| ----- | ---------------------------------------------------- |
| 10    | 8 intent icons and 7 trait icons in the UI kit style |

## OPEN (Stefan decides)

1. **Party retreat** (recommendation), or keep every hero fleeing on its own?
2. **Traits weighted by god** (Ares's children braver, Loki's greedier), or fully random?
3. **Curious loses its gold bonus** for a love of the unknown: fine?
