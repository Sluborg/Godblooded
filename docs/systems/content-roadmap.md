# Content roadmap

Design owns this spec. Lead turns it into milestone rows and keeps `docs/game-design.md`'s
milestone table in step. It places every spec in `docs/systems/` on milestones M2, M3 and M4
(`docs/game-design.md`), starting from what has shipped (project status 2026-10-13).

## Bottom line

- **M2 is "Aesir, but alive":** one pantheon done well. 4 Aesir gods with their 8 paths and
  skills, the combat pipeline with visible damage types, gear at the smithy, building upgrades
  you can tap, raid warnings, the first 3 minutes of hints, and code-made sound effects.
- **Fun before breadth:** M2 adds no second pantheon, no meta, no omens and no miracles. If
  Stefan finds M2 fun to watch, M3 adds breadth; if not, the M2 levers get fixed first.
- **What makes M2 fun** is a checklist with numbers the Sim bot can measure: a skill in most
  fights, a decision every minute, no quiet stretch over 60 s.
- **M3 is breadth:** Greek and Egyptian, the full card pool, tier 3, bosses per pantheon, omens,
  miracles, the meta. **M4 is feel:** music, juice, balance, polish.
- Pulling the effect synth (cheap) from M4 into M2 is the one move against the old plan:
  sound is half of "see it happen".

## 1. What ships when

### Gods and paths

| Milestone | Content                                                                                                                                      | Art needed                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| M2        | Aesir: Odin, Thor, Loki, Freyja; 8 paths; 8 skills at tier 2; 4 passives                                                                     | god tier 1 and path tier 2 (batch 70, queued) |
| M3        | Greek (Athena, Ares, Apollo, Poseidon) and Egyptian (Horus, Anubis, Sekhmet, Isis), 16 paths and skills, 8 passives; tier 3 for all 24 paths | 8 god tier 1, 16 path tier 2, 24 path tier 3  |
| M4        | tier 3 skill upgrades polished (favour cards ship in M3)                                                                                     | none                                          |

### Monsters and bosses (`monsters-and-bosses.md`)

| Milestone | Content                                                                                         | Art needed                            |
| --------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| M2        | draugr, troll, harpy, minotaur, jackal-man with their roles and quirks; Fafnir as the only boss | none (all tier 1 shipped)             |
| M3        | scarab swarm, Hydra, Apep; boss by lean; elites with skills; lair tier 2 and 3                  | 3 monsters, 3 lairs, 12 lair tier 2/3 |
| M4        | monster variants (`-v2`, `-v3`)                                                                 | 8 variants (art request 40)           |

### Buildings (`buildings.md`)

| Milestone | Content                                                                                                                  | Art needed                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| M2        | Aesir temple, market, smithy, shrine, tower at tier 1 and 2 (the town hall stays tier 1); the building card with upgrade | tier 2 (batch 80, queued)                  |
| M3        | Greek and Egyptian temples, Hearth Hall, town hall tiers, tier 3, ruins                                                  | tier 3 all, Hearth Hall x3, ruin, scaffold |

### Cards (`progression.md`)

| Milestone | Content                                                                                                                    |
| --------- | -------------------------------------------------------------------------------------------------------------------------- |
| M2        | the 9 shipped + keen-mind, giants-blood, field-dressing, deep-pockets, oath-brothers, bounty-hunters (15), rarity by level |
| M3        | skill cards (4), pantheon cards (9), last-stand, mending-bond, favour cards (12), level cap 8                              |

### Systems

| Milestone | Systems                                                                                                                                                                                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2        | combat pipeline, damage types, armour, crits; skills engine for the 8 Aesir skills (incl. the decoy summon); god passives; items: weapon, armour, potions (no charms); raid warning and shapes; building card; onboarding beats 10-90 and the M2 first-time hints (`hint-texts.md`); effect synth |
| M3        | other summons (falcon, thrall); charms and lair relic; elites and the staggered lair clock; omens; favour and miracles; meta (Ambrosia and the Altar, unlocks, Saga, Trials); Hall screen; town hall tiers; Hearth Hall                                                                           |
| M4        | music (calm, tension, boss, stings); vibration; juice (crit freeze, short hit pauses; no screen shake, decision 2026-10-14); first-time hints for M4 features; balance passes per pantheon                                                                                                        |

## 2. What M2 needs to be fun

Pillar 1 is "watching is the fun". M2 is fun when a 15-minute run passes these checks. The
first five are Sim bot numbers (new run stats); the last two are Stefan's judgment.

| Check                       | Target                                                                 | Measured by                                      |
| --------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| Skills in fights            | a skill cast in at least 60% of fights after 6:00                      | share of fights with a cast (per-fight record)   |
| Decisions                   | at least one player decision per minute (build, upgrade, bounty, card) | bot decision log                                 |
| Quiet stretches             | no 60 s with no fight, no level-up and no raid in view                 | longest quiet gap                                |
| Damage types read           | at least 2 types in most fights after tier 2                           | share of fights with 2+ types (per-fight record) |
| Gear shows                  | average weapon or armour level 1+ by 8:00                              | run stats (`items-and-shops.md`)                 |
| A hero to remember          | after a run, Stefan can name one hero and what it did                  | Stefan                                           |
| Bounties feel like steering | placing a flag visibly changes who goes where                          | Stefan                                           |

If M2 fails the last two checks, M3 waits; Design proposes the fix (most likely more
personality on screen: speech bubbles, rivalries, the coward fleeing visibly).

## 3. What not to build before M2 is judged

Meta (unlocks, Saga, Trials), omens, miracles, Greek and Egyptian content, tier 3, the Hearth
Hall, ruins, music. Each is a spec that is ready; none of them helps decide whether watching
is fun.

## 4. Proposed backlog rows

### Lead

| Order | Row                                                                                |
| ----- | ---------------------------------------------------------------------------------- |
| 10    | Re-tag existing Sim, Scene, Art rows with M2 / M3 / M4 from this roadmap           |
| 20    | Update the milestone table in `docs/game-design.md` (M2: Aesir alive, sound in M2) |
| 30    | M2 card data (15 cards)                                                            |

### Sim

| Order | Row                                                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 10    | Run stats for the fun checks: a record per fight (fight boundary from `combat.md`: start, end, any skill cast, set of damage types), decisions per minute, longest quiet gap; the report gives the share of fights with a cast and with 2+ types |

## Decided (Stefan, 2026-10-13)

1. **M2 = Aesir only, done well.**
2. **Effect sounds in M2.**
3. **The fun checks** as written.
