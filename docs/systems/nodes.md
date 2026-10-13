# Celestial nodes and gatherers (M3)

Design owns this spec (Lead, decision 2026-10-14 "Celestial nodes and gatherers"). Every lair
sits on a celestial node; clearing the lair frees the node; town gatherers walk out to collect
**Ambrosia**, an in-run currency, and carry it home. The Altar's meta currency becomes
**Essence** (Lead's call, Stefan may veto). Builds on `events.md` (raids, favour), `hero-ai.md`
(flag scoring), `monsters-and-bosses.md` (roles, Snatch), `buildings.md` and `meta.md`.

## Bottom line

- **A second loop for the mid run:** from the first lair fall (about 7:00) the player has a new
  decision every minute: which freed node to work, whether to pay for guards or an escort, and
  what to buy with the Ambrosia. It fills the quiet stretch between lair falls.
- **Still no commanding heroes:** gatherers and guards are town workers the player sends; heroes
  only join through an **escort bounty**, a moving bounty flag they score like any flag.
- **Gatherers come from the town hall** (recommended): no new building in M3, cap grows with
  the town hall tier. Guards come from guard towers.
- **A node is a pool, not a tap:** it opens with some Ambrosia and refills slowly; far nodes
  hold more (risk for reward). The boss lair has no node.
- **Ambrosia buys divine help during the run:** recommended sinks are **Offering** (fill a
  god's favour bar now; the god still picks the spot) and **Recall the Fallen** (bring back a
  slain hero at its temple). Four more options below.
- **Monsters hunt gatherers, never nodes:** wandering monsters and raiders attack them, harpies
  snatch the jar. A dropped jar stays 30 s for the next gatherer.
- **Essence:** the Altar's currency is renamed in `meta.md`, `meta-ui.md`, `ui-flows.md` and
  `content-roadmap.md` (this PR).
- **9 OPEN for Stefan** (end of page), each with a recommendation.

## 1. Nodes

| Rule         | Value                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Where        | one under every lair except the boss lair, at the lair's position (mapgen places lairs as today: 600+ from town, 350+ apart)   |
| Locked       | while the lair stands: a dim, red-veined glow under the lair (part of the corrupted-ground cue, `look-sheet.md`)               |
| Freed        | when the lair is destroyed: event `nodeFreed {node, lair, pos}`; the lair leaves a broken ruin beside the node                 |
| Pool         | opens with `nodeStart` 40 Ambrosia; refills `nodeRegenPerMin` 8 up to `nodeMax` 80                                             |
| Distance     | `nodeStart` and `nodeMax` x (1 + 0.25 per full 400 beyond 600 from the town hall): a far node at 1400 opens with 60, holds 120 |
| Lair tier    | a node freed from a tier 2 lair holds x1.25, tier 3 x1.5 (the harder lair pays more)                                           |
| Stays free   | for the rest of the run: a cleared lair is gone (`progression.md` 3); nothing re-corrupts a node in M3                         |
| Not a target | nodes cannot be damaged or claimed by monsters (OPEN 6)                                                                        |

- **Expected yield:** 4 to 6 lairs a run, the first falls about 7:00, runs end 15 to 18 min:
  about 3 to 4 freed nodes, worked for 4 to 8 minutes each, so **200 to 300 Ambrosia a run**
  for a player who keeps gatherers busy. That is 3 to 5 purchases (section 4).

## 2. Gatherers

| Rule   | Value                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Source | the **town hall** (OPEN 1): tap the town hall card, "Hire gatherer" for 30 gold                                                       |
| Cap    | 2 at town hall tier 1, 3 at tier 2, 4 at tier 3                                                                                       |
| Body   | hp 40, armour 0, speed 0.8 of a hero's base, no attack; a town unit (`kind: 'worker'`), no god, no party, no XP                       |
| Send   | tap a freed node: "Send gatherer" (an idle one walks out); tap again on a busy node to add a second; "Recall" brings them home        |
| Loop   | walk to the node, gather 5 s, carry `carry` 20 Ambrosia (or what is left) home, add it at the town hall, repeat until recalled or dry |
| Threat | on a hit it drops nothing yet and runs home at 1.2x speed; at 0 hp it dies and drops its jar (section 5)                              |
| Lost   | a dead gatherer is gone; hire another (cost and cap as above)                                                                         |
| Rest   | none: a hurt gatherer heals 2% per second while at the town hall                                                                      |

- **Why the town hall:** no new building to place on a phone, the gatherer count grows with
  town hall tiers (a reason to upgrade it), and the town hall card already exists
  (`ui-flows.md` 4). The other choice is a new **Gatherers' Lodge** (OPEN 1).

## 3. Protection

### Guards (the player sends them)

| Rule   | Value                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| Source | **guard towers** (OPEN 2): each tower lends 1 guard at a time (tier 2: 2, tier 3: 3)                               |
| Cost   | 15 gold per trip                                                                                                   |
| Body   | hp 80, armour 2, a spear: damage about half a tier 1 warrior's, physical; speed matches the gatherer it walks with |
| Rule   | walks beside one gatherer; fights what attacks it; never chases beyond 150; goes home with the gatherer            |
| Lost   | a guard at 0 hp dies; the tower lends a new one after 60 s                                                         |

- Weak on purpose: a guard turns a lone wolf or a harpy, not a raid. It buys time for the
  gatherer to run.

### Escort bounty (heroes may take it)

| Rule   | Value                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Place  | tap a sent gatherer: "Escort bounty" 25 or 50 gold (like a bounty flag)                                                         |
| What   | a **moving flag** that follows the gatherer; heroes score it as a flag (`hero-ai.md` 3), with distance to the gatherer          |
| Taken  | the first party to reach the gatherer walks with it until it is home                                                            |
| Paid   | when the gatherer reaches the town hall with a full jar; if the gatherer dies, half the gold comes back (like a cancelled flag) |
| Intent | the party's intent icon shows `escort` (new intent kind)                                                                        |

- The player never commands the party: greedy heroes bite on a big escort, cowards skip it, a
  committed party keeps its current goal (score and commit rules).

## 4. What Ambrosia buys (in the run)

Spent from a small **Ambrosia** counter on the HUD (under the gold) through the temple card or
the town hall card. Six options; recommendation: **ship A and B in M3**, C and D next, E and F
only if playtests ask for more.

| Option | Name              | Where         | Cost | Effect                                                                                                       | For and against                                                              |
| ------ | ----------------- | ------------- | ---- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| A      | Offering          | temple card   | 40   | fills that pantheon's favour bar now; the god still picks the spot (`events.md` 3)                           | uses a system that exists; a decision with timing; keeps "the gods act"      |
| B      | Recall the Fallen | temple card   | 80   | a slain hero of that temple's pantheon comes back at the temple at its level and path, items lost, once each | the strongest "hero to remember" hook; softens permadeath only when paid for |
| C      | Blessing          | temple card   | 60   | the rest of the run, heroes of that pantheon get +10% XP; one per pantheon                                   | simple; quiet (no moment on screen)                                          |
| D      | Anoint the Blades | town hall     | 30   | every hero in town gets its weapon +1 level for 3 minutes (glow per `items-and-shops.md` 5)                  | visible, a timing choice before a raid; overlaps the smithy                  |
| E      | Divine Masonry    | building card | 50   | the next upgrade of this building is free and instant (still gated by town hall tier)                        | saves gold, no new rules; competes with gold, so less special                |
| F      | Open a Path       | temple card   | 100  | the next path offer of that pantheon shows a third path (needs 3-path content)                               | big content cost; M4 at the earliest                                         |

- **No conversion to Essence** at run end (OPEN 4): Ambrosia left over is lost, so the player
  spends it.
- **Numbers** are first guesses for Balance; the bot run checks that 200 to 300 a run buys 3 to
  5 things.

## 5. Interactions

| With               | Rule                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wandering monsters | aggro on gatherers and guards like on heroes (same aggro range); gatherers are the weakest target, so harriers pick them (lowest hp)             |
| Harpies (Snatch)   | a harpy's landed hit on a carrying gatherer steals its jar instead of gold; killing the harpy drops the jar where it dies                        |
| Raids              | raiders on their way to town attack gatherers and guards in reach; a raid warning (15 s) gives time to recall (`events.md` 1)                    |
| Dropped jar        | a dead gatherer drops its jar (the Ambrosia it carried); it stays 30 s; the next gatherer that passes picks it up; monsters ignore it            |
| Lair tier-ups      | do not touch freed nodes; a lair that still stands keeps its node locked                                                                         |
| Ruins              | a ruined town hall is the lost run (as today); a ruined tower lends no guards until rebuilt; gatherers home at a ruined building go to the hall  |
| Boss lair          | no node: its fall ends the run                                                                                                                   |
| Omens              | Red Sky doubles escort bounties like other bounties; Merchant Caravan does not touch Ambrosia                                                    |
| Save               | nodes (pool, freed), gatherers, guards, jars and the Ambrosia count go in the run save: save version bump with a migration (empty for old saves) |
| Hints              | one M3 hint on the first `nodeFreed`: "A celestial node is free. / Send a gatherer from the town hall." (`hint-texts.md`, Balance row)           |

## 6. What the player sees

- **Locked node:** a dim red-veined glow in the corrupted ground under the lair, no light.
- **Freed node:** a pillar of soft gold-white light rising from the ground, a pulsing ring and
  slow motes; the brightness shows the pool (bright when full, faint when nearly dry). A small
  number over it on tap.
- **Gatherer:** a small villager (no party ring, no name label) with a basket on the back;
  carrying, a gold jar glows on the basket. Clearly smaller and plainer than a hero.
- **Guard:** a villager with a spear and a round shield in town colours.
- **Escort bounty:** the bounty flag's look on a short pole carried over the gatherer.
- **Ambrosia icon:** a gold drop with a white highlight; the HUD counter sits under the gold.
- **Sounds:** a chime when a jar arrives at the town hall; a short alarm horn when a gatherer is
  hit (once per gatherer per 10 s).
- Style per `look-sheet.md`: thin colour-matched outlines, effects grow (a node pillar at a far,
  high-tier node is taller).

## 7. Proposed rows

### Sim

| Order | Row                                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| 10    | Nodes: one per non-boss lair, freed on lair destroy (`nodeFreed`), pool with start, regen, max, distance and tier mults |
| 20    | Worker units (`kind: 'worker'`): gatherers (hire, send, recall, gather loop, flee on hit), cap by town hall tier        |
| 30    | Guards from towers (lend, follow, fight, die, 60 s re-lend); Snatch steals jars; dropped jars                           |
| 40    | Escort bounty: a flag that follows a gatherer, scored as a flag, `escort` intent, paid on return, half back on death    |
| 50    | Ambrosia counter and the A and B purchases (Offering fills a favour bar; Recall the Fallen revives a slain hero once)   |
| 60    | Save: nodes, workers, jars, Ambrosia; version bump and migration                                                        |

### Scene

| Order | Row                                                                                     |
| ----- | --------------------------------------------------------------------------------------- |
| 10    | Node glow (locked, freed by pool), node card (pool, Send gatherer, Recall)              |
| 20    | Gatherer and guard views, the carried jar, escort flag on the gatherer, alarm and chime |
| 30    | HUD Ambrosia counter; Offering and Recall buttons on the temple card                    |

### Balance (data)

| Order | Row                                                                                        |
| ----- | ------------------------------------------------------------------------------------------ |
| 10    | `tuning.nodes` (start, regen, max, distance and tier mults), worker and guard stats, costs |
| 20    | The node hint row; Ambrosia purchase rows (A, B)                                           |

### Art

| Order | Row                                                                                    |
| ----- | -------------------------------------------------------------------------------------- |
| 10    | Gatherer and guard as code parts (villager body set), basket and jar, spear and shield |
| 20    | Ambrosia icon (gold drop); node light can stay code                                    |

### Lead

| Order | Row                                                                                   |
| ----- | ------------------------------------------------------------------------------------- |
| 10    | `content-roadmap.md` M3 line gets nodes and gatherers (done in this PR); backlog rows |

## OPEN (Stefan decides)

1. **Where gatherers come from:** the town hall, cap by its tier (recommendation), or a new
   Gatherers' Lodge building?
2. **Where guards come from:** guard towers lend them (recommendation), or the town hall too?
3. **What Ambrosia buys first:** Offering and Recall the Fallen (recommendation), or another
   pair from section 4?
4. **Leftover Ambrosia:** lost at run end (recommendation), or a small part becomes Essence?
5. **Recall the Fallen:** once per hero (recommendation), or any number of times at a rising
   cost?
6. **Can monsters take a node back?** No, freed stays freed (recommendation), or a lair tier-up
   nearby re-corrupts the closest freed node?
7. **Escort bounty pay:** on a safe return with half back on a death (recommendation), or paid
   the moment a party takes it?
8. **Far nodes hold more** (+25% per 400 beyond 600, recommendation), or every node the same?
9. **Essence** as the Altar's currency name (Lead's call): keep, or another name?
