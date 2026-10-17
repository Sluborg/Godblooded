# Godblooded, game design

Lead owns this file. OPEN marks undecided items; Stefan decides those (Lead asks).

## Pitch

A Majesty-inspired kingdom builder with roguelite runs. You build a town. Godbloods, the
mortal-born children of the old gods, come to it, form parties and hunt the monsters around it
**on their own**. You never command a hero. You steer with buildings, bounty flags and the upgrade
you pick when a party levels up. A run lasts about 15-20 minutes and ends when the last lair
falls or your town hall burns.

## Pillars

1. **Watching is the fun.** The round plays itself; the player's choices are few and heavy.
   (Lesson from the text prototypes: reports are not enough, the player must _see_ it happen.)
2. **Personality you can see.** Traits show as behaviour on the map: the coward runs, the greedy
   one chases flags, the proud one ignores small fry, rivals argue. Speech bubbles, not reports.
3. **Parties, not units.** Heroes group up by bonds and traits. A party levels up together and
   you choose its upgrade (1 of 3, autobattler style).
4. **Everything has 3 tiers**, and tier reads at a glance (decisions 2026-10-05):
   - **Heroes (decision 2026-10-13):** no classes in the game. A hero is a **Godblood**, the
     child of one god, drawn from code parts (decision 2026-10-13: cartoon with painterly details).
     At tier-up the hero takes one of its god's **two paths**, a natural evolution of the same
     character (same face, hair, palette; added gear and effects) at tier 2 and 3. At most two children of the same god in
     town, and they take different paths. Gods and paths below.
   - **Monsters:** each tier adds one visible piece, tier colour on eyes and ring, size
     1.0/1.1/1.2 (look tables in `docs/systems/monsters-and-bosses.md`). Part variants keep a pack
     from looking cloned; elites get a gold edge.
   - **Buildings:** each tier adds to the same building (`docs/systems/buildings.md`).
5. **Phone first.** Landscape, one thumb, short runs.
6. **Art direction: chunky and gritty** (Stefan, batch S4): pixel art after his concept sheets
   (`docs/concept/`), about 3.5 to 4 heads tall, oversized weapons, thick outline, dark palette.
   One still picture per unit, facing right and mirrored; all motion is code
   (`docs/decisions.md`). **Parties wear a colour:** a ring under each member and a small banner
   over the leader.

## Lore (from StefanCoda "Godblood Knowledge", the source of truth)

- An alternate-history medieval world. Christianity never took hold; the old gods stayed strong
  and the world is full of mythological monsters and divine drama.
- Heroes are **Godbloods**: mortal-born children of the gods who ascend in power over time.
- Starter pantheons: **Aesir (Norse), Greek, Egyptian**, 3 gods each. OPEN: which gods.
- Inspirations: Majesty (autonomous heroes, indirect control), Scion (fiction, power past the
  mortal cap), Doomfields (auto-battler builds), Dominions (auto-resolved fights).

**How the lore shapes play:**

- **Temples recruit.** Each pantheon's temple calls Godbloods of that pantheon. Which temples you
  build decides who comes to your town.
- **Divine parent = flavour plus a boon line** in the level-up cards the party draws (Aesir: fury
  and frost, Greek: cunning and glory, Egyptian: death and sun).
- **Monsters are mythic,** grouped by pantheon (draugr, trolls, harpies, minotaurs, jackal-men,
  scarab swarms, ...). A run's map leans on one or two pantheons for its bestiary.

## Core loop (one run)

1. Start: a town hall, a little gold, fog around the town, 2-3 monster lairs out in it.
2. **Build** (tap a plot): temples (recruit), market (income), smithy and alchemist (heroes buy
   gear and potions, taxed for your income), healer's shrine, guard tower, Hearth Hall (no walls).
3. **Heroes arrive** at the temples, pay nothing to you, and spend their loot in your shops: your
   income is their spending, exactly like Majesty.
4. **Parties form** by traits and bonds (2-4 heroes). They explore, hunt, return to heal and shop.
5. **Bounty flags:** tap a spot or a monster, pay gold. Heroes weigh the bounty against the danger
   by personality; that is your main steering tool.
