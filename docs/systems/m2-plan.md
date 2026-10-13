# M2 plan: "Aesir, alive"

Design owns this page (Lead row Design 240). It is the definition of done for M2 as one
checklist, built from the specs in `docs/systems/` and `docs/backlog.md`, with the state of each
item checked on `main` at `935df3e` (2026-10-14, refreshed) and in the open PRs. Lead updates the state
column as PRs land.

## Bottom line (for Stefan)

- **M2 = one pantheon, done well:** the 4 Aesir gods and 8 paths with their skills, fights you
  can read (damage colours, crits, bosses), heroes who buy gear and level up on their own, raids
  with a warning, the first 3 minutes of hints, sound effects, all in the new cartoon look.
- **Where we are (refreshed):** the game rules are built (combat, skills, summons, passives,
  gear, potions, cards, auto-pick, level-up show, barks, boss, sealed boss lair, permadeath).
  Items are on main (#169). In PR: raid warnings, shapes and monster behaviours (#212, #214,
  #217, #245), hero intent (#221, open with Review findings; #223 on it), the Aesir skill,
  passive and card data (#235), skill visuals (#238) and gear on the map (#240). Still missing:
  the monster role and quirk **data**, **hints** and **sound effects**.
- **Biggest risk:** the new look. Heroes from parts are on main (#193) and follow the taste
  test in #228; monsters, lairs and buildings in the new look are not started (the look sheet, #234).
- **Critical path (section 3):** data on (skills, passives, items, cards) → raid warnings and
  monster behaviours → hero intent → hints → sound → new-look art → the fun check.
- **Out of M2:** Greek and Egyptian, tier 3, the meta (Essence), omens, miracles, the Hearth Hall,
  ruins, music. Built specs wait for M3.

## 1. Definition of done

State: **done** (on `main`), **PR #n** (open), **not started**. Owner: the role that builds it.

### Systems (game rules, `src/sim`)

| Order | Item                                                                            | Spec                             | State                                                                                                                   | Owner |
| ----- | ------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----- |
| 10    | Combat pipeline: damage types, armour, crits, riders, first strike              | `combat.md`                      | done                                                                                                                    | Sim   |
| 20    | Boss unit (Fafnir): emerge, cleave, enrage, immunities                          | `combat.md` 7                    | done                                                                                                                    | Sim   |
| 30    | Knockout cost 25% gold; permadeath (boss 20%, tier 3 lair 10%), graves          | `combat.md` 6                    | done (#210)                                                                                                             | Sim   |
| 40    | Skill engine and effects part 1                                                 | `paths-and-skills.md`            | done                                                                                                                    | Sim   |
| 50    | Effects part 2 (knockback, bind, revive, execute, cleanse, hot)                 | `paths-and-skills.md` 3          | done (#188)                                                                                                             | Sim   |
| 60    | Summons, the Trickster's decoy                                                  | `paths-and-skills.md`            | done (#194)                                                                                                             | Sim   |
| 70    | God passives engine                                                             | `paths-and-skills.md` 5          | done                                                                                                                    | Sim   |
| 80    | Items, shopping, potions                                                        | `items-and-shops.md`             | done                                                                                                                    | Sim   |
| 90    | Card offers, auto-pick weighted by trait, card effects                          | `level-ups.md`, `progression.md` | done                                                                                                                    | Sim   |
| 100   | Path pick slows the run to 30%                                                  | `level-ups.md` 4                 | done                                                                                                                    | Sim   |
| 110   | Lair clock: staggered tier-ups                                                  | `progression.md` 3               | done                                                                                                                    | Sim   |
| 120   | Raid warning (15 s), raid after a lair tier-up, raid shapes by role             | `events.md` 1                    | PR #212 (warning, tier-up raids, town cheer); raid shapes PR #245                                                       | Sim   |
| 130   | Monster roles (harrier, charger, pack) and quirks (regen, snatch, grave-cold)   | `monsters-and-bosses.md` 1       | PR #214 (roles), PR #217 (quirks)                                                                                       | Sim   |
| 140   | Hero intent event, score-and-commit, party retreat, trait behaviours            | `hero-ai.md`                     | PR #221 (intent, score-and-commit; Review findings open), PR #223 (party retreat, defend); trait behaviours not started | Sim   |
| 150   | Run stats for the fun checks: per-fight record, decisions per minute, quiet gap | `content-roadmap.md` 2           | not started                                                                                                             | Sim   |
| 160   | First run waits for the first temple; first-run tuning                          | `onboarding.md` 4                | not started                                                                                                             | Sim   |
| 165   | Boss lair sealed until 12:00 or 2 lairs have fallen                             | `pacing-review.md` 3             | done (#226)                                                                                                             | Sim   |

### Content (data rows, `src/data`)

| Order | Item                                                            | Spec                     | State                                                                                          | Owner   |
| ----- | --------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------- | ------- |
| 170   | Templates: armour, `spellMult`; god and path damage types       | `aesir-content.md` 2     | done                                                                                           | Balance |
| 180   | Caster paths give Int (Stormcaller, Flamebinder; Seer is done)  | `aesir-content.md` 2     | done (#169)                                                                                    | Balance |
| 190   | 4 Aesir passives                                                | `aesir-content.md` 3     | PR #235                                                                                        | Balance |
| 200   | 8 Aesir skills with tier 3 forms                                | `aesir-content.md` 4     | PR #235                                                                                        | Balance |
| 210   | Items: weapons, armour, potions, kits, smithy; economy pass     | `items-and-shops.md`     | done (#169)                                                                                    | Balance |
| 220   | 15 M2 cards with rarity, `pickTag` and `god`                    | `aesir-content.md` 6     | `god` and `pickTag` on the 9 shipped cards done (#169); 4 new cards PR #235; 2 replaced (#243) | Balance |
| 230   | Monster role and quirk fields on the 5 M2 monsters              | `monsters-and-bosses.md` | not started (rows listed in PR #214 and #217)                                                  | Balance |
| 240   | Hint rows (9 beats, M2 first-time hints)                        | `hint-texts.md`          | not started                                                                                    | Balance |
| 250   | Balance pass with all of the above: 55-75% wins, 15-18 min runs | `progression.md` 4       | not started                                                                                    | Balance |

### Screen and UI (`src/scenes`, `src/ui`)

| Order | Item                                                                      | Spec                             | State                                                                         | Owner      |
| ----- | ------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- | ---------- |
| 260   | Level-up celebration on the map; party XP bar                             | `level-ups.md` 2                 | done                                                                          | Scene      |
| 270   | Barks with the decided tempo                                              | `barks.md`                       | done                                                                          | Scene      |
| 280   | Path pick tray on the map at 30% speed                                    | `level-ups.md` 4                 | partly done: 30% speed is in, the pick is still the full-screen LevelUp modal | Scene      |
| 290   | Building card with upgrade                                                | `ui-flows.md` 4                  | done                                                                          | Scene      |
| 300   | Continue after reload                                                     | backlog Scene 190                | done                                                                          | Scene      |
| 310   | Damage numbers by type, crit and miss; rider tint; boss hp bar and cleave | `combat.md` 8                    | partly done (verify against Scene 210, 220)                                   | Scene      |
| 320   | Skill visuals: windup glow, the skill shapes, shield and mark display     | `paths-and-skills.md` 4          | PR #238 (Scene 230)                                                           | Scene      |
| 330   | Gear on the map and shopping feedback                                     | `items-and-shops.md`             | PR #240 (Scene 250)                                                           | Scene      |
| 340   | Raid warning arrow and horn                                               | `events.md`                      | not started (Scene 280)                                                       | Scene      |
| 350   | Monster role motion (harpy dart, minotaur charge, pack clump)             | `monsters-and-bosses.md` 5       | not started (Scene 270)                                                       | Scene      |
| 360   | Intent icon over the party banner; trait icon and arrival line            | `hero-ai.md` 2, 4                | not started                                                                   | Scene      |
| 370   | Flag card: raise and cancel a bounty (50% back)                           | `ui-flows.md` 3                  | not started (Scene 40 + Sim 10 of ui-flows)                                   | Scene, Sim |
| 380   | Hint engine and bubble, settings toggle                                   | `onboarding.md`, `hint-texts.md` | not started                                                                   | Scene      |

### Art in the new look (parts style)

| Order | Item                                                            | Spec                         | State                                 | Owner          |
| ----- | --------------------------------------------------------------- | ---------------------------- | ------------------------------------- | -------------- |
| 390   | Heroes from parts: bake pipeline, the 4 Aesir gods and 8 paths  | `paths-and-skills.md` 6      | done (#193); taste-test port PR #228  | Scene, Balance |
| 400   | Monsters in the new look: 5 M2 monsters, per-tier pieces        | `monsters-and-bosses.md` 5   | not started (waits on taste test)     | Art, Scene     |
| 410   | Fafnir and the wyrm nest in the new look                        | `monsters-and-bosses.md` 3   | not started (waits on taste test)     | Art            |
| 420   | Buildings tier 1 and 2 in the new look (B15, B16)               | `buildings.md` 4             | queued (Draft, art freeze)            | Art            |
| 430   | Lairs tier 1 in the new look (B17); lair tier shown in code     | `monsters-and-bosses.md` 4   | queued (Draft); code not started      | Art, Scene     |
| 440   | UI kit (U2): panel, buttons, icons                              | backlog Art 100              | in progress                           | Art            |
| 445   | Plain grass ground with tufts; no screen shake, effects by tier | `ui-flows.md` 2 (taste test) | no shake: done (#216); grass: PR #231 | Scene          |

### Sound

| Order | Item                                                                            | Spec            | State                                                            | Owner                    |
| ----- | ------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------- | ------------------------ |
| 450   | Audio core: unlock on first tap, volume settings, mute in the background        | `audio.md` 4, 5 | done (#227: unlock on first tap, music and effects volume, mute) | Scene                    |
| 460   | Effect synth: code presets per event (hits by type, level-up, raid horn, coins) | `audio.md` 2    | not started                                                      | Scene, Balance (presets) |

## 2. Out of M2 (explicit)

| Out                                                                        | Milestone | Why                                     |
| -------------------------------------------------------------------------- | --------- | --------------------------------------- |
| Greek and Egyptian gods, temples, monsters, bosses                         | M3        | breadth after M2 proves watching is fun |
| Tier 3 heroes, buildings and lairs                                         | M3        | the tier 2 moment first                 |
| Meta: Essence, the Altar, unlocks, Saga, Trials, the Hall                  | M3        | no meta before the core loop is fun     |
| Omens; favour bars and miracles (Sim landed in #205, off until rows exist) | M3        | not needed to judge M2                  |
| Charms and the lair relic (Sim landed in #204, no rows)                    | M3        | M2 gear is weapon, armour, potions      |
| Elites, late recruits, bosses by pantheon, the 5 new bosses                | M3        | one boss (Fafnir) in M2                 |
| Hearth Hall, town hall tiers, ruins                                        | M3        | the town hall stays tier 1 in M2        |
| Music, vibration, juice beyond damage numbers                              | M4        | sound effects come first                |

## 3. Critical path (in order)

1. **Data on (Balance):** rows 180-220. The engines are built; nothing shows until the rows are
   in. #169 has landed; #235 follows; skills need #188 and #194 for the Trickster.
2. **Raids and monsters (Sim, then Scene):** rows 120, 130 then 340, 350. They make fights differ.
3. **Hero intent (Sim, then Scene):** rows 140, 360. Lead adds backlog rows from `hero-ai.md`
   (Sim 10-60, Scene 10-30). This is the "a hero to remember" check.
4. **Skill and gear visuals (Scene):** rows 320, 330. Without them, skills and gear are invisible.
5. **Hints (Sim, Scene, Balance):** rows 160, 240, 380.
6. **Sound (Scene):** rows 450, 460.
7. **New-look art (Art, Scene):** rows 390-440, after the taste test; heroes first (#193).
8. **Run stats and balance (Sim, Balance):** rows 150, 250.
9. **Stefan plays M2** with `docs/playtest-m2.md` and judges the fun checks (section 4).

Rows 310 and 370 run in parallel with steps 1-4.

## 4. The fun gate (M2 is done when)

From `content-roadmap.md` section 2: a skill in at least 60% of fights after 6:00; a player
decision every minute; no 60 s without a fight, level-up or raid in view; 2+ damage types in
most fights after tier 2; average gear level 1+ by 8:00; and Stefan can name a hero and what it
did, and sees a bounty change who goes where. If the last two fail, M3 waits and Design
proposes the fix.

## 5. Proposed backlog rows

| Role    | Order | Row                                                                         |
| ------- | ----- | --------------------------------------------------------------------------- |
| Lead    | 10    | Add `hero-ai.md` rows to the backlog (Sim 10-60, Scene 10-30) as M2         |
| Lead    | 20    | Tag every backlog row M2 / M3 / M4 from this page; update its state weekly  |
| Balance | 10    | Rows 180-240 in that order, then the balance pass (row 250)                 |
| Scene   | 10    | Verify row 310 against Scene 210 and 220 and close or finish them           |
| Sim     | 10    | Tier 3 lair death: `lairDeathChance` 0.1, every cut at half (`combat.md` 6) |
| Scene   | 20    | Path pick tray on the map instead of the LevelUp modal (`level-ups.md` 4)   |
