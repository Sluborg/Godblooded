# Asset spec

Art owns this file. The house style is `art-tasks/STYLE.md`; this is the technical contract.

## Ids

| Kind     | Id                                  | Example                 |
| -------- | ----------------------------------- | ----------------------- |
| Hero     | `hero_<class>_t<1-3>_<front\|back>` | `hero_warrior_t2_front` |
| Monster  | `mon_<type>_t<1-3>_<front\|back>`   | `mon_draugr_t1_back`    |
| Building | `bld_<type>_t<1-3>`                 | `bld_temple_aesir_t3`   |
| Terrain  | `ter_<name>`                        | `ter_grass_a`           |
| UI       | `ui_<name>`                         | `ui_flag_bounty`        |

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
- Shipped: keyed to alpha, trimmed with the anchor kept (feet or base centre), downscaled to 256 px
  tall (units) or 512 px wide (buildings), PNG. Anchors recorded in the manifest.

## Tiers

| Tier | Reads as                                                                   |
| ---- | -------------------------------------------------------------------------- |
| 1    | Fresh: worn leather and iron, muted colours, simple shapes                 |
| 2    | Proven: steel, a cape or crest, the pantheon accent colour                 |
| 3    | Divine: gold trim, a glowing motif of the divine parent, bigger silhouette |

Silhouette must change between tiers (not only colour), so a tier reads at phone size.

## Manifest

`public/assets/manifest.json`: `{ id, kind, tier, view, file, anchorX, anchorY, license, source }`.
`license` is "own (ChatGPT, Stefan's account)", `source` the batch id.
