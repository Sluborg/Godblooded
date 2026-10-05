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
   - **Heroes:** tier 1 is the class (at most **two of each class** in town). At tier-up a hero
     takes a **favor path**, the patronage of one god, with its own art; **only one hero per
     favor path** at a time. Draft paths below.
   - **Monsters:** tiers by **colour** (like Rage of Mages: green, yellow, red goblins) plus size,
     done in code on one picture. Common monsters get 2-3 **variants** (same pose, a different
     head or weapon) so a pack never looks cloned.
   - **Buildings:** a new picture per tier.
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
- **Divine parent = flavour plus a boon line** in the level-up choices (Aesir: fury and frost,
  Greek: cunning and glory, Egyptian: death and sun; OPEN, draft only).
- **Monsters are mythic,** grouped by pantheon (draugr, trolls, harpies, minotaurs, jackal-men,
  scarab swarms, ...). A run's map leans on one or two pantheons for its bestiary.

## Core loop (one run)

1. Start: a town hall, a little gold, fog around the town, 2-3 monster lairs out in it.
2. **Build** (tap a plot): temples (recruit), market (income), smithy and alchemist (heroes buy
   gear and potions, taxed for your income), healer's shrine, guard tower, walls.
3. **Heroes arrive** at the temples, pay nothing to you, and spend their loot in your shops: your
   income is their spending, exactly like Majesty.
4. **Parties form** by traits and bonds (2-4 heroes). They explore, hunt, return to heal and shop.
5. **Bounty flags:** tap a spot or a monster, pay gold. Heroes weigh the bounty against the danger
   by personality; that is your main steering tool.
6. **Party level up:** pick 1 of 3 upgrades (stats, a skill, a pantheon boon). At party levels 3
   and 6 the heroes tier up and change skin.
7. **Lairs grow:** every few minutes a lair tiers up and spawns stronger monsters with new skins;
   raids hit the town. Clearing a lair stops it.
8. **End:** win when the final lair (a boss) falls; lose when the town hall is destroyed.

**Between runs (meta):** unlock new temples, classes, buildings and upgrade cards. OPEN: what
persists, and the currency.

## Content draft (first set)

| Kind      | First set                                                                    | Tiers |
| --------- | ---------------------------------------------------------------------------- | ----- |
| Classes   | Warrior, Paladin, Ranger, Rogue, Wizard, Healer (heals and buffs)            | 3     |
| Monsters  | 6 types, draft: draugr, troll, harpy, minotaur, jackal-man, wyrm (boss)      | 3     |
| Buildings | Town hall, 3 temples (one per pantheon), market, smithy, shrine, guard tower | 3     |
| Traits    | Brave, Coward, Greedy, Proud, Loyal, Vengeful, Curious                       | n/a   |

Personality traits drive behaviour (which flag, flee threshold, who they party with, what they
say). Visible bonds: heroes who win together like each other; a coward who flees costs trust.

## Combat (reference math)

Real-time on the map, each unit attacking on its own cooldown. Reference: Coda "Combat System"
(7 attributes Str, Dex, Sta, Cha, Per, Int, Wp; hp = Sta*8 + Str*4; damage = Str; dodge and
armor as saturating curves capped at 90%; attack time from weapon base reduced by Dex;
knockout by default, permadeath only against bosses). Sim may simplify for the graybox and
says so in `docs/decisions.md`.

## Favor paths

Six tier 1 classes shared by every pantheon: two strength (warrior, paladin), two dexterity
(ranger, rogue), two casters (wizard, healer). At most two heroes of each class in town. At the
first tier-up (party level 3) a hero takes a **favor path**: one god of a pantheon whose temple
stands, one hero per path at a time; tier 3 (level 6) is the same path's stronger form. One path
per class per pantheon, so a second hero of a class needs a second pantheon's temple to tier up.
If more than one path is free, the player picks it on the level-up card.

**Aesir (Stefan, 2026-10-05):**

| Class   | Path            | God      | Strike | Look                                                     |
| ------- | --------------- | -------- | ------ | -------------------------------------------------------- |
| Warrior | Storm Berserker | Thor     | chop   | Daughter of Thor (concept sheet): axe or hammer, storm   |
| Paladin | Oathsworn       | Tyr      | chop   | one-handed sword, big round shield, iron and honour      |
| Ranger  | Bifrost Warden  | Heimdall | shot   | watchman with a bow and the Gjallarhorn, rainbow accents |
| Rogue   | Rune Trickster  | Loki     | double | Son of Loki (concept sheet): twin daggers, green, masks  |
| Wizard  | Raven Seer      | Odin     | bolt   | spear-staff, one eye, two ravens, runes                  |
| Healer  | Valkyrie Skald  | Freyja   | bolt   | Son of Freyja (concept sheet): harp, feathered cloak     |

Greek and Egyptian paths: later, same shape (one path per class per pantheon).

## Milestones

| Order | Milestone        | Done when                                                                                                                                                            |
| ----- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10    | M1 Graybox       | Shapes only: town hall, 1 temple, 1 market, 2 lairs. Heroes arrive, form parties, hunt, return, shop. Bounty flag. Level-up pick. Win or lose. Stefan: fun to watch? |
| 20    | M2 First art     | Tier 1 of 5 classes, 6 monsters and the buildings in (one front picture each, mirrored), party colours, UI kit and logo.                                             |
| 30    | M3 Tiers and run | Tier 2 and 3 skins, lair growth, party tier-ups, 3 pantheon temples, meta unlocks.                                                                                   |
| 40    | M4 Feel          | Speech bubbles, hit effects, sound, juice, balance pass.                                                                                                             |

Art for M2 starts in parallel with M1 once the style test (Art backlog) is approved by Stefan.

## OPEN (Stefan decides)

- The 3 gods per pantheon and each pantheon's boon theme.
- What persists between runs.
