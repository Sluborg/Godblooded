# Events: raids, omens and god favours

Design owns this spec. Lead turns the proposed rows into backlog rows and data. Builds on
today's raids (decision 2026-10-04 "Graybox siege": first raid at about 5-6 min, every 2 min,
size grows), `monsters-and-bosses.md` (roles, which shape raids) and `progression.md` (the run
curve). The opt-in difficulty modifiers of `meta.md` are called Trials; omens here are in-run
events.

## Bottom line

- **Raids get a warning and a shape:** 15 s before a raid, a horn and an arrow at the map edge
  show where it comes from; the raid's monsters decide how it behaves (harpies strike fast,
  trolls go for buildings).
- **Omens:** from 3:00, every 100-140 s the run draws one event from a small deck, announced
  20 s ahead by a sign in the sky. Each omen is a short, visible situation with something for
  the heroes to chase: a fallen star, a wandering champion, a merchant caravan.
- **God favours (Stefan, 2026-10-13: the gods act on their own):** built temples fill a favour
  bar; when it is full, the god casts its miracle by itself (Thor's storm, Athena's aegis, Ra's
  dawn) where its children are in the most danger. No button: the player never commands, but
  builds the temples that feed the bars.
- All three are data rows on one event clock in Sim; Scene draws a banner, a sky tint and a
  map marker for each.

## 1. Raids

| Rule    | Today                                                           | Proposed                                                                                                       |
| ------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Timing  | first at `raidFirstMs` (6:00), every 3:00 (`raidEveryMs` 180 s) | also a small raid after every lair tier-up: 1 raider (`tierRaidSize` 1, `tierRaidEvery` 1, Balance 2026-10-14) |
| Warning | none                                                            | event `raidWarning` 15 s ahead: lair, direction, size                                                          |
| Who     | 2 per lair, +1 per `raidGrowEveryMs` (400 s)                    | unchanged count; the lair's monster row decides the shape (below)                                              |
| Target  | nearest building                                                | by shape (below)                                                                                               |
| Reward  | bounty and XP per raider                                        | unchanged, plus 20 gold to the town per raid fully beaten ("the town cheers")                                  |

| Shape (from role) | Raid behaviour                                                            |
| ----------------- | ------------------------------------------------------------------------- |
| brute             | walk to the nearest building (today)                                      |
| harrier           | 1.5x speed, go for heroes resting in town first, then the market          |
| charger           | charge the first building in line, x2 damage to buildings                 |
| pack              | travel as one group, go for the weakest building                          |
| swarm             | 1.5x speed, twice as many, half hp, spread over the two nearest buildings |

Guard towers already shoot raiders (Sim 130). A tower tier 2 or 3 gets the warning 5 s earlier
(shown as a longer arrow), the only change to towers here.

## 2. Omens

### The clock

- First omen at 3:00, then one every 100-140 s (seeded). At most one omen active.
- An omen is announced 20 s ahead (event `omen` with `inMs`): sky tint, a banner with its name
  and one line, a marker on the map if it has a place. Then it starts (`omenStart`) and ends
  after its duration (`omenEnd`).
- Draw by weight from the deck; an omen cannot repeat until 3 others have been drawn. The
  run's lean pantheon doubles the weight of its omens.

### The deck (8 to start)

| Order | Omen               | Pantheon | Lasts        | Effect                                                                                            | Heroes chase it because         |
| ----- | ------------------ | -------- | ------------ | ------------------------------------------------------------------------------------------------- | ------------------------------- |
| 10    | Fallen Star        | any      | 60 s         | a star falls in the fog; the first party to reach it gets 60 XP and the spot is revealed          | XP, curious heroes x2 appetite  |
| 20    | Wandering Champion | any      | until killed | an elite of the strongest monster roams near town; the gods place a 150 gold bounty on it (free)  | the bounty                      |
| 30    | Merchant Caravan   | any      | 60 s         | a caravan stands by the market: potions and charms 30% cheaper, tax still on full price           | cheap gear, greedy heroes go    |
| 40    | Red Sky            | any      | 60 s         | monsters deal +20% damage; every bounty pays double                                               | double bounties                 |
| 50    | Fimbul Frost       | aesir    | 60 s         | everyone moves 15% slower; frost damage +25%                                                      | Aesir frost heroes shine        |
| 60    | Games of Olympia   | greek    | 45 s         | heroes in town compete: the party with most kills in 45 s gets a bonus card (picked by the party) | glory, proud heroes x2 appetite |
| 70    | Plague of Scarabs  | egyptian | 45 s         | a scarab swarm bursts from the ground at a random plot near town                                  | defend the town                 |
| 80    | Eclipse of Ra      | egyptian | 45 s         | undead +25% damage, holy damage +50%                                                              | holy heroes shine               |

- Omens never command heroes: they place gold, XP or danger where heroes already go, and
  traits decide who bites (the bounty appetite rules from 2026-10-04).
- Speech bubbles on omen start: a hero of the omen's pantheon says one line ("The All-Father's
  winter!").

## 3. God favours

