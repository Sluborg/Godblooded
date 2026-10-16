# Look sheet: the new look in one place

Design owns this spec (Lead row, 2026-10-14). It turns Stefan's taste test (`docs/decisions.md`
2026-10-14 and its refinements) and the reference prototype (`docs/reference/style-test.html`)
into one sheet that Scene and Art build from. Per item: what it must **read as** at phone size,
its **parts**, **palette** notes, and the **owner**. The per-tier detail tables stay where they
are (heroes in `paths-and-skills.md` section 6, monsters and lairs in `monsters-and-bosses.md`,
buildings in `buildings.md`); this sheet is the common frame.

## Bottom line

- **One painted style** (Stefan, `docs/decisions.md` 2026-10-14 "Playtest run 2"): the painted buildings (longhouse, watch
  tower) are the anchor. Heroes, monsters, flags, the tax collector, the title and the UI are
  repainted to match: grim, mythic, Norse-carved, no cartoon faces. Art writes the style rules
  and the batches; each batch needs Stefan's go. This replaces the earlier big-head cartoon
  look. Small units: a hall is about 5 heroes wide.
- **No round plate under buildings:** a ground patch shaped to the footprint plus a soft cast
  shadow; a thin ring only when a building is tapped or being placed.
- **Collision:** units keep a minimum distance from each other and walk around building
  footprints; draw order by ground y, so nobody hides under a roof.
- **Who builds what:** everything that moves (heroes, monsters, summons, Fafnir) is an **animated
  parts rig** (Scene); heroes are combined from a **painted parts kit** by Art (Stefan,
  2026-10-14; `hero-kit.md`: compact rig approved 2026-10-16, seven sockets, four builds, worn items); everything that stands (buildings, lairs) is an **Art
  sheet** with Scene adding ground patches, decals, smoke and glow; flags, rings, labels, numbers, FX and
  the ground are **Scene code**; UI frames are **Art** 9-slices.
- **Lairs must never read as buildings** (Stefan could not tell them apart): four cues together,
  dark red cracked ground, a red skull name plate, a glowing doorway, and bones and a skull pike,
  with no wood-and-parchment and no town colours.
- **Effects grow with progression:** subtle at tier 1, stronger at tier 2, clearly effectful at
  tier 3, for bosses and late in a run; never screen shake.
- **Stefan decided (2026-10-14):** Fafnir is code parts; name labels are off by default and a
  tap on a hero shows the names of its whole party; the lair plate carries the lair's name.

## 1. Global rules

