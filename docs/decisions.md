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

## 2026-10-13 No art orders before Stefan's taste test

Stefan: no ChatGPT art is ordered until he has said what he wants and likes. Every batch stays
Draft until the A/B taste test results are written into `art-tasks/STYLE.md` and Stefan has seen
the updated brief.

## 2026-10-14 Stefan's taste test (art direction)

Answers from `docs/reference` taste test (G1-G14): big-head cartoon proportions; thin
colour-matched outlines (not thick black ink); painterly shading; warm earthy, muted palette;
small units (a hall is about 5 heroes wide); plain grass ground with tufts; top-down 3/4 view;
smooth, weighty motion; big coloured damage numbers; subtle hit effects (no screen shake);
grim, scary monsters; wood-and-parchment UI frames; party ring and name label on heroes;
level-up as a pillar of light with a banner. This replaces earlier style notes where they
differ. Art writes it into `art-tasks/STYLE.md`; Scene into the parts renderer and UI; Stefan
sees the updated brief before any art is ordered.

Refinements (Stefan, 2026-10-14): colours only slightly muted, keeping most of their saturation.
Effects grow with the game: subtle early, stronger at tier 2, clearly effectful at tier 3 and
for bosses and late-run moments (still no screen shake).

## 2026-10-14 Altar: lean is chosen, buys are hold-to-buy

Stefan on the meta-ui OPEN (`docs/systems/meta-ui.md`): the player **chooses** the run's
pantheon lean at the Altar (not only shown as the Portent). Altar buys with Ichor use
**press and hold** (about 0.6 s), no popup. Meta stays M3.

## 2026-10-14 Meta currency is Ambrosia

Stefan: the meta currency is renamed from Ichor to **Ambrosia** (food of the gods). Earlier
entries that say Ichor mean Ambrosia. No code uses the name yet.

## 2026-10-14 UI panels keep dark parchment centres (Lead)

Scene's wood-and-parchment UI (#233) uses dark parchment panel centres so the existing light
text stays readable. Light parchment with dark ink is a later pass, revisited with Art's UI kit
(U8) and shown to Stefan.

## 2026-10-14 Look sheet answers (`docs/systems/look-sheet.md`)

Stefan: Fafnir is built from **code parts** (no art order). Hero name labels are **off** by
default; tapping a hero shows the names of everyone in that hero's party. Lair plates show the
**lair's name** (e.g. "Wolf Den").

## 2026-10-14 Build menu: tap for info, tap again to build

Stefan: in the build menu, the first tap on a building shows what it does (role, what it
sells or trains, cost, what its next tier unlocks); a second tap on the same building confirms
and builds. Tapping another building or outside the menu cancels. Nothing is built on a single
tap.

## 2026-10-14 Celestial nodes and gatherers (M3)

Stefan: every lair sits on a **celestial node**. Clearing the lair frees the node. The player
sends **gatherers** (town workers, not heroes) to collect **Ambrosia** from freed nodes.
Gatherers can be attacked on the way. The player can send weak **guards** with them, or post an
**escort bounty** (gold on the route, like a bounty flag) that a party may take; the player
never commands a party. Ambrosia from nodes is an **in-run** currency only (spent during the
run). Lands in **M3**, with the meta.

