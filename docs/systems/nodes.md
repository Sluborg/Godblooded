# Celestial nodes and gatherers (M3)

Design owns this spec (Lead, decision 2026-10-14 "Celestial nodes and gatherers"). Every lair
sits on a celestial node; clearing the lair frees the node; town gatherers walk out to collect
**Ambrosia**, an in-run currency, and carry it home. The Altar's meta currency becomes
**Essence** (confirmed by Stefan). Builds on `events.md` (raids, favour), `hero-ai.md`
(flag scoring), `monsters-and-bosses.md` (roles, Snatch), `buildings.md` and `meta.md`.

## Bottom line

- **A second loop for the mid run:** from the first lair fall (about 7:00) the player has a new
  decision every minute: which freed node to work, whether to pay for guards or an escort, and
  what to buy with the Ambrosia. It fills the quiet stretch between lair falls.
- **Still no commanding heroes:** gatherers and guards are town workers the player sends; heroes
  only join through an **escort bounty**, a moving bounty flag they score like any flag.
- **Gatherers come from the town hall:** no new building in M3, cap grows with the town hall
  tier. Guards come from towers (`tower`).
- **A node is a pool, not a tap:** it opens with some Ambrosia and refills slowly; far nodes
  hold more (risk for reward). The boss lair has no node.
- **Ambrosia buys divine help during the run** (Stefan): **Temple upgrade** (a temple tier for
  Ambrosia instead of gold), **Offering** (fill a god's favour bar now; the god still picks the
  spot) and **Recall the Fallen** (bring back a slain hero once). Leftover Ambrosia is lost.
- **Monsters hunt gatherers, never nodes:** wandering monsters and raiders attack them, harpies
  snatch the jar. A dropped jar stays 30 s for the next gatherer.
- **Essence:** the Altar's currency is renamed in `meta.md`, `meta-ui.md`, `ui-flows.md` and
  `content-roadmap.md` (this PR).
- **Nodes can be lost again** (Stefan): a raid that reaches a freed node defiles it, and late in
  the run a new lair can sprout on one. Both are warned and both can be won back (section 1b).
- **Decided** (Stefan, 2026-10-14): end of page; no OPEN left.

## 1. Nodes

| Rule         | Value                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Where        | one under every lair except the boss lair, at the lair's position (mapgen places lairs as today: 600+ from town, 350+ apart)        |
| Locked       | while the lair stands: a dim, red-veined glow under the lair (part of the corrupted-ground cue, `look-sheet.md`)                    |
| Freed        | when the lair is destroyed: event `nodeFreed {node, lair, pos}`; the lair leaves a broken ruin beside the node                      |
| Pool         | opens with `nodeStart` 40 Ambrosia; refills `nodeRegenPerMin` 8 up to `nodeMax` 80                                                  |
| Distance     | `nodeStart` and `nodeMax` x (1 + 0.25 per full 400 beyond 600 from the town hall): a far node at 1400 opens with 60, holds 120      |
| Lair tier    | a node freed from a tier 2 lair holds x1.25, tier 3 x1.5 (the harder lair pays more)                                                |
| Stays free   | until it is defiled by a raid or a new lair sprouts on it (section 1b); a cleared lair itself never comes back (`progression.md` 3) |
| Not a target | nodes take no damage; monsters do not seek them out, only raiders passing near one defile it (section 1b)                           |

- **Expected yield:** 4 to 6 lairs a run, the first falls about 7:00, runs end 15 to 18 min:
  about 3 to 4 freed nodes, worked for 4 to 8 minutes each, so **200 to 300 Ambrosia a run**
  for a player who keeps gatherers busy. That is 3 to 5 purchases (section 4).

## 1b. Losing a node and winning it back

| Way      | Warning                                                                                                                         | What happens                                                                                                                                                                                  | Win it back                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Defiled  | raiders that pass within 120 of a freed node stop there; the pillar flickers red, event `nodeThreat` with a 10 s countdown ring | after 10 s with raiders still there: the node is **defiled** (event `nodeDefiled`): a red pillar, no gathering, the pool stops refilling but keeps what it holds; the raiders walk on to town | no monster within 150 for 10 s (heroes kill them, towers, guards): freed again (`nodeFreed`), pool as it was |
| New lair | from 12:00, a 30 s warning (`lairSprouting {node, inMs}`): red cracks spread from the node, a horn, an arrow on the screen edge | a tier 1 lair of the run's lean grows on the node; gatherers there run home                                                                                                                   | destroy the new lair like any lair: the node frees again with its pool x1.25                                 |

