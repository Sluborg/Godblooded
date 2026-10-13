# UI flows

Design owns this spec. Lead turns the proposed rows into backlog rows. Starts from what Scene
has shipped (`src/scenes/`, `src/ui/`, read 2026-10-13) and adds the screens and panels the
other specs need (`items-and-shops.md`, `buildings.md`, `events.md`, `meta.md`,
`progression.md`). Design size 1280x720, `Scale.FIT`, touch targets at least `MIN_TOUCH` (80).

## Bottom line

- **Keep the shipped skeleton:** Boot, Title, Map + Hud, LevelUp, Pause, Settings and the end
  screen work and stay. This spec adds, it does not rebuild.
- **Biggest gap first: tapping a building does nothing.** Sim already has the `upgrade`
  command; the building card with an upgrade button is Scene's most valuable next row.
- **One inspect slot on the right:** the party panel's rectangle (x 940, y 84, 330x480) becomes
  the one place for every card: party, hero, building, shop, bounty flag. One open at a time.
- **Thumb zones:** frequent taps live at the edges, low: the build and bounty menus bottom
  centre (as today), miracles bottom left (left thumb), the inspect slot right (right thumb).
  The top bar keeps glanceable info and rare buttons.
- **New screens for the meta and events specs:** the Hall (unlocks, Saga), the Trial picker,
  the end screen's unlock cards and a Title button.

## 1. Navigation map

```
Boot ──> Title ──Play──> [Trial picker, after the first win] ──> Map + Hud
           │  ├─Continue (Map asleep, run not over) ──> Map + Hud
           │  ├─Hall (new) ──> tabs: Pantheons, Buildings, Cards, Saga ──Back──> Title
           │  └─Settings ──Back──> (where it came from)
Map + Hud ──Menu──> Pause ──Resume / Restart / Settings / Quit to title
          ──level-up offer──> LevelUp (path card, then upgrade card) ──pick──> Map
          ──won or lost──> End screen ──Play again / Title (new)
```

- **Modal rule:** at most one modal over the map. Priority when two want the screen: end
  screen, then LevelUp, then Pause, then a menu or card. A lower one closes when a higher opens.
- The sim freezes during LevelUp (today), Pause, miracle aiming and the end screen; never
  during an open card or menu.

## 2. HUD layout (1280x720)

| Zone              | Where (px)               | Holds                                                                                 |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| Top bar           | y 0-72, full width       | gold (left, today), clock (centre, today), watch, menu, speed 1x/2x/4x (right, today) |
| Under gold        | x 20-280, y 76-112       | favour bars, one thin bar per built pantheon in its colour (`events.md`)              |
| Next to the clock | x 700-760, y 16-56       | active omen icon; tap shows its banner again                                          |
| Banner line       | centre, y 112            | events today (raid, destroyed); plus raid warning, omen, unlocks                      |
| Inspect slot      | x 940-1270, y 84-564     | party panel today; also hero, building, shop, flag cards (section 4)                  |
| Miracle column    | x 16-96, y 400-704       | up to 3 miracle buttons 80x80, 16 apart, bottom up; dim until the bar is full         |
| Menu strip        | bottom centre, y 600-708 | build menu, bounty menu (today), rebuild menu (new)                                   |
| Toast             | centre, y 640            | today; moves up to y 580 while a menu strip is open                                   |
| Map edges         | any edge                 | raid warning arrows (`events.md`)                                                     |

- `Hud.blocks()` (today: top bar, end screen, panel, menu) also covers the miracle column and
  the favour bars.
- The party colour, tier and elite rings on the map are Scene rows in the other specs.

## 3. What each tap does on the map

