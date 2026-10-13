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
  3 different upgrades (superseded 2026-10-13: parties pick their own card); tiers at party
  levels 3 and 6. Lead keeps 9 graybox upgrade cards.
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
- 2026-10-05: Stefan on art and heroes:
  - **Front view only**, mirrored; back views are dropped (they barely differed anyway).
  - **Heroes:** at most two of each class; at tier-up a hero takes a favor path (a god's
    patronage) with its own art, one hero per path. Path list: draft in `docs/game-design.md`.
  - **Party colours:** a ring under each member and a banner over the leader.
  - **Monster tiers by colour** (Rage of Mages style) plus size, in code on one picture; common
    monsters get 2-3 variants made as edits of the base picture (same pose, new head or weapon),
    ids `<type>-v2`, `<type>-v3`.
  - **UI:** a button and panel kit plus a logo and app icon (new ChatGPT track `ui`).
- 2026-10-05: Five graybox classes (PR #63: wizard, paladin, rogue added) and the class cap of two
  (Sim PR #62). Sim bot: 60% wins, median run 15.1 min.
- 2026-10-05: Heroes structure (Stefan): six classes (two strength, two dexterity, two casters;
  the sixth is the Healer), one favor path per class per pantheon. Aesir paths: Thor (warrior),
  Tyr (paladin), Heimdall (ranger), Loki (rogue), Odin (wizard), Freyja (healer). Table in
  `docs/game-design.md`, "Favor paths".
- 2026-10-05: Healer class (Sim #67, data #70) and the six Aesir favor paths (Sim #69, data #72,
  +1/+2 bonuses). Balance pass 3: 7 heroes per temple every 22 s, troll den 27000 hp. Sim bot,
  200 runs: 62-65% wins, median run about 15 min.

## 2026-10-08 | Safety net: backoff instead of 2-hour Routines

- Stefan: the 2-hourly checks run too long. All four Godblooded safety-net Routines (Lead, Sim,
  Scene, Art) are disabled, not deleted.
- Lead checks after activity at 1 h, 2 h, 4 h with one-shot `send_later`, then stops.
- Stefan talks to Lead; Lead wakes Art (or another session) when there is work.

## 2026-10-13 | Godbloods: gods and paths replace classes

- Stefan: no classes in the game. A hero is the child of a god; each god has two paths taken at
  tier-up. 4 gods per pantheon: Aesir Odin, Thor, Loki, Freyja; Greek Athena, Ares, Apollo,
  Poseidon; Egyptian Horus, Anubis, Sekhmet, Isis. Table in `docs/game-design.md`.
- The six class rows stay in code as hidden templates (stats, weapon, strike). Players never
  see them.
- Cap: at most two children of the same god, on different paths (replaces two per class).
- Art: `hero_<god>_t1_front`, `hero_<god>-<path>_t<2|3>_front`; 5 pictures per god. The shipped
  class pictures stay as template fallbacks until god art lands.
- Superseded: "Heroes structure: six classes and the Aesir paths" (2026-10-05).

## 2026-10-13 Level-ups pick themselves; the player picks paths

Stefan: party level-ups choose their upgrade card on their own (personality-weighted, no pause,
celebrated on the map). The player still chooses each hero's path. A tuning flag keeps player
card choice possible later. Also today: bark tempo 5 s real time globally, 30 s per hero, max 2
on screen; art style test toward cartoony units built from parts (S5 batch, code prototype).

## 2026-10-13 Stefan's answers to the spec OPEN questions

- Knockout costs 25% of carried gold. Permadeath: a knockout by a boss or in a tier 3 lair can
  kill (chance per `combat.md`), with a grave marker.
- Summons stay (decoy, falcon, thralls).
- Meta: a currency earned per run buys permanent upgrades (option B in `meta.md`).
- Miracles: the gods act on their own (no tap-to-cast lever).
- Bosses: all six (Fafnir, Hydra, Apep, Jormungandr, Cerberus, Sphinx), two per pantheon.
- Town hall tiers gate building tiers. Ruins stay and rebuild at half cost. Hearth Hall is added.
- Harpies steal gold. Elites from lair tier 2. Late recruits join parties below level 3. Level
  cap 8.
- Tutorial: plain hints, no Skald narrator.
- Music: Stefan makes it himself with an AI tool from prompts we prepare.
- Every other OPEN question in `docs/systems/` takes the spec's recommendation.

## 2026-10-13 Level-up details

The party's card is a seeded draw weighted by personality: the leader trait's card counts x3
(Design's rule in `level-ups.md`, not first-match). The path tray slows the run to 30% instead of
freezing it.

## 2026-10-13 Art style: cartoon units from parts, painterly details

Stefan approved the style test (`docs/reference/style-test.html`): cartoony units built from parts
and animated in code, flat shapes and thick outlines with painterly details (soft shading, rim
light, texture), crisp at device resolution. Paths are a natural evolution of the god's tier 1
child: same face, hair, palette and silhouette, plus gear and effects; tier 3 is more of the
same. Scene renders units from code parts (baked to an atlas); ChatGPT pictures in the same
style replace them when they exist.