- **New lairs are rare:** at most one sprouting every 3 minutes, at most 2 a run, only on a
  node that is not being gathered right now and is not the nearest to town. Seeded, so a run
  can be replayed.
- **Raids pick no node on purpose:** raiders keep their target (`events.md` 1); a node on
  their way is defiled only if they pass close, so a recall plus a guard or an escort is the
  answer.
- Recalling gatherers from a threatened node is one tap on the node card.

## 2. Gatherers

| Rule   | Value                                                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Source | the **town hall** (decided): tap the town hall card, "Hire gatherer" for 30 gold                                                      |
| Cap    | 2 at town hall tier 1, 3 at tier 2, 4 at tier 3                                                                                       |
| Body   | hp 40, armour 0, speed 0.8 of a hero's base, no attack; a town unit (`kind: 'worker'`), no god, no party, no XP                       |
| Send   | tap a freed node: "Send gatherer" (an idle one walks out); tap again on a busy node to add a second; "Recall" brings them home        |
| Loop   | walk to the node, gather 5 s, carry `carry` 20 Ambrosia (or what is left) home, add it at the town hall, repeat until recalled or dry |
| Threat | on a hit it drops nothing yet and runs home at 1.2x speed; at 0 hp it dies and drops its jar (section 5)                              |
| Lost   | a dead gatherer is gone; hire another (cost and cap as above)                                                                         |
| Rest   | none: a hurt gatherer heals 2% per second while at the town hall                                                                      |

- **Why the town hall:** no new building to place on a phone, the gatherer count grows with
  town hall tiers (a reason to upgrade it), and the town hall card already exists
  (`ui-flows.md` 4).

## 3. Protection

### Guards (the player sends them)

| Rule   | Value                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| Source | **towers** (building id `tower`, decided): each tower lends 1 guard at a time (tier 2: 2, tier 3: 3)               |
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
the town hall card. **M3 ships T, A and B** (Stefan); C to F stay as ideas for later.

| Option | Name              | Where         | Cost     | Effect                                                                                                               | For and against                                                              |
| ------ | ----------------- | ------------- | -------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| T      | Temple upgrade    | temple card   | 60 / 100 | the temple's next tier (tier 2 for 60, tier 3 for 100) instead of its gold cost (225 / 375); town hall gate as usual | a pantheon push without gold; competes with the favour and recall sinks      |
| A      | Offering          | temple card   | 40       | fills that pantheon's favour bar now; the god still picks the spot (`events.md` 3)                                   | uses a system that exists; a decision with timing; keeps "the gods act"      |
| B      | Recall the Fallen | temple card   | 80       | a slain hero of that temple's pantheon comes back at the temple at its level and path, items lost, once each         | the strongest "hero to remember" hook; softens permadeath only when paid for |
| C      | Blessing          | temple card   | 60       | the rest of the run, heroes of that pantheon get +10% XP; one per pantheon                                           | simple; quiet (no moment on screen)                                          |
| D      | Anoint the Blades | town hall     | 30       | every hero in town gets its weapon +1 level for 3 minutes (glow per `items-and-shops.md` 5)                          | visible, a timing choice before a raid; overlaps the smithy                  |
| E      | Divine Masonry    | building card | 50       | the next upgrade of this building is free and instant (still gated by town hall tier)                                | saves gold, no new rules; competes with gold, so less special                |
| F      | Open a Path       | temple card   | 100      | the next path offer of that pantheon shows a third path (needs 3-path content)                                       | big content cost; M4 at the earliest                                         |

- **No conversion to Essence** at run end (Stefan): Ambrosia left over is lost, so the player
  spends it.
- **Numbers** are first guesses for Balance; the bot run checks that 200 to 300 a run buys 3 to
  5 things.

## 5. Interactions

