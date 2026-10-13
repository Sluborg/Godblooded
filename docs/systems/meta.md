# Meta: what persists between runs

Design owns this spec. Stefan chose option B (decision 2026-10-13); Lead turns it into backlog
rows. Today nothing persists
except settings (`src/ui/settings.ts`); the end screen reads `RunReport` (Sim 140).

## Bottom line

- **Stefan decided (2026-10-13): option B.** A currency, **Ambrosia**, is earned every run (won or
  lost) and spent at the **Altar** in the hall on permanent upgrades. Content still unlocks by
  goals, as in option A, so the art order holds (Aesir first, Greek and Egyptian as rewards).
- **The Altar** has 10 upgrades, 1 to 3 ranks each, about 1700 Ambrosia in all: roughly 25 runs to
  fill. Each rank is small (start gold, cheaper temples, faster wake-ups); the strongest is a
  fourth card in party offers.
- **Power creep is capped:** a full Altar is worth about +15% run strength. Balance measures
  the win-rate target at half the Altar bought, and Trials take the edge back after the first
  win.
- **Saga and Trials stay** (recommendations): a hall of tier 3 heroes, and opt-in difficulty
  after the first win.
- **Cost:** one meta save (versioned), the Altar tab in the hall, Ambrosia on the end screen,
  upgrades applied at `createWorld`. About 8 PRs across Sim, Scene, Balance and Lead.

## 1. The three options (decided: B)

| Option         | Persists                                              | For                                                                   | Against                                                                                             |
| -------------- | ----------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| A Unlocks only | which content exists (temples, gods, cards, Trials)   | goals without power creep; balance stays fixed; matches the art order | content must exist to unlock; nothing to do once all is open (Trials answer that)                   |
| B Currency     | a currency ("Ambrosia") spent on upgrades and unlocks | strong retention; every run pays something, even a loss               | power creep (start gold, cheaper temples) breaks the fixed targets; a shop screen; grind on a phone |
| C Nothing      | nothing; all content from the start                   | simplest; every run fair; no save to break                            | no pull to the next run; the 3 pantheons are all there on run 1, which overwhelms                   |

## 2. Ambrosia and the Altar

### Earning

| Source                     | Ambrosia | Typical run                       |
| -------------------------- | -------- | --------------------------------- |
| each lair cleared          | 10       | a loss: 2 lairs, a win: 3 or more |
| each hero reaching tier 3  | 5        | 1 to 3                            |
| each full minute survived  | 1        | 10 to 18                          |
| the boss slain (a win)     | 30       |                                   |
| a Trial won with (per one) | 10       | after the first win only          |

- A typical loss pays about 35, a typical win about 90. The end screen counts it up line by
  line ("Lair cleared +10").

### The Altar (permanent upgrades)

| Order | Id              | Name                    | Effect per rank                               | Ranks | Cost per rank |
| ----- | --------------- | ----------------------- | --------------------------------------------- | ----- | ------------- |
| 10    | war-chest       | War Chest               | +50 start gold                                | 3     | 40, 80, 120   |
| 20    | devout-masons   | Devout Masons           | temples 10% cheaper                           | 2     | 60, 120       |
| 30    | open-hands      | Open Hands              | market and smithy 10% cheaper                 | 2     | 50, 100       |
| 40    | bounty-ledger   | Bounty Ledger           | bounty flags cost 10% less gold               | 2     | 40, 80        |
| 50    | hearth-fire     | Hearth Fire             | knocked out heroes wake 15% sooner            | 2     | 50, 100       |
| 60    | deep-roots      | Deep Roots              | town hall +20% hp                             | 2     | 60, 120       |
| 70    | watchful-eyes   | Watchful Eyes           | raid warnings come 5 s earlier                | 2     | 40, 80        |
| 80    | seasoned-blood  | Seasoned Blood          | the first party of each run starts with 15 XP | 1     | 150           |
| 90    | favoured-temple | Favoured (per pantheon) | that pantheon's temple recruits 15% faster    | 1     | 80 each       |
| 100   | fourth-card     | The Fourth Card         | party level-up offers show 4 cards            | 1     | 200           |

- Total about 1700 Ambrosia (Favoured counted for all three pantheons). A rank needs the one
  before it; Favoured needs its pantheon unlocked.
- **Return to the gods:** a free full refund at the Altar, any time outside a run, so a player
  can try other builds.