6. **Party level up:** the party picks its own upgrade card by personality and celebrates on the
   map (decision 2026-10-13). At party levels 3 and 6 the heroes tier up and change skin; the
   player chooses each hero's path at level 3.
7. **Lairs grow:** every few minutes a lair tiers up and spawns stronger monsters with new skins;
   raids hit the town. Clearing a lair stops it.
8. **End:** win when the final lair (a boss) falls; lose when the town hall is destroyed.

**Celestial nodes (M3):** every lair sits on a celestial node. Clearing the lair frees it;
gatherers walk out to collect Ambrosia, an in-run currency, and can be attacked on the way.
The player sends weak guards or posts an escort bounty that a party may take
(`docs/systems/nodes.md`).

**Between runs (meta):** every run earns Essence; the Altar spends it on 10 permanent upgrades
(capped near +15% power), and goals unlock new temples, gods, buildings and cards
(`docs/systems/meta.md`). **Gods act on their own:** temples fill a favour bar and the god
intervenes in the fight where its children are most hurt; the player never casts.
**Teaching:** plain first-time hints, no narrator (`docs/systems/hint-texts.md`).

## Content draft (first set)

| Kind      | First set                                                                     | Tiers |
| --------- | ----------------------------------------------------------------------------- | ----- |
| Godbloods | 4 gods per pantheon, 2 paths per god (table under "Gods and paths")           | 3     |
| Monsters  | 6 types plus 6 bosses (2 per pantheon, `docs/systems/monsters-and-bosses.md`) | 3     |
| Buildings | Town hall, 3 temples (one per pantheon), market, smithy, shrine, guard tower  | 3     |
| Traits    | Brave, Coward, Greedy, Proud, Loyal, Vengeful, Curious                        | n/a   |

Personality traits drive behaviour (which flag, flee threshold, who they party with, what they
say). Visible bonds: heroes who win together like each other; a coward who flees costs trust.

## Combat (reference math)

Real-time on the map, each unit attacking on its own cooldown. Reference: Coda "Combat System"
(7 attributes Str, Dex, Sta, Cha, Per, Int, Wp; hp = Sta*8 + Str*4; damage = Str; dodge and
armor as saturating curves capped at 90%; attack time from weapon base reduced by Dex;
knockout by default, permadeath on a knockout by a boss or in a tier 3 lair). Sim may simplify for the graybox and
says so in `docs/decisions.md`.

## Hero animation: skeleton and weapon stances

Decided 2026-10-17 (decisions 1453417, ccbaa89). Heroes are cut-out figures on a bone rig: hips,
torso, head; per arm shoulder, upper arm, forearm, hand; per leg hip, thigh, shin, foot. Arms and
legs use two-bone IK; clips are keyframed data with easing and run on the sim's windup and hit
events. Facing left mirrors the whole figure. The weapon is fixed in the grip hand; the wrist
bends at most about 40 degrees. Prototype: `docs/reference/skeleton-test.tpl.html` (stand-in
art; the shipped kit_rig_test, kit_rig_hands and G12 heads/boots replace it).

Clips per hero: idle, walk (feet pass each other on one line, toes lift a little, mostly
horizontal travel), attack (wind-up, hit pause, follow-through), hurt. Walk uses the carry pose
of the weapon; a fight blends into the weapon's guard stance.

Weapon stances (Stefan, 2026-10-17). Weapon side = the hand holding it; the lead foot is the one
in front in the guard stance.

| Weapon               | Hands | Carry (walking) | Guard            | Lead foot     | Attacks                                                                   |
| -------------------- | ----- | --------------- | ---------------- | ------------- | ------------------------------------------------------------------------- |
| Axe                  | 1     | at the side     | cocked back      | off-hand foot | chop from the back                                                        |
| Sword                | 1     | at the side     | back             | off-hand foot | slash from the back; thrust from the back                                 |
| Stabbing sword       | 1     | at the side     | front, point out | weapon foot   | thrust                                                                    |
| Dagger               | 1     | at the side     | front, low       | weapon foot   | quick stab, short slash                                                   |
| Wand                 | 1     | at the side     | front            | weapon foot   | point, flick cast                                                         |
| Greataxe, greatsword | 2     | on the shoulder | back             | off-hand foot | chop or slash from the back, top hand slides down the haft in the wind-up |
| Spear                | 2     | on the shoulder | back, at the hip | off-hand foot | long thrust, front hand slides along the shaft                            |
| Staff                | 2     | on the shoulder | back or front    | off-hand foot | swing from the back; thrust or cast from the front                        |

