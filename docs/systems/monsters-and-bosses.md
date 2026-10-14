# Monsters and bosses

Design owns this spec. Lead turns the proposed rows into backlog rows and data. Builds on
`combat.md` (types, armour, boss rules), `paths-and-skills.md` (the skill engine, reused for
monsters), `progression.md` (lair tiers, elites) and Sim 150 (seeded map: lairs drawn from a
pool with a pantheon lean, one boss lair as the win goal).

## Bottom line

- **Two monsters and two bosses per pantheon** (Stefan, 2026-10-13: all six bosses): Aesir
  draugr and troll, Greek harpy and minotaur, Egyptian jackal-man and a new **scarab swarm**;
  bosses **Fafnir the wyrm** (art exists) and **Jormungandr** (Aesir), **the Hydra** and
  **Cerberus** (Greek), **Apep** and **the Sphinx** (Egyptian).
- **Monsters differ by behaviour, not just numbers:** five roles (brute, harrier, charger,
  pack, swarm), each one small Sim rule. A player can tell a harpy raid from a troll raid
  without reading anything.
- **Each boss has one signature move** the player learns to watch for: Fafnir's fire breath,
  Jormungandr's venom, the Hydra's heads that regrow, Cerberus's howl that breaks nerve, Apep
  swallowing a hero whole, the Sphinx's riddle.
- **Which boss:** the run's lean pantheon picks the pair, a seeded draw picks one of its two,
  and the same boss never comes twice in a row (section 3).
- **New art:** scarab swarm, five bosses (all but Fafnir) and their lairs.

## 1. Roles

| Role    | Rule (Sim)                                                                                                                                | Who           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| brute   | today's behaviour: nearest hero, melee until it drops                                                                                     | draugr, troll |
| harrier | targets the hero with the least hp in aggro range; flees to its lair at 30% hp, returns healed; a raider (no lair to flee to) never flees | harpy         |
| charger | from 150-300 away, charges in a line: first strike 200% plus knockback 60; then a brute                                                   | minotaur      |
| pack    | +10% damage per other pack mate within 100 (max +30%); packs move together                                                                | jackal-man    |
| swarm   | many and weak: `maxAlive` x2, splits once into two halves at 0 hp (half hp, half damage)                                                  | scarab swarm  |

Roles are a field on the monster row; a new monster picks one of the five.

## 2. Monster rows (tier 1, lair tier scales them)

Combat values from `combat.md` (armour, tags, type rows) are repeated here for one place.

| Monster      | Pantheon | Role    | Str | Dex | Sta | Per | Wp  | Hp  | Weapon s / range | Armour | Tags         | Weak       | Resist         | Bounty | XP  |
| ------------ | -------- | ------- | --- | --- | --- | --- | --- | --- | ---------------- | ------ | ------------ | ---------- | -------------- | ------ | --- |
| draugr       | aesir    | brute   | 5   | 3   | 5   | 3   | 6   | 60  | 1.7 / 40         | 2      | undead       | holy, fire | death, frost   | 12     | 10  |
| troll        | aesir    | brute   | 10  | 2   | 11  | 2   | 4   | 128 | 2.4 / 50         | 4      | giant        | fire       | frost          | 40     | 35  |
| harpy        | greek    | harrier | 4   | 7   | 4   | 5   | 3   | 48  | 1.3 / 40         | 1      | beast, flyer | lightning  | none           | 14     | 12  |
| minotaur     | greek    | charger | 9   | 3   | 10  | 3   | 5   | 116 | 2.1 / 50         | 5      | beast, giant | frost      | physical x0.75 | 34     | 30  |
| jackal-man   | egyptian | pack    | 6   | 5   | 6   | 4   | 5   | 72  | 1.6 / 45         | 2      | undead       | holy       | death          | 18     | 15  |
| scarab swarm | egyptian | swarm   | 3   | 4   | 3   | 2   | 2   | 36  | 0.9 / 30         | 1      | beast        | fire       | physical x0.75 | 6      | 5   |

Rows follow the data after Balance's bot pass (2026-10-14): armour at half the first draft, harpy, minotaur and jackal-man attributes as shipped; hp is Sta x 8 + Str x 4. The scarab swarm's armour is halved to match (not in data yet).

### Monster quirks (one each, always on)

