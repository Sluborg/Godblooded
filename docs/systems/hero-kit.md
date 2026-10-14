# Hero kit: pawns, body types and worn items

Design owns this spec. It follows Stefan's decisions in `docs/decisions.md`: "Heroes in the
RimWorld manner, dark and pretty" (2026-10-15, which replaces the parts rig and the portraits),
"Items have an icon and a worn part" and "Headgear, weapons and hand gear are their own items"
(2026-10-14). Art writes the kit batches (sheet, grid, anchors, agreed with Scene); Scene stacks
and moves the pawn; Balance and Lead write the item rows. Builds on `items-and-shops.md` (slots,
levels, kits), `paths-and-skills.md` section 6 and `look-sheet.md`.

## Bottom line

- **A hero is a pawn:** one body sprite with a head sprite on top, worn layers on the body, and a
  weapon and an off-hand drawn on their own. No limbs: Scene slides it with a small bob and
  swings or lunges the weapon in code.
- **Seven slots:** body (type), head (face, hair, beard), headgear, torso layer, cloak, weapon,
  off-hand. Items fill four: headgear, torso layer (armour), weapon and off-hand.
- **Eight bodies:** lean, average, broad and heavy, each male and female. The body is real art
  now, not a scale row.
- **Three facings:** front, side (mirrored for the other side) and back. Weapons, off-hands and
  emblems are one sprite each.
- **No separate portraits:** a portrait is the same pawn drawn larger.
- **The god shows through cloak, colours and emblem;** faces, hair and beards are a shared pool,
  so heroes of one god look like kin, not twins.
- **M2 (Aesir) needs 115 pieces as 276 images, plus 48 icons**, in two batches (section 5): a
  **first batch of 61 pieces (146 images) and 20 icons** that makes a full M2 run look right,
  then **54 pieces (130 images) and 28 icons** for item levels 2 and 3 and the path cloaks.

## 1. Slots

Drawn back to front for the front facing (Scene reverses cloak and off-hand for the back facing).

