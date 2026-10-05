# Backlog

Lead owns this file. Rows per role, ordered 10, 20, 30 (insert between). Status: Open, Doing,
Review (PR open), Done. A worker takes its top Open row.

## Lead

| Order | Item                                                                                                   | Status |
| ----- | ------------------------------------------------------------------------------------------------------ | ------ |
| 10    | Spawn Sim, Scene and Art sessions (`docs/prompts/`), check they registered in sessions.md              | Done   |
| 20    | Agree the first `src/sim/api.ts` shape with Sim and Scene (inboxes), record in decisions               | Done   |
| 30    | First `src/data/` rows for the graybox: 2 classes, 2 monsters, 4 buildings, 3 upgrades                 | Done   |
| 35    | Balance pass on GRAYBOX with `npm run sim`: median run 15-18 min, win rate 55-75%, knockouts every run | Done   |
| 40    | Review and merge M1 PRs; when M1 runs end to end, ask Stefan "is it fun to watch?"                     | Doing  |

## Sim

| Order | Item                                                                                                                        | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| 10    | `api.ts` + world: `createWorld(seed, data)`, `step(world, dtMs)`, `snapshot()`, `command()`; tick loop                      | Done   |
| 20    | Units move on the map (simple steering, no pathfinding yet); lairs spawn monsters on a timer                                | Done   |
| 30    | Lean real-time combat from the Coda reference math (simplify if needed, log it in decisions)                                | Done   |
| 35    | Build plots in the sim: `GameData.plots`, `build` takes a plot, refuses occupied plots; snapshot lists plots                | Done   |
| 40    | Heroes: arrive at temples, explore, fight, return to heal and shop (gold flows to the town by tax)                          | Done   |
| 45    | Move hero tuning (recruit timer, flee, rest, shop, tax, revive) from `heroes.ts` into `GameData.tuning`; Lead fills the row | Done   |
| 50    | Parties: form by traits and bonds, move and fight together, share XP; party level up offers 3 upgrades                      | Done   |
| 60    | Bounty flags: heroes weigh bounty vs danger by trait; win (last lair) and lose (town hall) conditions                       | Done   |
| 70    | Headless balance sim (`npm run sim`): 100 seeded runs, report run length, win rate, deaths                                  | Done   |
| 80    | Hero cap: at most `tuning.hero.maxPerClass` (2) heroes of each class alive; temples skip full classes                       | Done   |

## Scene

| Order | Item                                                                                                                                                                                                      | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 10    | MapScene graybox: ground, camera drag and pinch zoom, render a snapshot as shapes (stub sim until Sim 10)                                                                                                 | Done   |
| 20    | Build menu: tap a plot, pick a building, see cost; HUD with gold and run clock; 1x/2x/4x speed                                                                                                            | Done   |
| 30    | Bounty flag: tap the map or a monster, set gold, flag shows; heroes' interest shown as markers                                                                                                            | Done   |
| 35    | Plots from the snapshot (after Sim 35); delete `src/scenes/plots.ts` and the occupied check in MapScene                                                                                                   | Done   |
| 40    | Level-up pick: a party levels, the game pauses, 3 upgrade cards, tap one                                                                                                                                  | Done   |
| 45    | Party panel: tap a hero or party to see members, trait, level, XP bar, gold; small party badges over heroes                                                                                               | Done   |
| 50    | Unit view: manifest sprite or placeholder, mirror by direction, bob/squash/lunge/hit-flash tweens                                                                                                         | Done   |
| 55    | Hero interest markers on bounty flags (after Sim 40/60)                                                                                                                                                   | Done   |
| 60    | Speech bubbles from sim events; end screen (win/lose, run summary, play again)                                                                                                                            | Done   |
| 65    | Smoke run: `npm run smoke` (Playwright, phone viewport) builds a temple and market, runs 4x for 3 game minutes, saves screenshots and fails on console errors                                             | Done   |
| 70    | Motion system (decisions 2026-10-05): hop walk, windup + lunge, strike effect from manifest `strike` + weapon points, hurt flash, KO fall, footprint spacing; reference `docs/reference/motion-test.html` | Done   |
| 85    | Front picture only, mirrored; drop the `_back` lookup                                                                                                                                                     | Open   |
| 90    | Party colours: ring under each member, banner over the leader, stable colour per party                                                                                                                    | Open   |
| 95    | Monster tiers by colour (hue shift + size), skin variants `-v2`/`-v3` per unit id, small scale jitter                                                                                                     | Open   |

## Art

| Order | Item                                                                                                    | Status |
| ----- | ------------------------------------------------------------------------------------------------------- | ------ |
| 10    | Pipeline: `scripts/art/` key-out (green and magenta), trim, downscale, `validate:art`, manifest tooling | Done   |
| 20    | Art-wake draft PR (`art-wake` branch, `art-wake/TRACKS.md`); check `art-tasks/README.md` end to end     | Done   |
| 30    | Style test B1: Warrior t1 front and back, draugr t1 front, town hall t1. Stefan approves before batches | Done   |
| 40    | After approval: tier-1 batches for heroes, monsters, buildings (art requests 10-30)                     | Doing  |
| 50    | Tier-2 and tier-3 batches                                                                               | Open   |
| 60    | Front only (drop `_back` items); monster variants `-v2`/`-v3` as edits of the base picture              | Open   |
| 70    | Track `ui`: U1 logo + app icon (3 options for Stefan), then U2 UI kit (panel, buttons, icons)           | Open   |