| Rule        | Value                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Outline     | per Art's painted style rules (run 2); until they say otherwise, thin and a darker shade of the part's own colour, no black ink. Signs and labels keep their own coloured border |
| Shading     | painterly: soft gradient per part, a light rim on the lit edge, a few brush strokes on cloth, fur and wood                                                                       |
| Palette     | warm and earthy, about 93% saturation and a slight warm grade (`PARTS_STYLE` in #228); one bright accent per unit at most                                                        |
| Light       | from the top left; a soft cast shadow under everything that stands                                                                                                               |
| Footprint   | a building stands on a ground patch shaped to its footprint, no round plate; a thin ring only when tapped or being placed                                                        |
| Collision   | units keep a minimum distance from each other and walk around footprints; draw order by ground y                                                                                 |
| Scale       | hero 1.0; hall about 5 heroes wide; temple about 4; lair about 4 to 5; troll 1.7; Fafnir about 2.5 heroes tall                                                                   |
| Camera      | top-down 3/4 from the lower right; units face left or right (mirrored), buildings never mirror                                                                                   |
| Motion      | smooth and weighty: eased wind-ups, a heavy strike, a small settle; idle breathing on everything alive                                                                           |
| Phone check | every item must read at 0.7x zoom on a 6 inch phone: silhouette first, colour second, detail last                                                                                |

## 2. Heroes

| Item        | Reads as                                 | Parts                                                                                                                                                                                                                                                                      | Palette                                   | Owner                         |
| ----------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------- |
| Hero        | a child of its god, its path at a glance | a build (lean, broad, tall, short) on the compact rig (big head, short body, floating fists and boots) with seven sockets: head, headgear, cloak, torso, boots, weapon, off-hand; a shield replaces the off-hand fist; portraits are the hero drawn larger (`hero-kit.md`) | per god (`paths-and-skills.md` section 6) | Art (kit pieces), Scene (rig) |
| Party ring  | which party this hero belongs to         | a thin ellipse under the feet in the party colour, 70% opacity                                                                                                                                                                                                             | the 8 party colours                       | Scene                         |
| Name label  | who it is, on request                    | off by default; tapping a hero shows the labels of everyone in its party while its Party panel is open: name in 14 px on a small parchment tab above the head, the party colour as a thin edge                                                                             | parchment fill, dark brown text           | Scene                         |
| Knocked out | down, not dead                           | the KO pose, greyed 30%, a small swirl                                                                                                                                                                                                                                     |                                           | Scene                         |

## 3. Monsters (the M2 five and Fafnir)

All monsters are **grim and scary** (gaunt, sunken glowing eyes, scars, rot, rags; menace from
shape, not gore), in the painted style of the buildings (Art's style rules). Tier: one visible added piece per tier
(`monsters-and-bosses.md` "How monsters look"), size 1.0 / 1.1 / 1.2, tier colour (green,
yellow, red) on the **eyes and the ground ring**, never on the whole body. Elites: a thin gold
outline edge.

| Monster    | Reads as                                    | Parts (tier 1)                                                                                         | Palette                                              | Owner |
| ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----- |
| Draugr     | a dead Norse warrior, hunched and cold      | grey-blue skin body, near-black mail, rusted helm, wispy beard, glowing cold eyes, jagged axe, tatters | dead grey, near black, rust; eyes cold cyan          | Scene |
| Troll      | a huge, slow brute (1.7x)                   | moss-dark hide body, fur, heavy brow head with tusks, ember eyes, spiked club, big hands and feet      | moss green, dark brown; eyes ember orange            | Scene |
| Harpy      | a flying hag that darts in and out          | gaunt hag head, ragged wings (2, flapping), bird legs with talons, wild hair                           | dusk grey-brown wings, sallow skin; eyes pale yellow | Scene |
| Minotaur   | a bull-man that charges                     | bull head with horns, bare chest body, leather kilt, big axe, hooves                                   | dark brown hide, bone horns; eyes red                | Scene |
| Jackal-man | a pack hunter of the desert dead            | jackal head with long ears, black fur body, linen kilt, short spear                                    | black, dirty linen, bronze; eyes amber               | Scene |
| Fafnir     | the boss: a wyrm guarding gold (about 2.5x) | long neck, horned head with jaw, body on four legs, folded wings, tail, a gold hoard at its feet       | dark green, gold belly and hoard; one sickly accent  | Scene |

- **Telegraphs and enrage** for Fafnir per `monsters-and-bosses.md` "How bosses look" (head
  rears back, a red cone on the ground, smoke; glowing cracks on the neck when enraged).
- **Variants:** 2-3 swaps of one part (head or weapon) per common monster.

## 4. Lairs vs buildings

Stefan could not tell a lair from a building. A lair carries **all four** of these cues; a
building carries **none** of them:

| Cue        | Lair                                                                     | Building                                     |
| ---------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| Ground     | dark, cracked, red-tinged corrupted ground with dead tufts (Scene decal) | warm earth town patch, green grass, a path   |
| Name plate | red skull plate with the lair's name (`lairPlate`, Scene)                | none on the map (the building card names it) |
| Light      | a red glow pulsing in the doorway, sometimes two red eyes                | warm yellow windows                          |
| Dressing   | bones, a skull pike, standing stones, rot                                | banners, shields, crates, flowers            |
| Colours    | the monster's palette, cold or sickly, no town colours                   | wood, stone, the town banner red             |
| Frame      | never wood-and-parchment                                                 | the building card uses wood-and-parchment    |

| Item        | Reads as                          | Parts (Art sheet, one picture per lair)                          | Owner                            |
| ----------- | --------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| Barrow      | the draugr's grave mound          | grassy mound, stone doorway, standing stones, skull pike, bones  | Art (B17), Scene decal and plate |
| Troll den   | a cave in boulders                | boulder heap, cave mouth, gnawed bones, stake fence              | Art (B17), Scene                 |
| Harpy roost | a jagged spire with a nest        | rock spire, stick nest with rags, feathers and bones at the foot | Art (B17), Scene                 |
| Labyrinth   | a ruined maze gate                | broken gateway with a bull head, low walls, horns on a post      | Art (B17), Scene                 |
| Jackal camp | a ragged desert camp              | hide tents, smoking fire ring, jackal-skull totem, loot pile     | Art (B17), Scene                 |
| Wyrm nest   | the boss lair, bigger and grander | scorched hollow, black rocks, cracked eggshells, gold hoard      | Art (B17), Scene                 |

- **Lair tier** is drawn in code (`monsters-and-bosses.md` "How lairs look per tier"): the
  corrupted ground grows (x1.15, x1.3) and the plate takes the tier colour, pulsing red at tier 3.

## 5. Buildings

| Item                 | Reads as                                    | Notes                                                                                    | Owner                                       |
| -------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| Town hall            | the heart of the town, the biggest building | about 5 heroes wide; longhouse, banners in the town red, warm windows                    | Art (B15, B16), Scene smoke and window glow |
| Temples              | the pantheon's home                         | about 4 heroes wide; look per pantheon (`buildings.md` section 4)                        | Art                                         |
| Shops, shrine, tower | each one's job at a glance                  | market stalls, forge with chimney, healing spring, tall tower (`buildings.md` section 4) | Art                                         |
| Scaffold, ruin       | being built; destroyed                      | timber scaffold over the picture; generic rubble tinted by the old building              | Art, Scene                                  |

## 6. Map signs and effects

| Item           | Reads as                                  | Spec                                                                                                                                                                                                                                                                                             | Owner                              |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Bounty flag    | "gold here", readable from across the map | repainted in the painted style (Art, run 2): a carved wooden pole about 1.5 heroes tall with a weathered red-and-gold cloth banner, no bright cartoon pennant; a parchment tag with the gold amount in 18 px bold; drops in (0.7 s); a soft gold glow on the ground; at least 64 px tall at 0.7x | Art (picture), Scene (tag, motion) |
| Level-up       | the party grew                            | a pillar of light in the party colour (1.4 s), a ring spreading, a parchment banner "Level 4" over the party for 2 s                                                                                                                                                                             | Scene                              |
| Damage numbers | who hit whom, how hard, with what         | big (20 px, crits 26 px with "!"), in the damage type's colour with a darker outline of the same colour; rise and fade 0.8 s; at most 6 on screen                                                                                                                                                | Scene                              |
| Ground         | open land                                 | plain grass with tufts and a few flowers; warm earth under the town; corrupted ground under lairs                                                                                                                                                                                                | Scene (#231)                       |

### Effects by tier (no screen shake, ever)

| Level  | Hits                           | Skills and auras                                    | Glows                            |
| ------ | ------------------------------ | --------------------------------------------------- | -------------------------------- |
| Tier 1 | a small spark, a short flash   | none (tier 1 has no skill)                          | none                             |
| Tier 2 | a spark and a short trail      | the skill shape, clear but small                    | a faint glow round the hero      |
| Tier 3 | a bright spark, a longer trail | the skill shape bigger, a clear aura while it lasts | a steady glow, close to the body |

- **Weapon glows follow the weapon's level, not the hero's tier** (`items-and-shops.md` section
  5, #240): level 2 a steel shimmer, level 3 a glow in the hero's damage-type colour.
  | Bosses and late run | heavy impacts, dust, embers | telegraphs on the ground, big and readable | strong, but never full-screen |

## 7. UI

| Item     | Reads as                        | Spec                                                                                                                                                   | Owner               |
| -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Frames   | wood and parchment              | dark wood border, dark parchment centre (light parchment later, U8), iron studs at the corners; 9-slice                                                | Art (UI kit), Scene |
| Buttons  | something to press              | wood with a parchment face; pressed and disabled states; at least 80 x 80                                                                              | Art, Scene          |
| Text     | readable on a phone             | light text on the dark parchment centres (#233, decision 2026-10-14), at least 18 px; numbers at least 28 px; dark ink on light parchment waits for U8 | Scene               |
| HUD bars | gold, clock (favour bars in M3) | parchment strips with wood ends, top of the screen                                                                                                     | Art, Scene          |

## 8. Proposed rows

| Role    | Order | Row                                                                                                                 |
| ------- | ----- | ------------------------------------------------------------------------------------------------------------------- |
| Scene   | 10    | Monster parts for draugr, troll, harpy, minotaur, jackal-man and Fafnir (tier pieces, eyes, ring), in the #193 bake |
| Scene   | 20    | Name labels on the tapped hero's party (off otherwise); bounty flag and damage numbers per section 6                |
| Scene   | 30    | Lair cues: corrupted ground decal, red skull plate, door glow (with B17)                                            |
| Art     | 10    | UI kit in wood and parchment                                                                                        |
| Balance | 10    | Monster part rows (like `heroParts.ts`) for the five M2 monsters                                                    |

## Decided (Stefan, 2026-10-14)

1. **Fafnir** is code parts like every other unit (one pipeline, it can rear and breathe).
2. **Name labels** are off by default; tapping a hero shows the names of everyone in that hero's
   party (not the recommendation, which was always on at normal zoom).
3. **The lair plate** carries the lair's name ("Draugr Barrow") with the skull.
