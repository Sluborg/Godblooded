# Backlog

Lead owns this file. Rows per role, ordered 10, 20, 30 (insert between). Status: Open, Doing,
Review (PR open), Done. A worker takes its top Open row.

## Lead

| Order | Item                                                                                      | Status |
| ----- | ----------------------------------------------------------------------------------------- | ------ |
| 10    | Spawn Sim, Scene and Art sessions (`docs/prompts/`), check they registered in sessions.md | Done   |
| 20    | Agree the first `src/sim/api.ts` shape with Sim and Scene (inboxes), record in decisions  | Done   |
| 30    | First `src/data/` rows for the graybox: 2 classes, 2 monsters, 4 buildings, 3 upgrades    | Done   |
| 40    | Review and merge M1 PRs; when M1 runs end to end, ask Stefan "is it fun to watch?"        | Open   |

## Sim

| Order | Item                                                                                                         | Status |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 10    | `api.ts` + world: `createWorld(seed, data)`, `step(world, dtMs)`, `snapshot()`, `command()`; tick loop       | Done   |
| 20    | Units move on the map (simple steering, no pathfinding yet); lairs spawn monsters on a timer                 | Done   |
| 30    | Lean real-time combat from the Coda reference math (simplify if needed, log it in decisions)                 | Done   |
| 35    | Build plots in the sim: `GameData.plots`, `build` takes a plot, refuses occupied plots; snapshot lists plots | Open   |
| 40    | Heroes: arrive at temples, explore, fight, return to heal and shop (gold flows to the town by tax)           | Open   |
| 50    | Parties: form by traits and bonds, move and fight together, share XP; party level up offers 3 upgrades       | Open   |
| 60    | Bounty flags: heroes weigh bounty vs danger by trait; win (last lair) and lose (town hall) conditions        | Open   |
| 70    | Headless balance sim (`npm run sim`): 100 seeded runs, report run length, win rate, deaths                   | Open   |

## Scene

| Order | Item                                                                                                      | Status |
| ----- | --------------------------------------------------------------------------------------------------------- | ------ |
| 10    | MapScene graybox: ground, camera drag and pinch zoom, render a snapshot as shapes (stub sim until Sim 10) | Done   |
| 20    | Build menu: tap a plot, pick a building, see cost; HUD with gold and run clock; 1x/2x/4x speed            | Done   |
| 30    | Bounty flag: tap the map or a monster, set gold, flag shows; heroes' interest shown as markers            | Review |
| 35    | Plots from the snapshot (after Sim 35); delete `src/scenes/plots.ts` and the occupied check in MapScene   | Open   |
| 40    | Level-up pick: a party levels, the game pauses, 3 upgrade cards, tap one                                  | Open   |
| 50    | Unit view: manifest sprite or placeholder, mirror by direction, bob/squash/lunge/hit-flash tweens         | Open   |
| 55    | Hero interest markers on bounty flags (after Sim 40/60)                                                   | Open   |
| 60    | Speech bubbles from sim events; end screen (win/lose, run summary, play again)                            | Open   |

## Art

| Order | Item                                                                                                    | Status |
| ----- | ------------------------------------------------------------------------------------------------------- | ------ |
| 10    | Pipeline: `scripts/art/` key-out (green and magenta), trim, downscale, `validate:art`, manifest tooling | Done   |
| 20    | Art-wake draft PR (`art-wake` branch, `art-wake/TRACKS.md`); check `art-tasks/README.md` end to end     | Done   |
| 30    | Style test B1: Warrior t1 front and back, draugr t1 front, town hall t1. Stefan approves before batches | Doing  |
| 40    | After approval: tier-1 batches for heroes, monsters, buildings (art requests 10-30)                     | Doing  |
| 50    | Tier-2 and tier-3 batches                                                                               | Open   |
