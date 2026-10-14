# Tax collector

Design owns this spec. Decided by Stefan on 2026-10-14 (`docs/decisions.md`, "Town income: a
tax collector", in M2). Sim builds it, Scene draws it, Balance sets the numbers. Builds on
`items-and-shops.md` (shop tax), `buildings.md` (town hall tiers) and Sim's tithe knob
(`tuning.hero.tithe`, branch `sim/human-bot`).

## Bottom line

- **Gold builds up in buildings, not in the purse.** Shop tax goes into the shop's till. The
  tithe heroes pay goes into their home temple's till when they rest.
- **The collector brings it home.** It walks from the town hall to the buildings that have gold,
  empties their tills, and carries the gold back. Only gold that reaches the hall is spendable.
- **It can be hit.** Monsters attack it like a hero. If it falls, the gold it carried drops on
  the ground. The next collector picks the gold up.
- **Every run earns money:** a town with just a temple has income from the tithe. That was
  Stefan's run 1 problem (tax 0 with no market).
- **Readable on a phone:** a coin number over each building with gold, a sack on the collector
  that grows with what it carries, and a `+N` pop at the hall when it arrives.

## 1. Rules

### Tills

1. Each building except the town hall has a `till` (whole gold, starts at 0, no cap).
2. **Shop tax:** the tax from a sale (`price x taxRate x tier mult`, `items-and-shops.md` 3) goes
   into that shop's till, not into `world.gold`. Today's `shopped` event keeps its `tax` field.
3. **Tithe:** when a hero earns a monster or lair bounty, `tithe` of it (Balance; Sim's lever,
   about 0.3) is set aside as `titheOwed` on the hero. Flags are the town's own gold and pay no
   tithe (as in Sim's knob).
   - The hero pays `titheOwed` into the till of its **home temple** when it starts to rest (at the
     town hall or a shrine). There is no extra walk: the coin pops over the temple.
   - No guilds exist in M2, so the decision's "temple or guild" means the temple for now; a
     guild gets a till when one ships.
   - Home temple: the nearest built temple of the pantheon of the hero's god. If none stands, the
     tithe goes into the town hall, which counts as banked at once.
   - A knocked-out hero keeps `titheOwed`, and the knockout gold loss does not touch it. A slain
     hero's `titheOwed` is lost.
4. **A destroyed building** drops its till as a gold pile at its spot (rule 10).

### The collector

5. **Count:** 1 per town hall tier (1, 2, 3; `buildings.md`). Until the hall tiers ship: 1, and
   a 2nd once 6 buildings stand besides the hall (`secondAtBuildings` 6; Lead 2026-10-14). Collectors appear at the hall at the run start, so the first one is walking by about 0:05.
6. **Route:** a collector at the hall picks a target when a till holds at least `minTill` (10).
   - It walks to the target with the highest `till - distance x 0.02`, distance measured from
     the collector (at the hall, that is from the hall).
   - At a building it stops for `collectMs` (1000) and takes the whole till.
   - It then visits the next building within 400 of it that holds `minTill`, until it carries
     `carryCap` (150) or none is left. Then it walks home and banks the gold: `world.gold` goes
     up and a `collected` event fires.
   - Two collectors never target the same building or the same pile.
7. **Towers cover it:** a tower shoots a monster that attacks a collector within the tower's
   range, as it does for the town (Lead 2026-10-14).
8. **Body:** `hp` 40, no armour, speed 0.7 of a level-1 hero's walk. It does not fight and
   never heals on the way. Monsters treat it as a hero when they pick a target, so raiders and
   wandering monsters go for it.
9. **Hit:** when it takes damage, it drops its route and walks home. If it reaches the hall with
   gold, that gold banks as usual.
10. **Falls:** it drops what it carries as a **gold pile** where it fell (no pile when it carries
    0). The pile stays until a collector picks it up, and every collector treats a pile like a
    till. Heroes ignore piles; their gold is their own, the pile is the town's. A new collector
    appears at the hall after `respawnMs` (20000).
11. **End of run:** gold still in tills, piles or sacks is lost. The end screen shows it as
    "Left uncollected" (the run stats row in Data rows, section 4).

### Why these numbers (Design's start, Balance owns them)

- **Hold-up:** with `minTill` 10 and the collector out all the time, gold reaches the hall
  15 to 40 s after it is earned. That is late enough to see, and short enough not to hurt.
- **The cap of 150** makes a fall cost something without ruining a run (start gold is 480).
- **hp 40 against one draugr hit** of about 8 to 12: a collector survives a brush with a wanderer
  and dies to a raid. Raids then threaten income, which gives the player a reason to place a
  flag on the raid or build a tower.

## 2. What the player sees (Scene)

| Order | Thing             | Look                                                                                                                                                |
| ----- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10    | Till              | A small coin and a number above a building once its till reaches `minTill`. Light text on dark parchment (`look-sheet.md`). Hidden below `minTill`. |
| 20    | Collector         | A small walking figure with a sack. The sack has 3 sizes: empty, under half `carryCap`, half or more.                                               |
| 30    | Collecting        | The coin above the building flies into the sack, and the number clears.                                                                             |
| 40    | Arrival at hall   | A `+N` coin pop over the town hall, and the top bar gold ticks up by N.                                                                             |
| 50    | Tithe             | A small coin pop over the home temple when a hero pays (`tithe` event, `+N`).                                                                       |
| 60    | Hit               | A hit flash, and the collector turns for home.                                                                                                      |
| 70    | Gold pile         | A coin pile with its number where the collector fell; it pulses once.                                                                               |
| 80    | Tap the collector | Info strip: "Tax collector: carrying 45 gold".                                                                                                      |

- **Art:** manifest id `npc_collector_t1_<view>`. This is a new `npc_` prefix, and Art adds it
  to `asset-spec.md`. Until the art exists, the placeholder is a small tan circle with a darker
  sack dot.

## 3. Hints (`hint-texts.md`)

| Order | Id          | Trigger               | Points at     | M   | Line 1                            | Line 2                            |
| ----- | ----------- | --------------------- | ------------- | --- | --------------------------------- | --------------------------------- |
| 55    | b-till      | first till reaches 10 | that building | M2  | Gold builds up in your buildings. | The tax collector brings it home. |
| 125   | h-collector | first `collectorFell` | the pile      | M2  | Your tax collector has fallen.    | The gold lies where it fell.      |

- `b-till` is a beat. It follows `b-market` and waits for the first till, so a run with no
  market gets it from the first tithe.

## 4. Data rows (proposed; Balance sets numbers)

| Order | Row                                  | Value (start)                          | Note                                          |
| ----- | ------------------------------------ | -------------------------------------- | --------------------------------------------- |
| 10    | `tuning.collector.perHallTier`       | 1                                      | collectors = hall tier x this                 |
| 15    | `tuning.collector.secondAtBuildings` | 6                                      | a 2nd collector until hall tiers ship         |
| 20    | `tuning.collector.minTill`           | 10                                     | smallest till worth a trip; also the HUD      |
| 30    | `tuning.collector.carryCap`          | 150                                    |                                               |
| 40    | `tuning.collector.collectMs`         | 1000                                   | stop per building                             |
| 50    | `tuning.collector.speedMult`         | 0.7                                    | of a level-1 hero's walk                      |
| 60    | `tuning.collector.hp`                | 40                                     |                                               |
| 70    | `tuning.collector.respawnMs`         | 20000                                  |                                               |
| 80    | `tuning.hero.tithe`                  | 0.3                                    | Sim's knob; now paid on rest, not at the kill |
| 90    | Run stats                            | banked, lost (falls), left uncollected | end screen and the bot report                 |

- **Saves:** tills, `titheOwed`, collectors and piles join the run state. Bump the save
  version and add a migration: old saves get empty tills and one collector at the hall.

### Balance (human-bot pass, `balance/spacing-collector`)

- **On by default** (`tuning.collector.enabled`), with this spec's start numbers and a tithe of
  0.3.
- **Target met:** town gold is about 165 at 3:00 for the human-like bot (target: 150 by 5:00).

### As built (Sim, `sim/collector` b0a5053)

- **Off until Balance turns it on:** `tuning.collector.enabled`. With it off, the tithe is paid
  at once and the `tithe` event carries building 0.
- **Where things live:** `titheOwed` is on the hero runtime (`heroRuntime.titheOwed`); gold piles
  are in `snapshot.piles`.
- **Events:** `till`, `tithe` (with building), `collectorOut`, `tillEmptied` (a till or a pile),
  `collectorHit`, `collected`, `collectorFell`. Scene's rows in section 2 map onto these.
- **Run report:** `taxBanked`, `taxLost`, `uncollected`.
- **Save version:** Sim made the change additive (old saves get empty tills and a collector at
  the hall). Lead ruled v4 anyway (2026-10-14), with a trivial migration (empty
  tills, no piles, a collector at the hall), following CLAUDE.md "Saves"; `save.ts` treats a new
  field as safe, so the bump is Lead's call, not a code need.

## 5. Backlog rows (proposed)

### Sim

| Order | Row                                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10    | Tills on buildings. Shop tax goes into the till; `titheOwed` is paid into the home temple's till on rest (moves Sim's tithe from the kill to rest). Events: `tithe` (unit, building, gold).                                                 |
| 20    | Collector unit (`kind: 'collector'`): count per hall tier (2nd at 6 buildings), route rule 6, towers shoot its attackers, flee on hit, falls into a pile, respawn. Events: `collected` (gold), `collectorHit`, `collectorFell` (pos, gold). |
| 30    | Monster targeting counts collectors as heroes.                                                                                                                                                                                              |
| 40    | Run stats: tax banked, gold lost in falls, left uncollected. The bot report prints tax per run and its p10 (playtest 1 lesson).                                                                                                             |
| 50    | Save version bump plus migration.                                                                                                                                                                                                           |

### Scene

| Order | Row                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------- |
| 10    | Till coin and number over buildings; collector figure with a 3-size sack; coin flight on collect.    |
| 20    | `+N` pop at the hall and a top bar tick; tithe pop over the temple; gold pile; collector info strip. |
| 30    | Hints `b-till` and `h-collector`.                                                                    |

### Balance

| Order | Row                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 10    | Tune `tithe`, `minTill`, `carryCap` and collector hp against the human-like bot. Target: a temple-only town still earns 150+ gold by 5:00. |

## Decided (Lead, 2026-10-14)

1. **Heroes cannot pick up a gold pile.** Only collectors do; the pile is the town's.
2. **A second collector at 6 buildings** until the town hall tiers ship.
3. **Towers shoot what attacks a collector** within their range.