| Order | Slot        | Filled by                                                              | Level 0 (a hero's start)  | Facings |
| ----- | ----------- | ---------------------------------------------------------------------- | ------------------------- | ------- |
| 10    | body        | the body type and sex (8 bodies), painted in the base tunic and boots  | the body                  | 3       |
| 20    | torso layer | a body armour item, by kit, fitted to the body type                    | none: the tunic shows     | 3       |
| 30    | cloak       | the god's cloak; the path's cloak from tier 2; the emblem on its clasp | the god's cloak           | 3       |
| 40    | head        | a face, with a hair and (optional) a beard layer                       | the face, hair and beard  | 3       |
| 50    | headgear    | a headgear item (helm, hood, hat)                                      | none: the hair shows      | 3       |
| 60    | weapon      | a weapon item; each level its own piece; held in the weapon hand       | the god's starting weapon | 1       |
| 70    | off-hand    | an off-hand item (shield, second blade, focus)                         | empty hand                | 1       |

- **Anchors, per body type and facing** (Scene's data, Art marks them on the sheet): the head
  point, the weapon hand, the off-hand point and the cloak clasp. Heads, headgear, weapons and
  off-hands are shared by all eight bodies; the anchor puts them in place.
- **Torso layers are fitted per body type** (4 fits); male and female of one type share the
  outline under the layer, so one fit covers both. Art confirms or asks for 8 fits.
- **Cloaks are drawn once** and Scene stretches them to the body type's width (a row per type).
  If a stretched cloak reads badly on heavy, Art draws a wide version (2 fits).
- **Facings:** the side facing is drawn facing right and mirrored for left. The back facing hides
  the face, so a head's back sprite shows hair (and the headgear covers it).
- **Hair and skin colour:** Art paints the hair and the skin in neutral tones that Scene tints
  (a few skin tones, a few hair colours, by seed), so one face or hair piece covers many heroes.
  Art may instead paint the tones if tinting dulls the painted look; it then says so and the
  counts in section 5 grow.
- **The keeps rule:** body, face, hair, beard and the god's cloak, colours and emblem never
  change for a hero; what it wears on head, body and hands is its gear.
- **The god's read:** the cloak's shape and the god's two colours (Odin blue-grey and pale gold,
  Thor red and gold, Loki green and lime, Freyja rose and cream; `paths-and-skills.md` section 6)
  and the **emblem** on the clasp: Odin a raven, Thor a hammer, Loki a serpent, Freyja a falcon
  feather. Scene shows it on the front and side facings and bigger on the Party panel.
- **The path's read:** its tier 2 cloak, its accent colour on trim and effects; tier 3 adds code
  effects (glow, motes). The hats and helms in the path table are headgear items a hero buys.
- **Movement and attacks** (Scene, code): a slide with a small bob while walking, a lean on the
  attack, the weapon swings (blunt, blade) or lunges (spear, daggers) or points (staff, wand);
  hurt is a flash and a small knock back; the knockout pose is the body laid flat and greyed.

## 2. Item slots and families

| Slot     | Families (M2 Aesir in bold)                                                           | Levels | Buys at | Worn slot   |
| -------- | ------------------------------------------------------------------------------------- | ------ | ------- | ----------- |
| weapon   | **staff, spear, hammer, daggers, wand**; later sword, axe, bow, khopesh, claws        | 0-3    | smithy  | weapon      |
| armour   | **heavy, light, robe** (the template's kit)                                           | 0-3    | smithy  | torso layer |
| headgear | **heavy helm, light hood, robe hat** (by kit)                                         | 0-3    | smithy  | headgear    |
| off-hand | **shield** (heavy kit), **second blade** (light kit), **focus** (robe kit: rune tome) | 0-3    | smithy  | off-hand    |
| potion   | **healing potion**                                                                    | count  | market  | none        |
| charm    | the four charms (M3)                                                                  | one    | market  | none        |

- **Each weapon level is its own item and piece:** for example staff 0 "Ash staff", 1
  "Tempered staff", 2 "Runed staff", 3 "Star staff"; Balance and Lead name the rows. The family
  comes from the hero's god at tier 1 and its path from tier 2 (Odin staff, Thor hammer, Loki
  daggers, Freyja wand; Wanderer and Valkyrie spear, Stormcaller and Seidkona staff).
- **Armour** is one item per level and one torso layer per level and kit; it no longer has leg
  layers (the body's own legs and boots show).
- **Headgear and off-hand** (Balance's rows, `balance/hero-kit` 446bc1f): the off-hand follows
  the kit (heavy shield, light second blade, robe focus).

| Item       | Price | Heavy: armour / Wp | Light          | Robe           | Worn (heavy / light / robe)    |
| ---------- | ----- | ------------------ | -------------- | -------------- | ------------------------------ |
| Headgear 1 | 10    | +1 / 0             | +1 / 0         | 0 / +1         | helm, hood, hat (level 1)      |
| Headgear 2 | 65    | +3 / 0             | +1 / +1        | 0 / +1         | helm, hood, hat (level 2)      |
| Headgear 3 | 140   | +4 / +1            | +2 / +1        | +1 / +2        | helm, hood, hat (level 3)      |
| Off-hand 1 | 10    | shield +1 armour   | blade +3% crit | focus +1 power | shield, blade, focus (level 1) |
| Off-hand 2 | 65    | shield +3 armour   | blade +5% crit | focus +2 power | shield, blade, focus (level 2) |
| Off-hand 3 | 140   | shield +4 armour   | blade +8% crit | focus +3 power | shield, blade, focus (level 3) |

- **Ids are Art's** (`asset-spec.md`). Icons keep Art's scheme: `ui_item_armour_N`,
  `ui_item_headgear_N`, `ui_item_offhand_N` (N 1-3), `ui_item_weapon_<kind>_N` (N 0-3). Worn
  pieces keep `layer_torso_<kit>_N`, `layer_headgear_<helm|hood|hat>_N`,
  `offhand_<shield|blade|focus>_N` and `weapon_<kind>_N`; the leg layers (`layer_thigh_`,
  `layer_boot_`) go. Art adds the body type and facing to the ids that need them (proposed:
  `body_<sex>_<type>_<facing>`, `layer_torso_<kit>_N_<type>_<facing>`, a `_<facing>` suffix on
  heads, hair, beards, headgear and cloaks).

## 3. Who looks like what

| Pick      | Pool (M2)                       | How a hero gets it                          |
| --------- | ------------------------------- | ------------------------------------------- |
| Sex       | male, female                    | 50/50 by the run's seed                     |
| Body type | lean, average, broad, heavy     | one of its god's two (below), 50/50 by seed |
| Face      | 4 per sex                       | by seed, from its sex's faces               |
| Hair      | 6 styles, each with a few tints | by seed; any sex                            |
| Beard     | none or 1 of 3                  | male: 60% a beard, by seed; female: none    |
| Skin tone | a few tints                     | by seed                                     |

- **Gods and body types:** Odin lean or average, Thor broad or heavy, Loki lean or average,
  Freyja average or broad. The template sets the armour kit, not the body.
- **A name, a face and a body** make a hero to remember; the same seed always builds the same
  pawn, so the Saga (`meta-ui.md`) shows the hero as it was.

## 4. Data rows

| Row       | Field                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| GodDef    | `bodies: [string, string]`, `cloak`, `colours: [string, string]`, `emblem`, `weapon`                                     |
| PathDef   | `cloak` and `weapon` (family) for tier 2                                                                                 |
| ItemDef   | `slot` gains `headgear` and `offhand`; weapon rows get a `family`; every row gets `icon` and `worn` (piece per kit)      |
| UnitState | `look: { sex, body, face, hair, hairTint, beard, skinTint }` (seeded on arrival); `items` gains `headgear` and `offhand` |
| BodyDef   | Scene's anchors per body type and facing (head, weapon hand, off-hand, clasp) and the cloak stretch                      |
| Manifest  | Art's scheme in `asset-spec.md`, with body type and facing where a piece needs them                                      |

### Paste-ready look rows (Aesir)

Colours are the god's cloak and trim from today's parts data (`src/data/heroParts.gen.ts`), so
the look carries over. Part ids are Art's; the emblem is a layer on the cloak clasp.

```ts
// GodDef look fields (with the existing id, pantheon, name, template, damageType)
{ id: 'odin',   bodies: ['lean', 'average'], cloak: 'cloak_odin',
  colours: ['#41507a', '#c8b27a'], emblem: 'layer_cloak_emblem_raven',   weapon: 'staff' },
{ id: 'thor',   bodies: ['broad', 'heavy'],  cloak: 'cloak_thor',
  colours: ['#a8392c', '#d9a441'], emblem: 'layer_cloak_emblem_hammer',  weapon: 'hammer' },
{ id: 'loki',   bodies: ['lean', 'average'], cloak: 'cloak_loki',
  colours: ['#4f8a3a', '#8fbf4a'], emblem: 'layer_cloak_emblem_serpent', weapon: 'daggers' },
{ id: 'freyja', bodies: ['average', 'broad'], cloak: 'cloak_freyja',
  colours: ['#9d4f6a', '#f1e8d4'], emblem: 'layer_cloak_emblem_feather', weapon: 'wand' },

// PathDef look fields (tier 2 on): the path's cloak and its weapon family
{ id: 'odin-seer',          cloak: 'cloak_odin_seer',          weapon: 'staff' },
{ id: 'odin-wanderer',      cloak: 'cloak_odin_wanderer',      weapon: 'spear' },
{ id: 'thor-hammerborn',    cloak: 'cloak_thor_hammerborn',    weapon: 'hammer' },
{ id: 'thor-stormcaller',   cloak: 'cloak_thor_stormcaller',   weapon: 'staff' },
{ id: 'loki-trickster',     cloak: 'cloak_loki_trickster',     weapon: 'daggers' },
{ id: 'loki-flamebinder',   cloak: 'cloak_loki_flamebinder',   weapon: 'daggers' },
{ id: 'freyja-valkyrie',    cloak: 'cloak_freyja_valkyrie',    weapon: 'spear' },
{ id: 'freyja-seidkona',    cloak: 'cloak_freyja_seidkona',    weapon: 'staff' },
```

- **Flamebinder** keeps the daggers family for its item rows; its look is flame in both hands
  (code effect over the weapon).
- **Fallbacks:** a missing body or head shows today's placeholder shape; a missing worn piece
  shows nothing (the tunic, the hair, an empty hand); a missing level 2 or 3 piece shows the
  level 1 piece of its family; a missing icon a plain slot icon.
- **Saves:** `look`, headgear and off-hand change the hero's shape: bump the save version with a
  migration (old heroes get a seeded look from their id, level 0 headgear and off-hand).
- **Magenta** stays the upload chroma key; Art and Scene pick the technical form for tints and
  replaceable areas.

## 5. M2 count (the four Aesir gods), per facing

A piece is one design; it needs one image per facing (3, or 1 for pieces that only rotate).

| Group             | Pieces, first | Pieces, later | Facings | Images, first | Images, later | What                                                          |
| ----------------- | ------------- | ------------- | ------- | ------------- | ------------- | ------------------------------------------------------------- |
| Bodies            | 8             |               | 3       | 24            |               | lean, average, broad, heavy x male, female; tunic and boots   |
| Faces             | 8             |               | 3       | 24            |               | 4 per sex; the back is the back of the head                   |
| Hair              | 6             |               | 3       | 18            |               | shared by both sexes, tinted                                  |
| Beards            | 3             |               | 2       | 6             |               | front and side; hidden from the back                          |
| God cloaks        | 4             |               | 3       | 12            |               | one per god, in its colours                                   |
| Emblems           | 4             |               | 1       | 4             |               | raven, hammer, serpent, falcon feather (clasp size)           |
| Torso layers      | 12            | 24            | 3       | 36            | 72            | 3 kits x 4 body types: level 1 first, levels 2 and 3 later    |
| Headgear          | 3             | 6             | 3       | 9             | 18            | helm, hood, hat: level 1 first, levels 2 and 3 later          |
| Path cloaks       |               | 8             | 3       |               | 24            | one per path, for tier 2                                      |
| Weapons           | 10            | 10            | 1       | 10            | 10            | 5 families x levels 0 and 1 first, levels 2 and 3 later       |
| Off-hands         | 3             | 6             | 1       | 3             | 6             | shield, blade, focus: level 1 first, levels 2 and 3 later     |
| **Worn and body** | **61**        | **54**        |         | **146**       | **130**       | **115 pieces, 276 images in all**                             |
| Icons             | 20            | 28            | 1       | 20            | 28            | one per item row: armour, headgear, weapons, off-hand, potion |

- **Per facing:** each batch's 3-facing pieces need a front, a side and a back image; the first
  batch is 44 images each for front and side and 41 for the back (no beards from behind),
  plus 17 single images; the later batch is 38 per facing, plus 16 single images.
- **Why this split:** a typical run reaches level 1 gear by 8:00 and level 2 late; until the
  later batch lands, a level 2 or 3 item shows its level 1 piece and icon.
- **What could grow it:** painted skin and hair tones instead of tints (Art's call, section 1),
  8 torso fits instead of 4, or a wide cloak for heavy bodies (+4 god cloaks, +8 path cloaks,
  3 facings each).
- **Greek and Egyptian gods** add cloaks, emblems, path cloaks and their weapon families in M3;
  bodies, faces, hair, beards, armour, headgear and off-hands are shared.

## 6. Backlog rows (proposed)

| Role    | Order | Row                                                                                                      |
| ------- | ----- | -------------------------------------------------------------------------------------------------------- |
| Art     | 10    | First pawn batch: 61 pieces, 146 images, 20 icons (section 5), with anchors per body type and facing     |
| Art     | 20    | Later pawn batch: 54 pieces, 130 images, 28 icons                                                        |
| Scene   | 10    | Stack a pawn from body, layers, head and items per facing; slide, bob, swing and lunge; tints; fallbacks |
| Scene   | 20    | Portraits as the pawn drawn larger (Party panel, level-up, Saga); inventory, shop and tap show icons     |
| Sim     | 10    | Seeded `look` on the hero (section 3); headgear and off-hand slots; save bump                            |
| Balance | 10    | Item rows: weapon rows per family and level, headgear and off-hand rows with effects and prices          |
| Lead    | 10    | GodDef look fields (bodies, cloak, colours, emblem, weapon), PathDef cloak and weapon family             |

## Decided

1. **Headgear is its own item slot**, not the god's fixed piece and not tied to armour level
   (Stefan, 2026-10-14).
2. **Every weapon and off-hand item is its own painted piece and icon**, not one piece per
   family with a level glow (Stefan, 2026-10-14).
3. **Heroes are RimWorld-style pawns, painted dark and pretty:** body types, many faces, hair and
   beards, worn layers, three facings, no limbs, no separate portraits (Stefan, 2026-10-15).