| With               | Rule                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wandering monsters | aggro on gatherers and guards like on heroes (same aggro range); harriers also pick gatherers by lowest hp (today #214 scores heroes and summons only: Sim row 30 adds workers) |
| Harpies (Snatch)   | a harpy's landed hit on a carrying gatherer steals its jar instead of gold; killing the harpy drops the jar where it dies                                                       |
| Raids              | raiders on their way to town attack gatherers and guards in reach; a raid warning (15 s, #212, not on main yet) gives time to recall (`events.md` 1)                            |
| Dropped jar        | a dead gatherer drops its jar (the Ambrosia it carried); it stays 30 s; the next gatherer that passes picks it up; monsters ignore it                                           |
| Lair tier-ups      | do not touch freed nodes (new lairs sprout per section 1b); a standing lair keeps its node locked                                                                               |
| Ruins              | a ruined town hall is the lost run (as today); a ruined tower lends no guards until rebuilt; gatherers home at a ruined building go to the hall                                 |
| Boss lair          | no node: its fall ends the run                                                                                                                                                  |
| Omens              | Red Sky doubles escort bounties like other bounties; Merchant Caravan does not touch Ambrosia                                                                                   |
| Save               | nodes (pool, freed), gatherers, guards, jars and the Ambrosia count go in the run save: save version bump with a migration (empty for old saves)                                |
| Hints              | one M3 hint on the first `nodeFreed`: "A celestial node is free. / Send a gatherer from the town hall." (`hint-texts.md`, Balance row)                                          |

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

| Order | Row                                                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 10    | Nodes: one per non-boss lair, freed on lair destroy (`nodeFreed`), pool with start, regen, max, distance and tier mults                                                                                                                                      |
| 20    | Worker units (`kind: 'worker'`): gatherers (hire, send, recall, gather loop, flee on hit), cap by town hall tier; the new kind handled once in every switch on `kind` (strike targeting, aggro, snapshot)                                                    |
| 30    | Guards from towers (lend, follow, fight, die, 60 s re-lend); Snatch steals jars; dropped jars; harrier target scoring includes workers                                                                                                                       |
| 40    | Escort bounty: a flag that follows a gatherer, scored as a flag, `escort` intent, paid on return, half back on death                                                                                                                                         |
| 50    | Ambrosia counter and the T, A and B purchases (temple tier for Ambrosia; Offering fills a favour bar; Recall the Fallen revives a slain hero once); a `fallen` list keeps each slain hero's id, god, pantheon, level and path (today `slain` drops the unit) |
| 55    | Losing nodes: raiders near a freed node stop and defile it (`nodeThreat`, `nodeDefiled`), cleared area frees it again; sprouting lairs from 12:00 (`lairSprouting`, at most 2 a run, seeded)                                                                 |
| 60    | Save: nodes (incl. defiled), workers, jars, Ambrosia, the `fallen` list; version bump and migration                                                                                                                                                          |

### Scene

| Order | Row                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------ |
| 10    | Node glow (locked, freed by pool), node card (pool, Send gatherer, Recall)                             |
| 20    | Gatherer and guard views, the carried jar, escort flag on the gatherer, alarm and chime                |
| 30    | HUD Ambrosia counter; Temple upgrade (Ambrosia price), Offering and Recall on the temple card          |
| 40    | Node threat: red flicker and countdown ring, defiled red pillar; sprouting cracks, horn and edge arrow |

### Balance (data)

| Order | Row                                                                                        |
| ----- | ------------------------------------------------------------------------------------------ |
| 10    | `tuning.nodes` (start, regen, max, distance and tier mults), worker and guard stats, costs |
| 20    | The node hint row; Ambrosia purchase rows (T, A, B)                                        |

### Art

| Order | Row                                                                                    |
| ----- | -------------------------------------------------------------------------------------- |
| 10    | Gatherer and guard as code parts (villager body set), basket and jar, spear and shield |
| 20    | Ambrosia icon (gold drop); node light can stay code                                    |

### Lead

| Order | Row                                                                                   |
| ----- | ------------------------------------------------------------------------------------- |
| 10    | `content-roadmap.md` M3 line gets nodes and gatherers (done in this PR); backlog rows |

## Decided (Stefan, 2026-10-14)

1. **Gatherers** come from the town hall, cap by its tier.
2. **Guards** are lent by towers.
3. **First purchases:** Temple upgrade, Offering and Recall the Fallen.
4. **Leftover Ambrosia** is lost at run end.
5. **Recall the Fallen** works once per hero.
6. **Freed nodes can be re-corrupted:** a raid that reaches one, or a new lair sprouting on one;
   both warned, both won back (section 1b).
7. **Escort bounty** pays on a safe return, half back on a death.
8. **Far nodes hold more** (+25% per 400 beyond 600).
9. **Essence** is the Altar's currency.
