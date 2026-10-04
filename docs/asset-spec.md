# Asset spec

Art owns this file. The house style is `art-tasks/STYLE.md` (classic fantasy strategy, about
4.5 heads tall, reference `art-tasks/ref/hero_warrior_t1_front.png`); this is the technical
contract.

## Ids

| Kind     | Id                                  | Example                 |
| -------- | ----------------------------------- | ----------------------- |
| Hero     | `hero_<class>_t<1-3>_<front\|back>` | `hero_warrior_t2_front` |
| Monster  | `mon_<type>_t<1-3>_<front\|back>`   | `mon_draugr_t1_back`    |
| Building | `bld_<type>_t<1-3>`                 | `bld_temple_aesir_t3`   |
| Terrain  | `ter_<name>`                        | `ter_grass_a`           |
| UI       | `ui_<name>`                         | `ui_flag_bounty`        |

Rig pieces (test, Lead's motion work): a unit id plus `_body` or `_arm`, and a `side` view
(profile facing right), e.g. `hero_warrior_t1_side_arm`. See "Rig pieces" below.

Animation frames: a unit id plus `_walk1`-`_walk4`, `_attack1`-`_attack3` or `_hurt`
(`hero_warrior_t1_front_walk2`); all frames of a unit share canvas, scale and feet position.

Names are lowercase letters; a name of several words joins them with a hyphen
(`mon_jackal-man_t1_front`). The underscore only separates the parts of an id.

## Views and mirroring

- **front:** the unit faces the camera, turned 3/4 toward the lower right.
- **back:** the unit faces away, turned 3/4 toward the upper right.
- The game mirrors both horizontally for leftward movement: 4 directions from 2 images.
- One static pose per view. Motion (walk bob, squash, attack lunge, hit flash, death fade) is
  done in code by Scene. No sprite sheets.

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
| Ship  | `npm run art:ship -- <folder> <B#/R#> [id ...]` | raw to source, sprite to game, manifest rows      |
| Gate  | `npm run validate:art`                          | manifest and PNGs against this spec               |

Uploads may be named `<batch>--<id>.png` (Drive), `<id>.png` (`art-inbox` branch) or base64
`<id>.png.b64[.001]` (decoded automatically).
