# Backlog

Lead owns this file. Rows per role, ordered 10, 20, 30 (insert between). Status: Open, Doing,
Review (PR open), Done. A worker takes its top Open row.

## Lead

| Order | Item                                                                                                                                                      | Status  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 10    | Spawn Sim, Scene and Art sessions (`docs/prompts/`), check they registered in sessions.md                                                                 | Done    |
| 20    | Agree the first `src/sim/api.ts` shape with Sim and Scene (inboxes), record in decisions                                                                  | Done    |
| 30    | First `src/data/` rows for the graybox: 2 classes, 2 monsters, 4 buildings, 3 upgrades                                                                    | Done    |
| 35    | Balance pass on GRAYBOX with `npm run sim`: median run 15-18 min, win rate 55-75%, knockouts every run                                                    | Done    |
| 40    | Review and merge M1 PRs; when M1 runs end to end, ask Stefan "is it fun to watch?"                                                                        | Doing   |
| 50    | Gods and paths data: 12 GODS rows, 24 path rows, templates; balance pass (after Sim 110)                                                                  | Done    |
| 60    | Building tier data (costs, effects per tier) after Sim 130; lair growth tuning after Sim 120; balance pass                                                | Open    |
| 70    | Map pool data after Sim 150: lair rows per monster, boss lair, pantheon lean; balance pass                                                                | Done    |
| 80    | Combat data: armour, `spellMult`, damage types, monster type rows (after Sim 190-200); balance pass                                                       | Doing   |
| 90    | Aesir skills (8) and passives (4) as data after Sim 240-260; balance pass with skills on                                                                  | Open    |
| 100   | Data: item rows, kits on templates, smithy row (after Sim 280); balance pass with items                                                                   | Open    |
| 110   | Data: the 30 upgrade cards, lair clock and elite tuning (after Sim 320-350); balance pass against the five beats                                          | Open    |
| 120   | Data: 8 omens (after Sim 390); 3 miracles once Stefan picks tap-to-cast or auto                                                                           | Open    |
| 130   | Data: building rows and tuning from `docs/systems/buildings.md`, 12 plots (after Stefan answers buildings OPEN)                                           | Blocked |
| 140   | Data: scarab swarm, Hydra, Apep and their lairs when their art lands; balance pass per lean pantheon (within 10 points)                                   | Blocked |
| 150   | Meta: record Stefan's A/B/C pick in decisions, turn `docs/systems/meta.md` into rows                                                                      | Blocked |
| 160   | Assign Balance: caster paths give Int only (not Str+Int) per the decisions; card `pickTag`/`god` rows                                                     | Open    |
| 170   | M2 critical path per `docs/systems/m2-plan.md`: data, raids and monsters, intent, visuals, hints, sound, art, run stats and balance, then Stefan playtest | Doing   |

## Sim

