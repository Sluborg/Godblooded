# Meta UI: between runs

Design owns this spec (Lead row Design 250). It is the phone flow from the end of a run to the
start of the next: the Ambrosia tally, the Altar, goal unlocks and the Saga, the Trials and
the new run setup. Rules come from `meta.md` (Ambrosia, the Altar, unlocks, Saga, Trials); screens
and HUD rules from `ui-flows.md`; the look from the taste test (decision 2026-10-14).

## Bottom line

- **Four screens, one loop:** End screen (Ambrosia counts up) → Altar (spend) → Run setup (Trials,
  the coming lean) → the run. The Hall holds the Altar, Saga and unlock lists for browsing from
  the Title.
- **Never more than two taps between runs:** "Play again" on the end screen goes straight to the
  run setup; the Altar is one tap away and only nags (a pulsing badge) when Ambrosia covers a rank.
- **The Altar is a list, not a tree:** 10 upgrades (Favoured is one row per unlocked pantheon, so 10 to
  12 rows), each with its ranks as pips and the next cost on
  a big button. A tree adds reading for no choice (`meta.md` has only "rank needs the rank
  before it").
- **The player chooses the lean at the Altar** (Stefan, 2026-10-14): a portent strip at the top
  of the Altar picks the next run's pantheon (unlocked ones only); the run setup shows it.
- **Buys are press-and-hold** (about 0.6 s, a ring fills round the button), no popup.
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
  through it; before the first win it shows only the portent and Start.
- **Back** goes one step up; the system back gesture on Android does the same.

## 2. End screen

| Part           | Content                                                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title          | VICTORY or THE TOWN HAS FALLEN, the run time                                                                                                                                            |
| MVP line       | the hero with most kills: name, god, path, one line ("Eirik Thorsson felled the wyrm")                                                                                                  |
| Ambrosia tally | one line per source, counting up 0.3 s each: lairs cleared +10 each, tier 3 heroes +5 each, minutes survived +1 each, the boss +30, Trials +10 each; then the total and the new balance |
| Unlocks        | one card per goal reached this run (art, name, "The Greek gods answer your call"), tap for details                                                                                      |
| Saga           | "Written into the Saga:" with each tier 3 hero this run (name, god, path, how it ended)                                                                                                 |
| Buttons        | **Play again** (big, bottom right), **Altar** (with a badge when a rank is affordable), **Title** (bottom left)                                                                         |

- The tally can be skipped with a tap (jumps to the totals).
- Stats from today's end screen (gold, kills, 6 stats) move behind a small "Run details" tab
  on the same panel.

## 3. The Altar

```
┌ wood frame ───────────────────────────────────────────────── Ambrosia 340 ┐
│ < Back                    THE ALTAR                                     │
│ Portent:  [ The north stirs ]  [ The sea grows restless ]  [ locked ]   │
│ ┌ parchment row ─────────────────────────────────────────────────────┐ │
│ │ [icon] War Chest      +50 start gold      ●●○   [ 120 ]            │ │
│ │ [icon] Devout Masons  temples 10% cheaper ●○    [ 120 ]            │ │
│ │ [icon] Favoured: Greek  temple recruits +15% ○  (win once)        │ │
│ │ ...                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ Return to the gods (refund all)                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- **10 to 12 rows** in `meta.md` order (Favoured: one row per unlocked pantheon), 96 px high: 5
  show at once, a short drag shows the rest.
- **Each row:** icon, name, effect per rank in one line, rank pips, and the next rank's cost on a
  button (80 x 80 or larger). A full row shows "Full" in place of the button.
- **Portent strip (the lean picker):** one button per pantheon with its sigil and portent line;
  locked pantheons show their unlock goal. Tap to choose; the choice is saved and holds until
  changed (default: the Aesir). The two possible bosses of the chosen pantheon show as
  silhouettes under the strip.
- **Buy: press and hold** the cost button for about 0.6 s; a ring fills round it, then the pip
  fills with a short glow and the Ambrosia counter ticks down. Letting go early cancels. No popup; a
  mistake is undone with "Return to the gods".
- **Can't afford:** the button is dimmed and shows the cost in red; tapping it shows a toast "Need 40 more Ambrosia".
- **Locked:** Favoured rows of a locked pantheon show the unlock goal instead of a cost.
- **Return to the gods:** a text button at the bottom, also press and hold (about 1.2 s, longer
  because it undoes everything), no popup.

## 4. Hall: Saga and unlocks

| Tab     | Content                                                                                                    |
| ------- | ---------------------------------------------------------------------------------------------------------- |
| Altar   | as section 3                                                                                               |
| Saga    | up to 50 heroes, newest first: portrait (the hero's baked look), name, god, path, kills, how it ended      |
| Unlocks | every unlock row: unlocked with the run it came from, or greyed with its goal and progress ("2 of 3 runs") |

- **Tabs** are three big buttons along the top of the frame (each at least 80 high).
- The Saga row opens a small card with that hero's run line, nothing more.

## 5. Run setup

| Part           | Content                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portent        | the lean chosen at the Altar: "The north stirs" (Aesir), "The sea grows restless" (Greek), "The sands whisper" (Egyptian), with the sigil and the two possible bosses; a tap opens the Altar to change it |
| Trials         | after the first win: 5 toggles (name, effect, a mark if won with it before), the Ambrosia bonus shown (+10 each)                                                                                          |
| Altar shortcut | a small "Altar (340)" button if any rank is affordable                                                                                                                                                    |
| Start          | big, bottom right                                                                                                                                                                                         |

- **The run uses the chosen lean:** `createWorld` takes `lean` from the meta save; the map leans
  on that pantheon and its boss pair is drawn (seeded by `nextSeed`, no repeat by `lastBoss`).
- With only the Aesir unlocked, the strip shows one choice and the portent still shows.

## 6. Layout rules

- **Frames:** wood border, parchment fill, iron studs (taste test); panels never fill the whole
  screen edge to edge: a 24 px margin shows the backdrop.
- **Thumb zones:** primary actions (Play again, Start, buy buttons) on the right half, bottom
  two thirds; Back top left, Title bottom left.
- **Touch targets** at least `MIN_TOUCH` (80); numbers at least 28 px.
- **Sound:** a coin clink per Ambrosia line, a deep chime on a buy, a horn on Start (`audio.md`).

## 7. Proposed rows

### Sim

| Order | Row                                                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 10    | `createWorld` takes a chosen `lean`; `previewRun(meta)` gives that lean's boss pair; `lean` in the meta save                                |
| 20    | Ambrosia tally lines from `RunReport` (source, count, amount) for the end screen; Altar buy and refund as pure functions over the meta save |

### Scene

| Order | Row                                                                                             |
| ----- | ----------------------------------------------------------------------------------------------- |
| 10    | End screen v3: Ambrosia tally with count-up, unlock cards, Saga lines, Run details tab, buttons |
| 20    | Altar screen: rows, pips, buy, toasts, refund                                                   |
| 30    | Hall tabs: Altar, Saga, Unlocks                                                                 |
| 40    | Run setup: portent with sigil and boss silhouettes, Trial toggles, Start                        |
| 50    | Wood-and-parchment frame and tab pieces (with Art's UI kit)                                     |

### Balance (data)

| Order | Row                                                              |
| ----- | ---------------------------------------------------------------- |
| 10    | Portent lines per pantheon; Altar row icons and text (`meta.md`) |

### Art

| Order | Row                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------- |
| 10    | Wood-and-parchment frame (9-slice), tab buttons, 10 Altar icons, 3 pantheon sigils, Ambrosia icon |

## Decided (Stefan, 2026-10-14)

1. **The lean is chosen** by the player at the Altar (the portent strip).
2. **Altar buys are press and hold** (about 0.6 s), no popup.
