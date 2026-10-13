# Meta UI: between runs

Design owns this spec (Lead row Design 250). It is the phone flow from the end of a run to the
start of the next: the Ichor tally, the Altar, goal unlocks and the Saga, the Trial picker and
the new run setup. Rules come from `meta.md` (Ichor, the Altar, unlocks, Saga, Trials); screens
and HUD rules from `ui-flows.md`; the look from the taste test (decision 2026-10-14).

## Bottom line

- **Four screens, one loop:** End screen (Ichor counts up) → Altar (spend) → Run setup (Trials,
  the coming lean) → the run. The Hall holds the Altar, Saga and unlock lists for browsing from
  the Title.
- **Never more than two taps between runs:** "Play again" on the end screen goes straight to the
  run setup; the Altar is one tap away and only nags (a pulsing badge) when Ichor covers a rank.
- **The Altar is a list, not a tree:** 10 rows, each with its ranks as pips and the next cost on
  a big button. A tree adds reading for no choice (`meta.md` has only "rank needs the rank
  before it").
- **The lean is shown, not chosen:** the run setup shows the omen of the coming run ("The north
  stirs": an Aesir lean and its boss pair) so a player can buy for it; the map seed decides it.
- **Look:** wood-and-parchment frames, big readable numbers, actions in the right thumb zone,
  Back always top left.

## 1. Flow

```
Run ends ──> End screen ──Play again──> Run setup ──Start──> Map + Hud
                │   └─Altar (badge if a rank is affordable) ──Back──> End screen
                └─Title ──> Title ──Hall──> Hall: Altar | Saga | Unlocks
                                  └─Play──> Run setup
```

- **Run setup** replaces today's "Trial picker, after the first win": every new run passes
  through it; before the first win it shows only the omen and Start.
- **Back** goes one step up; the system back gesture on Android does the same.

## 2. End screen

| Part        | Content                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title       | VICTORY or THE TOWN HAS FALLEN, the run time                                                                                                                                            |
| MVP line    | the hero with most kills: name, god, path, one line ("Eirik Thorsson felled the wyrm")                                                                                                  |
| Ichor tally | one line per source, counting up 0.3 s each: lairs cleared +10 each, tier 3 heroes +5 each, minutes survived +1 each, the boss +30, Trials +10 each; then the total and the new balance |
| Unlocks     | one card per goal reached this run (art, name, "The Greek gods answer your call"), tap for details                                                                                      |
| Saga        | "Written into the Saga:" with each tier 3 hero this run (name, god, path, how it ended)                                                                                                 |
| Buttons     | **Play again** (big, bottom right), **Altar** (with a badge when a rank is affordable), **Title** (bottom left)                                                                         |

- The tally can be skipped with a tap (jumps to the totals).
- Stats from today's end screen (gold, kills, 6 stats) move behind a small "Run details" tab
  on the same panel.

## 3. The Altar

```
┌ wood frame ───────────────────────────────────────────────── Ichor 340 ┐
│ < Back                    THE ALTAR                                     │
│ ┌ parchment row ─────────────────────────────────────────────────────┐ │
│ │ [icon] War Chest      +50 start gold      ●●○   [ 80 ]             │ │
│ │ [icon] Devout Masons  temples 10% cheaper ●○    [ 120 ]            │ │
│ │ [icon] Fourth Card    a 4th card in offers ○    [ 200 ] (locked)   │ │
│ │ ...                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ Return to the gods (refund all)                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- **10 rows** in `meta.md` order, 96 px high: 5 show at once, a short drag shows the rest.
- **Each row:** icon, name, effect per rank in one line, rank pips, and the next rank's cost on a
  button (80 x 80 or larger). A full row shows "Full" in place of the button.
- **Buy:** tap the cost button; the pip fills with a short glow and the Ichor counter ticks down.
  No confirm dialog; a mistake is undone with "Return to the gods".
- **Can't afford:** the button is dimmed and shows the cost in red; tapping it shows a toast "Need 40 more Ichor".
- **Locked:** Favoured rows of a locked pantheon show the unlock goal instead of a cost.
- **Return to the gods:** a text button at the bottom, one confirm ("Refund 340 Ichor?").

## 4. Hall: Saga and unlocks

| Tab     | Content                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Altar   | as section 3                                                                                               |
| Saga    | up to 50 heroes, newest first: portrait (the hero's baked look), name, god, path, kills, how it ended      |
| Unlocks | every unlock row: unlocked with the run it came from, or greyed with its goal and progress ("2 of 3 runs") |

- **Tabs** are three big buttons along the top of the frame (each at least 80 high).
- The Saga row opens a small card with that hero's run line, nothing more.

## 5. Run setup

| Part           | Content                                                                                                                                                                                               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Omen           | the coming run's lean, from its seed: "The north stirs" (Aesir), "The sea grows restless" (Greek), "The sands whisper" (Egyptian), with the pantheon sigil and its two possible bosses as silhouettes |
| Trials         | after the first win: 5 toggles (name, effect, a mark if won with it before), the Ichor bonus shown (+10 each)                                                                                         |
| Altar shortcut | a small "Altar (340)" button if any rank is affordable                                                                                                                                                |
| Start          | big, bottom right                                                                                                                                                                                     |

- **The seed is fixed when the setup opens,** so the omen is true; the next run's seed is drawn
  from the meta save, not from the clock (Sim decides the source; it stays seeded).
- With only the Aesir unlocked, the omen still shows (the lean decides the boss pair).

## 6. Layout rules

- **Frames:** wood border, parchment fill, iron studs (taste test); panels never fill the whole
  screen edge to edge: a 24 px margin shows the backdrop.
- **Thumb zones:** primary actions (Play again, Start, buy buttons) on the right half, bottom
  two thirds; Back and Title top or bottom left.
- **Touch targets** at least `MIN_TOUCH` (80); numbers at least 28 px.
- **Sound:** a coin clink per Ichor line, a deep chime on a buy, a horn on Start (`audio.md`).

## 7. Proposed rows

### Sim

| Order | Row                                                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 10    | `previewRun(meta)`: the next run's seed, lean pantheon and boss pair without starting it                                                 |
| 20    | Ichor tally lines from `RunReport` (source, count, amount) for the end screen; Altar buy and refund as pure functions over the meta save |

### Scene

| Order | Row                                                                                          |
| ----- | -------------------------------------------------------------------------------------------- |
| 10    | End screen v3: Ichor tally with count-up, unlock cards, Saga lines, Run details tab, buttons |
| 20    | Altar screen: rows, pips, buy, toasts, refund                                                |
| 30    | Hall tabs: Altar, Saga, Unlocks                                                              |
| 40    | Run setup: omen with sigil and boss silhouettes, Trial toggles, Start                        |
| 50    | Wood-and-parchment frame and tab pieces (with Art's UI kit)                                  |

### Balance (data)

| Order | Row                                                           |
| ----- | ------------------------------------------------------------- |
| 10    | Omen lines per pantheon; Altar row icons and text (`meta.md`) |

### Art

| Order | Row                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------- |
| 10    | Wood-and-parchment frame (9-slice), tab buttons, 10 Altar icons, 3 pantheon sigils, Ichor icon |

## OPEN (Stefan decides)

1. **The lean is shown, not chosen** (recommendation), or may the player pick the pantheon of
   the next run?
2. **Buy without a confirm** (recommendation, refund is free), or confirm every purchase?