Follow-on (Lead, Stefan to veto): since Ambrosia is now in-run, the meta currency for the Altar
between runs is renamed **Essence** (Stefan's other suggestion).

## 2026-10-14 PRs are scarce: branches plus batch PRs

Stefan could not switch off the automatic Codex reviews, so every PR may spend his ChatGPT
quota. Workers stop opening PRs: they push branches (CI runs on branch pushes) and message
Review and Integrator. Integrator lands reviewed, green branches in one batch PR at a time,
a few a day. Rules in `CLAUDE.md` "Git".

## 2026-10-14 Nodes answers (`docs/systems/nodes.md`)

Stefan: first Ambrosia purchases are **Temple upgrade** (pay Ambrosia instead of gold for a
temple tier), **Offering** and **Recall the Fallen**. Leftover Ambrosia is **lost** at run end.
Freed nodes **can be re-corrupted** (raids or a new lair). The meta currency is **Essence**.
The other nodes OPENs take Design's recommendation: gatherers from the town hall, guards from
towers, Recall once per hero, escort paid on return, far nodes hold more.

## 2026-10-14 Small ownership and process fixes (Lead)

- Design's docs also go through batches (its session cannot push to `main`).
- `src/data/sfx.ts` (sound presets) belongs to **Scene**, like the look rows; Balance or Lead
  may suggest tuning by message.

## 2026-10-14 Gear fun gate redefined (Lead, Stefan may veto)

The M2 gear gate "average gear level 1+ at 8:00" is not reachable with data alone. It is now:
at least 80% of heroes alive at 8:00 (knocked-out ones count, slain ones do not) own a gear
piece (weapon or armour). Heroes buy their first gear piece before their first potion.

## 2026-10-14 Flag steering rules (Lead, Stefan judges in playtest run 2)

- A flag dropped on a monster becomes a hunt flag: it follows the monster and pays the hero who
  kills it.
- A party standing at a lair with no monster within 100 can drop its lair goal for a fresh flag;
  a party mid-fight never breaks off for a flag.
- Gold size is the steering dial: a 100-gold flag draws a party within 10 s in about 70% of
  cases, a 50-gold flag draws one more slowly. Replaces the old target (50-gold flag heads
  within 5 s). Rich flags may lure heroes into danger; that is the player's risk.
- The "Bounties steer" fun gate is judged by Stefan's feel in playtest run 2, then tuned.

## 2026-10-14 Town income: a tax collector (Majesty style), in M2

Stefan's first run earned no tax (no market built). Stefan picked a Majesty-style tax collector:
gold builds up in buildings (shop sales tax, plus a tithe heroes pay at their home temple or
guild when they rest), and a tax collector walks from the town hall to each building with gold,
collects it and carries it home. The collector can be attacked; gold it carries drops if it
falls. The town hall shows the gold arriving. Lands in M2 because income is core; Design writes
the short spec, Sim builds it, Scene draws the collector and coin pops, Balance sets the numbers.

## 2026-10-14 Playtest run 2: one art style, ground patches, collision (Stefan)

Stefan's notes from run 2: units stack on one spot and heroes hide under buildings; the game
gets laggy quickly; the mixed art styles look messy; the title image is grainy, its text does not
fit and its buttons are ugly; the flags do not fit; many heroes (the princess) look silly and
cartoony; the tax collector looks like an executioner; buildings look odd on their circles.

- **One art style:** the painted buildings (longhouse, watch tower) are the anchor. Heroes,
  monsters, flags, the collector, the title and UI are repainted to match: grim, mythic,
  Norse-carved, no cartoon faces. Art writes the style rules and the batches; each batch still
  needs Stefan's go before it is Ready.
- **No round plate under buildings:** a ground patch shaped to the footprint plus a soft cast
  shadow. A thin ring shows only when a building is tapped or being placed.
- **Collision:** units keep a minimum distance from each other and walk around building
  footprints; draw order by ground y so nobody hides under a roof.
- **Lag:** Scene profiles a long run on a phone-sized view and fixes the top costs.

## 2026-10-14 More to do in a run; first repaint batches go (Stefan)

Stefan's run 2 in the browser: "I could only place buildings, and 1 or two flags." Two built
features come on in the live game:

- **The player picks level-up cards:** `autoPick` off; when a party levels up, the player picks
  1 of 3 (LevelUpScene). Leader traits still pick if the offer times out.
- **Town hall tiers and ruins on:** upgrading the hall unlocks buildings; ruins on the map can be
  repaired at half cost.
- Balance re-checks the human bot band with both on (the bot picks cards as a player would).
- Art batches **G1** (Aesir heroes repainted) and **B13** (bounty flag as a carved banner pole,
  plus build plot) are Ready. G3, G4 and the rest stay Draft.

## 2026-10-14 Heroes stay animated parts, with painted pieces (Stefan)

"I still want the style we used on heroes now. Just with cooler pieces of art, no svg. I don't
want static heroes." Heroes keep the animated parts rig; each part becomes a painted piece in the
one style (art-tasks/STYLE.md), replacing the code-drawn shapes. G1 is reworked from four stills
into part sheets, test sheet first (Grim son of Odin), and goes back to Draft until then. Painted
stills are for portraits and UI only. B13 stays Ready.

## 2026-10-14 Hero look approved; heroes are built from a painted parts kit (Stefan)

Stefan approved the ChatGPT test of Grim son of Odin (docs/playtest/hero-look-approved-grim.jpg:
hooded, bearded, weathered cloak with raven feathers, carved staff) as the hero look: "This."
Heroes are made like the cartoon parts were, as a kit: a few interchangeable painted heads, a
few bodies, legs, cloaks, weapons and off-hands, combined per hero and animated by the rig. Art
writes the kit batch (part list, grid, pivots agreed with Scene); Scene combines and animates.

## 2026-10-14 Items have an icon and a worn part; bodies come in builds (Stefan)

Stefan: the parts kit also serves gear. Each item found for the inventory has two pictures: a
still icon (inventory, loot, shop) and a worn part that fits the hero rig in its slot (weapon,
off-hand, head, torso, cloak, legs). Bodies come in a few builds (lean, broad, tall, short) so
heroes differ in shape, and every worn part fits every build through the rig's sockets. Stefan
suggested marking replaceable areas in magenta; magenta is the chroma key for every upload, so
Art and Scene pick the technical form (separate layers on sockets, or a second key colour).
Item rows in `src/data` name both ids; a missing worn part falls back to the base kit part.

## 2026-10-14 Headgear, weapons and hand gear are their own items (Stefan)

Answers to Design's hero-kit questions: headgear is its own item slot, not tied to the god or to
armour level ("Headgear should be its own thing"). Every weapon and every piece of hand gear is
its own item with its own painted worn piece and icon, not one piece per family with a level
glow ("I thought all weapons and hand gear would be own things"). Design updates hero-kit.md;
the M2 kit count grows accordingly, and Art batches it in priority order.

## 2026-10-14 G1 Ready as a test only: floating vs bent limbs (Stefan)

Stefan doubts bending limbs ("unsure it can be made to look good, prove it; floating hands and
legs worked fine"). G1 is Ready as one test sheet of Grim (art/g1-parts): hands and boots are
separate parts, so Scene renders the same art both ways (floating hands and feet, and bent IK
limbs) for Stefan to pick. The full kit stays Draft until he picks.

## 2026-10-14 Art quality gate; U1B logos void (Stefan)

Stefan rejected both U1B logos: "AI slop, not consistent and logical. Handles in front and behind
at the same time. I expect higher quality. This shouldn't even be brought before me." From now
on every image passes Art's QA checklist at full size before it reaches Lead or Stefan: each
object is in front or behind, never both; one light direction; believable grips and anatomy; no
melted or duplicated parts; matches STYLE.md; reads at target size. A failed image is redone
(up to three tries) or reported as a failure, never shown. Review spot-checks images on art
branches. U1B is Void; Art writes U1C, a simpler logo with an explicit stacking order, shown to
Stefan only after it passes QA. Lead also checks images before showing them.

## 2026-10-14 Reference set and art realism rules (Stefan's ratings)

Stefan rated 18 shipped pieces on the Art Verdicts page. Reference set (score 4-5, with Grim):
town hall t1, labyrinth lair, jackal-man, watch tower t1, Aesir temple t2, shrine, barrow lair
(should be grimmer: dead grass), jackal camp, troll. Rejected for redo (1-2): watch tower t2
(unrealistic), town hall t2 (odd extras on the back), Greek temple (too narrow, fewer front
pillars, room inside), Egyptian temple (reads as a gate, not a temple), market t2 (too busy,
impossible logs), smithy (unreal weapons). Middling (3): draugr, troll den (confusing wheel,
baked smoke), minotaur (hand positions). New QA rules: everything physically believable and
buildable, weapons usable and gripped like real hands, a building reads as its function, no
baked-in effects (smoke, sparks, glow are code), clear silhouette over busy props. Redo
batches are drafted by Art and need Stefan's go each.

## 2026-10-14 Look picks: shadows, lairs, Fafnir, camera (Stefan)

- **Shadows:** a long low-sun cast shadow to one side for buildings, lairs and units, one light
  direction matching the painted art.
- **Lairs:** dead dark ground around each lair, a skull pike, glowing embers and a faint red
  light, so a lair never reads as a town building.
- **Fafnir:** a painted parts kit from ChatGPT in the one style, animated in code like the
  heroes, QA-checked first; the code Fafnir stays as fallback until then.
- **Camera:** start closer so the art reads on a phone; drag to pan, pinch out to see the whole
  map.
- Gold feedback (coin pops) stays as built with the tax collector.

## 2026-10-14 God cards beat stat cards; redo batches go (Stefan)

- "God cards should be better than stat cards": each pantheon card is clearly stronger than the
  best stat card of its rarity, so the god's card is the signature pick. Balance sets the band
  around it.
- Go for the redo batches B19, B20, B21, B22, B23 and V2, plus a grimmer barrow (dead grass,
  spookier). B18 is Void: town hall t1 stays (rated 5, a reference). All pass Art's QA before
  they reach the Art Verdicts page.

## 2026-10-14 Tax collector redo: G3 go (Stefan)

"We really need to fix the tax collector." G3 is Ready, the tax reeve first: a painted parts kit
on the G1 contract so he walks animated, a sober town official with ledger and coin chest or
sack, no hood, no axe, nothing red, plus a portrait. Gatherer and guard follow. Scene draws an
interim collector with the hero rig at hero proportions until the kit lands.

## 2026-10-14 Go for all Draft art batches (Stefan)

"Go with all": every Draft art batch is Ready (U8 UI kit, G4 ground patches, G5 title art, U1C
logo, U5-U7 icons and frames, the rest of G3). G2 (paths t2, rewritten as kit parts) and the
Fafnir kit follow once the G1 Grim kit test passes QA and Stefan has seen it animated. Every
image still passes Art's QA before it reaches the Art Verdicts page.

## 2026-10-15 Fill the full phone width (Stefan)

Wide phones (about 20:9) showed dark side bars with Scale.FIT 1280x720. Stefan chose to fill the
screen: the design height stays 720, the width grows with the screen's aspect, the map shows
more to the sides, and the HUD anchors to the screen edges and safe areas.

## 2026-10-15 Heroes in the RimWorld manner, dark and pretty (Stefan)

Ratings: bounty flag 4 and axe icon 5 (ship both). Grim assembled 1: "I don't want full size,
movement can't be good. I want the RimWorld, but dark and pretty." Grim portrait 1: "I don't want
portraits, I want game graphics as portraits. Multiple faces, and headwear and type of body."

- **Heroes are built like RimWorld pawns:** a body sprite (a few body types: lean, average,
  broad, heavy; male and female) with a head sprite on top (many faces, hair, beards), worn
  layers on the body (armour, cloaks), headgear on the head, a held weapon and off-hand drawn
  separately. No limbs to animate; movement is a slide with a small bob, attacks are a weapon
  swing or lunge, all in code. Three facings: front, side (mirrored) and back.
- **Painted dark and pretty** in the one style (STYLE.md), not RimWorld's flat cartoon.
- **No separate portraits:** a portrait is the same in-game head and body drawn larger.
- The full-size Grim parts test, the floating-vs-bent question and the por_ portraits are
  dropped. The approved Grim still stays the look reference for colour, cloth and mood.

## 2026-10-15 Correction: keep the small rig, change the look (Stefan)

"I liked the small legs and arms you made. I just didn't like the childish wizard and princess
style art. If they had cool gear like on the painterly art. Dope." This replaces the RimWorld
entry above: heroes keep the compact animated parts rig from the prototype (small body, small
floating hands and feet that move in code). What changes is the art on it: painted pieces in the
one style, adult grim faces, cool believable gear (mail, leather, furs, carved weapons, hoods and
helms) instead of wizard hats and princess dresses. Still a kit: faces, headgear, bodies and gear
combine per hero; portraits are the in-game hero drawn larger.

## 2026-10-15 G7 hero look test go (Stefan)

"Proportions are fine. Have heroes make some test art so I can describe what works." G7 is
Ready: eight assembled compact heroes at today's proportions (Grim, axeman, old warrior,
shieldmaiden, son of Loki, son of Thor, two darker variants), QA-checked, then rated by Stefan.

## 2026-10-15 Overnight art ratings: neutral UI, pantheon symbols, no grain (Stefan)

Stefan rated 34 overnight pieces. Ship (4): riders, raven mark, shield rune, iron and gold card
frames, family icons, Egyptian sigil, gold, speed, upgrade, menu and pause icons. New rules from
his notes:

- **Core UI is pantheon-neutral:** the oak-and-dragon UI kit is "too Aesir". Buttons, panels and
  common icons use neutral dark stone, iron and leather; pantheon flavour stays in pantheon items.
  Wood reads poorly on a phone.
- **Symbols are per pantheon, not per god:** "Think Aesir, not Thor." The logo, app icon and the
  pantheon sigils use one emblem for each pantheon.
- **No grain on any art:** the title art was "so grainy you can hardly see the monsters". It also
  needs varied hero poses and a mixed party from several pantheons.
- Redos: title art, logo and app icon, Greek sigil, UI buttons, panel, settings and bounty icons,
  bronze card frame (more distinct), minotaur (straight axe haft).
- Map bounty flag redone neutral to match the new icon: plain wood-and-iron pole, dark-red coin
  banner, no dragon head (Stefan, 2026-10-15).

## 2026-10-15 Round 4 ratings; monsters use the compact hero rig (Stefan)

Stefan rated 18 round-4 pieces. Ship (4-5): the U9 neutral kit (panel, button, pressed,
disabled, bronze card frame, bounty and settings icons) and seven U7 omens (champion, red sky,
fallen star, fimbul frost, olympia, scarabs, eclipse). Redo:

- **Caravan omen (2):** "Odd fabric roof floating." The canvas must sit on the wagon or go.
- **Bound status (2):** "Doesn't look like chain."
- **G8 title art (3):** "Make the monsters more focused on the heroes, and add some subtle
  magical effects on each hero. I want the scene to feel tense and epic, right before the fight
  starts!" Subtle magic on the heroes is wanted here, an exception to no painted-in effects.

**Monsters get the same build as heroes.** V3 minotaur (1): "Why spend all time on this minotaur
when we don't even use art like that. Make RimWorld minotaur instead." Asked which build he
means, Stefan picked the compact rig: small body, small floating hands and feet moved in code,
painted grim gear. No more full-figure painted monster sprites. A compact-rig minotaur is a go
as the first monster test; Fafnir's painted kit follows the same rig.

## 2026-10-15 Answers on the Questions tab (Stefan)

- **HUD icons:** the wood menu, pause and speed 1/2/4 icons are redone in the neutral iron and
  stone of the new kit, so the whole HUD matches.
- **Map bounty flag:** thin iron pole, the same as the bounty icon he rated 5.
- **Title art harpy:** feathered chest instead of a bare human torso.
- **Run setup default pantheon:** Aesir on the first run, then the last pantheon chosen.

## 2026-10-16 Round 5: hero look approved, compact minotaur approved (Stefan)

- **G7 hero look test: approved.** Seven of eight rated 5 (Grim, axeman, shieldmaiden, son of
  Loki, son of Thor, both darker variants). This is the hero look: compact rig, big stern adult
  head, short body, floating fists and boots, painted grim gear. Build the hero kit (faces,
  headgear, bodies, cloaks, weapons as separate parts) from this set.
- **Old warrior (3):** "Hand on shield has a weird angle. With a strap and handle it wouldn't be
  like that. Is a hand needed when shield?" Rule: a shield replaces the off-hand. The shield is
  drawn at the off-hand socket, seen from the front, with the grip hidden behind it; no visible
  hand on a shield.
- **G10 compact minotaur: approved (5, parts 5).** Ship the parts as the minotaur's look; the
  other monsters follow on the same rig.
- **Buildings:** plot remake 5, Egyptian temple t1 4, Greek temple t1 4 (ship all three). Greek
  temple note: "A bit odd angles." Lead's read: its front is drawn almost straight on while the
  sides are isometric; a redo matches the town hall t1 camera angle. It ships now and is
  replaced when the redo passes.

## 2026-10-16 Animation mock feedback (Stefan)

Lead's quick animation mock of the G7 heroes and minotaur (cut into parts, idle, walk, attack,
hurt) rated 3: "Better swings, feet pointing forward, less static head without clipping errors."

