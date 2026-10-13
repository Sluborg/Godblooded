# Backlog

Lead owns this file. Rows per role, ordered 10, 20, 30 (insert between). Status: Open, Doing,
Review (PR open), Done. A worker takes its top Open row.

## Lead

| Order | Item                                                                                                       | Status |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------ |
| 10    | Spawn Sim, Scene and Art sessions (`docs/prompts/`), check they registered in sessions.md                  | Done   |
| 20    | Agree the first `src/sim/api.ts` shape with Sim and Scene (inboxes), record in decisions                   | Done   |
| 30    | First `src/data/` rows for the graybox: 2 classes, 2 monsters, 4 buildings, 3 upgrades                     | Done   |
| 35    | Balance pass on GRAYBOX with `npm run sim`: median run 15-18 min, win rate 55-75%, knockouts every run     | Done   |
| 40    | Review and merge M1 PRs; when M1 runs end to end, ask Stefan "is it fun to watch?"                         | Doing  |
| 50    | Gods and paths data: 12 GODS rows, 24 path rows, templates; balance pass (after Sim 110)                   | Done   |
| 60    | Building tier data (costs, effects per tier) after Sim 130; lair growth tuning after Sim 120; balance pass | Open   |
| 70    | Map pool data after Sim 150: lair rows per monster, boss lair, pantheon lean; balance pass                 | Open   |

## Sim

| Order | Item                                                                                                                                                         | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 10    | `api.ts` + world: `createWorld(seed, data)`, `step(world, dtMs)`, `snapshot()`, `command()`; tick loop                                                       | Done   |
| 20    | Units move on the map (simple steering, no pathfinding yet); lairs spawn monsters on a timer                                                                 | Done   |
| 30    | Lean real-time combat from the Coda reference math (simplify if needed, log it in decisions)                                                                 | Done   |
| 35    | Build plots in the sim: `GameData.plots`, `build` takes a plot, refuses occupied plots; snapshot lists plots                                                 | Done   |
| 40    | Heroes: arrive at temples, explore, fight, return to heal and shop (gold flows to the town by tax)                                                           | Done   |
| 45    | Move hero tuning (recruit timer, flee, rest, shop, tax, revive) from `heroes.ts` into `GameData.tuning`; Lead fills the row                                  | Done   |
| 50    | Parties: form by traits and bonds, move and fight together, share XP; party level up offers 3 upgrades                                                       | Done   |
| 60    | Bounty flags: heroes weigh bounty vs danger by trait; win (last lair) and lose (town hall) conditions                                                        | Done   |
| 70    | Headless balance sim (`npm run sim`): 100 seeded runs, report run length, win rate, deaths                                                                   | Done   |
| 80    | Hero cap: at most `tuning.hero.maxPerClass` (2) heroes of each class alive; temples skip full classes                                                        | Done   |
| 110   | Gods and paths (decision 2026-10-13): `GodDef`, path by god with a template, recruit a god's child, cap 2 per god on different paths                         | Done   |
| 120   | Lair growth: lairs tier up over the run (spawn faster, tier 2/3 monsters), tuning in `GameData`                                                              | Review |
| 130   | Building tiers: `upgrade` command, cost per tier, tier effects (temple recruit rate and cap, market stock, tower range and damage)                           | Open   |
| 140   | Run stats for the end screen: per hero kills, gold earned, knockouts, MVP; per run lairs cleared, gold over time                                             | Open   |
| 150   | Seeded map per run: lair layout from a pool (all 6 monster types), 4-6 lairs, a pantheon lean per run, a boss lair (wyrm) as the win goal; map rules as data | Open   |
| 160   | Save and load a run: versioned save of the world, migration hook, autosave every 30 s; `loadWorld` for Scene Continue                                        | Open   |
| 170   | Rivalries: bonds below a threshold make rivals; `argue` events; rivals refuse one party; a vengeful hero hunts what knocked out a friend                     | Open   |

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
| 85    | Front picture only, mirrored; drop the `_back` lookup                                                                                                                                                     | Done   |
| 90    | Party colours: ring under each member, banner over the leader, stable colour per party                                                                                                                    | Done   |
| 95    | Monster tiers by colour (hue shift + size), skin variants `-v2`/`-v3` per unit id, small scale jitter                                                                                                     | Done   |
| 100   | Gods and paths in the UI (after Sim 110): hero names "Thor-born" / path name, no class words; path cards show the god's two paths; art lookup path, god, template, placeholder                            | Doing  |
| 110   | Title screen (logo placeholder, Play, Continue if a run exists, Settings) and pause menu (resume, restart, quit); Settings: default speed, reduced motion, party-colour palette                           | Done   |
| 120   | Watch camera: auto-follow the most interesting fight (toggle on the HUD, any drag cancels it); tap a hero or party to follow it                                                                           | Open   |
| 130   | Event feed: short toasts from sim events (lair cleared, hero knocked out, party level up, raid on town, tier-up), tap a toast to jump there                                                               | Open   |
| 140   | Hero roster: side panel listing all heroes and parties (level, hp, gold, state), tap to focus and follow                                                                                                  | Open   |
| 150   | Phone polish: safe-area insets, touch target audit (>= MIN_TOUCH), loading screen with asset progress, PWA install prompt                                                                                 | Open   |
| 160   | Juice: damage numbers, screen shake on stomp and boss hits, gold pop on tax, building placement dust                                                                                                      | Open   |
| 170   | Building panel (after Sim 130): tap a building for info, tier, upgrade button and cost                                                                                                                    | Open   |
| 180   | End screen v2 (after Sim 140): MVP hero, per-hero stats, gold-over-time sparkline                                                                                                                         | Open   |
| 190   | Continue after reload (after Sim 160): title Continue loads the autosave; tower shot effect (Sim 130 hit events from buildings)                                                                           | Open   |
| 200   | Splash and menu look: splash scene (key art, logo reveal, loading bar), menu buttons and panels from the UI kit (9-slice, pressed state) with the current code-drawn style as fallback                    | Open   |

