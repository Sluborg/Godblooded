# Combat

Design owns this spec. Lead turns the proposed rows into backlog rows and data. Source: Coda
"Combat System" (the locked rules: 7 attributes, saturating curves capped at 90%, hp = Sta*8 +
Str*4, damage = Str, armour as % mitigation, dodge 2:1 Dex:Per, knockout by default, permadeath
only against bosses) and what Sim already does (`src/sim/units.ts`, `src/sim/swing.ts`,
decision 2026-10-04 "Graybox combat").

## Bottom line

- **One strike pipeline** for every attack in the game: dodge, power, crit, type, mitigation,
  round. Heroes, monsters, towers and skills all go through it.
- **Six damage types** (physical, fire, frost, lightning, death, holy). Weapons deal physical
  and are dodged and armoured; spells deal a type, cannot be dodged and are resisted by
  Willpower. Monsters carry a weakness and resistance row per type.
- **Crits are small and come from Perception** (6-12% at tier 1, x1.5). The Coda lean spec
  deferred crits; this adds them because a crit is something the player can _see_.
- **Heroes are knocked out, never killed**, except by a boss: a boss knockout rolls a death
  chance that shrines and healers lower.
- **Bosses** are one unit per final lair with a telegraphed area strike, an enrage at half hp
  and immunity to crits; chill slows it at half strength.
