# Godblooded house style (every image, every chat)

Apply to every image on top of the batch text, so all chats make art that fits together.
The look below is **Stefan's taste test (`docs/decisions.md` 2026-10-14)**; it replaces every
earlier look. Older shipped pictures (pixel art) get redrawn over time.

- **Look:** **big-head cartoon** with **painterly shading**. About **2.5 heads tall**: a big head
  with a readable face, a small body, a chunky weapon. Simple rounded shapes, crisp clean edges,
  no blur, no pixel dithering.
- **Outline: thin and colour-matched**, never thick black ink: each shape is edged by a
  slightly darker shade of its own colour (skin by a darker skin tone, a red cape by a dark red),
  about 1% of the canvas width.
- **Painterly shading** inside the shapes: soft shading, a gentle rim light, brush texture on
  wood, fur, stone and fabric, soft highlights on metal. Light from the top left.
- **Palette: warm, earthy and muted:** ochre, umber, moss and olive greens, rust, faded reds,
  stone greys, cream. No neon, no pure black, no pure white. Each Godblood keeps one signature
  accent from its divine parent (Thor: storm blue, Loki: green, ...), a little brighter than the
  rest.
- **Monsters are grim and scary**, never cute: hunched, sharp silhouettes, glowing eyes, darker
  and colder colours than the heroes.
- **Small units:** a hero is small next to a building (the town hall is about **5 heroes
  wide**). Units must read at about 30 px tall: strong colour blocks, no fine detail that
  vanishes when small.
- **Effects are subtle** and mostly added by the game in code (sparks, glow, flames, trails):
  never draw them into unit parts; on buildings only a soft glow inside the outline at tier 3.
- **Camera:** top-down 3/4, seen from the lower right.
- **Look reference:** `docs/reference/style-test-1.png` and `style-test-2.png` (fetch raw) show the
  proportions, the unit size and the camera; follow this text, not their thick black outlines.
- **Pose (every unit): faces RIGHT**, a three-quarter view toward the lower right; the game mirrors
  it for left. One front picture per unit, no back view: the game does all motion in code.
  Heroes and monsters are delivered as parts sheets (`docs/asset-spec.md` "Parts sheets") and
  assembled by the game. A monster changes visibly per tier (one new piece per tier,
  `docs/systems/monsters-and-bosses.md` "How monsters look").
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

- **Shading:** see Look; light from the top left. No cast shadow, no shadow ellipse under the
  feet, no glow outside the object unless the batch asks for a tier-3 aura.
- **Phone readability:** units show about 30-40 px tall; the silhouette, the weapon and the accent
  colour carry the read.
- **Background:** flat magenta #FF00FF unless the batch says green (the palette has little
  magenta).
- No text, no logos, no watermark, no frame, no ground, no scenery: only the object on the flat
  key colour.
