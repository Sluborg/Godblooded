# Hero kit: painted parts, builds and worn items

Design owns this spec. It follows Stefan's decisions of 2026-10-14 (`docs/decisions.md`: "Heroes
stay animated parts, with painted pieces", "Hero look approved; heroes are built from a painted
parts kit", "Items have an icon and a worn part; bodies come in builds", "Headgear, weapons and
hand gear are their own items") and the approved compact look of 2026-10-16 ("Round 5: hero look
approved": compact rig, big stern adult head, short body, floating fists and boots; a shield
replaces the off-hand). Art writes the kit batches (part list, grid, pivots, agreed
with Scene); Scene combines and animates; Balance and Lead write the item rows. Builds on
`items-and-shops.md` (slots, levels, kits), `paths-and-skills.md` section 6 and `look-sheet.md`.

## Bottom line

- **The compact rig (G7, approved):** a big head, a short body, two floating fists and two
  floating boots; no arms or legs. Scene moves fists and boots in code.
- **Seven sockets:** head, headgear, cloak, torso, boots, weapon, off-hand; plus the two base
  fists, which are never items.
- **Items fill five sockets:** headgear, torso and boots (armour), weapon and off-hand; each item
  has its own painted piece and icon. Potions and charms do not show on the body.
- **A shield replaces the off-hand fist** (Stefan, G7): drawn from the front at the off-hand
  socket, grip hidden, no hand. A second blade or a focus is held by the off-hand fist.
- **Heads are a shared pool** (face, hair and beard in one piece), picked by seed; **the god
  shows through cloak, colours and emblem.** The path changes the cloak at tier 2.
- **Four builds** (lean, broad, tall, short) stay scale rows in Scene's data, not art.
- **No portraits:** a portrait is the in-game hero drawn larger. One facing (right, mirrored).
- **M2 (Aesir) needs 77 pieces and 48 icons**, in two batches: **41 pieces and 20 icons first**
  (a full M2 run looks right), then **36 pieces and 28 icons** (levels 2 and 3, path cloaks).

## 1. Sockets

