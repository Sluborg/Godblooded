# Onboarding

Design owns this spec. Lead turns the proposed rows into backlog rows and the hint texts into
data. Builds on `ui-flows.md` (HUD zones, taps), `meta.md` (the meta save, Aesir-only start) and
today's run start (300 gold, temple 150, first hero 5 s after a temple stands).

## Bottom line

- **Teach by pointing, never by commanding.** A narrator, the town's **Skald**, says one line
  at a time in a speech bubble from the town hall and a pulse points at the thing to tap. The
  heroes are never steered; the player is.
- **The first run waits for the first temple:** the clock does not start and no monster moves
  until a temple stands. After that nothing pauses for teaching.
- **First 3 minutes, beat by beat:** temple, first hero, the "you can't command them" line, the
  first bounty, the market and tax, the first party, the first level-up card.
- **After that, first-time hints** fire on events (first raid warning, first knockout, first
  path pick, first omen, first full favour bar), one at a time, at most one per 20 s.
- **A gentler first run:** first raid at 8:00 instead of about 5:00 (first run only).

## 1. Rules

1. **One hint at a time.** A hint shows until tapped anywhere or 8 s pass; a new hint waits
   at least 20 s after the last.
2. **Hints point:** each hint names a target (a plot, a building, a lair, a hero, a HUD button)
   that pulses (a ring, 1 s loop) while the hint shows.
3. **Hints never block** the game, except beat 10 (the run waits for the first temple).
4. **Once per player:** a seen hint is stored in the meta save (`hintsSeen`), so it never comes
   back, also not in later runs.
5. **Settings:** "Hints on/off" and "Show hints again" (clears `hintsSeen`).
6. **The Skald speaks like the world:** short, in voice, no UI words like "click" or "HUD"
   where a game word fits ("Raise a temple" not "Tap a plot to build").

## 2. The first 3 minutes

| Beat | When                         | The Skald says                                                               | Points at                                  |
| ---- | ---------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| 10   | run start (clock stopped)    | "The gods have children among us. Raise a temple, and they will come."       | a free plot                                |
| 20   | build menu open              | "The Aesir temple. Odin, Thor, Loki and Freyja will hear it."                | the temple button                          |
| 30   | first hero arrives           | "A Godblood. They answer to no king, not even you."                          | the hero                                   |
| 40   | 10 s later                   | "You cannot command them. But gold speaks to every child of a god."          | none                                       |
| 50   | 10 s after beat 40           | "Heroes spend what they earn. Build a market, and the town takes its share." | a free plot                                |
| 60   | first monster seen by a hero | "Tap a monster to put a bounty on its head."                                 | the monster                                |
| 70   | first bounty placed          | "Watch who goes for it. The greedy run, the cowards think twice."            | the flag                                   |
| 80   | first party formed           | "Two who fight together stay together. Tap a hero to see the party."         | a party member                             |
| 90   | first level-up offer         | "They have grown. Choose what the gods grant them."                          | the cards (top line on the LevelUp screen) |

- Beats fire in order; a beat whose trigger already passed fires right after the one before.
- A player who builds before the Skald speaks skips beat 10 and 20.
- The market beat comes before the bounty beat on purpose: after the temple (150) the player
  has 150 gold, enough for the market (100); a bounty first could leave too little to build
  the shop that brings gold back.
- The run clock and the first-run tuning start at beat 10's build.

## 3. First-time hints (after the first 3 minutes)

| Id            | Trigger (Sim event)               | The Skald says                                                                    | Points at          |
| ------------- | --------------------------------- | --------------------------------------------------------------------------------- | ------------------ |
| raid-warning  | first `raidWarning`               | "Horns from the edge of the map. Raiders come. Towers and heroes will meet them." | the arrow          |
| knockout      | first `knockout`                  | "Down, not dead. They wake at the town hall."                                     | the downed hero    |
| path-pick     | first `pathOffer`                 | "A path opens. Each god's child walks one of two."                                | the cards          |
| tier-up       | first `tierUp` to tier 2          | "Look at them now."                                                               | the hero           |
| lair-tier     | first `lairTierUp`                | "The lair grows. Its brood grows with it."                                        | the lair           |
| upgrade       | first time gold covers an upgrade | "Your buildings can grow too. Tap one."                                           | a building         |
| omen          | first `omen`                      | "A sign in the sky. Something is coming."                                         | the banner         |
| favour        | first full favour bar             | "The gods are pleased. Call on them once."                                        | the miracle button |
| boss          | boss emerges                      | "There. The one that rules them all."                                             | the boss           |
| building-down | first `buildingDestroyed`         | "Rubble can be raised again."                                                     | the ruin           |

## 4. First-run tuning

The first run (no run finished in the meta save) uses gentler numbers, all tuning overrides:

| Key                | Normal                            | First run   |
| ------------------ | --------------------------------- | ----------- |
| town.raidFirstMs   | about 5 min                       | 8 min       |
| lair first tier-up | 6 / 8 / 10 min (`progression.md`) | +2 min each |
| events omenFirstMs | 3 min                             | 6 min       |

From the second run on, everything is normal. The end screen of the first run says so in one
line ("The world will not wait for you next time.").

## 5. What the player sees

- **Skald bubble:** a speech bubble anchored at the town hall (or the screen's top centre
  when the town hall is off screen), with a small skald portrait, 26 px text, max 2 lines.
- **Pulse:** a white ring on the target; for a HUD button, the button itself glows.
- **LevelUp first time:** the Skald's line replaces the subtitle once.

## 6. Proposed data rows

| Row       | Fields                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HintDef   | `id`, `beat` (order, or none), `trigger` (event kind or condition id), `text`, `target` (plot, building type, lair, hero, unit kind, ui id), `delayMs` |
| meta save | `hintsSeen: string[]`, `hintsOn: boolean` (bump the meta save version)                                                                                 |
| tuning    | `firstRun` overrides (table in section 4), applied by `createWorld` when the meta save says so                                                         |

## 7. Proposed backlog rows

### Scene

| Order | Row                                                                                         |
| ----- | ------------------------------------------------------------------------------------------- |
| 10    | Hint engine: HintDef rows, triggers from Sim events, one at a time, 20 s spacing, seen list |
| 20    | Skald bubble and the pulse on map targets and HUD buttons                                   |
| 30    | First run: wait for the first temple before starting the clock                              |
| 40    | Settings: hints on/off, show hints again                                                    |

### Sim

| Order | Row                                                                          |
| ----- | ---------------------------------------------------------------------------- |
| 10    | `firstRun` tuning overrides; a `started` flag so the clock waits for a build |

### Lead (data)

| Order | Row                                      |
| ----- | ---------------------------------------- |
| 10    | The 9 beats and 10 hints as HintDef rows |

### Art

| Order | Row                                                            |
| ----- | -------------------------------------------------------------- |
| 10    | Skald portrait, a small bust facing right, for the hint bubble |

## OPEN (Stefan decides)

1. **The Skald** as the narrator (recommendation), or no narrator, plain hint text?
2. **The first run waits for the first temple** (recommendation), or the clock runs from the
   start?
3. **Gentler first run** (raid at 8:00), or the same numbers every run?
