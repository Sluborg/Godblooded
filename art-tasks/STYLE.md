# Godblooded house style (every image, every chat)

**One style** (Stefan, `docs/decisions.md` "Playtest run 2", 2026-10-14). The painted buildings
are the anchor; every new picture must look like it came from the same hand. This replaces the
big-head cartoon taste test; never draw cartoon again (heroes are the one exception: Stefan settled a big-head hero style on 2026-10-18, see "Heroes"). Every batch quotes this page.

**Quality: every image passes `art-tasks/QA.md` before upload** (redo up to 3 times, then
report the fault instead of uploading).

**Reference set (fetch raw, match them).** Stefan rated these 4-5 (2026-10-14); they are the
only references. Copy their palette, thin dark-brown outline, top-left light and level of detail.

| Picture (`public/assets/...` unless noted)  | Copy from it                                           |
| ------------------------------------------- | ------------------------------------------------------ |
| `docs/reference/hero-style-*.png` (7)       | **every hero** (settled 2026-10-18): see "Heroes"      |
| `buildings/bld_townhall_t1.png` (5)         | the style itself, built for real (rule 14, 2026-10-17) |
| `buildings/bld_lair_labyrinth_t1.png` (5)   | grim ruin: stone, braziers, bones, mood                |
| `units/mon_jackal-man_t1_front.png` (5)     | a figure: anatomy, grip on the weapon, trim            |
| `buildings/bld_tower_t1.png` (4)            | believable timber construction, ladder, stone base     |
| `buildings/bld_temple_aesir_t2.png` (4)     | Norse carving, dragon heads, knotwork                  |
| `buildings/bld_shrine_t1.png` (4)           | a small building with a clear use (basin, candles)     |
| `buildings/bld_lair_barrow_t1.png` (4)      | a grim lair; it could be grimmer: dead grass, spookier |
| `buildings/bld_lair_jackal-camp_t1.png` (4) | Egyptian lair, tents, totem                            |
| `units/mon_troll_t1_front.png` (4)          | a big brute: fur, moss, weight                         |