| Monster      | Quirk                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| draugr       | **Grave-cold:** a hero it knocks out wakes 50% slower                                                                            |
| troll        | **Regrowth:** heals 1% max hp per second; a fire hit stops it for 5 s                                                            |
| harpy        | **Snatch:** a landed strike steals 2 gold from the hero (shown as a coin); the hero that kills the harpy gets it with the bounty |
| minotaur     | **Bull rush:** the charge (role) cannot be dodged                                                                                |
| jackal-man   | **Scavenger:** heals 10% of max hp when its pack knocks out a hero                                                               |
| scarab swarm | **Splitting:** the swarm role's split                                                                                            |

Quirks reuse passive keys (`paths-and-skills.md`) where they can; Snatch and Regrowth are two
new keys (`stealGold`, `regen` with `stopOnType`), Scavenger a third (`healOnKo`).

### Elite skills (elites from lair tier 3, `progression.md`)

Monster skills are SkillDef rows with an `owner: 'monster'`, run by the same engine as hero
skills.

| Monster      | Skill        | Trigger               | CD  | Effect                                         | Visual        |
| ------------ | ------------ | --------------------- | --- | ---------------------------------------------- | ------------- |
| draugr       | Grave Breath | crowd 2 in a 100 cone | 12  | 100% frost, chill                              | cone (blue)   |
| troll        | Boulder      | engage 120-300        | 14  | 180% physical, stagger                         | bolt (grey)   |
| harpy        | Shriek       | crowd 2 in 100        | 15  | stagger every hero in r 100                    | burst         |
| minotaur     | Gore         | ready                 | 10  | 220% physical, knockback 80                    | line          |
| jackal-man   | Howl         | ready, fighting       | 18  | pack mates in r 150: +25% attack speed for 6 s | aura (red)    |
| scarab swarm | Devour       | ready                 | 8   | 80% death, wither                              | burst (green) |

## 3. Bosses

The `combat.md` boss rules hold for all six: emerge at 75% lair hp, the lair cannot fall
while the boss lives, enrage at 50% (attack x0.7, calls 2 monsters), immune to crits, chill at
half strength, a boss knockout rolls death. Each boss replaces the generic cleave with its own
signature move.

| Boss        | Pantheon | Hp   | Str | Armour | Strike s / range | Type     | Weak      | Resist               | Bounty | XP  |
| ----------- | -------- | ---- | --- | ------ | ---------------- | -------- | --------- | -------------------- | ------ | --- |
| Fafnir      | aesir    | 1200 | 14  | 7      | 2.0 / 70         | physical | frost     | fire, physical x0.75 | 400    | 300 |
| Hydra       | greek    | 1100 | 14  | 7      | 1.6 / 80         | physical | fire      | frost                | 400    | 300 |
| Apep        | egyptian | 1300 | 18  | 8      | 2.2 / 70         | death    | holy      | death                | 400    | 300 |
| Jormungandr | aesir    | 1300 | 20  | 8      | 2.2 / 90         | death    | lightning | frost, death         | 400    | 300 |
| Cerberus    | greek    | 1150 | 16  | 7      | 1.4 / 70         | fire     | holy      | fire                 | 400    | 300 |
| Sphinx      | egyptian | 1200 | 17  | 9      | 2.0 / 70         | physical | frost     | holy, physical x0.8  | 400    | 300 |

Boss hp is a data value, not Sta x 8 + Str x 4 (`combat.md`). Fafnir follows the data after Balance's bot pass (hp 1200, Str 14, armour 7, 2026-10-14); a party of four tier 3 heroes does about 30-40 damage per second, so the fight lasts 30-40 s. The other five follow Balance's boss pass (`balance/bosses`, 2026-10-14): hp 1100-1300 and armour 7-9, Str, strike times and moves as specced; the bot wins 60-63% against each of the six, fights 2.8-3.9 min. Cerberus carries the `demon` tag, so holy's sear applies.

- **Strike type:** Apep and Jormungandr (death) and Cerberus (fire) need a non-physical monster strike; today monsters strike physical only. Sim row 80 adds a `strikeType` field on MonsterDef (default physical).

### Signature moves

