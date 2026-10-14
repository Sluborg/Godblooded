# Asset spec

Art owns this file. The house style is `art-tasks/STYLE.md` (chunky pixel art after Stefan's
concept sheets in `docs/concept/`); this is the technical contract.

## Ids

| Kind     | Id                                 | Example                           |
| -------- | ---------------------------------- | --------------------------------- |
| Hero     | `hero_<god>[-<path>]_t<1-3>_front` | `hero_thor-hammerborn_t2_front`   |
| Monster  | `mon_<type>[-v2\|-v3]_t1_front`    | `mon_draugr-v2_t1_front`          |
| Summon   | `sum_<type>_t<1-3>_front`          | `sum_falcon_t1_front`             |
| Building | `bld_<type>[_t<1-3>]`              | `bld_temple_aesir_t3`, `bld_ruin` |
| Terrain  | `ter_<name>`                       | `ter_grass_a`                     |
| UI       | `ui_<name>`                        | `ui_flag_bounty`                  |
| Key art  | `art_<name>`                       | `art_splash`                      |

Rig pieces (test, Lead's motion work): a unit id plus `_body` or `_arm`, and a `side` view
(profile facing right), e.g. `hero_warrior_t1_side_arm`. See "Rig pieces" below.

Animation frames: a unit id plus `_walk1`-`_walk4`, `_attack1`-`_attack3` or `_hurt`
(`hero_warrior_t1_front_walk2`); all frames of a unit share canvas, scale and feet position.

Names are lowercase letters; a name of several words joins them with a hyphen
(`mon_jackal-man_t1_front`). The underscore only separates the parts of an id. Exception: `ui_`
and `art_` ids have no tier or view, so everything after the prefix is the name and may use
underscores to group (`ui_icon_speed2`, `ui_item_charm_bloodstone`, `ui_button_pressed`).

Heroes are children of gods (`docs/game-design.md` "Gods and paths", decision 2026-10-13).
Tier 1 is the god alone (`hero_thor_t1_front`); tier 2 and 3 add a hyphen and the path
(`hero_thor-hammerborn_t2_front`, `hero_freyja-seidkona_t3_front`), so 5 pictures per god. The
validator rejects a path at tier 1 and a tier 2 or 3 hero without one. The god is the part
before the first hyphen. The shipped class pictures (`hero_warrior_t1_front` and the other
tier-1 classes) stay as fallbacks for the hidden templates until the god art lands.

Buildings carry a tier; a few map pieces have none: `bld_ruin` (a destroyed building, tinted in
code), `bld_scaffold` (laid over a building while it is built or upgraded) and `bld_caravan`.

Monster variants: the type name plus `-v2` or `-v3` (`mon_draugr-v2_t1_front`,
`mon_jackal-man-v3_t1_front`); the plain name is variant 1. The base type is the name with a
trailing `-v<n>` removed. A variant is an edit of the shipped base picture: same canvas, pose and
body, only the head (helmet, hair) and the weapon change, the weapon in the same strike position.
Each variant is a full manifest row with its own measured weapon point.

`_back` ids are legacy (the five tier-1 hero backs already shipped); no new back views.

## Pose standard (Stefan, `docs/decisions.md` 2026-10-05)

- **One front picture per unit, facing right** (three-quarter toward the lower right). No back
  view, no frames: the game mirrors it for left and does all motion in code (hop, lunge, strike
  effect, flash, fall).
- The **weapon's position is fixed by the unit's strike** (table in `art-tasks/STYLE.md`): overhead
  chop, double chop, side sweep, upward, thrust, smash, stomp, bolt, shot. Every batch item names
  its strike.
- The shipped picture carries the **feet anchor** and the **weapon point(s)** (see Manifest), so
  the strike effect starts at the weapon.

## Views and mirroring

- **front** (the only view): the unit faces the camera, turned 3/4 toward the lower right.
- The game mirrors it horizontally for leftward movement.
- One static pose. Motion (walk bob, squash, attack lunge, hit flash, death fade) is done in code
  by Scene. No sprite sheets.

## Canvas and scale

- ChatGPT draws on a square canvas (its normal square size, e.g. 1024 or 1254) on a flat key
  colour: green #00FF00, or magenta #FF00FF when the object has green or mint in it.
- **Units:** the whole figure fits, feet at about 88% of the canvas height, centred
  horizontally, figure height about 75% of the canvas. Same framing for every hero and tier so
  units line up in game.
- **Buildings:** 3/4 top-down view, the building's base centred, about 85% of the canvas width.
- **Shipped** (`scripts/art/ship.mjs`): keyed to alpha, specks dropped, trimmed to the object
  plus a 2 px margin, palette PNG with alpha (see Pipeline). Scaled **by the canvas, not by the object**, so relative size
  survives (a tier-3 silhouette stays bigger than tier 1). Size between types (troll vs draugr)
  is a per-type scale in code, not in the art:
  - units: a figure at the nominal 75% of canvas height becomes 256 px tall (`public/assets/units/`)
  - buildings: a building at the nominal 85% of canvas width becomes 512 px wide
    (`public/assets/buildings/`)
  - terrain and ui: full canvas width becomes 256 px (`public/assets/terrain/`, `ui/`)
- **Anchor:** stored as 0..1 of the shipped image, i.e. the Phaser origin:
  `sprite.setOrigin(anchorX, anchorY)` puts that point on the map position.
  - units (hero, mon, sum): at the feet (centre of the lowest 6% of the object, bottom edge).
  - buildings and lairs (bld): at the iso footprint centre, `x = 0.5`,
    `y = 1 - 0.2 * width / height` (clamped 0.6..1). The lowest band of an iso building is its
    front corner, which sits off the plot centre. Same rule as Scene's `footOrigin`
    (`src/ui/unitLook.ts`), so the art must keep the building centred left to right and its base a
    full iso footprint; a building that breaks this needs a note to Scene with its depth share.
  - terrain, ui and art: at the centre.

## Rig pieces

A unit split so code can swing the weapon arm from the shoulder: `<unit>_body` (the figure
without the weapon arm) and `<unit>_arm` (only that arm with its weapon). ChatGPT makes both as
edits of one reference image, so they share canvas and position. `ship.mjs` ships them as a
pair: one shared crop and scale (the two PNGs have the same size and stack exactly), the body's
feet as anchor for both, and on the arm row `pivotX`/`pivotY` (0..1 of the image): the
shoulder, found as the top of the band where the arm touches the body. Rotate the arm sprite
around that point.

## Parts sheets (units from parts, agreed with Scene 2026-10-13; not shipping yet)

Heroes and monsters are drawn by code from parts (Scene, `src/ui/parts/`). Art can replace a
vector part with a picture; the vector part stays the fallback. Effects (lightning, fire, glow,
ravens, trails) stay in code, never in the images. No back view: one side, facing right,
mirrored by code.

**Upload:** one square **parts sheet** per look (a god child at tier 1, each path at tier 2 and
3, each monster tier), a **5 x 2 grid**, flat magenta between the cells, every part tightly
inside its own cell, all parts at **the same scale**. Cell order, left to right, top row first:

| Row | Cells                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | body (torso with clothing) · head (face; a beard is part of the head) · headgear (hair, hood or helmet) · cape · weapon |
| 2   | front foot · back foot · front hand · back hand · shield (empty if none)                                                |

**Ship:** the sheet is keyed to alpha and shipped as one image with a rectangle per cell (each
cell up to about 192 px, the assembled unit at most about 350 px tall) and these **pivots**, as
fractions (0..1, x right, y down) of the part's rectangle, in its manifest row:

| Part     | Pivots                                                           |
| -------- | ---------------------------------------------------------------- |
| body     | neck, hip, shoulder_front, shoulder_back                         |
| head     | neck (bottom of the skull)                                       |
| headgear | brow (where it sits on the head)                                 |
| cape     | shoulder (the hem end is free; code sways it)                    |
| foot     | ground point under the ankle (one image per foot, so it strides) |
| hand     | wrist                                                            |
| weapon   | grip, plus the tip direction at rest as an angle in degrees      |
| shield   | strap (held in the back hand)                                    |

The row also states `pxPerUnit`: picture pixels per drawing unit (a standard hero is 44 units
from head to feet; 6 to 8 px per unit). The id scheme, the manifest fields and the pipeline step
land with the first parts batch, after Stefan's style verdict.

## Opaque pictures: key art and ground tiles

Two kinds are **full pictures** with no key colour, opaque edge to edge; the pipeline ships the
whole canvas (nothing keyed or trimmed), scaled to the nominal width, and the validator rejects
any transparent pixel:

- **Key art** `art_<name>` (the splash, `art_splash`): framed for a 16:9 screen (the batch says
  how on a square or 3:2 canvas). Ships 1280 px wide to `public/assets/art/`; Scene crops it to
  16:9 (cover-fit, centred).
- **Ground tiles** `ter_ground_<name>` (`ter_ground_grass_a`): a square, seamless, top-down
  texture. Ships 256 x 256 to `public/assets/terrain/`; Scene repeats it as a tile sprite.

Other `ter_` pictures (props such as `ter_rock_a`, `ter_tree_pine_a`) are keyed objects like
any unit or building.

## 9-slice (panels and buttons)

UI pieces the game stretches (`ui_panel`, `ui_button`, `ui_button_pressed`,
`ui_button_disabled`, the card frames `ui_card_<metal>`) are drawn for 9-slice: ornament only in the four corners (inside the outer
15% of the shape), plain even edges, a flat even middle. On ship Art measures the corners on the
shipped PNG and adds four integer fields to the row, in **shipped pixels**:

- `sliceLeft`, `sliceRight`: width of the left and right column (corner art included)
- `sliceTop`, `sliceBottom`: height of the top and bottom row

Scene draws it with Phaser's NineSlice, whose arguments run left, right, top, bottom:
`this.add.nineslice(x, y, id, undefined, w, h, row.sliceLeft, row.sliceRight, row.sliceTop,
row.sliceBottom)`. The validator checks that all four are present together and leave a middle
(left + right < width, top + bottom < height).

## Tiers

| Tier | Reads as                                                                   |
| ---- | -------------------------------------------------------------------------- |
| 1    | Fresh: worn leather and iron, muted colours, simple shapes                 |
| 2    | Proven: steel, a cape or crest, the pantheon accent colour                 |
| 3    | Divine: gold trim, a glowing motif of the divine parent, bigger silhouette |

Silhouette must change between tiers (not only colour), so a tier reads at phone size.

**A path picture is a natural evolution of the god's tier-1 child** (Stefan 2026-10-13): the
same face, hair, palette and silhouette as `hero_<god>_t1_front`, adding gear and effects; tier
3 is more of the same. Never a different person.

A **summon** (`sum_`, a unit a path skill calls up, such as Horus's falcon) is drawn and shipped
like a monster still: one front picture facing right, with its strike and weapon point.

Heroes and buildings get a picture per tier. **Monsters change visibly per tier** (Lead
2026-10-13, `docs/systems/monsters-and-bosses.md` "How monsters look"): the same face, body and
palette, one new silhouette piece per tier (a shield, horns, a crest), and the tier colour on the
eyes and the ground ring (drawn by the game, not in the picture). Lairs have one tier-1 picture;
the game shows the lair tier.

## Manifest

`public/assets/manifest.json`:

```json
{
  "assets": [
    {
      "id": "hero_warrior_t1_front",
      "kind": "hero",
      "tier": 1,
      "view": "front",
      "file": "units/hero_warrior_t1_front.png",
      "anchorX": 0.5,
      "anchorY": 0.992,
      "license": "own (ChatGPT, Stefan's account)",
      "source": "B1"
    }
  ]
}
```

- `kind`: `hero`, `mon`, `bld`, `ter`, `ui` or `art`. `tier` and `view` are `null` when the id has none.
- Rig pieces add `part` (`body` or `arm`); arm rows add `pivotX`, `pivotY`.
- 9-slice UI rows add `sliceLeft`, `sliceRight`, `sliceTop`, `sliceBottom` (pixels, see 9-slice).
- Unit stills (hero and mon rows without `part`) must carry the strike and weapon points (all
  fractions 0..1 of the shipped picture):
  - `strike`: `chop`, `double`, `sweep`, `upward`, `thrust`, `smash`, `stomp`, `bolt` or `shot`
  - `weaponX`, `weaponY`: where the strike starts (the weapon head or tip; for `bolt` the head of
    the staff or wand in the front hand, or the focus (orb, casting hand) when there is none; for
    `shot` the bow; for `stomp` the front foot, where the shockwave starts)
  - `weapon2X`, `weapon2Y`: the second weapon, only for `double` (`weapon` = the one high behind,
    `weapon2` = the one low in front)
- `file` is relative to `public/assets/`. `source` is the batch; the untouched upload is kept at
  `assets/source/<batch>/<id>.png`.
- Sorted by id. `npm run validate:art` (also part of `npm test`) checks every row and PNG: id
  format, fields, file path, size, alpha, nothing cut off at the border, no key colour left, no
  PNG without a row.

## Music

Music rows follow `docs/systems/audio.md` section 6 and `docs/systems/music-prompts.md` section 4:
`{ id: "mus_<name>", kind: "mus", file: "audio/mus_<name>", loopStartMs, loopEndMs, bpm, key,
license, source }`, the file **without extension**: both `.ogg` and `.m4a` ship (stereo, 44.1
kHz, 96 kbps), loops at about -16 LUFS and stings about -14 LUFS, peaks below -1 dB. Extra
fields: `loopCrossfadeMs` when the loop needs a crossfade at the seam, `loudnessLufs`, `note`.
The raw file stays in `assets/source/<batch>/`, never in `public/`.

## Pipeline (Art)

| Step   | Command                                         | Does                                              |
| ------ | ----------------------------------------------- | ------------------------------------------------- |
| Check  | `npm run art:check -- <folder> --sheet out.png` | canvas, flat key, framing; contact sheet + anchor |
| Look   | open the contact sheet                          | style, consistency, readable at phone size        |
| Point  | write `<folder>/points.json`                    | per unit still: strike, weapon point(s) in raw px |
| Ship   | `npm run art:ship -- <folder> <B#/R#> [id ...]` | raw to source, sprite to game, manifest rows      |
| Shrink | `npm run art:compress` (ship does it already)   | palette PNG, about a third of the size            |
| Gate   | `npm run validate:art`                          | manifest and PNGs against this spec               |

`points.json` maps each unit still to `{ "strike": "chop", "weapon": [x, y] }` (plus
`"weapon2": [x, y]` for `double`), in pixels of the raw upload. Ship converts them to the
manifest fractions and keeps the file as `assets/source/<batch>/points.json`, so a re-ship finds
them again. A unit still without an entry does not ship. `"fit": true` on an entry re-frames an
upload ChatGPT framed too big or off-centre to the spec framing first (figure 75% of the canvas
height, feet at 88%, centred), so every unit ships at the same scale; the kept source stays the
untouched upload and the points stay in its pixels.

Shipped PNGs are palette PNGs (up to 256 colours with alpha, no dithering), written by ship and
`art:compress`. The PWA precaches every shipped PNG, so the validator caps their total at 12 MB (Lead 2026-10-13)
and warns on any PNG still in plain RGBA. The raw uploads in `assets/source/` stay untouched.

Uploads may be named `<batch>--<id>.png` (Drive), `<id>.png` (`art-inbox` branch) or base64
`<id>.png.b64[.001]` (decoded automatically).