**Do not copy** (Stefan's notes on the rest): impossible logs, beams or extra bits on the back of
buildings; weapons that could not be used; hands that do not really grip; static smoke or sparks
painted in; busy piles of props; a temple that is only a gate.

## Heroes (settled by Stefan, 2026-10-18, `docs/decisions.md` "Hero style settled")

The references are Stefan's seven pictures, fetched raw from main:
`docs/reference/hero-style-anchor-thor-grim.png`, `-anchor-odin-grim.png`, `-tyr.png`,
`-loki.png`, `-freyja.png`, `-athena.png`, `-anubis.png`. Match them; they replace the G7
heroes, the skeleton pieces and `art-tasks/ref/hero-anchor-grim.png` for heroes.

- **Shape:** a **big head, about a third of the figure**, on a **round body ball**; **floating ball
  hands** (plain skin tone) and **ball feet** (plain leather) drawn by the game. **No arms, no legs,
  no sleeve stubs.** The ball stays readable as a ball: **at least 40 percent of it visible**,
  never hidden by the cape, a shield or the hands.
- **Face:** stylised features (oversized round ears, a short rounded nose, heavy simple brows),
  **grim and adult**, never cute; not realistic proportions. Both genders.
- **Finish:** smooth painted game art with real texture on cloth, leather, metal and hair (this
  replaces "painted pixel art" for heroes only); top-left light; the thin dark warm-brown
  outline; no grain.
- **Kit, one layer each:** the **body ball per god** (that god's colour and motif: Thor red and
  iron, Odin grey-blue and ravens, Loki green and serpents, Freyja gold and amber); the **head
  per hero**; the **weapon per path at 3 tiers**; the **cape per party**, painted **neutral light
  grey** so the game tints it, its finish rising with the party's level; a shield is optional.
  Hero level shows through the weapon tier and the game's auras, not through the body.
- **Motifs stay with their god:** never put one god's sign on another god's body (no owls on
  Loki).
- **Layering:** weapon hafts pass **behind** the hand balls; a shield covers its hand.

## The rules

- **Look:** detailed **painted pixel art**: crisp pixel clusters, no blur, no soft airbrush, no
  noise or grain. Hand-made, worn, heavy: weathered wood, rough stone, dented iron, leather, fur.
- **Mood: grim and mythic.** Three pantheons: Aesir (Norse), Greek and Egyptian. Norse carving,
  knotwork, runes and dragon heads belong to Aesir things only; Greek things get bronze, marble
  and laurel, Egyptian things get sandstone, lapis and gold. Gods' children look like the heroes
  of a saga, not like a fairy tale.
- **Core UI is pantheon-neutral** (Stefan 2026-10-15: the oak-and-dragon kit is "too Aesir",
  "wood doesn't do well on a phone"): buttons, panels and common icons are **dark stone, iron and
  dark leather**, plain and readable, with no carving, no knotwork, no dragon heads and no
  pantheon symbol. Pantheon flavour appears only in items that belong to one pantheon.
- **Symbols per pantheon, not per god** (Stefan 2026-10-15: "Think Aesir, not Thor"): a logo, app
  icon or pantheon sigil uses one emblem for each **whole pantheon**, never the sign of a single
  god (no hammer for the Aesir, no owl for the Greeks).
- **No grain on any picture**, key art included (Stefan 2026-10-15: the title art was "so grainy
  you can hardly see the monsters"): clean flat pixel clusters, no noise, no film grain, no
  speckle or dither texture over areas. Every figure must read at a glance.
- **Groups vary:** when several figures stand together, each has its own pose and stance; never
  the same stance repeated.
- **Outline:** a thin dark warm-brown outline around the whole object (as on the anchors), darker
  brown lines between parts. Never thick black ink.
- **Palette:** earthy and muted like the anchors: umber, ochre, moss, slate, iron grey, bone,
  dark red. Colour comes from materials (paint on wood, dyed cloth, brass). One accent colour per
  hero from its divine parent (Thor: storm blue, Loki: green, Freyja: gold, Odin: grey-blue), used
  on cloth or trim, never neon.
- **Figures** (monsters and other non-hero figures): grounded proportions, broad and solid.
  **Adult faces, stern or fierce**, small eyes, no big anime eyes, no blush, no cute smile, no
  princess dresses, no clean shiny costumes. Women are warriors and sorceresses in practical gear
  (mail, leather, fur, braids), never pretty-princess. **Heroes follow their own rules below.**
- **Monsters** are grim and scary: hunched, sharp silhouettes, darker and colder than heroes.
- **Small on the map:** units show about 30-40 px tall; the silhouette, the weapon and the accent
  colour must carry the read. Chunky gear, no hair-thin detail.
- **Believable and buildable** (Stefan 2026-10-14): every beam, log, plank and stone carries
  weight the way it would in real life; nothing floats, nothing extra hangs off the back. Weapons
  are real, usable weapons. A building shows its function (a temple has an inside you could
  walk into, a smithy has a forge and an anvil you could use).
- **Clear over busy:** few, chunky props; a clear silhouette beats lots of small detail.
- **Buildings: real construction, symmetry, restraint, scale** (Stefan 2026-10-17: "I see a lot
  of AI slop on buildings. I want realistic constructions and good symmetry when expected"):
  1. **Real construction:** every beam, post and brace carries load and meets another member at a
     visible joint or rests on the foundation. Nothing floats, nothing is bolted on for
     decoration. Period-true methods: Norse turf or shingle roofs on rafters with **no metal
     bands or straps**, stave and log joinery; Greek post-and-lintel in stone; Egyptian battered
     mud-brick and stone. No loose beams ending in mid-air. **Every member follows the
     building's perspective** (Stefan 2026-10-17): one that projects out from a wall (a porch
     beam, a brace, a rafter end, a buttress) recedes toward the viewer at the camera's angle;
     one that runs along a wall stays parallel to that wall's edge. Never a beam that should
     project outward drawn running along the wall.
  2. **Symmetry where the type expects it:** gables, temple fronts, gates, doorways and paired
     ornaments are mirror-symmetric about the entrance axis (two gable heads the same size and
     pose, the door on the centre line of a temple front). Repeated elements (bays, columns,
     windows, posts, wall bracing) have the same width, spacing and pattern.
  3. **Restraint:** one focal ornament per facade (a carved gable, a banner pair). No clutter, no
     random extra beams, straps, rivets or banners.
  4. **Scale:** a door is about 1.3 times a hero's height; steps and windows are sized to match.
- **No painted effects:** smoke, sparks, flying embers, magic glow and auras are drawn by the
  game, never into a picture. Fire in a hearth or brazier and lit windows are fine; a column of
  smoke is not. Higher tiers show richer build (stone, carving, gilding), not effects.
- **Camera:** top-down 3/4 seen from the lower right, as the anchors.
- **Pose (every unit): faces RIGHT**, three-quarter toward the lower right; the game mirrors it.
  One front picture per unit; the game does the motion.
- **Weapon position = the unit's strike** (the batch names it). The strike starts where the weapon
  is drawn:

  | Strike        | Weapons                      | Draw the weapon                                                                                                                                                                  |
  | ------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | overhead chop | axe, sword, mace             | raised high behind the back shoulder                                                                                                                                             |
  | double chop   | two weapons                  | one high behind the back shoulder, one low in front                                                                                                                              |
  | side sweep    | greatsword, polearm, scythe  | held level behind the hip                                                                                                                                                        |
  | upward        | claws, fists, low blades     | low in front of the body                                                                                                                                                         |
  | thrust        | spear, dagger, rapier, bite  | level at chest height, tip pointing forward                                                                                                                                      |
  | stomp         | giants, beasts (the foot)    | the front foot planted and clearly visible; the weapon may be anywhere                                                                                                           |
  | smash         | giants, hammers, clubs       | raised over the head                                                                                                                                                             |
  | bolt          | staffs, wands, casting hands | staff or wand in the FRONT hand, head raised at shoulder height; a free casting hand may glow behind. No staff: the focus (orb, casting hand) raised in front at shoulder height |
  | shot          | bows, slings                 | the bow held in front at chest height                                                                                                                                            |

  **A shield replaces the off hand** (Stefan 2026-10-16): draw it at the off-hand place, seen
  from the front, its grip and strap hidden behind it, **no visible hand** on or beside it.
  Grip like a real fighter (axe and hammer at the lower end of the handle). The whole weapon is
  inside the picture, never cut off.

- **Light** from the upper left, a low warm sun (the game draws long soft shadows falling to
  the lower right, mostly sideways; never paint a shadow in). No cast shadow, no shadow ellipse, no glow outside the object
  unless the batch asks for a tier-3 aura.
- **Background:** flat magenta #FF00FF unless the batch says green.
- No text, no logos, no watermark, no frame, no ground, no scenery: only the object on the flat
  key colour.