| Boss        | Move        | Rule                                                                                                                                                                                           | Telegraph (Scene)                                         |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Fafnir      | Fire Breath | every third strike: a 160, 70-degree cone, 120% fire with burn; cannot be dodged                                                                                                               | 1.2 s: head rears back, red cone on the ground            |
| Hydra       | Three Heads | every strike hits up to 3 heroes in reach; at 66% and 33% hp a head is cut and regrows in 8 s (one fewer target meanwhile) unless a fire hit lands on it within those 8 s (then it stays cut)  | heads shown as 3 pips over the boss; a cut head smokes    |
| Apep        | Swallow     | every 15 s: the hero with the most hp in reach is swallowed for 4 s (off the map, 8% of its max hp per second as death damage); 25% of Apep's max hp in damage within those 4 s frees it early | 1.0 s: coils tighten, a dark ring under the target        |
| Jormungandr | Venom       | every 12 s: spits on the hero with the most hp in reach; it and every hero within 60 of it are poisoned, 3% max hp per second as death for 8 s; any heal on a hero ends its poison             | 1.0 s: the head lifts, green drops fall on the target     |
| Cerberus    | Howl        | every 15 s: heroes within 200 below 50% hp break and flee for 3 s (brave and proud heroes and Berserker parties ignore it); the howl also calls 1 guard from the lair                          | 0.8 s: three heads lift, a red shock ring spreads         |
| Sphinx      | Riddle      | every 18 s: asks the hero in reach with the lowest Int; Int 8 or more answers (that hero +30% damage for 6 s, gold "!"), less is turned to stone for 3 s (no actions, takes half damage)       | 1.2 s: a "?" over the hero, then "!" or a grey stone tint |

- **Enrage** adds to the move: Fafnir breathes every second strike, the Hydra regrows in 5 s,
  Apep swallows every 10 s, Jormungandr spits every 8 s, Cerberus howls every 10 s, the
  Sphinx asks every 12 s.
- **Death roll:** a hero knocked out while swallowed counts as a boss knockout.

### Which boss

- **Pantheon:** the lean the player chose at the Altar (`meta-ui.md`, decision 2026-10-14);
  Sim 150's map draws its lairs leaning on it.
- **Boss:** a seeded draw of the two bosses of that pantheon, skipping the boss of the
  previous run when the other one is available (the meta save keeps `lastBoss`).
- **Only bosses with art and rows are drawn:** until the others land, Fafnir (the existing
  `wyrm`) is the only boss; the rule needs no code change when the others arrive (rows only).

## 4. Lairs

| Lair          | Monster      | Pantheon | Size  | Hp   | Spawn s | Max alive | Art                        |
| ------------- | ------------ | -------- | ----- | ---- | ------- | --------- | -------------------------- |
| barrow        | draugr       | aesir    | small | 2100 | 10      | 6         | `bld_lair_barrow_t1` (B10) |
| troll-den     | troll        | aesir    | big   | 3600 | 25      | 4         | `bld_lair_troll-den_t1`    |
| harpy-roost   | harpy        | greek    | small | 1800 | 9       | 6         | `bld_lair_harpy-roost_t1`  |
| labyrinth     | minotaur     | greek    | big   | 3600 | 24      | 4         | `bld_lair_labyrinth_t1`    |
| jackal-camp   | jackal-man   | egyptian | small | 2100 | 10      | 6         | `bld_lair_jackal-camp_t1`  |
| scarab-pit    | scarab swarm | egyptian | small | 1800 | 6       | 10        | new                        |
| wyrm-nest     | Fafnir       | aesir    | boss  | 8000 | 30      | 3 guards  | `bld_lair_wyrm-nest_t1`    |
| hydra-marsh   | Hydra        | greek    | boss  | 8000 | 30      | 3 guards  | new                        |
| apep-tomb     | Apep         | egyptian | boss  | 8000 | 30      | 3 guards  | new                        |
| serpent-shore | Jormungandr  | aesir    | boss  | 8000 | 30      | 3 guards  | new                        |
| gate-of-hades | Cerberus     | greek    | boss  | 8000 | 30      | 3 guards  | new                        |
| sphinx-plinth | Sphinx       | egyptian | boss  | 8000 | 30      | 3 guards  | new                        |

