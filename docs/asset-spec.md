# Asset spec

Art owns this file. The house style is `art-tasks/STYLE.md` (chunky pixel art after Stefan's
concept sheets in `docs/concept/`); this is the technical contract.

## Ids

| Kind     | Id                                  | Example                      |
| -------- | ----------------------------------- | ---------------------------- |
| Hero     | `hero_<class>[-<god>]_t<1-3>_front` | `hero_warrior-thor_t2_front` |
| Monster  | `mon_<type>[-v2\|-v3]_t1_front`     | `mon_draugr-v2_t1_front`     |
| Building | `bld_<type>_t<1-3>`                 | `bld_temple_aesir_t3`        |
| Terrain  | `ter_<name>`                        | `ter_grass_a`                |
| UI       | `ui_<name>`                         | `ui_flag_bounty`             |

Rig pieces (test, Lead's motion work): a unit id plus `_body` or `_arm`, and a `side` view
(profile facing right), e.g. `hero_warrior_t1_side_arm`. See "Rig pieces" below.

Animation frames: a unit id plus `_walk1`-`_walk4`, `_attack1`-`_attack3` or `_hurt`
(`hero_warrior_t1_front_walk2`); all frames of a unit share canvas, scale and feet position.

Names are lowercase letters; a name of several words joins them with a hyphen
(`mon_jackal-man_t1_front`). The underscore only separates the parts of an id.

Hero favor paths (tier 2 and 3): the class name plus a hyphen and the patron god
(`hero_warrior-thor_t2_front`, `hero_healer-freyja_t3_front`); tier 1 has no god
(`hero_healer_t1_front`). The base class is the part before the first hyphen.

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
  horizontally, figure height about 75% of the canvas. Same framing for every class and tier so
  units line up in game.
- **Buildings:** 3/4 top-down view, the building's base centred, about 85% of the canvas width.
- **Shipped** (`scripts/art/ship.mjs`): keyed to alpha, specks dropped, trimmed to the object
  plus a 2 px margin, PNG RGBA. Scaled **by the canvas, not by the object**, so relative size
  survives (a tier-3 silhouette stays bigger than tier 1). Size between types (troll vs draugr)
  is a per-type scale in code, not in the art:
  - units: a figure at the nominal 75% of canvas height becomes 256 px tall (`public/assets/units/`)
  - buildings: a building at the nominal 85% of canvas width becomes 512 px wide
    (`public/assets/buildings/`)
  - terrain and ui: full canvas width becomes 256 px (`public/assets/terrain/`, `ui/`)
- **Anchor:** units and buildings at the feet / base (centre of the lowest 6% of the object,
  bottom edge); terrain and ui at the centre. Stored as 0..1 of the shipped image, i.e. the
  Phaser origin: `sprite.setOrigin(anchorX, anchorY)` puts the feet on the unit's map position.

## Rig pieces

A unit split so code can swing the weapon arm from the shoulder: `<unit>_body` (the figure
without the weapon arm) and `<unit>_arm` (only that arm with its weapon). ChatGPT makes both as
edits of one reference image, so they share canvas and position. `ship.mjs` ships them as a
pair: one shared crop and scale (the two PNGs have the same size and stack exactly), the body's
feet as anchor for both, and on the arm row `pivotX`/`pivotY` (0..1 of the image): the
shoulder, found as the top of the band where the arm touches the body. Rotate the arm sprite
around that point.

## Tiers

| Tier | Reads as                                                                   |
| ---- | -------------------------------------------------------------------------- |
| 1    | Fresh: worn leather and iron, muted colours, simple shapes                 |
| 2    | Proven: steel, a cape or crest, the pantheon accent colour                 |
| 3    | Divine: gold trim, a glowing motif of the divine parent, bigger silhouette |

Silhouette must change between tiers (not only colour), so a tier reads at phone size.

Heroes and buildings get a picture per tier. **Monsters have tier-1 pictures only**: the game
shows a tougher monster by colour (tint) in code.

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

- `kind`: `hero`, `mon`, `bld`, `ter` or `ui`. `tier` and `view` are `null` when the id has none.
- Rig pieces add `part` (`body` or `arm`); arm rows add `pivotX`, `pivotY`.
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

## Pipeline (Art)

| Step  | Command                                         | Does                                              |
| ----- | ----------------------------------------------- | ------------------------------------------------- |
| Check | `npm run art:check -- <folder> --sheet out.png` | canvas, flat key, framing; contact sheet + anchor |
| Look  | open the contact sheet                          | style, consistency, readable at phone size        |
| Point | write `<folder>/points.json`                    | per unit still: strike, weapon point(s) in raw px |
| Ship  | `npm run art:ship -- <folder> <B#/R#> [id ...]` | raw to source, sprite to game, manifest rows      |
| Gate  | `npm run validate:art`                          | manifest and PNGs against this spec               |

`points.json` maps each unit still to `{ "strike": "chop", "weapon": [x, y] }` (plus
`"weapon2": [x, y]` for `double`), in pixels of the raw upload. Ship converts them to the
manifest fractions and keeps the file as `assets/source/<batch>/points.json`, so a re-ship finds
them again. A unit still without an entry does not ship. `"fit": true` on an entry re-frames an
upload ChatGPT framed too big or off-centre to the spec framing first (figure 75% of the canvas
height, feet at 88%, centred), so every unit ships at the same scale; the kept source stays the
untouched upload and the points stay in its pixels.

Uploads may be named `<batch>--<id>.png` (Drive), `<id>.png` (`art-inbox` branch) or base64
`<id>.png.b64[.001]` (decoded automatically).
