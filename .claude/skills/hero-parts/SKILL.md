---
name: hero-parts
description: Make Godblooded hero parts (heads, bodies, weapons) drawn in code in the shared forge style, check them on a contact sheet, and rebuild the grading page. Use when asked to add, change or mass-produce hero parts, or to update the parts forge.
---

# Hero parts (code-drawn)

Heroes are drawn in code, not painted (Stefan, 2026-11-11: "the photo you did, but prettier";
the detailed painted eggs and heads read badly). Every part is a small draw function built
from one shared kit, so a new head, body or weapon matches the rest by construction.

## Files

| File                  | What it holds                                                                 |
| --------------------- | ----------------------------------------------------------------------------- |
| `kit.js`              | colour helpers, shape paths (`C`, `E`, `P`, `R`, `eggPath`), `paint`, palette |
| `parts.js`            | `HEADS`, `BODIES`, `WEAPONS`: one entry per part                              |
| `hero.js`             | capes, attack keys, walk pose, `drawHero` (assembly and motion)               |
| `forge.template.html` | the grading page without the drawing code                                     |
| `build.mjs`           | inlines kit, parts and hero into the template: `node build.mjs out.html`      |
| `render.mjs`          | contact sheet PNG of every part and assembled hero: `node render.mjs out.png` |

The scripts are plain browser JavaScript, concatenated in the order kit, parts, hero. Grading page
(Lead publishes it): https://claude.ai/artifact/Fo4mjuGVC7VCnJXcgtqiYo

## Style rules

- **Simple first.** Big clear shapes, few details. Nothing smaller than about 0.4 units; it
  vanishes at game size. If a part needs explaining at full size, it is too detailed.
- **Adult, grim chibi.** Big head, stern brows with the inner ends low, small dark eyes, scars,
  braids and beards for character. 3/4 view facing right.
- **One look.** Fill shapes with `paint(fill, path, box, opts)`: light top-left to dark
  bottom-right, a light rim, optional `grit` (a seed number) for wear, and a thin outline in a
  darker shade of the fill. Use `flat` for eyes and small marks, `stroke` for lines.
- **Muted palette.** Colours come from `COL`, `TIER`, `CAPES` or the part's own fields (`skin`,
  `hair`). Add a colour to `COL` instead of writing a new hex inside a draw function.
- **Judge at game size.** A hero is about 36 px tall in the game. The sheet's bottom row and the
  forge's corner box show that size; a part that does not read there fails.

## Coordinates (game units, y grows down)

Everything is drawn in **3/4 view, turned about 45 degrees toward the camera, facing right**
(Stefan, 2026-11-11), the usual view for games seen from above at an angle. `face: -1` mirrors the
whole hero to face left. Every part uses the same view.

- **Hero:** about 44 units tall, ground at y 0.
- **Head:** origin is the chin. Skull ellipse centre (0.4, -8.8), radii 7.4 x 7.9, jaw turned to the
  right. The face's centre line is at x 3.4 (`FACE_X`): near eye (1.5, -9.4) a little larger, far
  eye (5, -9.3), nose inside the face just right of the centre line, mouth below it, ear on the
  left at (-5.2, -8.4). Women (`fem: true`) get thin arched brows, lashes, a smaller nose, lips and
  an earring; men get heavy brows with the inner ends low. Beards wrap the jaw and end on the upper
  chest (no lower than about +4 from the chin).
- **Body:** origin is the ground under the middle. An egg, barrel or bell from `bodyPoints(b)`
  (`w`, `h`, `base` about -2 to -3, `kind`, optional `flat` hem and `flare`). The front's centre line
  is at `centreX(b)` (right of the middle): buckle, plate ridge, robe opening and laces go there.
  Bands (`belt`, `hem`, `bandPath`) curve down a little in the middle. Clip patterns with
  `within(b, fn)`. The head sits at `(0.2, bodyTop(b) + 1.8)`.
- **Hands and feet:** balls of radius 2.5 in the head's skin colour; feet ellipses 3.4 x 2. Sizes
  are fixed for every hero. The shield is on the near hand (on the left, closest to the camera,
  at (-5.8, -10.8)), drawn over the body; the weapon is in the far hand on the right (resting at
  (6.4, -11.6)), drawn behind the body. The far foot stands a little higher (further back).
- **Weapon:** origin is the grip, the haft points up (-y). Set `tip` to the striking end. One-handed
  weapons reach up to about -17, staffs to about -27.
- **Shield:** origin is the shield hand; its face is turned to the camera and painted in the party
  colour, with a metal boss and rim in the tier's metals.

## Layers (back to front)

`cloak.back`, `head.back` (hair or braids that hang behind the body), far foot, near foot, the
weapon and the far hand, body, `cloak.front`, head, the near hand with the shield, strike trail.

- **The cloak is one garment** (`CLOAKS`): gathered on top of the shoulders, pinned at the throat,
  hanging down the back. Its shoulders never move; only the hem sways when walking.
  `CLOAK_LENGTH` sets its length.
- Hair falling down the back goes in an optional `head.back(h)`, so it never covers the body.

## Tiers

The same part at every tier: never change the face, hair or body shape by tier.
`draw(tier, ti)` gets `TIER[ti]` (iron, silver, gold metal and trim colours) and the index.
Tier 2 adds engraving lines; tier 3 adds a gem, and `hero.js` adds the glow and strike sparks.

## Add a part

1. Copy the closest entry in `parts.js` and give it the next id (`head-6`, `body-6`,
   `weapon-6`) and a short name.
2. Change shapes and colours with kit helpers only. Keep inside the coordinates above.
3. Render the sheet and look at it, the game-size row first:
   `CHROMIUM_PATH=/opt/pw-browsers/chromium node .claude/skills/hero-parts/render.mjs sheet.png`
   (leave `CHROMIUM_PATH` out where Playwright finds a browser by itself).
4. Check: reads at game size; silhouette differs from the existing parts; the beard or chin covers
   the body top; no stray colours; no page errors (the script exits non-zero on one).
5. Lead builds and republishes the forge (`node build.mjs forge.html`, then publish to the same
   Artifact URL with `capabilities: { db: {}, user: {} }`), and Stefan grades it.

## Mass production

- **Vary by data, not by copying code.** When several parts differ only in colours or one shape
  (hair colour, beard length, helmet or not), give the entry fields and read them in one shared
  draw function, then add rows.
- **Per god:** a palette row (skin, hair, cloth, cape motif). **Per path:** a weapon at 3 tiers.
- **Batch rhythm:** about 5 new parts per round, sheet checked, forge republished, Stefan grades;
  parts graded 4 or 5 are kept, anything under 4 is revised (see below).

## Reading the grades

The forge stores grades and combos in its Artifact database: collection `grades` (doc id = part
id; fields `score` 1-5, `comment`, `rev`) and `combos` (`head`, `body`, `weapon`, `tier`,
`backHand`, `cape`, `note`). Read them with the ArtifactData tool on the forge URL.

- **4 passes.** Every part graded below 4 is revised in the next round, using its comment.
- **Bump `rev` on every change** to a part (add `rev: 2`, then 3 ...). A grade only counts for the
  `rev` it was given to; the forge shows a changed part as "grade again", so an old grade never
  sticks to a new drawing.
- A part that keeps failing after two revisions is replaced by a new one under a new id.

## Into the game

Scene ports `kit.js` and the graded parts to TypeScript under `src/ui/` behind a test switch,
drawn once per part into a texture. Keep this skill's files as the single reference: change a
part here first, then port it; never fork the drawing code.
