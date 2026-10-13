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
- **One engine, many rows.** 6 triggers, 13 effects and 10 visuals cover all 24 skills. Sim
  builds the engine once; every skill after that is a row.
- **Aesir first** (M2): the 8 Aesir skills need 8 of the 13 effects, the chain shape and the decoy summon.

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
8. **Bosses:** ignore taunt, take bind and chill at half duration, cannot be knocked back.

A skill should add about 15-25% to a hero's fight output at tier 2. Fights last 15-45 s, so
cooldowns of 9-18 s give 1-3 casts per fight.

## 2. Triggers

| Id       | Fires when                                                                |
| -------- | ------------------------------------------------------------------------- |
| ready    | the cooldown is up and a foe is in the skill's range                      |
| crowd    | at least `n` foes within `radius` of the caster (or of its target)        |
| allyHurt | a party mate within `radius` is below `below` of max hp (most hurt first) |
| selfHurt | the caster is below `below` of max hp, or `n` foes target it              |
| engage   | a foe is between `min` and `max` range (opens a fight from a distance)    |
| kill     | a foe died within `radius` in the last 3 s                                |

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
| Stormcaller | Chain Lightning  | ready, range 220        | 9   | 140% lightning, chain 3 jumps (r 120, falloff 0.7)                      | 5 jumps, a pillar on the last target for 100%               | chain         |
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

## 7. Data rows

### SkillDef (new table)

| Field     | Example (Mjolnir Slam)                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| id        | `thor-hammerborn-slam`                                                                                                                       |
| path      | `thor-hammerborn`                                                                                                                            |
| name      | Mjolnir Slam                                                                                                                                 |
| trigger   | `{ kind: 'crowd', n: 2, radius: 90 }`                                                                                                        |
| cooldownS | 10                                                                                                                                           |
| target    | `self` / `foe` / `ally` / `point` (where the shape sits)                                                                                     |
| shape     | `{ kind: 'circle', radius: 90 }` (single, circle, cone, line, chain)                                                                         |
| effects   | `[{ damage: 1.5, type: 'lightning' }, { stagger: true }]`                                                                                    |
| visual    | `['pillar', 'burst']`                                                                                                                        |
| t3        | the fields that change at tier 3: `{ shape: { radius: 130 }, effects: [{ damage: 2, type: 'lightning', rider: 'arc' }, { stagger: true }] }` |

### PassiveDef (on GodDef)

`passive: { id, name, scope: 'self' | 'party', range?, effects }`, using the same effect ids
as skills plus three passive-only keys: `vsTag` (damage against a tag), `onKillStack`,
`belowHp` (condition).

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

| Order | Row                                                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------- |
| 10    | Skill engine: SkillDef, cooldowns, triggers (6), shapes (5), `cast` and `skill` events, personality nudge |
| 20    | Effects part 1: damage, heal, shield, buff, stagger, mark, dash, taunt (all Aesir needs, with summon)     |
| 30    | Summons: decoy, falcon, thrall; `summoned` events; summons in the snapshot                                |
| 40    | Effects part 2: knockback, bind, revive, execute; boss immunities                                         |
| 50    | God passives (12) as data on GodDef                                                                       |

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

### Art

| Order | Row                                                                                       |
| ----- | ----------------------------------------------------------------------------------------- |
| 10    | Falcon summon (one small picture, flying, facing right) `sum_falcon_t1_front`             |
| 20    | Raven mark sign and status signs (raven, bind chains, shield rune) in the U2 UI kit style |

## OPEN (Stefan decides)

1. **Tier 1 heroes have no skill** (recommendation: the first tier-up is the reward), or a
   small basic skill per god at tier 1?
2. **Revive** (Lifegiver tier 3) undoes a knockout once per fight. Too strong for a run where
   knockouts are the main cost, or the heal fantasy the healer path needs?
3. **Summons** (decoy, falcon, thralls): keep all three, or cut summons from M2 to save Scene
   and Art work (Trickster and Falconer would get other skills)?
4. **Skill names** are a first draft; any you want renamed or tied to a myth you prefer?
5. **Passives:** Freyja's and Anubis's tie into knockouts and boss deaths from `combat.md`.
   Keep that link?