Two-handed carry: the weapon hand is raised to the shoulder, elbow bent and low, fist just in
front of the same shoulder; the blade or haft lies on top of the shoulder pointing back, nearly
level and tilting up behind (axe head above and behind). The off hand swings free until the
guard. Two-handed grip: the weapon follows the main hand; the second hand has a grip point on
the haft (a keyframed fraction, so it can slide) and its arm reaches it by IK. A two-handed
weapon takes the shield slot.

Grip art: the weapon hand shows the back of the hand (fingers behind the haft, thumb in front);
the far hand on a two-handed haft shows the fingers side (decisions f18cace).

## Gods and paths

Decision 2026-10-13 (Stefan): classes are gone from the game. The player meets Godbloods: a
temple calls a child of one of its pantheon's gods, and at the first tier-up (party level 3) the
hero takes one of that god's two paths; tier 3 (level 6) is the same path's stronger form. At
most two children of the same god in town, and they take different paths; if both paths are
free the player picks it on the path tray.

**Dev only:** each god and each path points to a hidden **template** (the old class rows:
warrior, paladin, ranger, rogue, wizard, healer) that sets stats, weapon and strike. Templates
are a tuning tool; the words never show in the game.

| Pantheon | God      | Tier 1 template | Path 1                       | Path 2                     |
| -------- | -------- | --------------- | ---------------------------- | -------------------------- |
| Aesir    | Odin     | wizard          | Seer (wizard)                | Wanderer (warrior, thrust) |
| Aesir    | Thor     | warrior         | Hammerborn (paladin, smash)  | Stormcaller (wizard)       |
| Aesir    | Loki     | rogue           | Trickster (rogue)            | Flamebinder (wizard)       |
| Aesir    | Freyja   | healer          | Valkyrie (warrior)           | Seidkona (healer)          |
| Greek    | Athena   | paladin         | Aegis (paladin)              | Owlsage (wizard)           |
| Greek    | Ares     | warrior         | Bloodrager (rogue, double)   | Warlord (warrior)          |
| Greek    | Apollo   | ranger          | Sunarcher (ranger)           | Paean (healer)             |
| Greek    | Poseidon | warrior         | Trident (warrior, thrust)    | Tidecaller (wizard)        |
| Egyptian | Horus    | ranger          | Falconer (ranger)            | Skyguard (paladin)         |
| Egyptian | Anubis   | warrior         | Gravewarden (warrior, sweep) | Embalmer (wizard)          |
| Egyptian | Sekhmet  | rogue           | Lioness (rogue)              | Plaguefire (wizard)        |
| Egyptian | Isis     | healer          | Lifegiver (healer)           | Enchantress (wizard)       |

Art per god: tier 1 + 2 paths x 2 tiers = 5 pictures, 60 in all. Aesir first (M2), Greek and
Egyptian with their temples (M3). Some differences can show as effects (strike colour, aura)
instead of new art.

## Milestones

| Order | Milestone        | Done when                                                                                                                                                        |
| ----- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10    | M1 Graybox       | Shapes only: town hall, 1 temple, 1 market, 2 lairs. Heroes arrive, form parties, hunt, return, shop. Bounty flag. Level-ups. Win or lose. Stefan: fun to watch? |
| 20    | M2 First art     | Tier 1 of the 4 Aesir gods, 6 monsters and the buildings in (one front picture each, mirrored), party colours, UI kit and logo.                                  |
| 30    | M3 Tiers and run | Tier 2 and 3 skins, lair growth, party tier-ups, 3 pantheon temples, Essence and the Altar, celestial nodes.                                                     |
| 40    | M4 Feel          | Speech bubbles, hit effects, sound, juice, balance pass.                                                                                                         |

Art for M2 starts in parallel with M1 once the style test (Art backlog) is approved by Stefan.

## OPEN (Stefan decides)

- Nothing open right now; see `docs/decisions.md` for the latest calls.
