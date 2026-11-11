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

- **Hero:** about 44 units tall, ground at y 0.
- **Head:** near profile. Origin is the chin. Skull from x -6.8 to 7.4, top at y -16.9. One eye
  at (5.1, -9.4) under one brow, nose on the front edge from x 6.4 to 9.3, ear mid-head at
  (-0.8, -8.4).
  Hair and helmets may reach x -9 to 8.6 and y -18.3. Beards may hang to y +5 (a long beard to
  +10).
- **Body:** origin is the ground under the middle, a true side view built by `sidePoints(b)`
  from `w`, `h`, `base` (the bottom, about -2 to -3) and optional `chest`, `belly`, `back`,
  `flare` (robes) and `flat` (a straight hem). Details sit on the front or back edge, never in the
  middle. Clip patterns with `within(b, fn)`; use `belt(b, y)` so the belt wraps past both edges
  with round ends and the buckle on the front. The head sits at `(0.6, bodyTop(b) + 1.8)`.
- **Feet:** ellipses 3.6 x 2, toes forward, at (-2.4, -1.3) and (3, -1.3). **Hands:** balls of
  radius 2.5 in the head's skin colour; the near hand rests on the chest (3.4, -9.8), the far hand
  peeks out at the front (5.8, -12.4). Sizes are fixed for every hero.
- **Weapon:** origin is the grip, the haft points up (-y). Set `tip` to the striking end (used for
  the glow). One-handed weapons reach up to about -17, staffs to about -24.

## Layers (side view, facing right)

Back to front: cape, `head.back` (hair or braids that hang behind the body), feet, far hand (and
its weapon in far-hand mode), body, the cape's drape over the back shoulder, head (face, hair,
beard), weapon, near hand, strike trail. The mantle (the cape's shoulder
piece) always covers the top of the body: `hero.js` measures each body's widest reach over its
top rows (`bodyReach`) and makes the mantle a unit wider, so no body shows above or beside it.
A body may have any shape below the mantle. A head that has hair falling down the back puts it in
an optional `back(h)` function so it never covers the body. Beards end on the upper chest (no
lower than about +4 from the chin). `face: -1` mirrors the whole hero to face left.

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