- **Curves are rescaled to graybox numbers** (attributes 2 to 11, not Coda's up to 99): same
  shapes, smaller K. At tier 1 fights land within about 20% of today's speed.

## 1. The strike pipeline

A strike resolves when its windup ends (today's `windup` then `hit`, decision 2026-10-05). In
order:

| Step | Rule                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------- |
| 10   | **Dodge.** Physical strikes only: roll the target's dodge. Dodged = 0 damage, event `dodged`.      |
| 20   | **Power.** Weapon: attacker Str. Spell: attacker Int times `spellMult`. Tower: its `towerDamage`.  |
| 30   | **Skill multiplier.** A skill strike multiplies power (paths-and-skills spec). Basic attack = 1.   |
| 40   | **Crit.** Roll the attacker's crit chance; a crit multiplies by `critMult`. Bosses cannot be crit. |
| 50   | **Type.** Multiply by the target's row for this type (weak 1.5, normal 1, resist 0.5); sear here.  |
| 60   | **Mitigation.** Physical: times (1 - armour%). Any other type: times (1 - resist%).                |
| 70   | **Round** to a whole number, at least 1 on a landed strike. Subtract from hp.                      |
| 80   | **Rider.** If the strike carries a rider (skills only, section 4), apply it.                       |
| 90   | **Down.** Hp at or below 0: hero knocked out (or slain, section 6), monster dies.                  |

Missiles (ranger arrows, tower bolts) are physical and resolve on the strike like melee; the
projectile Scene draws is only a picture. Tower bolts skip the dodge roll (towers are the
player's one sure thing) and cannot crit; their power is the tier's flat `towerDamage`.

**A fight** (for every "per fight" and "first strike" rule in the specs): a unit's fight starts
when it takes a foe target after having none for 5 s, and ends once it has had no foe target
for 5 s. Sim tracks it per unit; a party's fight is any member's.

## 2. Curves

Every chance follows the Coda shape `0.9 * x / (x + K)`: never 100%, hard cap 90%. Coda's
provisional K (50, 20) assumes attributes up to 99; ours are 2 to 11 at tier 1, so K shrinks.
Lead tunes K as data; Sim reads it from `tuning.combat`.

| Value        | Formula                                   | K (proposed) | Coda K | Replaces today         |
| ------------ | ----------------------------------------- | ------------ | ------ | ---------------------- |
| Dodge        | 0.9 * (2*Dex + Per) / (2*Dex + Per + K)   | 40           | 50     | 0.9 * dex / (dex + 10) |
| Attack time  | weapon base * (1 - 0.9 * Dex / (Dex + K)) | 15           | 50     | base / (1 + dex * 0.1) |
| Crit chance  | 0.9 * Per / (Per + K)                     | 40           | none   | none                   |
| Armour       | 0.9 * armour / (armour + K)               | 20           | 20     | none (no armour)       |
| Magic resist | 0.9 * Wp / (Wp + K)                       | 30           | none   | none                   |

- **Attack time** now floors at 10% of the weapon base (Coda), instead of falling forever with
  Dex. The windup stays `min(windupMs, 40% of the cycle)`.
- **Crit multiplier** 1.5. Crit chance from items, skills and boons adds after the curve, still
  capped at 90%.
- **First strike** (Coda): when two units first engage, the one with the lower Dex + Per starts
  with half its attack cycle on cooldown. Opening only, no lasting tempo edge.

### Tier 1 read-out (graybox templates, proposed armour)

| Unit    | Hp  | Dodge (today) | Attack s (today) | Crit | Armour % | Resist % |
| ------- | --- | ------------- | ---------------- | ---- | -------- | -------- |
| warrior | 72  | 17 (21)       | 1.36 (1.23)      | 6    | 21       | 13       |
| ranger  | 48  | 28 (34)       | 1.04 (0.87)      | 12   | 12       | 11       |
| wizard  | 44  | 22 (26)       | 1.54 (1.36)      | 10   | 0        | 13       |
| paladin | 84  | 13 (15)       | 1.70 (1.58)      | 6    | 30       | 17       |
| rogue   | 48  | 31 (40)       | 0.76 (0.61)      | 10   | 12       | 8        |
| healer  | 40  | 18 (21)       | 1.36 (1.23)      | 8    | 4        | 15       |
| draugr  | 60  | 17 (21)       | 1.44 (1.31)      | 6    | 15       | 15       |
| troll   | 128 | 12 (15)       | 2.15 (2.00)      | 4    | 26       | 11       |

Warrior vs one draugr: kills it in about 19 s (today 16 s) and takes about 44 of 72 hp (today
about 47). Both sides lose roughly 20% damage per second, so fights last a little longer and the
win ratios hold. The rogue is the biggest loser (dodge 40% to 31%), on purpose: today it is the
strongest template by far. Lead re-runs the Sim bot after the change.

## 3. Damage types

| Type      | Colour (Scene) | Dodge | Mitigated by | Rider (skills only)                                      |
| --------- | -------------- | ----- | ------------ | -------------------------------------------------------- |
| physical  | white          | yes   | armour       | none                                                     |
| fire      | orange         | no    | resist       | **burn:** 3 more ticks of 20% of the hit over 3 s        |
| frost     | pale blue      | no    | resist       | **chill:** move and attack 25% slower for 3 s            |
| lightning | yellow-white   | no    | resist       | **arc:** jumps to 1 foe within 120 for 50% of the hit    |
| death     | sickly green   | no    | resist       | **wither:** healing on the target halved for 4 s         |
| holy      | gold           | no    | resist       | **sear:** at step 50, the bonus doubles vs undead/demons |

- **Basic attacks carry no rider**, only their type. Riders come from skills (next spec), so the
  map is not a soup of status effects, and a rider is a visible event.
- **Riders do not stack:** a new one refreshes the timer. Bosses take chill at half strength
  (12.5% slower, full duration).
- **Sear** is the one rider that acts inside the strike: at step 50 a weak (x1.5) holy hit on an
  `undead` or `demon` target becomes x2 (the bonus 0.5 doubles to 1.0). All other riders apply
  at step 80.
- **Buildings and lairs** take every type as normal, with no dodge and no resist, except fire,
  which deals x1.5 to buildings (raids that burn read well).

### Damage type per god and path (draft, the skills spec may revise)

Weapon templates (warrior, paladin, rogue, ranger) strike physical. Casters (wizard, healer)
strike their god's or path's type.

| God      | Tier 1 strike | Path 1 strike         | Path 2 strike          |
| -------- | ------------- | --------------------- | ---------------------- |
| Odin     | death         | Seer: death           | Wanderer: physical     |
| Thor     | physical      | Hammerborn: physical  | Stormcaller: lightning |
| Loki     | physical      | Trickster: physical   | Flamebinder: fire      |
| Freyja   | holy          | Valkyrie: physical    | Seidkona: frost        |
| Athena   | physical      | Aegis: physical       | Owlsage: lightning     |
| Ares     | physical      | Bloodrager: physical  | Warlord: physical      |
| Apollo   | physical      | Sunarcher: physical   | Paean: holy            |
| Poseidon | physical      | Trident: physical     | Tidecaller: frost      |
| Horus    | physical      | Falconer: physical    | Skyguard: physical     |
| Anubis   | physical      | Gravewarden: physical | Embalmer: death        |
| Sekhmet  | physical      | Lioness: physical     | Plaguefire: fire       |
| Isis     | holy          | Lifegiver: holy       | Enchantress: lightning |

Weapon paths still get typed hits through their signature skill (for example Sunarcher's
skill shot is holy, Hammerborn's smash is lightning).

### Monster type rows (draft)

Tags drive holy's sear and later skills: `undead`, `beast`, `giant`, `demon`, `flyer`.

| Monster    | Tags         | Armour | Weak (x1.5) | Resist (x0.5)          |
| ---------- | ------------ | ------ | ----------- | ---------------------- |
| draugr     | undead       | 4      | holy, fire  | death, frost           |
| troll      | giant        | 8      | fire        | frost                  |
| harpy      | beast, flyer | 1      | lightning   | none                   |
| minotaur   | beast, giant | 10     | frost       | physical (x0.75)       |
| jackal-man | undead       | 3      | holy        | death                  |
| wyrm       | boss         | 14     | frost       | fire, physical (x0.75) |

## 4. Healing

- Unchanged from today: `healPower * (Int + Wp)` to the most hurt party mate below
  `healBelow` within `healRange`. Healing is never mitigated and never crits.
- **Wither** (death rider) halves it. Monsters do not heal unless a skill says so.

## 5. Armour

- **Monsters:** a number on the monster row (table above), scaled by lair tier like the other
  attributes.
- **Heroes:** a base number per hidden template until gear exists, then gear adds to it
  (`items-and-shops.md`). Proposed base: warrior 6, paladin 10, rogue 3, ranger 3, wizard 0,
  healer 1.
- No armour penetration yet (Coda deferred it).

## 6. Knockout, death and recovery

- **Knockout (default):** a hero at 0 hp falls where it stood (Scene: the KO fall), lies there
  for `koMs` and wakes at the town hall at `reviveHp` (today's 10 s and 25%). Monsters ignore a
  downed hero.
- **Cost of a knockout** (new, small): the hero drops 25% of the gold it carries (lost), and
  its bond with each party mate drops by 1 at the moment of the knockout (like fleeing today). Enough that the player notices, not
  enough to snowball.
- **Monsters die** at 0 hp and leave the map; the killing blow's hero gets the bounty (today).
- **Permadeath, boss only:** a hero knocked out by a boss strike rolls `bossDeathChance` (20%).
  Each shrine tier in town takes 5 points off; a healer alive in the same party takes 5 more
  (floor 5%). A slain hero leaves a grave marker, frees its god slot, and the party mourns
  (event for a speech bubble).
- **Everything else can never kill a hero,** not raids, not lair monsters at tier 3.

## 7. Bosses

- **One boss unit per final lair.** It stays inside until the lair drops below 75% hp, then
  emerges and fights. The lair cannot fall while its boss lives.
- **Boss row:** a monster row with `boss: true`, its own hp (not Sta*8 + Str*4; set as data),
  armour, type row and a strike.
- **Cleave:** every third strike is an area strike: all heroes within 70 of the target take 60%
  of the hit. It has a long windup (1.2 s) with a ground marker, cannot be dodged, and is the
  thing to watch.
- **Enrage** at 50% hp: attack time x0.7, and it calls 2 monsters from its lair at once.
- **Immune** to crits; chill at half strength. Bounty and XP from the data row.
- Boss knockouts roll death (section 6).

## 8. What the player sees

- **Floating numbers** in the type colour; crits larger with "!", dodges as the word "miss" and
  a short side hop of the target; weak hits get a small "weak" tag, resisted hits a grey number.
- **At most 6 floating numbers on screen;** older ones fade first (phone first, no number
  soup).
- **Riders** show as a tint plus a small icon over the head (flame, snowflake, spark, skull,
  sun). Burn ticks show as small numbers.
- **Boss cleave marker:** a red ring on the ground for the windup.
- **Death:** a grave marker that stays for the run.

## 9. Proposed data rows

### `tuning.combat` additions

| Key              | Value | Note                                     |
| ---------------- | ----- | ---------------------------------------- |
| dodgeK           | 40    | dodge curve                              |
| attackK          | 15    | attack time curve, floor 10% of base     |
| critK            | 40    | crit chance curve                        |
| critMult         | 1.5   |                                          |
| armourK          | 20    |                                          |
| resistK          | 30    | Wp curve against non-physical            |
| firstStrikeDelay | 0.5   | share of the cycle the slower side waits |
| koGoldLoss       | 0.25  | share of carried gold lost on knockout   |
| bossDeathChance  | 0.2   |                                          |
| deathShrineStep  | 0.05  | per shrine tier                          |
| deathHealerStep  | 0.05  | healer alive in the party                |
| deathFloor       | 0.05  |                                          |
| buildingFireMult | 1.5   |                                          |

### Row fields

| Row        | New fields                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ClassDef   | `armour`, `spellMult` (wizard 0.8, healer 0.5, weapons none = physical)                                                                                   |
| GodDef     | `damageType` (tier 1 caster strike)                                                                                                                       |
| PathDef    | `damageType`                                                                                                                                              |
| MonsterDef | `armour`, `tags`, `types` (map type to multiplier), `boss`, `hp` (boss only)                                                                              |
| DamageType | new table: `id`, `colour`, `rider`, rider numbers                                                                                                         |
| BossDef    | `emergeBelow` 0.75, `cleaveEvery` 3, `cleaveRadius` 70, `cleaveShare` 0.6, `cleaveWindupMs` 1200, `enrageAt` 0.5, `enrageAttackMult` 0.7, `enrageCalls` 2 |

`spellMult` keeps casters in line: a raw Int strike would make the healer the best damage
dealer (Int 6, no dodge for the target).

## 10. Proposed backlog rows

### Sim

| Order | Row                                                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------- |
| 10    | Strike pipeline in one function (steps 10 to 90), new curves and K values in `tuning.combat`                               |
| 20    | Armour on templates and monsters; magic resist from Wp; `spellMult`                                                        |
| 30    | Damage types: type on god/path/monster rows, monster type multipliers, `hit` event carries `type`, `crit`, `weak`/`resist` |
| 40    | First strike on engage                                                                                                     |
| 50    | Riders (burn, chill, arc, wither, sear) as data, applied only when a strike carries one                                    |
| 60    | Knockout cost (gold loss, bond -1)                                                                                         |
| 70    | Boss unit: emerge, cleave, enrage, immunities; lair cannot fall while it lives                                             |
| 80    | Boss permadeath roll, shrine and healer reductions, `slain` event, god slot freed                                          |

### Scene

| Order | Row                                                                                  |
| ----- | ------------------------------------------------------------------------------------ |
| 10    | Floating numbers by type colour, crit and weak styles, "miss" with a side hop, cap 6 |
| 20    | Caster bolt colour by damage type                                                    |
| 30    | Rider tint and head icon (code shapes first)                                         |
| 40    | Boss: cleave ground marker during windup, enrage tint, boss hp bar at top            |
| 50    | Slain hero grave marker                                                              |

### Art

| Order | Row                                                                           |
| ----- | ----------------------------------------------------------------------------- |
| 10    | Five rider icons (flame, snowflake, spark, skull, sun) in the U2 UI kit style |
| 20    | Grave marker, one picture per pantheon (rune stone, stele, ankh slab)         |

### Lead

| Order | Row                                                                              |
| ----- | -------------------------------------------------------------------------------- |
| 10    | Data: armour, `spellMult`, damage types and monster type rows from this spec     |
| 20    | Balance pass after Sim 10 to 30: Sim bot, target the same 55-75% wins, 15-18 min |

## OPEN (Stefan decides)

1. **Crits:** add them now (this spec, small, from Perception) or keep the Coda lean rule of
   deterministic damage until skills? Recommendation: add them, they are fun to watch.
2. **Permadeath:** only against bosses at 20% (recommendation), or never, or also on tier 3
   lairs?
3. **Knockout cost:** lose 25% carried gold (recommendation), nothing, or a longer timer?
4. **A fallen Aesir hero:** flavour only (grave marker), or does Valhalla give the party a small
   boon? Same question for Greek (Elysium) and Egyptian (weighing of the heart) later.
5. **Damage types per god:** the table in section 3 is a draft. Any god whose element feels
   wrong (Odin death, Freyja holy, Isis Enchantress lightning)?