- **Troll den changes:** today it is the final lair (24000 hp). With the boss lair as the win
  goal (Sim 150) it becomes a big normal lair, 4 alive. All six boss lairs are 8000 hp (Balance's boss pass, 2026-10-14).
- **Lair hp after playtest 1** (Balance, human-bot pass, `balance/spacing-collector`): non-boss
  lairs at 60% of the earlier hp. The human-like bot then won 63-64% and killed its first lair
  at about 6.2 min.
- **Then 80%** (Balance, `balance/lairs-80`): once the human build also gets a smithy (hint
  `h-smithy`), it wins about 15 points more, so non-boss lairs went back up to 80% of the old hp
  (big 4800, small 2400-2800; the scarab pit 2400, data `maxAlive` 5, which the swarm role doubles to the table's 10; scarab armour 1). The nest
  stays 8000.
- **Then 70%** (Balance, `balance/playtest-trim`, with the first raid at 7:00 and a 1-raider
  Vanguard): big 4200, small 2100-2450, the scarab pit 2100; the nest 8000. The human bot on the
  playtest build wins 63-70% with a 35-min run cap (57-63% at the default 30, where longer runs
  count as timeouts).
- **Then 60% with omens and elites** (Balance, `balance/omens` 11721e0): big 3600, small
  1800-2100, the scarab pit 1800; boss lairs 8000. Full stack: the human bot wins 65%, the full
  bot 73-78%.
- **Boss lair guards:** a boss lair spawns guards until the boss emerges: the wyrm nest spawns
  draugr (Balance, 2026-10-14: trolls at the nest made the boss fight a wall in the bot); Greek
  and Egyptian boss lairs spawn the minotaur and jackal-men until their bot pass.
- **Raids** come from every lair as today; harriers and swarms raid faster (1.5x walk speed).

### How lairs look per tier

Lairs follow the monster rule (`docs/asset-spec.md`): **one tier-1 picture per lair** (Art batch
B17), and Scene shows the lair tier in code, with no new art.

| Lair tier | What Scene draws                                                                                |
| --------- | ----------------------------------------------------------------------------------------------- |
| 1         | the B17 picture on the corrupted ground; the skull name plate (`lairPlate`) as today            |
| 2         | the corrupted ground grows (radius x1.15); the plate takes the tier 2 colour (yellow)           |
| 3         | ground x1.3; the plate turns red and pulses slowly: heroes can die here (`combat.md` section 6) |

- **Boss lairs** have one look for every tier _visually_; the sim still tiers them (guards and
  boss hp scale with the lair tier).

### Growth ring (a reason to flag a lair; Lead 2026-10-14)

Playtest 1: Stefan placed no flags because "heroes were always fighting". Nothing showed him
that an untouched lair was a threat. The growth ring makes the next lair tier-up visible, so a
flag on the lair becomes the obvious answer. This is a look only: no rule changes.

1. **Ring:** a thin ring around each lair that is below its max tier, filling clockwise from its
   last tier-up (or the run start) to its next one. The ring is dim grey while
   more than 60 s are left.
2. **Last 60 s:** the ring turns amber and a small "60" counts down beside the plate, in light
   text on dark parchment (`look-sheet.md`).
3. **Last 15 s:** the ring and the plate pulse once a second, and one soft drum beat plays (once
   per lair tier-up, not per pulse).
4. **Tier-up:** the ring flashes in the new tier's plate colour and empties. A timed tier-up of a
   normal lair also sends a small raid (`events.md`; not a pressure tier-up, not a boss lair),
   and its raid arrow appears at the same moment.
5. **Hidden** at max tier, on a sealed boss lair, and while a lair is destroyed.

- **Sim:** the lair snapshot carries `nextTierMs`, the ms left until the next tier-up (null at
  max tier or with no tier clock; built on `sim/lair-timer` de737b4), and `tierSpanMs`, the
  length of the current wait, so the ring fills `1 - nextTierMs / tierSpanMs`. A pressure tier-up restarts
  it, so the ring jumps back to empty, which is correct.

### Guard pips (the push is working; Lead 2026-10-14)

Sim's lair-kill check after playtest 1: a lair is slow to fall because it keeps refilling its
monsters (a barrow spawns one every 10 s, up to 6). The player cannot see whether a fight at a
lair is winning. Guard pips show it. This is a look only: no rule changes.

1. **Pips:** a row of small dots under the lair plate, one per monster the lair may have alive
   (`maxAlive`, with its tier and swarm adds). A filled dot is a living monster from this lair,
   wherever it is (raiders it sent out do not count); an empty dot is a dead one not yet replaced.
2. **Respawn:** the next empty dot fills slowly over the lair's spawn time, so the player sees the
   refill coming.
3. **A kill:** the dot empties with a small red flash. With every dot empty, the plate glows once:
   the lair is open, and heroes hitting it now go straight at its hp.
4. **Shown** while a hero is within the lair's aggro range, and for 10 s after; hidden otherwise
   so a full map stays calm. Never on a sealed boss lair, or when `maxAlive` is 0.

- **Sim:** the lair snapshot carries `alive` (its living monsters, raiders excluded), `maxAlive` (after tier and
  swarm adds) and `nextSpawnMs` (ms left until its next spawn; null when full).

## 5. What the player sees

- **Roles read from motion:** harpies dart in and out, minotaurs paw the ground then charge
  (0.6 s windup with a dust puff), jackal packs move as a clump, scarabs spill out in numbers.
- **Quirks:** a coin flying from hero to harpy; a troll's green regen sparkle that stops when
  fire hits; a scarab splitting into two smaller ones.
- **Bosses:** the boss hp bar at the top (`combat.md`), the signature move's telegraph, head
  pips on the Hydra, a swallowed hero's portrait shown in a small ring over Apep, a green
  poison tint, a fleeing hero's broken-shield icon after the howl, a stone-grey hero after a
  failed riddle.

### How monsters look (tier 1, 2, 3)

**Style (taste test, decision 2026-10-14): grim and scary**, in the one painted style of the
buildings (`docs/decisions.md` 2026-10-14 "Playtest run 2"; Art's style rules, which also set the outlines). Gaunt faces, sunken glowing eyes, scars, rot and
rags, in earthy colours only slightly muted; menace from shape and posture, not gore.

Same rule as the heroes (`paths-and-skills.md` section 6, units from parts): a monster
keeps its face, body and palette on every tier; each tier adds **one silhouette change** and
grows a little (size x1.0, x1.1, x1.2). The **tier colour** (green, yellow, red,
`docs/game-design.md`, Lead 2026-10-13) shows on the eyes and the ground ring, never as a
whole-sprite tint, so it never clashes with Scene's rider and heal tints.

| Monster      | Tier 1 (keeps on every tier)                             | Tier 2 adds                              | Tier 3 adds                                                |
| ------------ | -------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------- |
| draugr       | grey-green skin, rusted mail, dented helm, notched sword | a cracked round shield, a tattered cape  | a horned helm, frost on the blade, a cold mist at the feet |
| troll        | mossy grey skin, huge arms, a tree-branch club           | a stone in the club, a bone necklace     | moss and a small tree on the back, a boulder club          |
| harpy        | gaunt hag face, ragged feathered wings, long talons      | longer wing tips, a stolen gold necklace | a bone-and-feather crest, storm-dark tattered wings        |
| minotaur     | bull head with horns, bare chest, a big axe              | a bronze nose ring, a leather harness    | gilded horns, a double-headed axe                          |
| jackal-man   | jackal head, black fur, linen kilt, a short spear        | a bronze collar, a small round shield    | a gold headdress, a khopesh                                |
| scarab swarm | a knot of black beetles with gold backs                  | a bigger knot, a few flying beetles      | one large gold scarab at the centre                        |

- **Elites** (from lair tier 2, `progression.md`): the same picture with a **thin gold outline edge**
  and a bigger health bar; an elite with a skill (lair tier 3) shows the skill's colour in the
  eyes.
- **Readable at 0.7x on a phone:** each tier must change the outline (a shield, horns, a
  crest), not only the colour.
- **Variants** (`docs/game-design.md`): common monsters get 2-3 swaps of one part (head or
  weapon), so a pack never looks cloned.
- **Art contract:** this replaces "monsters have tier-1 pictures only"; Art updates
  `docs/asset-spec.md` and `STYLE.md` (Lead 2026-10-13).

### How bosses look

Bosses are the grimmest units on the map (taste test): about 2.5x a hero's height (Fafnir's
art sets the size), earthy colours with one sickly accent and clearly visible effects (bosses sit at the top of
the effect scale, like tier 3), and one look; the sim
still scales their hp with the lair tier (visual only). The
**telegraph** is the boss's one moving tell; `Signature moves` above gives its timing.

| Boss        | Silhouette                                                  | Palette                   | Telegraph look                                                 | Enraged look                        |
| ----------- | ----------------------------------------------------------- | ------------------------- | -------------------------------------------------------------- | ----------------------------------- |
| Fafnir      | a long-necked wyrm on four legs, folded wings, a gold hoard | dark green, gold belly    | head rears back, a red cone on the ground, smoke from the jaws | glowing cracks along the neck       |
| Jormungandr | a huge serpent rising in coils, a wide fanged head          | sea-green, pale scales    | head lifts, green drops fall, a green ring under the target    | venom drips from the jaws all along |
| Hydra       | a squat body with three long necks                          | marsh green, yellow eyes  | 3 head pips over the body; a cut neck smokes                   | the necks thrash faster             |
| Cerberus    | a giant three-headed hound, chain collar                    | black, ember-red eyes     | the three heads lift, a red shock ring spreads                 | fire in the mouths and the collar   |
| Apep        | a giant coiling serpent, a hooded head                      | black-violet, dark gold   | coils tighten, a dark ring under the target                    | a black haze trailing the coils     |
| Sphinx      | a lion body with a pharaoh head and folded wings            | sandstone, lapis and gold | a "?" over the chosen hero, then "!" or a stone-grey tint      | the eyes glow gold, the wings open  |

## 6. Proposed data rows

| Row            | Change                                                                                                                                                                                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MonsterDef     | `pantheon`, `role`, `quirk` (passive keys), `eliteSkill` (SkillDef id), `boss`, `hp` (boss only), `move` (boss only)                                                                                                                                                               |
| BossMove       | `breath` { everyN, cone, mult, type, rider }, `heads` { count, cutAt, regrowS, stopType }, `swallow` { everyS, s, dotPct, freePct }, `venom` { everyS, radius, dotPct, s }, `howl` { everyS, radius, belowHp, fleeS, calls }, `riddle` { everyS, intAtLeast, buff, buffS, stoneS } |
| LairDef        | `pantheon`, `size`, `guards` (boss lairs)                                                                                                                                                                                                                                          |
| MapRules       | `boss` becomes `bossesByPantheon` { aesir: ['wyrm-nest', 'serpent-shore'], greek: ['hydra-marsh', 'gate-of-hades'], egyptian: ['apep-tomb', 'sphinx-plinth'] }                                                                                                                     |
| meta save      | `lastBoss` (`meta.md`)                                                                                                                                                                                                                                                             |
| tuning.monster | `raidSpeedMult` for harrier and swarm 1.5                                                                                                                                                                                                                                          |

## 7. Proposed backlog rows

### Sim

| Order | Row                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------- |
| 10    | Monster roles: harrier, charger, pack, swarm (brute is today's)                                   |
| 20    | Quirks: regen with fire stop, snatch gold, grave-cold, scavenger (heal on KO)                     |
| 30    | Monster skills through the skill engine (`owner: 'monster'`), on elites                           |
| 40    | Boss moves: breath, heads, swallow, venom, howl, riddle; enrage variants                          |
| 50    | Boss pick: lean pantheon, seeded one of two, no repeat; boss lair guards                          |
| 60    | Lair snapshot: `nextTierMs` and `tierSpanMs` (done, `sim/lair-timer` 0ad1a1b) for the growth ring |
| 70    | Lair snapshot: `alive`, `maxAlive`, `nextSpawnMs` for the guard pips (done, 0ad1a1b)              |
| 80    | MonsterDef `strikeType` (default physical): Apep and Jormungandr strike death, Cerberus fire      |

### Lead (data)

| Order | Row                                                                                     |
| ----- | --------------------------------------------------------------------------------------- |
| 10    | Monster rows for harpy, minotaur, jackal-man (art exists) and the troll den change      |
| 20    | Scarab swarm, the five new bosses and their lairs when their art lands                  |
| 30    | Balance pass: one bot batch per lean pantheon; win rates within 10 points of each other |

### Scene

| Order | Row                                                                                      |
| ----- | ---------------------------------------------------------------------------------------- |
| 10    | Role motion: harpy dart, minotaur paw and charge, pack clumping, swarm spill             |
| 20    | Quirk effects: snatched coin, regen sparkle, scarab split                                |
| 30    | Boss telegraphs: breath, head pips, swallow ring, venom, howl ring, riddle               |
| 40    | Lair growth ring: fill, amber 60 s countdown, 15 s pulse and drum, tier flash            |
| 50    | Guard pips under the lair plate: fill, slow refill, red flash on a kill, glow when empty |

### Art (requests)

| Order | Row                                                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------- |
| 10    | `mon_scarab-swarm_t1_front`: a knot of a dozen fist-sized black-gold scarabs, one picture                                   |
| 20    | Bosses, bigger canvas like the wyrm: `mon_hydra`, `mon_apep`, `mon_jormungandr`, `mon_cerberus`, `mon_sphinx` (`_t1_front`) |
| 30    | Lairs tier 1: scarab-pit, hydra-marsh, apep-tomb, serpent-shore, gate-of-hades, sphinx-plinth (`bld_lair_<id>_t1`)          |

## Decided (Stefan, 2026-10-13)

1. **Bosses:** all six, two per pantheon (section 3).
2. **Scarab swarm** as the second Egyptian monster.
3. **Harpies steal gold:** kept.
4. **Apep's swallow:** kept at 4 s.
5. **The boss follows the lean,** one of its pantheon's two, no repeat in a row.
