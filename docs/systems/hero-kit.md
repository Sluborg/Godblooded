# Hero kit: painted parts, builds and worn items

Design owns this spec. It follows Stefan's decisions of 2026-10-14 (`docs/decisions.md`: "Heroes
stay animated parts, with painted pieces", "Hero look approved; heroes are built from a painted
parts kit", "Items have an icon and a worn part; bodies come in builds"). Art writes the kit
batches (part list, grid, pivots, agreed with Scene); Scene combines and animates; Balance and
Lead write the item rows. Builds on `items-and-shops.md` (slots, levels, kits),
`paths-and-skills.md` section 6 (what each god and path looks like) and `look-sheet.md`.

## Bottom line

- **Six sockets show on the body:** head, torso, legs, cloak, weapon, off-hand. The rig moves
  them; each holds one painted piece.
- **Who fills a socket:** the **god** fills head and cloak (the signature pieces that never
  change), the **path** adds its tier 2 pieces there, and **items** fill torso, legs, weapon and
  off-hand. Potions and charms do not show on the body.
- **Every item has two pictures:** a still **icon** (inventory, shop, loot) and a **worn part**
  for its socket. A missing worn part falls back to the base kit part, a missing icon to a plain
  slot icon: the game never breaks for lack of art.
- **Four builds** (lean, broad, tall, short). Each god allows two; the hero's build is picked by
  seed when it arrives and never changes. A build is not separate art: Scene scales each segment
  and moves its sockets (Art's parts kit rule), so every worn part fits every build.
- **M2 needs about 46 painted layers, 10 icons and 8 portraits** for the four Aesir gods (section 5).

## 1. Sockets

| Socket   | Filled by                                                          | Changes when                         | Shown at level 0           |
| -------- | ------------------------------------------------------------------ | ------------------------------------ | -------------------------- |
| head     | the god's face and hair (2 faces per god), then the god's headgear | the path's tier 2 headgear           | face, hair, god's headgear |
| cloak    | the god's cloak or cape                                            | the path's tier 2 cloak              | the god's cloak            |
| torso    | the armour item, by kit (heavy, light, robe)                       | level 1 plain, level 2 fine          | the build's base tunic     |
| legs     | the armour item, by kit                                            | buying any armour (level 1)          | the build's base legs      |
| weapon   | the weapon item, family from the god or path (section 2)           | weapon level: glow (`look-sheet.md`) | the family's plain piece   |
| off-hand | the shield (heavy kit with a shield path) or the second dagger     | armour level 2 (plain to fine)       | empty hand or plain piece  |

- **The keeps rule holds** (`paths-and-skills.md` section 6): face, hair and the god's signature
  pieces never change. Armour never replaces a signature head or cloak piece; it shows on torso,
  legs and shield.
- **Tier 3** adds no new pieces in M2: it is the tier 2 pieces plus code effects (trim glow,
  motes, the accent colour). The tier 3 mantles in the path table (raven feathers, wolf pelt,
  white fur) come with the M3 kit.
- **Arms, hands and feet** are base segments, so a worn layer always sits on the same transform.
- **Sockets and Art's segments** (`asset-spec.md`, "Parts kit"): head = head (+ headgear layer),
  cloak = cloak, torso = torso (chest layer), legs = thigh + shin (trousers and boots layers),
  weapon = weapon, off-hand = offhand. Upperarm and forearm stay base segments in M2 (bracers
  and gloves can come later as forearm layers).

## 2. Item families per slot

| Item slot | Families (M2 in bold)                                                              | Worn socket           | Family comes from                |
| --------- | ---------------------------------------------------------------------------------- | --------------------- | -------------------------------- |
| weapon    | **staff, spear, hammer, daggers, wand**; later sword, axe, bow, khopesh, claws     | weapon, off-hand      | the god at tier 1, the path at 2 |
| armour    | **heavy, light, robe** (the template's kit), each **plain** (1) and **fine** (2-3) | torso, legs, off-hand | the template's kit               |
| potion    | **healing potion**                                                                 | none (flask pip)      | none                             |
| charm     | the four charms (M3)                                                               | none (icon pip)       | none                             |

- **Weapon level** shows as the glow already specced (none, faint, steady, bright); the piece
  itself does not change in M2. A fine variant per family can follow in M3.
- **Flame in both hands** (Loki Flamebinder) and **ravens** are code effects, not weapon pieces.
- **The lair relic** (M3) is a charm: icon only.

## 3. Builds

Builds are rows of per-segment scale factors and socket offsets in Scene's data (no extra art).

| Build | Reads as                        | Aesir gods that allow it |
| ----- | ------------------------------- | ------------------------ |
| lean  | narrow shoulders, light step    | Odin, Loki, Freyja       |
| broad | wide chest and arms, heavy step | Thor, Freyja             |
| tall  | long limbs, a head taller       | Odin                     |
| short | stocky and low                  | Thor, Loki               |

- **Rule:** each god lists two builds (Odin tall or lean, Thor broad or short, Loki lean or short,
  Freyja lean or broad); a new hero gets one of the two, 50/50, from the run's seed (`sim/rng.ts`),
  and keeps it for life. Two sons of Thor can differ, a son of Odin never looks squat.
- **Not by class:** the template sets the armour kit, not the body; a broad healer is fine.
- **Sim:** the hero carries `build` in the snapshot (set at arrival). Save shape changes, so the
  save version bumps with a migration (old heroes get their god's first build).

## 4. Data rows

| Row       | Field                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GodDef    | `builds: [string, string]`, `faces: [string, string]`, `headgear`, `cloak` (part ids)                                        |
| PathDef   | `headgear?`, `cloak?`, `weapon` (family) for tier 2                                                                          |
| ItemDef   | `icon` (manifest id) and `worn` (part id per kit for armour, per family for weapons); both optional                          |
| UnitState | `build`, plus today's `items`                                                                                                |
| Manifest  | Art proposes the ids (`asset-spec.md` is Art's); Design suggests `part_<socket>_<name>` for pieces and `item_<id>` for icons |

- **Magenta:** it stays the chroma key for uploads, so replaceable areas cannot also be
  magenta; Art and Scene pick the technical form (separate layers on sockets, or a second key
  colour), as the decision says.

## 5. M2 minimum (the four Aesir gods)

| Group           | Pieces | What                                                                                                                            |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Base body       | 5      | torso, upperarm, forearm (with hand), thigh, shin (with boot); builds scale it                                                  |
| Faces           | 8      | 2 per god, with hair (beard, braids, hood edge)                                                                                 |
| God headgear    | 2      | Odin's wide hat, Loki's hood (Thor and Freyja show their hair)                                                                  |
| God cloaks      | 4      | one per god                                                                                                                     |
| Path tier 2     | 8      | headgear for 6 paths (tall hat, iron helm, horned hood, dark hood, winged helm, frost hood), capes for Wanderer and Stormcaller |
| Torso armour    | 6      | heavy, light, robe x plain, fine                                                                                                |
| Legs            | 6      | heavy, light, robe x trousers (thigh) and boots (shin)                                                                          |
| Weapons         | 5      | staff, spear, hammer, daggers, wand                                                                                             |
| Off-hands       | 2      | round shield plain and fine (the second dagger reuses the dagger piece)                                                         |
| **Layer total** | **46** |                                                                                                                                 |
| Icons           | 10     | weapon level 1-3 for weapon kits and casters (6), armour level 1-3 (3), potion (1)                                              |
| Portraits       | 8      | one painted portrait per kit face (`por_<face>`, Stefan via Lead 2026-10-14): Party panel, level-up card                        |

- Greek and Egyptian gods add faces, headgear, cloaks, path pieces and their weapon families
  (sword, bow, khopesh, claws) in M3; the build bodies, torso, legs and shield pieces are shared.

## 6. Backlog rows (proposed)

| Role  | Order | Row                                                                                                        |
| ----- | ----- | ---------------------------------------------------------------------------------------------------------- |
| Art   | 10    | Kit batch for the Aesir: the 46 layers of section 5 on the agreed grid and pivots                          |
| Art   | 20    | Item icons (10) and face portraits (8) of section 5                                                        |
| Scene | 10    | Combine a hero from build (scale rows), face, headgear, cloak, path pieces and items; fall back per socket |
| Scene | 20    | Inventory and shop show item icons; a hero tap shows its worn items                                        |
| Sim   | 10    | `build` on the hero (seeded pick from the god's two), in the snapshot; save bump                           |
| Lead  | 10    | GodDef and PathDef look fields; ItemDef `icon` and `worn`                                                  |

## OPEN

1. **Armour on the head:** Design's start keeps the head for the god and path only (keeps
   rule). Should a heavy-armour hero at level 3 get a helm over the god's headgear?
2. **A fine weapon piece per family** at level 3, or glow only (Design's start: glow in M2)?