### Rules (the gods act on their own)

1. Each built temple fills its pantheon's **favour bar** (0-100): +1 per 4 s per temple tier,
   +10 when a hero of that pantheon tiers up, +15 when a party with that pantheon clears a lair.
2. When a bar is full, the god picks its spot: the fight with the most of its pantheon's
   heroes below 50% hp (ties: the most monsters within 250, then the nearest to the town hall).
   With no such fight it waits, full, and checks every 1 s; a raid at the town counts as a
   fight for every pantheon.
3. A 1.5 s omen-style tell (sky flash in the pantheon colour, the god's sigil over the spot),
   then the miracle lands. Event `miracle { pantheon, pos }`.
4. The bar empties. Expected: one miracle every 3-4 minutes per temple tier 1, faster with
   higher temples.

### The three miracles (one per pantheon)

| Pantheon | Miracle        | Effect at the chosen spot                                                          | Visual                   |
| -------- | -------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| Aesir    | Thor's Storm   | 6 lightning pillars over 3 s on random monsters within 250: 60 lightning each, arc | pillars, dark sky flash  |
| Greek    | Athena's Aegis | every hero within 250: shield 40% max hp for 8 s, +3 armour                        | gold dome, owl cry       |
| Egyptian | Ra's Dawn      | every hero within 250 heals 35%; undead within 250 take 80 holy with sear          | sunrise flare, gold rays |

Miracle damage is flat (gods do not use attributes) and goes through the strike pipeline as a
spell (no dodge, resisted by Wp).

## 4. What the player sees

- **Raid warning:** a horn, a red arrow at the map edge for 15 s, then the raiders arrive.
  - **The raid shows its source** (Lead 2026-10-14): the arrow carries the icon of the lair it
    comes from (`raidWarning.lair`), and a faint dotted trail runs from that lair toward the town
    for the 15 s. The lair's growth ring (`monsters-and-bosses.md` section 4) flashes red once.
    The player learns that a lair is where the raids come from, and that a flag on it ends them.
  - **Off screen:** when the lair is off screen, the arrow at the map edge carries the icon,
    and tapping the arrow pans the camera to the lair.
- **Omen:** a sky tint (red, pale blue, gold, dark), a banner for 3 s with name and line, a
  marker on the map where it has a place; a small icon at the top while it lasts.
- **Favour:** three thin bars in pantheon colours under the gold counter; a full bar pulses
  while its god waits for a fight. The miracle itself: the tell, then the effect, and a bark
  from a hero of that pantheon ("Thor hears us!").

## 5. Proposed data rows

| Row           | Fields                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| OmenDef       | `id`, `name`, `text`, `pantheon?`, `weight`, `leadMs` 20000, `durationMs`, `effects` (tuning overrides, a spawn, a free bounty, a reward spot) |
| tuning.events | `omenFirstMs` 180000, `omenEveryMs` [100000, 140000], `omenNoRepeat` 3, `leanWeight` 2                                                         |
| tuning.town   | `raidWarnMs` 15000, `raidBeatenGold` 20, `towerWarnAddMs` 5000                                                                                 |
| MonsterDef    | raid shape comes from `role` (`monsters-and-bosses.md`), no new field                                                                          |
| MiracleDef    | `id`, `pantheon`, `radius` 250, `effects` (skill effect ids), `visual`                                                                         |
| tuning.favour | `perTempleTierS` 4, `tierUpGain` 10, `lairGain` 15, `max` 100, `dangerHp` 0.5, `tellMs` 1500                                                   |
| Event         | `miracle { pantheon, pos }` (no new command)                                                                                                   |

## 6. Proposed backlog rows

### Sim

| Order | Row                                                                                  |
| ----- | ------------------------------------------------------------------------------------ |
| 10    | Raid warning event, raid after lair tier-up, raid shapes by role, town cheer gold    |
| 20    | Omen clock and deck (OmenDef rows, effects as tuning overrides, spawns, free bounty) |
| 30    | Favour bars per pantheon; the god picks its spot and casts; `miracle` event          |

### Scene

| Order | Row                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------- |
| 10    | Raid warning arrow and horn                                                                       |
| 15    | Raid source: lair icon on the arrow, dotted trail from the lair, tap the arrow to pan to the lair |
| 20    | Omen banner, sky tint, map marker, top icon                                                       |
| 30    | Favour bars, the miracle tell and visuals                                                         |

### Lead (data)

| Order | Row                                     |
| ----- | --------------------------------------- |
| 10    | The 8 omens and 3 miracles as rows      |
| 20    | Balance pass with omens and miracles on |

### Art

| Order | Row                                                                   |
| ----- | --------------------------------------------------------------------- |
| 10    | 8 omen icons and 3 pantheon sigils (miracle tell) in the UI kit style |
| 20    | Merchant caravan picture (a cart and a mule), facing right            |

## Decided (Stefan, 2026-10-13)

1. **Miracles:** the gods act on their own (section 3); no tap-to-cast.
2. **Omens:** the 8 above to start.
3. **Raid after a lair tier-up:** kept.
