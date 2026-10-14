# Hero kit: painted parts, builds and worn items

Design owns this spec. It follows Stefan's decisions of 2026-10-14 (`docs/decisions.md`: "Heroes
stay animated parts, with painted pieces", "Hero look approved; heroes are built from a painted
parts kit", "Items have an icon and a worn part; bodies come in builds", "Headgear, weapons and
hand gear are their own items"). Art writes the kit batches (part list, grid, pivots, agreed
with Scene); Scene combines and animates; Balance and Lead write the item rows. Builds on
`items-and-shops.md` (slots, levels, kits), `paths-and-skills.md` section 6 and `look-sheet.md`.

## Bottom line

- **Seven sockets on the body:** head, headgear, cloak, torso, legs, weapon, off-hand. The rig
  moves them; each holds one painted piece.
- **Items fill five of them:** headgear, torso, legs, weapon and off-hand are items, each with
  its own painted worn piece and its own icon (Stefan: "Headgear should be its own thing", "all
  weapons and hand gear would be own things"). Potions and charms do not show on the body.
- **The god shows through face, cloak, colours and emblem:** the face and hair (2 per god), the
  god's cloak, the god's two colours on the cloak and trim, and a small god emblem on the cloak
  clasp. The path changes the cloak at tier 2.
- **Four builds** (lean, broad, tall, short) are scale rows in Scene's data, not art. Each god
  allows two; a hero gets one by seed when it arrives and keeps it.
- **M2 (Aesir) needs 82 worn pieces, 48 icons and 8 portraits**, in two batches: a **first batch
  of 46 pieces, 20 icons and 8 portraits** that makes a full M2 run look right (levels 0 and 1),
  then **36 pieces and 28 icons** for levels 2 and 3 and the path cloaks (section 5).

## 1. Sockets

| Socket   | Filled by                                                     | Level 0 (a hero's start)  |
| -------- | ------------------------------------------------------------- | ------------------------- |
| head     | the face with hair (2 faces per god); never an item           | the face                  |
| headgear | a headgear item (helm, hood, hat)                             | none: the hair shows      |
| cloak    | the god's cloak; the path's cloak from tier 2                 | the god's cloak           |
| torso    | a body armour item, by kit (chest layer)                      | the base tunic            |
| legs     | the same armour item, by kit (trousers and boots layers)      | the base legs and boots   |
| weapon   | a weapon item; each weapon is its own piece                   | the god's starting weapon |
| off-hand | an off-hand item (shield, second blade, focus); its own piece | empty hand                |

- **Sockets and Art's segments** (`asset-spec.md`, "Parts kit"): head = head, headgear =
  headgear, cloak = cloak, torso = torso (chest layer), legs = thigh (trousers) and shin (boots),
  weapon = weapon, off-hand = offhand. Upperarm and forearm stay base segments in M2.
- **The keeps rule, revised:** face, hair and the god's cloak, colours and emblem never change
  for a god's child; what the hero wears on head, body and hands is its gear.
- **The god's read** without fixed headgear: the cloak's shape and the god's two colours (Odin
  blue-grey and pale gold, Thor red and gold, Loki green and lime, Freyja rose and cream; from
  `paths-and-skills.md` section 6), and the **emblem** on the clasp: Odin a raven, Thor a hammer,
  Loki a serpent, Freyja a falcon feather. Scene can show the emblem bigger on the Party panel.
- **The path's read:** its tier 2 cloak, its accent colour on trim and effects; tier 3 adds code
  effects (glow, motes). The hats and helms in the path table become headgear items a hero can
  buy, not path pieces.

## 2. Item slots and families

| Slot     | Families (M2 Aesir in bold)                                                           | Levels | Buys at | Worn socket |
| -------- | ------------------------------------------------------------------------------------- | ------ | ------- | ----------- |
| weapon   | **staff, spear, hammer, daggers, wand**; later sword, axe, bow, khopesh, claws        | 0-3    | smithy  | weapon      |
| armour   | **heavy, light, robe** (the template's kit)                                           | 0-3    | smithy  | torso, legs |
| headgear | **heavy helm, light hood, robe hat** (by kit)                                         | 0-3    | smithy  | headgear    |
| off-hand | **shield** (heavy kit), **second blade** (light kit), **focus** (robe kit: rune tome) | 0-3    | smithy  | off-hand    |
| potion   | **healing potion**                                                                    | count  | market  | none        |
| charm    | the four charms (M3)                                                                  | one    | market  | none        |

- **Each weapon level is its own item and piece:** for example staff 0 "Ash staff", 1
  "Tempered staff", 2 "Runed staff", 3 "Star staff"; Balance and Lead name the rows. The family
  comes from the hero's god at tier 1 and its path from tier 2 (Odin staff, Thor hammer, Loki
  daggers, Freyja wand; Wanderer and Valkyrie spear, Stormcaller and Seidkona staff).
- **Armour** stays one item (one level) that fills torso and legs; plain at level 1, finer at 2
  and 3, each level its own chest piece.
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

- **Ids follow Art's scheme** (`asset-spec.md` "Item ids", `art/item-ids`; Art owns ids): an
  item id is `<slot>_<kind>_<level>`, underscores only (`head_helm_2`, `offhand_blade_1`,
  `weapon_staff_0`); its icon is `ui_item_<item id>`; its worn layer is a `kit_` sheet cell:
  `layer_headgear_<item id>`, `layer_torso_<item id>`, legs as `layer_thigh_<item id>` plus
  `layer_boot_<item id>`, and weapons and off-hands use the item id itself. Base parts are
  `<slot>_<variant>` (`head_odin_a`, `cloak_odin`).

## 3. Builds

Builds are rows of per-segment scale factors and socket offsets in Scene's data (no extra art).

| Build | Reads as                        | Aesir gods that allow it |
| ----- | ------------------------------- | ------------------------ |
| lean  | narrow shoulders, light step    | Odin, Loki, Freyja       |
| broad | wide chest and arms, heavy step | Thor, Freyja             |
| tall  | long limbs, a head taller       | Odin                     |
| short | stocky and low                  | Thor, Loki               |

- **Rule:** each god lists two builds (Odin tall or lean, Thor broad or short, Loki lean or short,
  Freyja lean or broad); a new hero gets one of the two, 50/50, from the run's seed, and keeps it.
- **Not by class:** the template sets the armour kit, not the body.

## 4. Data rows

| Row       | Field                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| GodDef    | `builds: [string, string]`, `faces: [string, string]`, `cloak`, `colours: [string, string]`, `emblem`, `weapon`                                |
| PathDef   | `cloak` and `weapon` (family) for tier 2                                                                                                       |
| ItemDef   | `slot` gains `headgear` and `offhand`; weapon rows get a `family`; every row gets `icon` and `worn` (part ids per kit for armour and headgear) |
| UnitState | `build`; `items` gains `headgear` and `offhand` levels                                                                                         |
| Manifest  | Art's scheme in `asset-spec.md`: `ui_item_<item>` icons, `kit_<name>` sheets with `<slot>_<variant>` parts and `layer_<slot>_<item>` layers    |

### Paste-ready look rows (Aesir; Lead approved 2026-10-14)

Part ids follow Art's `<slot>_<variant>` scheme (`asset-spec.md`); the emblem is a layer on the cloak; colours are the god's
cloak and trim from today's parts data (`src/data/heroParts.gen.ts`), so the look carries over.

```ts
// GodDef look fields (with the existing id, pantheon, name, template, damageType)
{ id: 'odin',   builds: ['tall', 'lean'],  faces: ['head_odin_a', 'head_odin_b'],
  cloak: 'cloak_odin',   colours: ['#41507a', '#c8b27a'], emblem: 'layer_cloak_emblem_raven' },
{ id: 'thor',   builds: ['broad', 'short'], faces: ['head_thor_a', 'head_thor_b'],
  cloak: 'cloak_thor',   colours: ['#a8392c', '#d9a441'], emblem: 'layer_cloak_emblem_hammer' },
{ id: 'loki',   builds: ['lean', 'short'], faces: ['head_loki_a', 'head_loki_b'],
  cloak: 'cloak_loki',   colours: ['#4f8a3a', '#8fbf4a'], emblem: 'layer_cloak_emblem_serpent' },
{ id: 'freyja', builds: ['lean', 'broad'], faces: ['head_freyja_a', 'head_freyja_b'],
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
- **Base body may shrink:** Stefan is testing floating against bent limbs with Grim; if floating
  wins, the base body has fewer segments and section 5's first batch drops by the same number.

- **Fallbacks:** a missing worn piece shows the base part (or nothing for headgear and
  off-hand), a missing icon a plain slot icon.
- **Saves:** new slots and `build` change the hero's shape: bump the save version with a
  migration (old heroes: level 0 headgear and off-hand, the god's first build).
- **Magenta** stays the upload chroma key; Art and Scene pick the technical form for
  replaceable areas, as the decision says.

## 5. M2 count (the four Aesir gods), by batch

| Group           | First batch | Later  | What                                                                              |
| --------------- | ----------- | ------ | --------------------------------------------------------------------------------- |
| Base body       | 5           |        | torso, upperarm, forearm (with hand), thigh, shin (with boot)                     |
| Faces           | 8           |        | 2 per god, with hair                                                              |
| God cloaks      | 4           |        | one per god, in its colours                                                       |
| Emblems         | 4           |        | raven, hammer, serpent, falcon feather (clasp size)                               |
| Path cloaks     |             | 8      | one per path, for tier 2                                                          |
| Chest (armour)  | 3           | 6      | heavy, light, robe: level 1 first; levels 2 and 3 later                           |
| Legs (armour)   | 6           |        | heavy, light, robe x trousers and boots (one look for levels 1-3)                 |
| Headgear        | 3           | 6      | heavy helm, light hood, robe hat: level 1 first; levels 2 and 3 later             |
| Weapons         | 10          | 10     | 5 families x levels 0 and 1 first; levels 2 and 3 later                           |
| Off-hands       | 3           | 6      | shield, second blade, focus: level 1 first; levels 2 and 3 later                  |
| **Worn pieces** | **46**      | **36** | **82 in all**                                                                     |
| Icons           | 20          | 28     | one per item row: armour 3+6, headgear 3+6, weapons 10+10, off-hand 3+6, potion 1 |
| Portraits       | 8           |        | one per face (`por_<face>`, Stefan via Lead)                                      |

- **Why this split:** a typical run reaches level 1 gear by 8:00 and level 2 late; until the
  later batch lands, a level 2 or 3 item shows its level 1 piece and icon (fallback by family).
- Greek and Egyptian gods add faces, cloaks, emblems, path cloaks and their weapon families in
  M3; base body, armour, headgear and off-hand pieces are shared.

## 6. Backlog rows (proposed)

| Role    | Order | Row                                                                                             |
| ------- | ----- | ----------------------------------------------------------------------------------------------- |
| Art     | 10    | First kit batch: 46 pieces, 20 icons, 8 portraits (section 5)                                   |
| Art     | 20    | Later kit batch: 36 pieces, 28 icons                                                            |
| Scene   | 10    | Combine a hero from build (scale rows), face, cloak, emblem and items; fall back per socket     |
| Scene   | 20    | Inventory, shop and hero tap show item icons                                                    |
| Sim     | 10    | `build` on the hero (seeded pick from the god's two); headgear and off-hand slots; save bump    |
| Balance | 10    | Item rows: weapon rows per family and level, headgear and off-hand rows with effects and prices |
| Lead    | 10    | GodDef look fields (faces, cloak, colours, emblem, builds), PathDef cloak and weapon family     |

## Decided (Stefan, 2026-10-14)

1. **Headgear is its own item slot**, not the god's fixed piece and not tied to armour level.
2. **Every weapon and off-hand item is its own painted piece and icon**, not one piece per
   family with a level glow.