- **Balance:** each row is a tuning override applied at `createWorld`. The bot reports the
  win rate at three Altar levels (none, half, full); the 55-75% target holds at half, full stays
  at or below 85%.

## 3. Unlocks, Saga and Trials

### Unlocks

Run 1 starts with: the Aesir temple and its 4 gods, market, shrine, guard tower, the graybox
cards (stats, sustain, nerve) and the standard seeded map (Sim 150).

| Order | Unlock                         | Condition (from the run report)            |
| ----- | ------------------------------ | ------------------------------------------ |
| 10    | Smithy                         | finish a run (won or lost)                 |
| 20    | Skill cards                    | a hero reaches tier 2                      |
| 30    | Greek temple and its 4 gods    | win once, or play 3 runs                   |
| 40    | Pantheon cards (per pantheon)  | a party with that pantheon reaches level 4 |
| 50    | Egyptian temple and its 4 gods | win with a Greek hero in the town          |
| 60    | Charms (market tier 2 stock)   | a hero buys level 2 gear                   |
| 70    | God's favour cards             | a party reaches level 7                    |
| 80    | Trials                         | win once                                   |
| 90    | Large maps, more lairs (later) | win with all three temples built           |

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

### Trials (after the first win)

Opt-in difficulty, picked before a run, stacking (named Trials so they do not clash with the
in-run omens of `events.md`). Each trial won with is marked on the hall.

| Order | Trial         | Effect                       |
| ----- | ------------- | ---------------------------- |
| 10    | Blood Moon    | first raid 2 minutes earlier |
| 20    | Restless Dead | lairs start at tier 2        |
| 30    | Thin Faith    | temples recruit 25% slower   |
| 40    | Hungry Gods   | death chances doubled        |
| 50    | Lean Years    | start with half the gold     |

## 4. Save

- One localStorage key, `godblooded.meta`, JSON: `{ version: 1, runs, wins, ambrosia, altar:
Record<string, number>, unlocks: string[], trialsWon: string[], saga: SagaEntry[], nextSeed: number, lean: string, hintsSeen:
string[], hintsOn: boolean, lastBoss?:
string }` (`nextSeed` and `lean`, the pantheon chosen at the Altar, `meta-ui.md`; `hintsSeen` and `hintsOn` from
  `onboarding.md`; `lastBoss` keeps the boss pick from
  repeating, `monsters-and-bosses.md`).
- Versioned per `CLAUDE.md`: a shape change bumps `version` and adds a migration. A missing or
  broken save starts fresh (it never blocks play).
- A dev flag (settings) unlocks everything, for testing and for Stefan.

## 5. Who builds what

### Sim

| Order | Row                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------ |
| 10    | `meta.ts`, pure: unlock rules over a `RunReport` and meta state; `GameData` filtered by unlocks; tests |
| 15    | Ambrosia earned from a `RunReport`; Altar ranks as tuning overrides at `createWorld`; tests            |
| 20    | Trials as tuning overrides applied at `createWorld`                                                    |
| 30    | Run report: Saga entries (tier 3 heroes) and the fields the conditions read                            |
| 40    | Hero names: seeded pick from the pantheon's name list on arrival, `name` in the snapshot               |

### Scene

| Order | Row                                                                        |
| ----- | -------------------------------------------------------------------------- |
| 10    | Meta save: load, migrate, write after each run; dev flag in settings       |
| 20    | End screen: Ambrosia count-up and new unlock cards                         |
| 25    | Altar tab in the hall: rows, ranks, costs, buy, Return to the gods         |
| 30    | Hall screen: Altar, Saga and Unlocks tabs (`meta-ui.md`)                   |
| 40    | Run setup before a run: portent, Trials after the first win (`meta-ui.md`) |

### Lead

| Order | Row                                            |
| ----- | ---------------------------------------------- |
| 10    | Data: unlock rows and Trial rows               |
| 15    | Data: Ambrosia sources and the 10 Altar rows   |
| 20    | Data: a name list per pantheon (about 30 each) |

### Art

| Order | Row                                                            |
| ----- | -------------------------------------------------------------- |
| 10    | Hall backdrop and 5 Trial icons in the UI kit style (after U2) |
| 20    | Ambrosia icon and 10 Altar upgrade icons                       |

## Decided (Stefan, 2026-10-13)

1. **Option B:** Ambrosia and the Altar, with goal unlocks as in A.
2. **Aesir only** at the start; Greek and Egyptian unlock by goals.
3. **Saga:** kept.
4. **Trials:** kept as the post-win goal.
