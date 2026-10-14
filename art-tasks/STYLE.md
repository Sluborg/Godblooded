# Godblooded house style (every image, every chat)

**One style** (Stefan, `docs/decisions.md` "Playtest run 2", 2026-10-14). The painted buildings
are the anchor; every new picture must look like it came from the same hand. This replaces the
big-head cartoon taste test; never draw cartoon again. Every batch quotes this page.

**Anchor pictures (fetch raw, match them):**

- `public/assets/buildings/bld_townhall_t1.png` (the longhouse) and
  `public/assets/buildings/bld_tower_t1.png` (the watch tower): the style itself.
- `public/assets/buildings/bld_temple_aesir_t1.png`: the carving and trim.
- `public/assets/units/mon_draugr_t1_front.png`: how a figure looks in this style (proportions,
  outline, detail at unit size).

## The rules

- **Look:** detailed **painted pixel art**: crisp pixel clusters, no blur, no soft airbrush, no
  noise or grain. Hand-made, worn, heavy: weathered wood, rough stone, dented iron, leather, fur.
- **Mood: grim and mythic**, Norse first. Carved knotwork, runes, dragon heads, iron bands. Gods'
  children look like the heroes of a saga, not like a fairy tale.
- **Outline:** a thin dark warm-brown outline around the whole object (as on the anchors), darker
  brown lines between parts. Never thick black ink.
- **Palette:** earthy and muted like the anchors: umber, ochre, moss, slate, iron grey, bone,
  dark red. Colour comes from materials (paint on wood, dyed cloth, brass). One accent colour per
  hero from its divine parent (Thor: storm blue, Loki: green, Freyja: gold, Odin: grey-blue), used
  on cloth or trim, never neon.
- **Figures:** grounded heroic proportions like the draugr, **about 5 to 6 heads tall**, broad
  and solid. **Adult faces, stern or fierce**, small eyes, no big anime eyes, no blush, no cute
  smile, no chibi, no princess dresses, no clean shiny costumes. Women are warriors and
  sorceresses in practical gear (mail, leather, fur, braids), never pretty-princess.
- **Monsters** are grim and scary: hunched, sharp silhouettes, darker and colder than heroes.
- **Small on the map:** units show about 30-40 px tall; the silhouette, the weapon and the accent
  colour must carry the read. Chunky gear, no hair-thin detail.
- **Effects grow with tier:** none at tier 1, a hint at tier 2, clear at tier 3 and bosses. Unit
  effects (sparks, flames, glow) are drawn by the game, not into the unit. Buildings carry their
  tier's effect inside the outline.
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

  Grip like a real fighter (axe and hammer at the lower end of the handle). The whole weapon is
  inside the picture, never cut off.

- **Light** from the top left. No cast shadow, no shadow ellipse, no glow outside the object
  unless the batch asks for a tier-3 aura.
- **Background:** flat magenta #FF00FF unless the batch says green.
- No text, no logos, no watermark, no frame, no ground, no scenery: only the object on the flat
  key colour.