| Socket   | Filled by                                                      | Level 0 (a hero's start)  |
| -------- | -------------------------------------------------------------- | ------------------------- |
| head     | a head from the shared pool (face, hair, beard); never an item | the head                  |
| headgear | a headgear item (helm, hood, hat)                              | none: the hair shows      |
| cloak    | the god's cloak; the path's cloak from tier 2                  | the god's cloak           |
| torso    | a body armour item, by kit (chest layer)                       | the base tunic            |
| boots    | the same armour item, by kit (one pair of floating boots)      | the base boots            |
| weapon   | a weapon item; each weapon is its own piece                    | the god's starting weapon |
| off-hand | an off-hand item (shield, second blade, focus); its own piece  | the empty off-hand fist   |

- **Sockets and Art's segments** (`asset-spec.md`, "Parts kit", floating mode): head = head,
  headgear = headgear, cloak = cloak, torso = torso, boots = boot (drawn twice), weapon = weapon,
  off-hand = offhand; hand is the base fist (drawn twice). No upperarm, forearm, thigh or shin.
- **The shield rule:** with a shield in the off-hand, Scene hides the off-hand fist and draws the
  shield at its socket, face on, so no hand shows (Stefan's G7 note on the old warrior). The main
  hand always shows its fist on the weapon grip.
- **Drawn for animation** (Stefan's mock feedback, `docs/decisions.md` 2026-10-16):
  - **Heads apart:** every head is its own part with a collar or neck overlap at the base, so it
    can bob, tilt and turn toward a target with no seam or clipping in any pose. The torso's neck
    sits under that collar.
  - **Boots toes forward:** boots point the way the hero walks (toes forward in the front view,
    toes in the walk direction from the side), never splayed. The base boot is redrawn this way.
  - **Weapons for big arcs:** each weapon is drawn so the fist grips it low enough for a full
    swing: overhead chops for axes and hammers, thrusts for spears and daggers, a wind-up and
    follow-through. Scene owns the motion; Art keeps the grip pivot at the real hand position.
- **The keeps rule, revised:** the head and the god's cloak, colours and emblem never change
  for a god's child; what the hero wears on head, body and hands is its gear.
- **The god's read** without fixed headgear: the cloak's shape and the god's two colours (Odin
  blue-grey and pale gold, Thor red and gold, Loki green and lime, Freyja rose and cream; from
  `paths-and-skills.md` section 6), and the **emblem** on the clasp: Odin a raven, Thor a hammer,
  Loki a serpent, Freyja a falcon feather. Scene can show the emblem bigger on the Party panel.
- **The path's read:** its tier 2 cloak, its accent colour on trim and effects; tier 3 adds code
  effects (glow, motes). The hats and helms in the path table become headgear items a hero can
  buy, not path pieces.

## 2. Item slots and families

| Slot     | Families (M2 Aesir in bold)                                                           | Levels | Buys at | Worn socket  |
| -------- | ------------------------------------------------------------------------------------- | ------ | ------- | ------------ |
| weapon   | **staff, spear, hammer, daggers, wand**; later sword, axe, bow, khopesh, claws        | 0-3    | smithy  | weapon       |
| armour   | **heavy, light, robe** (the template's kit)                                           | 0-3    | smithy  | torso, boots |
| headgear | **heavy helm, light hood, robe hat** (by kit)                                         | 0-3    | smithy  | headgear     |
| off-hand | **shield** (heavy kit), **second blade** (light kit), **focus** (robe kit: rune tome) | 0-3    | smithy  | off-hand     |
| potion   | **healing potion**                                                                    | count  | market  | none         |
| charm    | the four charms (M3)                                                                  | one    | market  | none         |

- **Each weapon level is its own item and piece:** for example staff 0 "Ash staff", 1
  "Tempered staff", 2 "Runed staff", 3 "Star staff"; Balance and Lead name the rows. The family
  comes from the hero's god at tier 1 and its path from tier 2 (Odin staff, Thor hammer, Loki
  daggers, Freyja wand; Wanderer and Valkyrie spear, Stormcaller and Seidkona staff).
- **Armour** stays one item (one level) that fills torso and boots; plain at level 1, finer at 2
  and 3, each level its own torso piece; one boot pair per kit serves levels 1-3.
- **Headgear and off-hand are new item slots** (Sim and Balance; section 4). Balance's rows
  (`balance/hero-kit` 446bc1f): the off-hand follows the kit (heavy shield, light second blade,
  robe focus).

| Item       | Price | Heavy: armour / Wp | Light          | Robe           | Worn (heavy / light / robe)    |
| ---------- | ----- | ------------------ | -------------- | -------------- | ------------------------------ |
| Headgear 1 | 10    | +1 / 0             | +1 / 0         | 0 / +1         | helm, hood, hat (level 1)      |
| Headgear 2 | 65    | +3 / 0             | +1 / +1        | 0 / +1         | helm, hood, hat (level 2)      |
| Headgear 3 | 140   | +4 / +1            | +2 / +1        | +1 / +2        | helm, hood, hat (level 3)      |
| Off-hand 1 | 10    | shield +1 armour   | blade +3% crit | focus +1 power | shield, blade, focus (level 1) |
| Off-hand 2 | 65    | shield +3 armour   | blade +5% crit | focus +2 power | shield, blade, focus (level 2) |
| Off-hand 3 | 140   | shield +4 armour   | blade +8% crit | focus +3 power | shield, blade, focus (level 3) |

- **Ids follow Art's scheme** (`asset-spec.md` "Item ids", `art/item-ids` 900ce8c; the first
  kit batch is G12, `art/hero-kit` e07dded; Art owns ids). One item per level, a worn piece per kit: icons `ui_item_armour_N`,
  `ui_item_headgear_N`, `ui_item_offhand_N` (N 1-3) and `ui_item_weapon_<kind>_N` (N 0-3);
  worn armour as `layer_torso_<kit>_N` (a layer over the tunic) and `layer_boot_<kit>_1` (one
  pair per kit, the size of `boot_base`, drawn in its place; the thigh layers go with the compact
  rig), `layer_headgear_<helm|hood|hat>_N`,
  `offhand_<shield|blade|focus>_N`, `weapon_<kind>_N`. Base parts are `<slot>_<variant>`
  (`torso_base`, `hand_base`, `boot_base`, `head_a` to `head_h` for the shared heads,
  `cloak_odin`, `layer_cloak_emblem_raven`). Headgear covers the hair, so no separate hair piece.

## 3. Builds

Builds are rows of per-segment scale factors and socket offsets in Scene's data (no extra art).

| Build | Reads as                                 | Aesir gods that allow it |
| ----- | ---------------------------------------- | ------------------------ |
| lean  | narrow shoulders, light step             | Odin, Loki, Freyja       |
| broad | wide chest and arms, heavy step          | Thor, Freyja             |
| tall  | a taller body, fists and boots set wider | Odin                     |
| short | stocky and low                           | Thor, Loki               |

- **Rule:** each god lists two builds (Odin tall or lean, Thor broad or short, Loki lean or short,
  Freyja lean or broad); a new hero gets one of the two, 50/50, from the run's seed, and keeps it.
- **Not by class:** the template sets the armour kit, not the body.

## 4. Data rows

| Row       | Field                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| GodDef    | `builds: [string, string]`, `cloak`, `colours: [string, string]`, `emblem`, `weapon`                                                           |
| PathDef   | `cloak` and `weapon` (family) for tier 2                                                                                                       |
| ItemDef   | `slot` gains `headgear` and `offhand`; weapon rows get a `family`; every row gets `icon` and `worn` (part ids per kit for armour and headgear) |
| UnitState | `build` and `head` (seeded from the shared pool); `items` gains `headgear` and `offhand` levels                                                |
| Manifest  | Art's scheme in `asset-spec.md`: `ui_item_<item>` icons, `kit_<name>` sheets with `<slot>_<variant>` parts and `layer_<slot>_<item>` layers    |

### Paste-ready look rows (Aesir; Lead approved 2026-10-14)

Part ids follow Art's `<slot>_<variant>` scheme (`asset-spec.md`); the emblem is a layer on the cloak; colours are the god's
cloak and trim from today's parts data (`src/data/heroParts.gen.ts`), so the look carries over.

```ts
// GodDef look fields (with the existing id, pantheon, name, template, damageType)
{ id: 'odin',   builds: ['tall', 'lean'],
  cloak: 'cloak_odin',   colours: ['#41507a', '#c8b27a'], emblem: 'layer_cloak_emblem_raven' },
{ id: 'thor',   builds: ['broad', 'short'],
  cloak: 'cloak_thor',   colours: ['#a8392c', '#d9a441'], emblem: 'layer_cloak_emblem_hammer' },
{ id: 'loki',   builds: ['lean', 'short'],
  cloak: 'cloak_loki',   colours: ['#4f8a3a', '#8fbf4a'], emblem: 'layer_cloak_emblem_serpent' },
{ id: 'freyja', builds: ['lean', 'broad'],
  cloak: 'cloak_freyja', colours: ['#9d4f6a', '#f1e8d4'], emblem: 'layer_cloak_emblem_feather' },

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

- **Tier 1 weapon family** comes from the god: Odin staff, Thor hammer, Loki daggers, Freyja
  wand (`weapon` on GodDef too: `'staff' | 'hammer' | 'daggers' | 'wand'`).
- **Flamebinder** keeps the daggers family for its item rows; its look is flame in both hands
  (code effect over the weapon socket).
- **Fallbacks:** a missing worn piece shows the base part (or nothing for headgear and
  off-hand), a missing icon a plain slot icon.
- **Saves:** new slots, `build` and `head` are saved on the hero, so Sim bumps the save version with a
  migration (old heroes: level 0 headgear and off-hand, the god's first build, a head seeded
  from the hero's id).
- **Magenta** stays the upload chroma key; Art and Scene pick the technical form for
  replaceable areas, as the decision says.

## 5. M2 count (the four Aesir gods), by batch

One facing (right, mirrored), so one picture per piece.

| Group          | First batch | Later  | What                                                                                             |
| -------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------ |
| Base body      | 3           |        | torso (plain tunic, neck under the collar), fist (drawn twice), boot (toes forward, drawn twice) |
| Heads          | 8           |        | shared pool with hair and beard; the approved G7 heads can seed it                               |
| God cloaks     | 4           |        | one per god, in its colours                                                                      |
| Emblems        | 4           |        | raven, hammer, serpent, falcon feather (clasp size)                                              |
| Path cloaks    |             | 8      | one per path, for tier 2                                                                         |
| Torso (armour) | 3           | 6      | heavy, light, robe: level 1 first; levels 2 and 3 later                                          |
| Boots (armour) | 3           |        | heavy, light, robe (one pair per kit for levels 1-3), toes forward; stay in the first batch      |
| Headgear       | 3           | 6      | heavy helm, light hood, robe hat: level 1 first; levels 2 and 3 later                            |
| Weapons        | 10          | 10     | 5 families x levels 0 and 1 first; levels 2 and 3 later                                          |
| Off-hands      | 3           | 6      | shield, second blade, focus: level 1 first; levels 2 and 3 later                                 |
| **Pieces**     | **41**      | **36** | **77 in all**                                                                                    |
| Icons          | 20          | 28     | one per item row: armour 3+6, headgear 3+6, weapons 10+10, off-hand 3+6, potion 1                |

- **Down from 46 + 8 portraits:** no upperarm, forearm, thigh or shin (-2 base parts), one boot
  pair per kit instead of trousers and boots (-3), no portraits (-8).
- **Why this split:** a typical run reaches level 1 gear by 8:00 and level 2 late; until the
  later batch lands, a level 2 or 3 item shows its level 1 piece and icon (fallback by family).
- Greek and Egyptian gods add a few heads, cloaks, emblems, path cloaks and their weapon families in
  M3; base body, armour, headgear and off-hand pieces are shared.

## 6. Backlog rows (proposed)

| Role    | Order | Row                                                                                                                                           |
| ------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Art     | 10    | First kit batch: 41 pieces, 20 icons (section 5)                                                                                              |
| Art     | 20    | Later kit batch: 36 pieces, 28 icons                                                                                                          |
| Scene   | 10    | Compact rig: build (scale rows), head, cloak, emblem, items; floating fists and boots; shield hides the off-hand fist; portraits drawn larger |
| Scene   | 20    | Inventory, shop and hero tap show item icons                                                                                                  |
| Sim     | 10    | `build` and `head` on the hero (seeded); headgear and off-hand slots; save bump                                                               |
| Balance | 10    | Item rows: weapon rows per family and level, headgear and off-hand rows with effects and prices                                               |
| Lead    | 10    | GodDef look fields (cloak, colours, emblem, builds), PathDef cloak and weapon family                                                          |

## Decided (Stefan)

1. **Headgear is its own item slot**, not the god's fixed piece and not tied to armour level
   (2026-10-14).
2. **Every weapon and off-hand item is its own painted piece and icon**, not one piece per
   family with a level glow (2026-10-14).
3. **The compact rig is the hero look** (G7, 2026-10-16): big stern adult head, short body,
   floating fists and boots, painted grim gear; a shield replaces the off-hand; no separate
   portraits.
