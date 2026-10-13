# Meta: what persists between runs

Design owns this spec. Stefan decides between the options; Lead records the decision in
`docs/decisions.md` and turns the chosen option into backlog rows. Today nothing persists
except settings (`src/ui/settings.ts`); the end screen reads `RunReport` (Sim 140).

## Bottom line

- **Recommendation: option A, unlocks only,** plus two power-free extras: a **Saga** (a hall of
  the heroes who reached tier 3) and **Omens** (opt-in difficulty after the first win).
- **Why A:** no permanent power means the balance targets (55-75% wins, 15-18 min) hold on run
  1 and run 50; unlocks give the next run a goal; and it fits the art order (Aesir first, Greek
  and Egyptian arrive as rewards, exactly when their art ships).
- **B (a currency)** retains players longer but adds a shop screen, grind and power creep that
  fights the balance targets. **C (nothing)** is the cheapest and the weakest pull to play again.
- **Cost of A:** one small meta save (versioned), one unlock check on the end screen, one hall
  screen. About 6 PRs across Sim, Scene and Lead.

## 1. The three options

| Option         | Persists                                           | For                                                                   | Against                                                                                             |
| -------------- | -------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A Unlocks only | which content exists (temples, gods, cards, Omens) | goals without power creep; balance stays fixed; matches the art order | content must exist to unlock; nothing to do once all is open (Omens answer that)                    |
| B Currency     | a currency ("Ichor") spent on upgrades and unlocks | strong retention; every run pays something, even a loss               | power creep (start gold, cheaper temples) breaks the fixed targets; a shop screen; grind on a phone |
| C Nothing      | nothing; all content from the start                | simplest; every run fair; no save to break                            | no pull to the next run; the 3 pantheons are all there on run 1, which overwhelms                   |

### What B would look like (for comparison)

- Earn Ichor per run: 10 per lair cleared, 5 per hero reaching tier 3, 30 for a win.
- Spend on: unlocks (as A), plus permanent boosts: +50 start gold (3 ranks), temples 10%
  cheaper (2 ranks), one card reroll per run, a fourth card in offers.
- Balance needs a moving target: the bot must assume a "typical" Ichor level, or runs get
  easier the longer one plays.

## 2. Option A in detail (recommended)

### Unlocks

Run 1 starts with: the Aesir temple and its 4 gods, market, shrine, guard tower, the graybox
cards (stats, sustain, nerve) and one map.

| Order | Unlock                         | Condition (from the run report)            |
| ----- | ------------------------------ | ------------------------------------------ |
| 10    | Smithy                         | finish a run (won or lost)                 |
| 20    | Skill cards                    | a hero reaches tier 2                      |
| 30    | Greek temple and its 4 gods    | win once, or play 3 runs                   |
| 40    | Pantheon cards (per pantheon)  | a party with that pantheon reaches level 4 |
| 50    | Egyptian temple and its 4 gods | win with a Greek hero in the town          |
| 60    | Charms (market tier 2 stock)   | a hero buys level 2 gear                   |
| 70    | God's favour cards             | a party reaches level 7                    |
| 80    | Omens                          | win once                                   |
| 90    | Second map (later spec)        | win with all three temples built           |

- Every unlock is a row; the conditions read only `RunReport` and run stats, so Sim can test
  them without Phaser.
- The end screen shows new unlocks as cards ("The Greek gods answer your call").
- Locked content is visible in the hall, greyed, with its condition: the player always knows
  the next goal.

### Saga (flavour, no power)

- Every hero who reached tier 3 is written into the Saga: name, god, path, kills, how the run
  ended, and how it ended for them (fell to a boss, saw the win).
- Heroes have no names today: each pantheon gets a name list (Lead data, about 30 names
  each), and Sim gives every arrival a seeded name. Names also feed speech bubbles.
- Up to 50 entries, newest first. One tap on the hall's Saga tab.
- It turns pillar 2 (personality you can see) into a reason to remember a run.

### Omens (after the first win)

Opt-in difficulty, picked before a run, stacking. Each omen won with is marked on the hall.

| Order | Omen          | Effect                       |
| ----- | ------------- | ---------------------------- |
| 10    | Blood Moon    | first raid 2 minutes earlier |
| 20    | Restless Dead | lairs start at tier 2        |
| 30    | Thin Faith    | temples recruit 25% slower   |
| 40    | Hungry Gods   | boss death chance doubled    |
| 50    | Lean Years    | start with half the gold     |

## 3. Save

- One localStorage key, `godblooded.meta`, JSON: `{ version: 1, runs, wins, unlocks: string[],
omensWon: string[], saga: SagaEntry[] }`.
- Versioned per `CLAUDE.md`: a shape change bumps `version` and adds a migration. A missing or
  broken save starts fresh (it never blocks play).
- A dev flag (settings) unlocks everything, for testing and for Stefan.

## 4. Who builds what (option A)

### Sim

| Order | Row                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------ |
| 10    | `meta.ts`, pure: unlock rules over a `RunReport` and meta state; `GameData` filtered by unlocks; tests |
| 20    | Omens as tuning overrides applied at `createWorld`                                                     |
| 30    | Run report: Saga entries (tier 3 heroes) and the fields the conditions read                            |
| 40    | Hero names: seeded pick from the pantheon's name list on arrival, `name` in the snapshot               |

### Scene

| Order | Row                                                                                  |
| ----- | ------------------------------------------------------------------------------------ |
| 10    | Meta save: load, migrate, write after each run; dev flag in settings                 |
| 20    | End screen: new unlock cards                                                         |
| 30    | Hall screen: pantheons, buildings and cards (locked greyed with condition), Saga tab |
| 40    | Omen picker before a run (after the first win)                                       |

### Lead

| Order | Row                                            |
| ----- | ---------------------------------------------- |
| 10    | Data: unlock rows and Omen rows                |
| 20    | Data: a name list per pantheon (about 30 each) |

### Art

| Order | Row                                                           |
| ----- | ------------------------------------------------------------- |
| 10    | Hall backdrop and 5 Omen icons in the UI kit style (after U2) |

## OPEN (Stefan decides)

1. **A, B or C?** Recommendation: A (unlocks only) with Saga and Omens.
2. If A: start with **Aesir only** (recommendation) or all three pantheons from run 1?
3. **Saga:** keep (recommendation) or skip?
4. **Omens:** keep as the post-win goal (recommendation) or add later?
