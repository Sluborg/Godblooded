# Paths and skills

Design owns this spec. Lead turns the proposed rows into backlog rows and data. Builds on
`docs/systems/combat.md` (strike pipeline, damage types, riders) and the gods and paths table
in `docs/game-design.md` (decision 2026-10-13).

## Bottom line

- **Every god gives a passive from tier 1.** Small, always on, often party-wide, so a party of
  mixed gods reads as a team.
- **Every path gives one signature skill at tier 2** and an upgraded form of the same skill at
  tier 3. Tier 1 heroes have no skill: the first tier-up is when a hero becomes someone.
- **Heroes cast on their own.** Each skill is a data row: a trigger (when), a cooldown, a shape
  (where), effects (what) and a visual (what Scene draws). The player never presses a button.
- **One engine, many rows.** 6 triggers, 16 effects, 5 hooks and 10 visuals cover all 24 skills. Sim
  builds the engine once; every skill after that is a row.
- **Aesir first** (M2): the 8 Aesir skills need 8 of the 16 effects and the expire hook, the chain shape and the decoy summon.

## 1. How a skill works

1. **Ready:** the skill's cooldown has run out and the hero is fighting (it has a foe target)
   or the trigger is a support trigger (an ally is hurt).
2. **Trigger:** every tick a ready skill checks its trigger (section 2). The first tick it
   holds, the hero casts instead of starting its next basic strike.
