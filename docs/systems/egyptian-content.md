# Egyptian content sheet (M3)

Design owns this spec. Balance pastes the blocks below into `src/data/` (the rows that need a
new Sim shape say so). It is the concrete content for the Egyptian temple in M3
(`content-roadmap.md`): the 4 Egyptian gods, their 8 paths, damage types, the 4 passives, the
8 signature skills with their tier 3 forms, the Egyptian cards and favour cards, and the start
numbers. Rules come from `combat.md` and `paths-and-skills.md`; the format follows
`aesir-content.md` and `greek-content.md`. Skills and passives use the shapes Sim ships today
(`src/sim/types.ts`).

## Bottom line

- **Theme: death and sun.** Horus sees far and strikes first, Anubis rules the dead (his own
  and the monsters'), Sekhmet hunts and burns, Isis keeps the party alive.
- **Ready to paste when the temple ships:** gods, paths and damage types (section 2), all 4
  passives (today's keys), and 3 of 8 skills whole at tier 2 (Sun Disk, Plague Breath,
  Breath of Life).
- **The Egyptians need the most new Sim:** summons (Falconer, Embalmer; also the Aesir decoy),
  `bind`, `execute`, `drain`, `revive`, a crit-below rule and the `death` hook. Section 4 marks
  each; this is why Egyptian comes after Greek.
- **Budget:** each tier 2 skill adds 15-25% to its hero's fight output (section 5).

## 1. The Egyptians at a glance

| God     | Tier 1 (template, strike) | Passive             | Path 1 (template, type)         | Skill          | Path 2 (template, type)         | Skill           |
| ------- | ------------------------- | ------------------- | ------------------------------- | -------------- | ------------------------------- | --------------- |
| Horus   | ranger, physical          | Eye of Horus        | Falconer (ranger, physical)     | Falcon         | Skyguard (paladin, physical)    | Sun Disk (holy) |
| Anubis  | warrior, physical         | Weigher of Hearts   | Gravewarden (warrior, physical) | Reaping Sweep  | Embalmer (wizard, death)        | Raise the Dead  |
| Sekhmet | rogue, physical           | Fury of the Lioness | Lioness (rogue, physical)       | Pounce         | Plaguefire (wizard, fire)       | Plague Breath   |
| Isis    | healer, holy              | Great of Magic      | Lifegiver (healer, holy)        | Breath of Life | Enchantress (wizard, lightning) | Binding Spell   |

Types in play: physical, holy, death, fire, lightning, plus the wither and sear riders. Holy
and death face each other: Egyptian parties shine against the undead (jackal-men, draugr) and
the death-resistant (Apep).

## 2. Paste with the temple (Sim reads these fields today)

### Gods (`GODS`, the Egyptian four; already in `src/data/graybox.ts`, unchanged)

```ts
{ id: 'horus', pantheon: 'egyptian', name: 'Horus', template: 'ranger' },
{ id: 'anubis', pantheon: 'egyptian', name: 'Anubis', template: 'warrior' },
{ id: 'sekhmet', pantheon: 'egyptian', name: 'Sekhmet', template: 'rogue' },
{ id: 'isis', pantheon: 'egyptian', name: 'Isis', template: 'healer', damageType: 'holy' },
```

### Paths (`PATHS`; change only the wizards' bonus, decision 2026-10-13: casters to Int)

```ts
{ id: 'anubis-embalmer', god: 'anubis', template: 'wizard', name: 'Embalmer',
  damageType: 'death', attrs: [{ int: 2 }, { int: 4 }] },
{ id: 'sekhmet-plaguefire', god: 'sekhmet', template: 'wizard', name: 'Plaguefire',
  damageType: 'fire', attrs: [{ int: 2 }, { int: 4 }] },
{ id: 'isis-enchantress', god: 'isis', template: 'wizard', name: 'Enchantress',
  damageType: 'lightning', attrs: [{ int: 2 }, { int: 4 }] },
```

The other five Egyptian paths stay as shipped (Falconer Dex and Per, Skyguard Sta and Wp,
Gravewarden Str and Sta, Lioness Dex and Str, Lifegiver Int and Wp).

### Start numbers

| What              | Value                                                                           |
| ----------------- | ------------------------------------------------------------------------------- |
| Egyptian temple   | 150 gold, as every temple (`buildings.md`)                                      |
| Recruit           | every 22 s, 7 alive                                                             |
| Unlock            | win with a Greek hero in the town (`meta.md`)                                   |
| Tier 1 stats      | the god's template row (ranger, warrior, rogue, healer)                         |
| God cap           | at most 2 children of one god, on different paths                               |
| Egyptian monsters | jackal-man, scarab swarm; bosses Apep and the Sphinx (`monsters-and-bosses.md`) |

## 3. Passives (`PassiveDef` on GodDef, today's keys)

```ts
horus:   { id: 'eye-of-horus', name: 'Eye of Horus',
           effects: [{ scope: 'self', keys: { aggroMult: 1.2, crit: 0.05 } }] },
anubis:  { id: 'weigher-of-hearts', name: 'Weigher of Hearts',
           effects: [
             { scope: 'self', keys: { vsTag: { undead: 1.25 } } },
             { scope: 'party', range: 300, keys: { bossDeathAdd: -0.1 } },
           ] },
sekhmet: { id: 'fury-of-the-lioness', name: 'Fury of the Lioness',
           effects: [{ scope: 'self', keys: { belowHp: { below: 0.5, stat: 'damage', amount: 0.25 } } }] },
isis:    { id: 'great-of-magic', name: 'Great of Magic',
           effects: [{ scope: 'party', range: 300, keys: { healTakenMult: 1.25 } }] },
```

- Anubis's `bossDeathAdd` also cuts the tier 3 lair death chance by half as many points
  (`combat.md` section 6).

## 4. Skills (`SkillDef`, today's shapes; new shapes marked)

Multipliers are on power (Str, or Int x `spellMult`). `t3` replaces whole fields.

```ts
export const EGYPTIAN_SKILLS: readonly SkillDef[] = [
  {
    id: 'falcon',
    path: 'horus-falconer',
    name: 'Falcon',
    trigger: { kind: 'ready', range: 260 },
    cooldownS: 14,
    target: 'foe',
    shape: { kind: 'single' },
    effects: [
      // NEW SHAPE: { kind: 'summon', summon: 'falcon', count: 1, s: 6 }
      //   the falcon strikes the target for 0.6 physical every 0.8 s; the target cannot dodge
      { kind: 'damage', mult: 0.6, type: 'physical', sure: true },
    ],
    visual: ['summon'],
    // Tier 3: the falcon stays and is resummoned 10 s after it dies (`summon` with `s: 0`).
  },
  {
    id: 'sun-disk',
    path: 'horus-skyguard',
    name: 'Sun Disk',
    trigger: {
      any: [
        { kind: 'allyHurt', below: 0.5, radius: 150 },
        { kind: 'crowd', n: 2, radius: 150 },
      ],
    },
    cooldownS: 16,
    target: 'self',
    shape: { kind: 'circle', radius: 150 },
    effects: [
      { kind: 'buff', stat: 'armour', amount: 0.5, s: 5, to: 'allies' }, // stand-in, see note
      { kind: 'damage', mult: 0.8, type: 'holy' },
    ],
    visual: ['aura', 'burst'],
    t3: {
      effects: [
        { kind: 'buff', stat: 'armour', amount: 0.5, s: 5, to: 'allies' }, // stand-in, see note
        { kind: 'damage', mult: 0.8, type: 'holy', rider: 'sear' },
        { kind: 'shield', pct: 0.05, s: 5, to: 'allies' },
      ],
    },
  },
  {
    id: 'reaping-sweep',
    path: 'anubis-gravewarden',
    name: 'Reaping Sweep',
    trigger: { kind: 'crowd', n: 2, radius: 80 },
    cooldownS: 10,
    target: 'self',
    shape: { kind: 'cone', radius: 80, angle: 180 },
    effects: [
      { kind: 'damage', mult: 1.6, type: 'physical' },
      // NEW SHAPE: { kind: 'drain', pct: 0.3, to: 'self' }  heals 30% of the damage dealt
    ],
    visual: ['cone'],
    t3: {
      effects: [
        { kind: 'damage', mult: 1.6, type: 'physical' },
        // NEW SHAPE: { kind: 'drain', pct: 0.3, to: 'self' }
        // NEW SHAPE: { kind: 'execute', below: 0.2 }  foes left below 20% hp die (not bosses)
      ],
    },
  },
  {
    id: 'raise-the-dead',
    path: 'anubis-embalmer',
    name: 'Raise the Dead',
    trigger: { kind: 'kill', radius: 200 },
    cooldownS: 18,
    target: 'point',
    shape: { kind: 'single' },
    effects: [
      // NEW SHAPE: { kind: 'summon', summon: 'thrall', count: 1, s: 10 }
      //   the dead monster rises with 50% of its stats and fights for the party
    ],
    visual: ['summon'],
    t3: {
      effects: [
        // NEW SHAPE: { kind: 'summon', summon: 'thrall', count: 2, s: 20 }  2 if 2 died
      ],
    },
  },
  {
    id: 'pounce',
    path: 'sekhmet-lioness',
    name: 'Pounce',
    trigger: { kind: 'engage', min: 80, max: 250 },
    cooldownS: 9,
    target: 'foe',
    shape: { kind: 'single' },
    effects: [
      { kind: 'dash' },
      { kind: 'damage', mult: 2.0, type: 'physical' },
      // NEW FIELD on damage: `critBelow: 0.5`  a sure crit if the target is below 50% hp
    ],
    visual: ['dash'],
    // Tier 3: a kill pounces on to the next foe within 200. NEW: `chainOnKill: 200`.
  },
  {
    id: 'plague-breath',
    path: 'sekhmet-plaguefire',
    name: 'Plague Breath',
    trigger: { kind: 'crowd', n: 2, radius: 120, angle: 60 },
    cooldownS: 11,
    target: 'foe',
    shape: { kind: 'cone', radius: 120, angle: 60 },
    effects: [{ kind: 'damage', mult: 1.0, type: 'fire', rider: 'wither' }],
    visual: ['cone'],
    t3: {
      effects: [
        { kind: 'damage', mult: 1.0, type: 'fire', rider: 'wither' },
        // NEEDS the `death` hook: foes that die while withered burst r 60 for 0.8 fire
        // { kind: 'damage', mult: 0.8, type: 'fire', on: 'death' } with shape circle 60
      ],
    },
  },
  {
    id: 'breath-of-life',
    path: 'isis-lifegiver',
    name: 'Breath of Life',
    trigger: { kind: 'allyHurt', below: 0.3, radius: 250 },
    cooldownS: 15,
    target: 'ally',
    shape: { kind: 'single' },
    effects: [{ kind: 'heal', mult: 3 }],
    visual: ['pillar'],
    t3: {
      effects: [
        { kind: 'heal', mult: 3 },
        // NEW SHAPE: { kind: 'revive', hp: 0.4, perFight: 1 }  revives a knocked out party mate
      ],
    },
  },
  {
    id: 'binding-spell',
    path: 'isis-enchantress',
    name: 'Binding Spell',
    trigger: { kind: 'ready', range: 260 },
    cooldownS: 13,
    target: 'foe',
    shape: { kind: 'single' },
    effects: [
      { kind: 'damage', mult: 1.0, type: 'lightning' },
      // NEW SHAPE: { kind: 'bind', s: 3 }  the target cannot move or strike (bosses: half)
    ],
    visual: ['mark', 'chain'],
    t3: {
      shape: { kind: 'circle', radius: 100 },
      // effects as tier 2, on every foe in the circle
    },
  },
];
```

- **Binding Spell's target** is "the foe on a party healer, else the foe with most hp"
  (`paths-and-skills.md`). Today `target: 'foe'` takes the hero's own target; a `pick` rule
  (`onHealer`, `mostHp`) is a small Sim field shared with the Aesir Seer (`pick: 'mostHp'`).
- **Sun Disk's -25% damage taken** is armour x1.5 until Sim adds a `damageTaken` BuffStat
  (new shape below). It is a known gap: armour cuts only physical hits and does nothing for
  0-armour wizards.
- **Raise the Dead: do not paste** until `summon` ships (Sim #194); with empty effects the
  skill would fire and do nothing.
- **Sun Disk tier 3** heals the party 5% (`paths-and-skills.md`); today's shapes have no heal
  by share of max hp, so it is a 5% shield, which plays the same.
- **Falcon without summons:** until Sim ships `summon`, the falcon is a sure 0.6 hit that
  ignores dodge, so the path still works.

### New Sim shapes (one row, section 7)

| Shape                    | Fields                          | Used by                                  |
| ------------------------ | ------------------------------- | ---------------------------------------- |
| `summon`                 | `summon`, `count`, `s`          | Falcon, Raise the Dead (and Aesir decoy) |
| `drain`                  | `pct`                           | Reaping Sweep                            |
| `execute`                | `below` (bosses immune)         | Reaping Sweep tier 3                     |
| `critBelow` (damage)     | share of max hp                 | Pounce                                   |
| `chainOnKill` (skill)    | radius                          | Pounce tier 3                            |
| `death` hook             | runs an effect where a foe died | Plague Breath tier 3                     |
| effect `shape`           | per-effect shape (circle 60)    | Plague Breath tier 3 burst               |
| `damageTaken` (BuffStat) | share less damage taken         | Sun Disk                                 |
| `revive`                 | `hp`, `perFight`                | Breath of Life tier 3                    |
| `bind`                   | `s` (bosses half)               | Binding Spell                            |
| `pick` (skill)           | `mostHp`, `onHealer`            | Binding Spell (and Aesir Seer)           |

## 5. Budget check (for the Sim bot)

| Path        | Casts per 25 s fight | Skill share of output                                    | Within 15-25%?     |
| ----------- | -------------------- | -------------------------------------------------------- | ------------------ |
| Falconer    | 2                    | about 20% with the summon (the stand-in hit is far less) | yes, with `summon` |
| Skyguard    | 1-2                  | about 15% plus the party armour                          | yes, low end       |
| Gravewarden | 2, in crowds         | about 22% plus self heal                                 | yes                |
| Embalmer    | 1-2 (needs kills)    | about 20% (a thrall at 50% stats for 10 s)               | yes                |
| Lioness     | 2-3 (CD 9)           | about 25%                                                | yes, top end       |
| Plaguefire  | 2                    | about 20% plus wither on the targets                     | yes                |
| Lifegiver   | 1-2                  | about 25% of healing                                     | yes                |
| Enchantress | 2                    | about 15% plus 3 s of a foe out                          | yes                |

## 6. Egyptian cards (from `progression.md`)

### Pantheon cards (need an Egyptian hero in the party)

| Id           | Name             | Rarity | Effect                                                                    |
| ------------ | ---------------- | ------ | ------------------------------------------------------------------------- |
| scarab       | Scarab           | common | +3 Sta; heal 3% max hp per kill                                           |
| book-of-dead | Book of the Dead | rare   | +2 Sta, +2 Wp; death chances -10 points (boss), -5 (lair); +25% vs undead |
| eye-of-ra    | Eye of Ra        | epic   | +2 Str, +3 Per; every 4th strike is holy and carries sear                 |

### Favour cards (level 7, one per god in the party, epic)

| Id             | God     | Name              | Effect                                                              |
| -------------- | ------- | ----------------- | ------------------------------------------------------------------- |
| favour-horus   | Horus   | The Sky Sees All  | party: +40% aggro range, +10% crit                                  |
| favour-anubis  | Anubis  | Scales of Ma'at   | party: +25% vs undead; death chances -15 points (boss), -7.5 (lair) |
| favour-sekhmet | Sekhmet | The Lioness Wakes | party: +25% damage while below 50% hp                               |
| favour-isis    | Isis    | Words of Power    | party: healing received +50%                                        |

## 7. Proposed backlog rows

### Balance (data)

| Order | Row                                                                                 |
| ----- | ----------------------------------------------------------------------------------- |
| 10    | Embalmer, Plaguefire and Enchantress bonus to Int (section 2); passives (section 3) |
| 20    | The 8 Egyptian skills (section 4), in today's shapes first                          |
| 30    | Egyptian pantheon and favour cards (section 6) once card families and needs exist   |
| 40    | Bot pass with an Egyptian-lean run against the section 5 budget                     |

### Sim

| Order | Row                                                                            |
| ----- | ------------------------------------------------------------------------------ |
| 10    | Summons (falcon, thrall, decoy): `summon` effect, summon units in the snapshot |
| 20    | `bind`, `execute`, `drain`, `revive`; `critBelow`, `chainOnKill`; `pick`       |
| 30    | The `death` hook (effects where a foe dies)                                    |

### Scene

| Order | Row                                                                                   |
| ----- | ------------------------------------------------------------------------------------- |
| 10    | Bind chains, execute flash, revive pillar, thrall look (green-tinted monster), falcon |

### Art

| Order | Row                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------- |
| 10    | Egyptian heroes per `paths-and-skills.md` "How each path looks"; Egyptian temple per `buildings.md` |