- **Swings:** a real arc with wind-up, follow-through and weight (overhead chops for axes and
  hammers, thrusts for spears and seax), not a small wrist turn.
- **Feet point forward:** boots are drawn pointing the way the hero walks (toes forward in the
  front view, toes in the walk direction in the side view), not splayed to the sides.
- **The head moves on its own:** the head is a separate part (bob, small tilt and turn toward the
  target), so the kit draws heads apart from bodies with a collar or neck overlap that hides the
  seam in every pose. No clipping.

## 2026-10-16 Shared head pool for the hero kit (Lead)

Heroes draw their head from one shared pool of painted heads (8 in the first kit) instead of a
per-god `faces` list; the god decides gear, not the face. Follows the kit decision (faces,
headgear, bodies and gear combine per hero) and Design's hero-kit.md for G7.

## 2026-10-17 Heroes on a real skeleton; order rig-ready test art (Stefan)

After the Hero Lab and the skeleton test page (https://claude.ai/artifact/WfDNPmW9tbv1ttpoqoChJu),
heroes move on a real skeleton: bones (hips, torso, head; shoulder, upper arm, forearm, hand;
hip, thigh, shin, foot), two-bone IK so knees and elbows bend themselves, and keyframed clips
(walk with feet passing each other on one line, attack with wind-up, hit pause and follow-through,
hit). The weapon is fixed in the hand and the wrist bends at most about 40 degrees. Turning left
mirrors the whole figure for now (true right-handedness needs far-side hand art).

Go for G13 as a skeleton test only: the base rig sheet (sleeveless torso, upper arm, forearm,
thigh, shin) and the hands sheet (loose fists L/R, two-layer grip hands: back of hand behind the
haft, thumb in front), with proportions from the test page. Armour layer sheets and weapons wait
for the test verdict. Spine stays an option (decided after the test).

## 2026-10-17 Heroes mirror when facing left (Stefan)

Turning left mirrors the whole figure (scaleX -1): the weapon and shield swap hands visually.
No far-side hand art, no layer swap. G13 still ships both left and right hands, so true
handedness stays a cheap switch later if the test shows a need.