Order of resolution (today's rows 10, 40, 50, 60; new rows in bold):

| Order | Tap on                           | Does                                                        |
| ----- | -------------------------------- | ----------------------------------------------------------- |
| 10    | a free plot (within 110)         | build menu (today)                                          |
| 20    | **a built building (within 70)** | **building card** in the inspect slot (upgrade button)      |
| 30    | **a ruin**                       | **rebuild menu**: rebuild at 50% or clear (`buildings.md`)  |
| 40    | a hero (within 70)               | follow it and open its party card (today)                   |
| 50    | **a bounty flag (within 60)**    | **flag card**: amount, who is heading for it, raise, cancel |
| 60    | a monster or lair (within 70)    | bounty menu on it (today)                                   |
| 70    | bare ground                      | bounty menu on the spot (today)                             |

- **While aiming a miracle:** the next map tap casts there; the miracle button cancels.
- **With a menu open:** a tap on bare ground closes it (today).
- Drag pans, pinch zooms, any camera move stops the watch camera (today). No long-press: every
  action stays one tap, to be predictable on a phone.

## 4. Cards in the inspect slot

All cards share the slot, a title line, the close button (80x80, today) and a back arrow when
opened from another card.

| Card     | Opened by                | Shows                                                                           | Buttons                                                                   |
| -------- | ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Party    | tap a hero (today)       | level, XP, upgrades, member rows (today)                                        | member row tap opens the Hero card                                        |
| Hero     | tap a member row         | god, path, tier, trait, the four item slots, gold, kills (`items-and-shops.md`) | back                                                                      |
| Building | tap a building           | name, tier, what it does now, what the next tier adds, hp                       | Upgrade (cost; greyed with the reason: gold, or "needs town hall tier 2") |
| Shop     | tap the market or smithy | the building card plus what it sells now                                        | Upgrade                                                                   |
| Flag     | tap a bounty flag        | amount, heroes heading for it (party dots), time placed                         | Raise (+25, +50), Cancel (50% back)                                       |

## 5. Menus in the bottom strip

| Menu    | Today                                  | Change                                                          |
| ------- | -------------------------------------- | --------------------------------------------------------------- |
| Build   | one button per building, name and cost | locked buildings (meta) not shown; at the cap ("1 of 1") greyed |
| Bounty  | 25, 50, 100, 200 and Close             | unchanged                                                       |
| Rebuild | (new)                                  | Rebuild (cost), Clear, Close                                    |

## 6. Modal screens

| Screen             | Today                                                 | Change                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LevelUp            | path cards, then 3 upgrade cards; no close            | rarity frame and family icon (`progression.md`); a **Map** button (bottom right) hides the cards while held, so the player can look before picking; the sim stays frozen |
| Pause              | Resume, Restart, Settings, Quit to title              | unchanged                                                                                                                                                                |
| Settings           | default speed, reduced motion, party colours, Back    | music and effects volume (`audio.md`); the HUD speed choice is saved as the default                                                                                      |
| End screen         | VICTORY or TOWN LOST, time, gold, 6 stats, Play again | MVP hero line (run report has `mvp`), new unlock cards, Saga entries added this run, a **Title** button next to Play again                                               |
| Hall (new)         |                                                       | tabs: Pantheons (gods, locked greyed with condition), Buildings, Cards, Saga; Back                                                                                       |
| Trial picker (new) | (only after the first win)                            | 5 toggles with their effect, Start; won trials marked                                                                                                                    |
| Miracle aim        | (new)                                                 | sim paused, a 250 ring under the finger, the miracle's name at the top, cancel by its button                                                                             |

## 7. Proposed backlog rows

### Scene

| Order | Row                                                                           |
| ----- | ----------------------------------------------------------------------------- |
| 10    | Tap a building: building card with the upgrade button (Sim `upgrade` exists)  |
| 20    | Inspect slot: one card at a time; party member rows open a Hero card          |
| 30    | End screen: Title button, MVP line                                            |
| 40    | Flag card: raise and cancel (needs Sim 10)                                    |
| 50    | LevelUp: hold-to-peek Map button                                              |
| 60    | HUD speed choice saved as the default                                         |
| 70    | Favour bars, miracle column and aiming (with `events.md` Sim rows)            |
| 80    | Hall and Trial picker; end screen unlock cards and Saga (with `meta.md` rows) |
| 90    | Rebuild menu and ruins (with `buildings.md` rows)                             |

### Sim

| Order | Row                                                                              |
| ----- | -------------------------------------------------------------------------------- |
| 10    | Commands `raiseBounty { bounty, gold }` and `cancelBounty { bounty }` (50% back) |

## OPEN (Stefan decides)

1. **LevelUp peek:** a hold-to-look Map button on the card screen (recommendation), or keep the
   cards covering the map?
2. **Bounty cancel** refunds 50% (recommendation), 100%, or no cancel at all?
3. **Miracle aiming pauses the game** (recommendation, one thumb on a phone), or aim live?