3. **Cast:** a cast has its own windup (`castWindupMs`, 500, longer than a basic strike's 300)
   and emits `cast` with the skill, caster, target and point, so Scene can show it coming. A
   cast is cancelled like a strike when the caster is knocked out; it is not cancelled when the
   target moves (skills land on their point).
4. **Resolve:** the effects apply to every unit in the shape. Damage goes through the combat
   pipeline (`combat.md`, section 1) with the skill's multiplier, type and rider.
5. **Cooldown** starts at the cast. A hero who just tiered up starts with the skill ready.
6. **Personality nudges triggers:** a coward's self-hurt triggers fire 15 points earlier, a
   brave hero's 15 points later; a proud hero aims target-picking skills at the foe with the
   most max hp. One rule, all skills.
7. **Speech:** one cast in four shows the skill name as a speech bubble (pillar 2).
8. **Bosses:** ignore taunt, take bind at half duration and chill at half strength (`combat.md`),
   cannot be knocked back.

A skill should add about 15-25% to a hero's fight output at tier 2. Fights last 15-45 s, so
cooldowns of 9-18 s give 1-3 casts per fight.

## 2. Triggers

| Id       | Fires when                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------- |
| ready    | the cooldown is up and a foe is in the skill's range                                                           |
| crowd    | at least `n` foes in an `area` (circle `radius`, or cone `radius` and `angle`) around the caster or its target |
| allyHurt | at least `n` (default 1) party mates within `radius` are below `below` of max hp (most hurt first)             |
| selfHurt | the caster is below `below` of max hp, or `n` foes target it                                                   |
| engage   | a foe is between `min` and `max` range (opens a fight from a distance)                                         |
| kill     | a foe died within `radius` in the last 3 s                                                                     |

## 3. Effects

| Id        | Does                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| damage    | `mult` x power, of `type`, optional `rider` (combat.md, section 3); `mult` 0 applies only the rider; `sure` strikes skip the dodge roll |
| heal      | `mult` x (Int + Wp), like today's heal                                                                                                  |
| shield    | absorbs `mult` x (Int + Wp) (or `pct` of max hp) damage for `s` seconds                                                                 |
| buff      | adds to attributes or rates (`attackSpeed`, `dodge`, `armour`, `damage`, `crit`) for `s`                                                |
| stagger   | cancels the targets' windups (their strike starts over)                                                                                 |
| knockback | pushes targets `dist` away from the caster                                                                                              |
| mark      | targets take `pct` more damage from everyone for `s`                                                                                    |
| taunt     | foes in the shape target the caster for `s`                                                                                             |
| bind      | targets cannot move and attack 50% slower for `s`                                                                                       |
| dash      | caster moves to the target point at 4x speed before the other effects                                                                   |
| summon    | spawns a friendly unit row (`summonId`) for `s`, or until killed                                                                        |
| revive    | stands a knocked out party mate in the shape up at `pct` of max hp (once per fight)                                                     |
| execute   | foes in the shape below `below` of max hp die (not bosses)                                                                              |
| cleanse   | removes riders from the targets                                                                                                         |
| hot       | heals the targets `pct` of max hp per second for `s`                                                                                    |
| refresh   | restarts the timer of this skill's own status on the caster                                                                             |

**Hooks.** An effect runs at the cast unless it names a hook (`on`). Hooks run while the skill's
status or summon lasts:

| Hook   | Runs when                               | Used by                       |
| ------ | --------------------------------------- | ----------------------------- |
| cast   | the skill resolves (default)            | all                           |
| hit    | the caster lands a strike               | Frenzy heal                   |
| kill   | the caster (or its summon) kills a foe  | Frenzy t3 refresh, Lioness t3 |
| expire | the status or summon ends or dies       | Mirror Double t3 burst        |
| death  | a foe carrying this skill's status dies | Plague Breath t3 burst        |

A summon row may carry `respawnS` (Falcon t3: resummoned 10 s after it dies).

**Combining triggers:** `trigger` may be `{ any: [triggerA, triggerB] }`; it fires when either
holds (Frenzy, Sun Disk, Trickster).

`chain` is a shape, not an effect: it hits the target, then jumps `jumps` times to the nearest
foe not yet hit within `radius`, each jump at `falloff` of the last.

## 4. Visuals (Scene draws them in code, coloured by damage type)

| Id     | Picture                                              |
| ------ | ---------------------------------------------------- |
| bolt   | a projectile from the weapon point to the target     |
| burst  | an expanding ring at a point                         |
| cone   | a fan from the caster                                |
| line   | a straight streak through the targets                |
| chain  | jagged lines jumping between targets                 |
| aura   | a ring under the caster pulsing outward              |
| shield | a bubble over a unit while the shield holds          |
| dash   | a smear behind the caster along its path             |
| mark   | a small floating sign over the target while it lasts |
| pillar | a column of light or lightning falling on a point    |

Summons use their own unit look (section 8). Every visual is a few shapes and a tint, no art.

## 5. God passives (from tier 1)

Pantheon themes from `docs/game-design.md` (draft): Aesir fury and frost, Greek cunning and
glory, Egyptian death and sun.

| God      | Passive              | Effect                                                                |
| -------- | -------------------- | --------------------------------------------------------------------- |
| Odin     | All-Father's Eye     | party: +3 Per (sees further, crits more) and wins first strike        |
| Thor     | Giant-Bane           | +30% damage against `giant` foes                                      |
| Loki     | Slippery             | the first strike against him each fight misses; +5% dodge             |
| Freyja   | Chooser of the Slain | party mates knocked out within 300 lose no gold and revive 50% faster |
| Athena   | Strategist           | party within 200: +2 armour                                           |
| Ares     | Bloodlust            | +6% attack speed per kill this fight, up to 5 stacks                  |
| Apollo   | Healing Sun          | party rests 50% faster                                                |
| Poseidon | Earthshaker          | every 5th strike staggers and knocks back 40                          |
| Horus    | Eye of Horus         | +20% aggro range, +5% crit                                            |
| Anubis   | Weigher of Hearts    | +25% damage against `undead`; party boss death chance -10 points      |
| Sekhmet  | Fury of the Lioness  | +25% damage while below 50% hp                                        |
| Isis     | Great of Magic       | party: healing received +25%                                          |

Party-wide passives do not stack with themselves (two Odin children give +3 Per, not +6).

## 6. Path skills

Notation: power = Str for weapon paths, Int x `spellMult` for casters (`combat.md`). CD =
cooldown in seconds. Radius and range in world units (melee reach is about 40, a hero is about
30 wide).

### Aesir

| Path        | Skill            | Trigger                 | CD  | Tier 2                                                                  | Tier 3 adds                                                 | Visual        |
| ----------- | ---------------- | ----------------------- | --- | ----------------------------------------------------------------------- | ----------------------------------------------------------- | ------------- |
| Seer        | Raven Omen       | ready, range 300        | 12  | mark the foe with most hp: +25% damage taken for 6 s                    | marks 3 foes, +35%                                          | mark (ravens) |
| Wanderer    | Gungnir          | engage 120-300          | 14  | sure line strike 250% physical through the first foe                    | pierces every foe on a 300 line, then hits the target again | line          |
| Hammerborn  | Mjolnir Slam     | crowd 2 in 90           | 10  | 150% lightning around self (r 90), stagger                              | r 130, 200%, arc rider                                      | pillar, burst |
| Stormcaller | Chain Lightning  | ready, range 220        | 10  | 90% lightning, chain 3 jumps (r 120, falloff 0.7)                       | 5 jumps, a pillar on the last target for 100%               | chain         |
| Trickster   | Mirror Double    | selfHurt 60% or 2 on me | 16  | summon a decoy (20% of his max hp, taunts r 120) for 6 s; +30% dodge    | 2 decoys; each bursts for 100% fire when it ends            | summon        |
| Flamebinder | Wildfire         | ready, range 220        | 10  | bolt bursting r 70 for 120% fire, burn rider                            | burst r 100, and the burn lasts 6 s instead of 3            | bolt, burst   |
| Valkyrie    | Valkyrie's Swoop | allyHurt 35% in 300     | 14  | dash to the ally's attacker, 180% physical; shield ally 20% hp, 5 s     | lands with a r 70 burst for 100%; shield 35%                | dash, shield  |
| Seidkona    | Seidr Ward       | allyHurt 50% in 220     | 12  | shield the ally 2 x (Int + Wp) for 6 s; chill its attacker (rider only) | shields every party mate in r 200                           | shield        |

### Greek

| Path       | Skill           | Trigger                      | CD  | Tier 2                                                     | Tier 3 adds                                  | Visual       |
| ---------- | --------------- | ---------------------------- | --- | ---------------------------------------------------------- | -------------------------------------------- | ------------ |
| Aegis      | Aegis           | crowd 2 near a party mate    | 15  | taunt foes in r 150 for 4 s; self +50% armour for 4 s      | taunted foes are chilled (Medusa's glance)   | aura, shield |
| Owlsage    | Owl's Insight   | ready, fighting              | 16  | party in r 200: +20% crit for 6 s                          | +30% crit and +15% attack speed              | aura         |
| Bloodrager | Frenzy          | kill, or selfHurt 50%        | 12  | +50% attack speed for 5 s; heals 5% max hp per landed hit  | a kill during Frenzy refreshes it            | aura (red)   |
| Warlord    | War Cry         | crowd 2 in 150               | 18  | party in r 200: +25% damage for 6 s; foes in r 150 stagger | +35%, and the party does not flee this fight | burst        |
| Sunarcher  | Sun Arrow       | engage 120-260               | 10  | sure shot 200% holy, sear rider                            | then a volley: 3 arrows of 120% holy in r 80 | bolt, pillar |
| Paean      | Hymn of Healing | 2 allies below 60% in 220    | 14  | heal every party mate in r 220 for 1 x (Int + Wp)          | also clears riders and heals 2% hp/s for 5 s | aura (gold)  |
| Trident    | Riptide         | crowd 2 in 120               | 10  | line thrust: up to 3 foes for 140% physical, knockback 60  | line 200 long, frost type, chill rider       | line         |
| Tidecaller | Crashing Wave   | crowd 3 within 100 of target | 13  | burst r 100 at the target: 120% frost, chill, knockback 50 | r 140, 160%                                  | burst (blue) |

### Egyptian

| Path        | Skill          | Trigger                                     | CD  | Tier 2                                                                                   | Tier 3 adds                                            | Visual         |
| ----------- | -------------- | ------------------------------------------- | --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------- |
| Falconer    | Falcon         | ready, range 260                            | 14  | summon a falcon on the target for 6 s: 60% physical every 0.8 s; the target cannot dodge | the falcon stays (resummoned 10 s after it dies)       | summon         |
| Skyguard    | Sun Disk       | allyHurt 50%, or crowd 2                    | 16  | party in r 150: -25% damage taken for 5 s; 80% holy to foes in r 150                     | the pulse sears and heals the party 5% max hp          | aura, burst    |
| Gravewarden | Reaping Sweep  | crowd 2 in 80                               | 10  | half-circle sweep 160% physical; heals self 30% of damage dealt                          | foes left below 20% hp die (execute)                   | cone           |
| Embalmer    | Raise the Dead | kill within 200                             | 18  | the dead monster rises as a thrall (50% stats) for 10 s                                  | 20 s, and 2 thralls if 2 died                          | summon (green) |
| Lioness     | Pounce         | engage 80-250                               | 9   | dash and strike 200% physical; a sure crit if the target is below 50%                    | a kill pounces on to the next foe within 200           | dash           |
| Plaguefire  | Plague Breath  | crowd 2 in a 120 cone                       | 11  | cone 120 (60 degrees): 100% fire, wither rider                                           | foes that die while withered burst r 60 for 80% fire   | cone           |
| Lifegiver   | Breath of Life | allyHurt 30% in 250                         | 15  | heal the ally 3 x (Int + Wp)                                                             | once per fight, revive a knocked out party mate at 40% | pillar (gold)  |
| Enchantress | Binding Spell  | ready, foe on a party healer or most-hp foe | 13  | 100% lightning and bind for 3 s                                                          | binds every foe in r 100 of the target                 | mark, chain    |

### How each path looks (tier 1 child, tier 2, tier 3)

**Style:** one painted style with the buildings (Stefan, `docs/decisions.md` 2026-10-14 "Playtest run 2"): grim, mythic,
Norse-carved, **no cartoon faces**; Art's style rules lead and replace the earlier big-head
cartoon proportions; outlines and shading follow Art's rules too. From the taste test
(2026-10-14) still:
a **warm, earthy palette, only slightly muted** (most of the saturation stays), smooth and
weighty motion. Units are small next to buildings (a hall is about 5 heroes wide). **Effects grow
with progression** (Lead 2026-10-14): tier 1 subtle, tier 2 stronger, tier 3 clearly effectful;
never screen shake. Each hero has its party ring and a name label.

Rule (decision 2026-10-13, units from parts): a path is a natural evolution of the
god's tier 1 child. The **face, hair, skin and the god's signature pieces** (the "keeps"
column below) **never change**; tier 2 adds gear and one effect (armour or a robe may replace
the tunic colour), tier 3 is more of the same (finer material, a bigger effect, one extra
piece). Scene builds these from code parts (the Aesir rows match `docs/reference/style-test.html`);
Art's pictures follow the same table. The **accent** is the colour of the path's trim, glow and
skill effects (rule under the paths table).

#### The tier 1 child per god

| God      | Keeps on every tier                 | Tier 1 outfit                        | Tier 1 weapon, effect      |
| -------- | ----------------------------------- | ------------------------------------ | -------------------------- |
| Odin     | long grey beard, eye patch          | blue-grey robe, wide hat             | staff, ravens              |
| Thor     | red hair: braids or a big beard     | brown tunic with gold trim, red cape | hammer, sparks             |
| Loki     | sly grin, a hood                    | green hood, dark green tunic         | two daggers, green flame   |
| Freyja   | golden braids                       | rose dress, cream feather cape       | wand, gold motes           |
| Athena   | dark hair in a bun, grey-blue eyes  | white chiton with owl-grey trim      | spear and round shield     |
| Ares     | black curls, scarred arms           | crimson cloak, leather kilt          | short sword, red sparks    |
| Apollo   | golden curls, laurel wreath         | white chiton                         | short bow, sun motes       |
| Poseidon | dark wavy hair and beard            | sea-green tunic, shell clasp         | short spear, water drips   |
| Horus    | kohl eyes, falcon-feather headdress | blue and gold striped kilt           | bow, a small falcon glint  |
| Anubis   | kohl eyes, black jackal-ear hood    | black and gold collar, white kilt    | khopesh, dust wisps        |
| Sekhmet  | tawny lion-mane hair, gold armbands | red linen                            | two curved claws, heat     |
| Isis     | black hair, throne-sign headband    | blue dress, folded wing shawl        | ankh wand, turquoise motes |

#### Paths

| God      | Path        | Tier 2 adds                                                   | Tier 3 adds                                                                           | Accent    |
| -------- | ----------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------- |
| Odin     | Seer        | tall hat, eye-topped staff, 2 ravens                          | gold-banded hat, raven-feather mantle, glowing runes circling the staff head          | death     |
| Odin     | Wanderer    | spear, grey travelling cloak, robe off (tunic)                | Gungnir-style gold spearhead, wolf-pelt mantle                                        | steel     |
| Thor     | Hammerborn  | iron helm (no horns), plate, red and cream round shield       | gilded plate, the helm gains wings folded back, a crackle on the hammer               | lightning |
| Thor     | Stormcaller | lightning staff, blue cape and tunic                          | a small storm cloud over the head, arcs on the cape hem                               | lightning |
| Loki     | Trickster   | horned purple hood, pale violet blades                        | a faint mirror shimmer that trails him                                                | steel     |
| Loki     | Flamebinder | flame in both hands, darker hood, orange trim                 | horns of flame on the hood, embers trailing                                           | fire      |
| Freyja   | Valkyrie    | winged helm, spear, blue round shield, light plate            | gold-trimmed helm (wings folded close), white fur mantle, feathered blue-violet cloak | steel     |
| Freyja   | Seidkona    | frost hood, frost staff, ice-blue cape                        | a ring of floating ice shards, frosted cape hem                                       | frost     |
| Athena   | Aegis       | crested bronze helm (open face), Medusa-faced shield          | the shield's face glows, silver cape                                                  | steel     |
| Athena   | Owlsage     | owl on the shoulder, scroll staff, grey stola                 | the owl's wings open when casting, silver laurel                                      | lightning |
| Ares     | Bloodrager  | second sword, bare chest with war paint                       | a faint red haze when fighting, a torn crimson cloak                                  | steel     |
| Ares     | Warlord     | red-crested helm, bronze cuirass, battle standard on the back | larger crest and a gold-edged standard                                                | steel     |
| Apollo   | Sunarcher   | longbow, gold quiver, sun disc clasp                          | a halo behind the head, glowing arrows                                                | holy      |
| Apollo   | Paean       | lyre in hand, longer chiton, gold laurel                      | music-note motes that drift, a gold lyre                                              | holy      |
| Poseidon | Trident     | trident, scale-armour vest                                    | coral-gold trident tips, a cape like a breaking wave                                  | frost     |
| Poseidon | Tidecaller  | conch-shell staff, sea-foam cape                              | a ring of water circling the feet, pearl crown                                        | frost     |
| Horus    | Falconer    | falcon on the arm, leather bracer, longbow                    | a bigger falcon with gold wing tips, gold bracer                                      | steel     |
| Horus    | Skyguard    | sun-disc shield, gilded collar, short spear                   | the disc glows, falcon wings on the helm                                              | holy      |
| Anubis   | Gravewarden | heavy khopesh, black and gold scale armour                    | a jackal mask, purple-black dust trailing                                             | steel     |
| Anubis   | Embalmer    | wrapped staff with a canopic jar, linen sash                  | green soul-wisps circling, a gold death mask on the belt                              | death     |
| Sekhmet  | Lioness     | lion-pelt hood, longer claws                                  | the mane flares when she pounces, gold claw tips                                      | steel     |
| Sekhmet  | Plaguefire  | red sun disc over the head, flame in one hand                 | a heat haze around her, black-red flames                                              | fire      |
| Isis     | Lifegiver   | wings opened on the arms, ankh staff                          | full feathered wings, a soft gold glow                                                | holy      |
| Isis     | Enchantress | bound-cord staff, star-flecked blue veil                      | sparking cords that float around her                                                  | lightning |

- **Accent colours** follow the data: a path with a `damageType` row (`src/data`) uses that
  type's colour (`combat.md` section 3); a physical path uses its skill's damage type if the
  skill has one (Hammerborn lightning, Trident frost), else **steel** (light grey).
- **Tier 3 keeps the silhouette tight** (Art batch A2): wings stay folded, glows stay close to
  the body, no wide auras.
- **Readable at 0.7x on a phone:** each tier must change the silhouette at least once (a hat,
  a shield, wings, a weapon shape), not only colours.

## 7. Data rows

### SkillDef (new table)

| Field     | Example (Mjolnir Slam)                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| id        | `thor-hammerborn-slam`                                                                                                                       |
| path      | `thor-hammerborn`                                                                                                                            |
| name      | Mjolnir Slam                                                                                                                                 |
| trigger   | `{ kind: 'crowd', n: 2, radius: 90 }`                                                                                                        |
| cooldownS | 10                                                                                                                                           |
| target    | `self` / `foe` / `ally` / `allyAttacker` / `point` (where the shape sits); effects may override `target` and `shape`                         |
| shape     | `{ kind: 'circle', radius: 90 }` (single, circle, cone, line, chain)                                                                         |
| effects   | `[{ damage: 1.5, type: 'lightning' }, { stagger: true }]`                                                                                    |
| visual    | `['pillar', 'burst']`                                                                                                                        |
| t3        | the fields that change at tier 3: `{ shape: { radius: 130 }, effects: [{ damage: 2, type: 'lightning', rider: 'arc' }, { stagger: true }] }` |

### PassiveDef (on GodDef)

`passive: { id, name, scope: 'self' | 'party', range?, keys }`. Every passive is a set of keys
from this list; Sim implements each key once:

| Key                | Meaning                                             | Passives     |
| ------------------ | --------------------------------------------------- | ------------ |
| attr               | flat attributes                                     | Odin (Per)   |
| firstStrike        | wins the first-strike check (`combat.md`)           | Odin         |
| vsTag              | damage multiplier against a tag                     | Thor, Anubis |
| firstHitMisses     | the first strike against the unit each fight misses | Loki         |
| dodge, crit        | flat chance added after the curve                   | Loki, Horus  |
| koGoldLoss, koMult | knockout gold loss and timer multipliers            | Freyja       |
| armour             | flat armour                                         | Athena       |
| onKillStack        | a buff per kill this fight, with a cap              | Ares         |
| restMult           | resting speed multiplier                            | Apollo       |
| everyNth           | effects on every nth strike (`n`, `effects`)        | Poseidon     |
| aggroMult          | aggro range multiplier                              | Horus        |
| bossDeathAdd       | added to the boss death chance (half to the lair's) | Anubis       |
| belowHp            | a buff while below a share of max hp                | Sekhmet      |
| healTakenMult      | healing received multiplier                         | Isis         |

### SummonDef (new rows, small)

| Id     | Hp                   | Strike                   | Note                               |
| ------ | -------------------- | ------------------------ | ---------------------------------- |
| decoy  | 20% of caster max hp | none                     | taunts r 120, a tinted copy        |
| falcon | 20                   | 60% of caster Str, 0.8 s | flies, cannot be targeted by melee |
| thrall | 50% of the monster   | the monster's strike     | green tint, fights for the party   |

### Events (Sim to Scene, through `api.ts`)

`cast` (skill, caster, target, point, inMs), `skill` (skill, caster, hits[], point),
`status` (unit, kind, until) for marks, shields, buffs, binds and riders, `summoned` and
`unsummoned`.

## 8. What the player sees

- **Cast windup:** the caster glows in its damage type colour for 0.5 s.
- **The visual** from the skill row, then numbers through the combat floats.
- **Status:** shields as a bubble, marks and binds as a sign over the head, buffs as a tinted
  ring under the feet. At most one ring per unit (the newest).
- **Skill name** in a speech bubble on one cast in four.
- **Level-up card for a path** (already exists) shows the path's skill name and one line.

## 9. Proposed backlog rows

### Sim

| Order | Row                                                                                                                         |
| ----- | --------------------------------------------------------------------------------------------------------------------------- |
| 10    | Skill engine: SkillDef, cooldowns, triggers (6, `any`), shapes (5), hooks (5), `cast` and `skill` events, personality nudge |
| 20    | Effects part 1: damage, heal, shield, buff, stagger, mark, dash, taunt (all Aesir needs, with summon)                       |
| 30    | Summons: decoy, falcon, thrall; `summoned` events; summons in the snapshot                                                  |
| 40    | Effects part 2: knockback, bind, revive, execute; boss immunities                                                           |
| 50    | God passives: the 16 keys, 12 rows on GodDef                                                                                |

### Lead (data)

| Order | Row                                                               |
| ----- | ----------------------------------------------------------------- |
| 10    | Aesir skills (8) and passives (4) as rows, after Sim 10 and 20    |
| 20    | Greek and Egyptian skills and passives with their temples (M3)    |
| 30    | Balance pass: Sim bot with skills on, same win and length targets |

### Scene

| Order | Row                                                                                 |
| ----- | ----------------------------------------------------------------------------------- |
| 10    | Cast windup glow and the 10 skill visuals in code, coloured by damage type          |
| 20    | Status display: shield bubble, mark sign, buff ring, one ring per unit              |
| 30    | Summons: decoy as a tinted copy, falcon and thrall looks (placeholder shapes first) |
| 40    | Skill name speech bubble, 1 cast in 4                                               |
| 50    | Hero parts per path and tier from "How each path looks" (section 6), accent colours |

### Art

| Order | Row                                                                                       |
| ----- | ----------------------------------------------------------------------------------------- |
| 10    | Falcon summon (one small picture, flying, facing right) `sum_falcon_t1_front`             |
| 20    | Raven mark sign and status signs (raven, bind chains, shield rune) in the U2 UI kit style |
| 30    | Hero pictures per god and path follow "How each path looks" (section 6)                   |

## Decided (Stefan, 2026-10-13)

1. **Tier 1 heroes have no skill;** the first tier-up is the reward.
2. **Revive** (Lifegiver tier 3) stays, once per fight.
3. **Summons stay:** decoy, falcon, thralls.
4. **Skill names** as written.
5. **Passives** keep the link to knockouts and boss deaths.