## Art

| Order | Item                                                                                                                                                                                                                   | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 10    | Pipeline: `scripts/art/` key-out (green and magenta), trim, downscale, `validate:art`, manifest tooling                                                                                                                | Done   |
| 20    | Art-wake draft PR (`art-wake` branch, `art-wake/TRACKS.md`); check `art-tasks/README.md` end to end                                                                                                                    | Done   |
| 30    | Style test B1: Warrior t1 front and back, draugr t1 front, town hall t1. Stefan approves before batches                                                                                                                | Done   |
| 40    | After approval: tier-1 batches for heroes, monsters, buildings (art requests 10-30)                                                                                                                                    | Doing  |
| 50    | Tier-2 and tier-3 batches                                                                                                                                                                                              | Open   |
| 60    | Front only (drop `_back` items); monster variants `-v2`/`-v3` as edits of the base picture                                                                                                                             | Open   |
| 70    | Track `ui`: U1 logo + app icon (3 options for Stefan), then U2 UI kit (panel, buttons, icons)                                                                                                                          | Open   |
| 80    | Heroes by god: rewrite A1 to 4 Aesir god tier-1 + 8 Aesir path tier-2; ids and asset-spec per 2026-10-13                                                                                                               | Done   |
| 90    | Queue buildings tier 2 batch (all 8) and Greek + Egyptian temple tier 1, for Sim 130 and M3                                                                                                                            | Done   |
| 100   | Track `ui`: U2 UI kit now, not waiting on the logo pick: 9-slice panel, buttons (normal, pressed, disabled), icon set (gold, speed, menu, bounty, upgrade, pause), in a bronze-and-iron look that fits any logo option | Open   |
| 110   | Track `ui`: U3 splash key art: a wide 16:9 painting of Godbloods of three pantheons facing a monster horde at dusk, no text (the logo goes on top in code)                                                             | Open   |

## Design

| Order | Item                                                                                                         | Status |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------ |
| 10    | `docs/systems/combat.md`: damage, armour, dodge, crits, damage types, KO and death, boss rules               | Open   |
| 20    | `docs/systems/paths-and-skills.md`: a signature skill per path (24) with a tier 3 upgrade, a passive per god | Open   |
| 30    | `docs/systems/items-and-shops.md`: weapons, armour, potions, charms, item tiers by building tier             | Open   |
| 40    | `docs/systems/progression.md`: hero and party levels, upgrade card pool, lair and monster tiers, run curve   | Open   |
| 50    | `docs/systems/meta.md`: what persists between runs, options A/B/C with a recommendation                      | Open   |
