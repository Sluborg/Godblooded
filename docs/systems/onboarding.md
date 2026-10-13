# Onboarding

Design owns this spec. Lead turns the proposed rows into backlog rows and the hint texts into
data. Builds on `ui-flows.md` (HUD zones, taps), `meta.md` (the meta save, Aesir-only start) and
today's run start (300 gold, temple 150, first hero 5 s after a temple stands).

## Bottom line

- **Teach by pointing, never by commanding.** Plain hint text (Stefan, 2026-10-13: no
  narrator), one hint at a time in a bubble, and a pulse points at the thing to tap. The
  heroes are never steered; the player is. Final text: `hint-texts.md`.
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
6. **Plain words:** short and direct, game names over jargon (rules in `hint-texts.md`).

## 2. The first 3 minutes

| Beat | When                         | Hint (`hint-texts.md`) | Points at                  |
| ---- | ---------------------------- | ---------------------- | -------------------------- |
| 10   | run start (clock stopped)    | b-temple               | a free plot                |
| 20   | build menu open              | b-aesir                | the temple button          |
| 30   | first hero arrives           | b-arrive               | the hero                   |
| 40   | 10 s later                   | b-gold                 | none                       |
| 50   | 10 s after beat 40           | b-market               | a free plot                |
| 60   | first monster seen by a hero | b-bounty               | the monster                |
| 70   | first bounty placed          | b-watch                | the flag                   |
| 80   | first party formed           | b-party                | a party member             |
| 90   | first upgrade picked         | b-levelup              | the party (`level-ups.md`) |

- Beats fire in order; a beat whose trigger already passed fires right after the one before.
- A player who builds before the first hint shows skips beat 10 and 20.
- The market beat comes before the bounty beat on purpose: after the temple (150) the player
  has 150 gold, enough for the market (100); a bounty first could leave too little to build
  the shop that brings gold back.
- The run clock and the first-run tuning start at beat 10's build.

## 3. First-time hints (after the first 3 minutes)

The 16 first-time hints (raid warning, knockout, path pick, tier-up, skill, gear, potion, flee,
argue, building upgrade, lair tier-up, boss, a hero slain, ruin, omen, full favour bar), with
triggers, targets and text, are in `hint-texts.md` section 3.

## 4. First-run tuning

The first run (no run finished in the meta save) uses gentler numbers, all tuning overrides:

| Key                | Normal                            | First run   |
| ------------------ | --------------------------------- | ----------- |
| town.raidFirstMs   | about 5 min                       | 8 min       |
| lair first tier-up | 6 / 8 / 10 min (`progression.md`) | +2 min each |
| events omenFirstMs | 3 min                             | 6 min       |

From the second run on, everything is normal. The end screen of the first run says so in one
line ("The next run will be harder.").

## 5. What the player sees

- **Hint bubble:** a plain bubble at the top centre of the screen, 26 px text, max 2 lines, a
  small arrow toward the target when it is on screen.
- **Pulse:** a white ring on the target; for a HUD button, the button itself glows.

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
| 20    | Hint bubble and the pulse on map targets and HUD buttons                                    |
| 30    | First run: wait for the first temple before starting the clock                              |
| 40    | Settings: hints on/off, show hints again                                                    |

### Sim

| Order | Row                                                                          |
| ----- | ---------------------------------------------------------------------------- |
| 10    | `firstRun` tuning overrides; a `started` flag so the clock waits for a build |

### Lead (data)

| Order | Row                                      |
| ----- | ---------------------------------------- |
| 10    | The 9 beats and 16 hints as HintDef rows |

## Decided (Stefan, 2026-10-13)

1. **Plain hint text, no narrator** (no Skald, no portrait).
2. **The first run waits for the first temple.**
3. **Gentler first run** (raid at 8:00).