| Order | Item                                                                                                                                                               | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 10    | `api.ts` + world: `createWorld(seed, data)`, `step(world, dtMs)`, `snapshot()`, `command()`; tick loop                                                             | Done   |
| 20    | Units move on the map (simple steering, no pathfinding yet); lairs spawn monsters on a timer                                                                       | Done   |
| 30    | Lean real-time combat from the Coda reference math (simplify if needed, log it in decisions)                                                                       | Done   |
| 35    | Build plots in the sim: `GameData.plots`, `build` takes a plot, refuses occupied plots; snapshot lists plots                                                       | Done   |
| 40    | Heroes: arrive at temples, explore, fight, return to heal and shop (gold flows to the town by tax)                                                                 | Done   |
| 45    | Move hero tuning (recruit timer, flee, rest, shop, tax, revive) from `heroes.ts` into `GameData.tuning`; Lead fills the row                                        | Done   |
| 50    | Parties: form by traits and bonds, move and fight together, share XP; party level up offers 3 upgrades                                                             | Done   |
| 60    | Bounty flags: heroes weigh bounty vs danger by trait; win (last lair) and lose (town hall) conditions                                                              | Done   |
| 70    | Headless balance sim (`npm run sim`): 100 seeded runs, report run length, win rate, deaths                                                                         | Done   |
| 80    | Hero cap: at most `tuning.hero.maxPerClass` (2) heroes of each class alive; temples skip full classes                                                              | Done   |
| 110   | Gods and paths (decision 2026-10-13): `GodDef`, path by god with a template, recruit a god's child, cap 2 per god on different paths                               | Done   |
| 120   | Lair growth: lairs tier up over the run (spawn faster, tier 2/3 monsters), tuning in `GameData`                                                                    | Done   |
| 130   | Building tiers: `upgrade` command, cost per tier, tier effects (temple recruit rate and cap, market stock, tower range and damage)                                 | Done   |
| 140   | Run stats for the end screen: per hero kills, gold earned, knockouts, MVP; per run lairs cleared, gold over time                                                   | Done   |
| 150   | Seeded map per run: lair layout from a pool (all 6 monster types), 4-6 lairs, a pantheon lean per run, a boss lair (wyrm) as the win goal; map rules as data       | Done   |
| 160   | Save and load a run: versioned save of the world, migration hook, autosave every 30 s; `loadWorld` for Scene Continue                                              | Done   |
| 170   | Rivalries: bonds below a threshold make rivals; `argue` events; rivals refuse one party; a vengeful hero hunts what knocked out a friend                           | Done   |
| 175   | Raids: only `tuning.town.raidLairs` random non-boss lairs raid; the boss lair never raids                                                                          | Done   |
| 180   | Combat: strike pipeline in one function (dodge, power, crit, type, mitigation, round, rider, down), new curves and K in `tuning.combat` (`docs/systems/combat.md`) | Done   |
| 190   | Combat: armour on templates and monsters, magic resist from Wp, `spellMult`                                                                                        | Done   |
| 200   | Combat: damage types on god/path/monster rows, monster type multipliers; `hit` carries `type`, `crit`, `weak`/`resist`                                             | Done   |
| 210   | Combat: first strike on engage; riders (burn, chill, arc, wither, sear) as data, applied only when a strike carries one                                            | Done   |
| 220   | Combat: boss unit (emerge, cleave, enrage, immunities); the boss lair cannot fall while the boss lives                                                             | Done   |
| 230   | Combat: knockout costs 25% carried gold; permadeath by a boss or in a tier 3 lair, graves (#183)                                                                   | Done   |
| 240   | Skills: engine (SkillDef, cooldowns, 6 triggers, 5 shapes, `cast`/`skill` events, trait nudge) (`docs/systems/paths-and-skills.md`)                                | Done   |
| 250   | Skills: effects part 1 (damage, heal, shield, buff, stagger, mark, dash, taunt; chain)                                                                             | Done   |
| 260   | Skills: god passives (12) as data on GodDef                                                                                                                        | Done   |
| 270   | Skills: summons (decoy, falcon, thrall) and effects part 2 (knockback, bind, revive, execute) (waits on Stefan, skills OPEN 2-3)                                   | Done   |
| 280   | Items: ItemDef, hero slots, weapon power and armour by kit into the strike pipeline (`docs/systems/items-and-shops.md`)                                            | Done   |
| 290   | Shopping: smithy then market, budget by trait, buy order, tax per item, `shopped` event with item id                                                               | Done   |
| 300   | Potions: drink rule, coward and berserker offsets                                                                                                                  | Done   |
| 310   | Charms and the lair relic (waits on Stefan, items OPEN)                                                                                                            | Done   |
| 320   | Card offers: families, rarity by level, needs, fitted rule, stacking, level cap from tuning (`docs/systems/progression.md`)                                        | Done   |
| 330   | New card effects (combat and skill keys in progression.md)                                                                                                         | Review |
| 340   | Lair clock: staggered first tier-up and new mults; pressure tier-up behind a tuning flag (off until Stefan answers)                                                | Done   |
| 350   | Elites, late recruits (waits on Stefan, progression OPEN)                                                                                                          | Review |
| 360   | Monster roles: harrier, charger, pack, swarm (`docs/systems/monsters-and-bosses.md`)                                                                               | Done   |
| 370   | Quirks: regen with fire stop, grave-cold, scavenger; snatch gold waits on Stefan                                                                                   | Done   |
| 380   | Raids: warning event, raid after lair tier-up, raid shapes by role, town cheer gold (`docs/systems/events.md`)                                                     | Done   |
| 390   | Omens: clock and deck, OmenDef rows, effects as tuning overrides, spawns, free bounty                                                                              | Review |
| 400   | Gods act on their own: favour bars per pantheon, automatic miracle in the most-hurt fight, `miracle` event (`events.md`)                                           | Done   |
| 410   | Build and upgrade time (5 s) and repair (`docs/systems/buildings.md`); ruins, town hall gating and Hearth Hall wait on Stefan                                      | Review |
| 420   | Shrine tier values and tower warning by tier                                                                                                                       | Review |
| 430   | Monster skills through the skill engine (`owner: monster`), after 240                                                                                              | Review |
| 440   | Boss moves (breath, heads, swallow), boss by lean pantheon (waits on Stefan, boss picks)                                                                           | Done   |
| 450   | Run stats: gear levels, items bought, tax by shop; curve beats (first party, first tier 2, first lair fall, first tier 3)                                          | Review |
| 460   | Bosses by pantheon: `bossesByPantheon` (2 each), seeded pick, no repeat via meta `lastBoss`; moves for the 5 new bosses                                            | Review |
| 470   | Late recruits: parties below level 3 take new heroes; `hallJoinBelowLevel` with the Hearth Hall                                                                    | Review |
| 480   | Meta: Essence per run and the Altar upgrades (`meta.md`), meta save                                                                                                | Review |
| 490   | Hero AI (M2, `docs/systems/hero-ai.md` Sim rows 10-60): intent event, score-and-commit choices with distance, trait behaviours, party retreat, discovery state     | Done   |

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
| 100   | Gods and paths in the UI (after Sim 110): hero names "Thor-born" / path name, no class words; path cards show the god's two paths; art lookup path, god, template, placeholder                            | Done   |
| 110   | Title screen (logo placeholder, Play, Continue if a run exists, Settings) and pause menu (resume, restart, quit); Settings: default speed, reduced motion, party-colour palette                           | Done   |
| 120   | Watch camera: auto-follow the most interesting fight (toggle on the HUD, any drag cancels it); tap a hero or party to follow it                                                                           | Done   |
| 130   | Event feed: short toasts from sim events (lair cleared, hero knocked out, party level up, raid on town, tier-up), tap a toast to jump there                                                               | Review |
| 140   | Hero roster: side panel listing all heroes and parties (level, hp, gold, state), tap to focus and follow                                                                                                  | Review |
| 150   | Phone polish: safe-area insets, touch target audit (>= MIN_TOUCH), loading screen with asset progress, PWA install prompt                                                                                 | Review |
| 160   | Juice: damage numbers, screen shake on stomp and boss hits, gold pop on tax, building placement dust                                                                                                      | Review |
| 170   | Building panel (after Sim 130): tap a building for info, tier, upgrade button and cost                                                                                                                    | Done   |
| 180   | End screen v2 (after Sim 140): MVP hero, per-hero stats, gold-over-time sparkline                                                                                                                         | Review |
| 190   | Continue after reload (after Sim 160): answer `autosave` events with `saveWorld`, title Continue loads it (`loadWorld`, drop it on `SaveError`)                                                           | Open   |
| 200   | Splash and menu look: splash scene (key art, logo reveal, loading bar), menu buttons and panels from the UI kit (9-slice, pressed state) with the current code-drawn style as fallback                    | Done   |
| 210   | Combat feedback: floating numbers by type colour, crit and weak styles, "miss" with a hop (cap 6); caster bolt colour by type; rider tint and head icon                                                   | Open   |
| 220   | Boss: cleave ground marker during windup, enrage tint, boss hp bar at the top; slain hero grave marker                                                                                                    | Open   |
| 230   | Skills: cast windup glow and the 10 skill visuals in code, coloured by damage type; status display (shield, mark, buff ring); skill name bubble 1 cast in 4                                               | Open   |
| 240   | Party XP bar under the banner; level-up celebration on the map (#184)                                                                                                                                     | Review |
| 250   | Gear on the map: weapon shimmer, armour outline colour, potion pips; shopping feedback (tax coin, item icon, drink swirl) (after Sim 280-300)                                                             | Open   |
| 260   | Shop card on tap: tier, what it sells, what the next tier unlocks; locked plots with a lock                                                                                                               | Open   |
| 270   | Role motion: harpy dart, minotaur paw and charge, pack clumping, swarm spill (after Sim 360)                                                                                                              | Open   |
| 280   | Raid warning arrow and horn; omen banner, sky tint, map marker, top icon (after Sim 380-390)                                                                                                              | Open   |
| 290   | Building damage: scaffold, smoke and fire by hp (ruins wait on Stefan)                                                                                                                                    | Open   |
| 300   | Elite look and lair tier-up shake; quirk effects (regen sparkle, snatched coin)                                                                                                                           | Open   |
| 310   | Hero card on tap; boss telegraphs for the new bosses; favour bars and miracle visuals (automatic)                                                                                                         | Open   |
| 320   | Hero AI visuals (M2, `hero-ai.md` Scene rows 10-30): party intent icon, trait tells, retreat horn                                                                                                         | Open   |
| 330   | M2 visuals per `docs/systems/m2-plan.md`: skill and gear visuals, flag raise/cancel, first-time hints, effect sounds                                                                                      | Open   |

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
| 100   | Track `ui`: U2 UI kit now, not waiting on the logo pick: 9-slice panel, buttons (normal, pressed, disabled), icon set (gold, speed, menu, bounty, upgrade, pause), in a bronze-and-iron look that fits any logo option | Doing  |
| 110   | Track `ui`: U3 splash key art: a wide 16:9 painting of Godbloods of three pantheons facing a monster horde at dusk, no text (the logo goes on top in code)                                                             | Doing  |
| 120   | Rider icons (flame, snowflake, spark, skull, sun) in the U2 style; grave markers per pantheon (rune stone, stele, ankh slab)                                                                                           | Done   |
| 130   | Status signs in the U2 style (raven mark, bind chains, shield rune); falcon summon `sum_falcon_t1_front` (if summons stay)                                                                                             | Done   |
| 140   | Item icons in the U2 style: sword, focus, armour, potion, greater potion, 6 charms                                                                                                                                     | Done   |
| 150   | Card frames (iron, bronze, gold), 5 card family icons, 3 pantheon sigils                                                                                                                                               | Done   |
| 160   | 8 omen icons; merchant caravan (cart and mule, facing right)                                                                                                                                                           | Done   |
| 170   | `bld_ruin` (generic rubble, tinted in code), `bld_scaffold` overlay                                                                                                                                                    | Done   |
| 180   | Bosses Hydra, Apep, Jormungandr, Cerberus, Sphinx and their lairs; scarab swarm; Hearth Hall t1-t3 (after the style decision)                                                                                          | Open   |

## Design

| Order | Item                                                                                                                                    | Status  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 10    | `docs/systems/combat.md`: damage, armour, dodge, crits, damage types, KO and death, boss rules                                          | Done    |
| 20    | `docs/systems/paths-and-skills.md`: a signature skill per path (24) with a tier 3 upgrade, a passive per god                            | Done    |
| 30    | `docs/systems/items-and-shops.md`: weapons, armour, potions, charms, item tiers by building tier                                        | Done    |
| 40    | `docs/systems/progression.md`: hero and party levels, upgrade card pool, lair and monster tiers, run curve                              | Done    |
| 50    | `docs/systems/meta.md`: what persists between runs, options A/B/C with a recommendation                                                 | Done    |
| 60    | `docs/systems/monsters-and-bosses.md`, `events.md`, `buildings.md`                                                                      | Done    |
| 70    | `docs/systems/ui-flows.md`: every screen and panel, navigation map, HUD layout at 1280x720, thumb zones, what each tap does             | Done    |
| 80    | `docs/systems/onboarding.md`: first run teaching without commanding heroes, tooltip moments, the first 3 minutes beat by beat           | Done    |
| 90    | `docs/systems/audio.md`: music per pantheon and state, SFX list by event, sourcing and license per the manifest rule                    | Done    |
| 100   | `docs/systems/content-roadmap.md`: which gods, monsters, buildings, cards land in M2, M3, M4; what M2 needs to be fun                   | Done    |
| 110   | Fold Stefan's answers to the OPEN questions into the specs (when Lead relays them)                                                      | Blocked |
| 120   | `docs/systems/hint-texts.md`: the first-time hints as final English text (plain, no Skald), with triggers                               | Open    |
| 130   | `docs/systems/hero-ai.md`: how a Godblood decides today (audit of `src/sim`) and proposals for readable intent and visible personality  | Open    |
| 140   | `docs/systems/aesir-content.md`: M2 content sheet (4 gods, 8 paths, skills, passives, damage types, start numbers) ready for `src/data` | Open    |
