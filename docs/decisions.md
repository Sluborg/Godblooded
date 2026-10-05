# Decisions

Lead owns this file. One dated line per decision that changes how the game or the team works.

- 2026-10-04: Project started. Majesty-inspired kingdom builder with roguelite runs, Godblood
  lore (StefanCoda "Godblood Knowledge"). Phaser 3 + Vite + TS, landscape 1280x720, phone first.
- 2026-10-04: Text prototypes (Guild Ledger, Asset Report) judged not fun by Stefan: the player
  must see the heroes act. Hence graphics first, graybox before art.
- 2026-10-04: Every hero, monster and building has 3 tiers. Units have 2 painted views (front,
  back), left is mirrored. Party level-up = pick 1 of 3 upgrades; tier-ups at party levels 3, 6.
- 2026-10-04: Four Claude sessions (Lead, Sim, Scene, Art) and one ChatGPT chat per art track.
  Inboxes for talk, one-shot Routines for waking (`docs/collaboration.md`).
- 2026-10-04: Worker sessions cannot push to `main` (auto-mode blocks it as a deploy). Workers send
  inbox, sessions and art-tasks edits as docs-only PRs; Lead merges them in the same round.
- 2026-10-04: Worker messages go by `send_message` (instant wake plus content), not inbox edits:
  inbox appends in parallel PRs conflicted on every merge. Inboxes, backlog and sessions are
  Lead-only files; Lead keeps them current.
- 2026-10-04: First `src/sim/api.ts` (PR #4): `createWorld(seed, data)`, `step(world, dtMs)` with
  fixed 50 ms ticks (Scene passes frame time times game speed), `snapshot(world)` returns a plain
  copy and drains `events`, `command(world, cmd)` returns `{ok, id}` or `{ok:false, reason}`.
  Commands: `build`, `placeBounty`. Scene imports nothing else from `src/sim/`.
- 2026-10-04: Graybox derivations (Sim 20): move speed = 40 + dex * 8 world units/s, hp = sta * 8 +
  str * 4. Revisit in the M4 balance pass.
- 2026-10-04: Graybox combat (Sim 30): damage = str (min 1), attack time = weapon base / (1 + dex *
  0.1), dodge = 0.9 * dex / (dex + 10), aggro range = 150 + per * 15, monster leash 420 from the
  lair. No armor until gear exists. Heroes are knocked out, monsters die.
- 2026-10-04: Bounty amounts 25/50/100/200 for the graybox (Scene 30). A bounty on a monster is a
  spot for now; Sim 60 makes it follow the target.
- 2026-10-04: Workers message Lead only when their PR is green; Lead stops watching PR events.
  Lead messages Stefan only for tests, decisions and ChatGPT steps (less noise for Stefan).
- 2026-10-04: Graybox hero life (Sim 40): temples recruit every 15 s (first after 5 s, 4 alive
  per temple); heroes flee below 30% hp, rest 10% hp/s (shrine 3x), spend 60% of their gold at
  the market and the town taxes 50% of it; knocked out heroes revive at the town hall after 10 s
  at 25% hp; heroes keep monster bounties. These numbers move to `src/data/` (Sim 45).
- 2026-10-04: Graybox parties (Sim 50): every hero starts as a party of one with a random trait;
  level-1 parties merge on meeting (max 4); party level n needs 30n shared XP; bonds grow on
  shared kills and drop when a hero flees; a level up freezes the run until the player picks 1 of
  3 different upgrades; tiers at party levels 3 and 6. Lead keeps 9 graybox upgrade cards.
- 2026-10-04: Graybox siege and win/lose (Sim 60): heroes storm lairs within 350; a lair pays 60
  gold and 40 party XP; the run is won when the last lair falls and lost when the town hall
  (500 hp) falls; raids start at 4 min, every 2 min, 2 monsters per lair (+1 per 5 min) and
  march on the nearest building (200 hp). Bounty weighing by trait: greedy x1.5 gold, curious
  x1.2, brave fear x0.5, coward fear x2, proud ignores flags under 40 gold.
- 2026-10-04: First balance read (Sim 70 bot, 100 runs): 100% wins in 2.4 min, no knockouts.
  Far too easy; Lead balance pass (Lead 35) targets median 15-18 min, win rate 55-75%.
- 2026-10-04: Balance pass 1 (PR #32): lairs 3500/16000 hp, 6 alive each, spawn 10/25 s; 6 heroes per
  temple every 25 s; first raid at 6 min. Sim bot: 62% wins, median run 15.2 min, 17 knockouts.
- 2026-10-04: Art direction S1-c (Stefan): Majesty-like proportions (~4.5 heads), grim, painted.
  Replaces chibi. Side-view rig (R1) dropped: the rotated arm read as a twirl and the feet did
  not move. Next: frame-based walk and attack test in style c (S2) before any production batch.
- 2026-10-05: Animation system (Stefan, "looks ok"): frame animation dropped (S2 legs wobbled,
  ChatGPT frames drift). One still picture per unit per tier; all motion is shared code: hop
  walk, lean-back windup plus lunge, a strike effect per unit (overhead chop from the weapon,
  double chop for dual wielders, side sweep, upward, thrust, bolt, smash), hurt flash, knock-out
  fall. Each unit's data row adds: picture facing, weapon point(s), footprint radius, strike.
  Proof: https://claude.ai/artifact/Q4fbxESdGgQsstWkVTFvFg. Next: chunky proportions test (S4).
- 2026-10-05: Pose standard for every unit picture (Stefan): all art faces **right** (three-quarter
  view toward the lower right); the game mirrors it for left. The weapon's position in the picture
  is fixed by the unit's strike, so the strike always starts at the weapon:
  - overhead chop (axe, sword, mace): weapon raised high behind the back shoulder
  - double chop (two weapons): one weapon high behind the back shoulder, one low in front
  - side sweep (greatsword, polearm, scythe): weapon held level behind the hip
  - upward (claws, fists, low blades): weapon low in front of the body
  - thrust (spear, dagger, rapier): weapon level at chest height, tip pointing forward
  - smash (giants, hammers, clubs): weapon raised over the head
  - bolt (casters): staff head, orb or open hand raised in front at shoulder height
  - shot (bows): bow held in front at chest height
    Art measures each picture's feet anchor and weapon point(s) and ships them in the manifest.
- 2026-10-05: House style locked: **chunky** (batch S4), about 3.5 to 4 heads tall, oversized
  weapons, thick outline, gritty concept-sheet palette (`art-tasks/STYLE.md`). Casters hold the
  staff in the front hand. Back views: undecided, both kept for now.
- 2026-10-05: Windup (Sim PR #51): every strike announces itself `windupMs` (300, at most 40% of
  the attack cycle) before it lands, so Scene plays the full windup. Rebalance (PR #54): first
  raid at 6:40. Sim bot: 71% wins, median run 15.5 min.
