# Greek content sheet (M3)

Design owns this spec. Balance pastes the blocks below into `src/data/` (the rows that need a
new Sim shape say so). It is the concrete content for the Greek temple in M3
(`content-roadmap.md`): the 4 Greek gods, their 8 paths, damage types, the 4 passives, the 8
signature skills with their tier 3 forms, the Greek cards and favour cards, and the start
numbers. Rules come from `combat.md` and `paths-and-skills.md`; the format follows
`aesir-content.md`. Skills and passives use the shapes Sim ships today (`src/sim/types.ts`,
`SkillDef`, `PassiveDef`).

## Bottom line

- **Theme: cunning and glory.** Athena guards and plans, Ares hits harder the longer a fight
  runs, Apollo heals and shoots light, Poseidon shoves and soaks the field in frost.
- **Ready to paste when the temple ships:** gods, paths and damage types (section 2; most rows
  exist in `src/data/graybox.ts`), 4 passives and 5 of 8 skills in today's shapes.
- **Needs small Sim shapes:** `knockback` (Trident, Tidecaller, Poseidon's passive),
  `lifesteal` and `refreshOnKill` (Bloodrager), `noFlee` (Warlord tier 3), `cleanse` and `hot`
  (Paean tier 3), `volley` (Sunarcher tier 3), an effect-level shape (War Cry), and a
  `regen` passive key (Apollo's favour card); full list in section 4. Section 4 marks each; the skill works without them, minus that part.
- **Budget:** each tier 2 skill adds 15-25% to its hero's fight output, as for the Aesir
  (section 5).

## 1. The Greeks at a glance

| God      | Tier 1 (template, strike) | Passive     | Path 1 (template, type)      | Skill            | Path 2 (template, type)     | Skill           |
| -------- | ------------------------- | ----------- | ---------------------------- | ---------------- | --------------------------- | --------------- |
| Athena   | paladin, physical         | Strategist  | Aegis (paladin, physical)    | Aegis            | Owlsage (wizard, lightning) | Owl's Insight   |
| Ares     | warrior, physical         | Bloodlust   | Bloodrager (rogue, physical) | Frenzy           | Warlord (warrior, physical) | War Cry         |
| Apollo   | ranger, physical          | Healing Sun | Sunarcher (ranger, physical) | Sun Arrow (holy) | Paean (healer, holy)        | Hymn of Healing |
| Poseidon | warrior, physical         | Earthshaker | Trident (warrior, physical)  | Riptide          | Tidecaller (wizard, frost)  | Crashing Wave   |

Types in play: physical, lightning, holy, frost (and frost riders from Aegis tier 3). A Greek
party is less colourful than an Aesir one by design: its show is buffs (gold rings, red rage,
shields) and shoves (knockback), not elements.

## 2. Paste with the temple (Sim reads these fields today)

### Gods (`GODS`, the Greek four; already in `src/data/graybox.ts`, unchanged)

```ts
{ id: 'athena', pantheon: 'greek', name: 'Athena', template: 'paladin' },
{ id: 'ares', pantheon: 'greek', name: 'Ares', template: 'warrior' },
{ id: 'apollo', pantheon: 'greek', name: 'Apollo', template: 'ranger' },
{ id: 'poseidon', pantheon: 'greek', name: 'Poseidon', template: 'warrior' },
```

### Paths (`PATHS`; change only the casters' bonus, decision 2026-10-13: casters to Int)

```ts
{ id: 'athena-owlsage', god: 'athena', template: 'wizard', name: 'Owlsage',
  damageType: 'lightning', attrs: [{ int: 2 }, { int: 4 }] },
{ id: 'poseidon-tidecaller', god: 'poseidon', template: 'wizard', name: 'Tidecaller',
  damageType: 'frost', attrs: [{ int: 2 }, { int: 4 }] },
```

The other six Greek paths stay as shipped (Aegis Sta and Wp, Bloodrager Dex and Str, Warlord
Str and Sta, Sunarcher Dex and Per, Paean Int and Wp, Trident Str and Sta).

### Start numbers

| What           | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Greek temple   | 150 gold, as the Aesir temple (`buildings.md`)                        |
| Recruit        | every 22 s, 7 alive, same as every temple                             |
| Unlock         | win once, or play 3 runs (`meta.md`)                                  |
| Tier 1 stats   | the god's template row (paladin, warrior, ranger, warrior)            |
| God cap        | at most 2 children of one god, on different paths (decision)          |
| Greek monsters | harpy, minotaur; bosses Hydra and Cerberus (`monsters-and-bosses.md`) |

## 3. Passives (`PassiveDef` on GodDef, today's keys)

```ts
athena:   { id: 'strategist', name: 'Strategist',
            effects: [{ scope: 'party', range: 200, keys: { armour: 2 } }] },
ares:     { id: 'bloodlust', name: 'Bloodlust',
            effects: [{ scope: 'self', keys: { onKillStack: { stat: 'attackSpeed', per: 0.06, max: 5 } } }] },
apollo:   { id: 'healing-sun', name: 'Healing Sun',
            effects: [{ scope: 'party', range: 300, keys: { restMult: 1.5 } }] },
poseidon: { id: 'earthshaker', name: 'Earthshaker',
            effects: [{ scope: 'self', keys: { everyNth: { n: 5, effects: [{ kind: 'stagger' }] } } }] },
```

- **Poseidon's knockback 40** (`paths-and-skills.md` section 5) joins the `everyNth` effects
  as `{ kind: 'knockback', dist: 40 }` once Sim ships `knockback` (section 4).

## 4. Skills (`SkillDef`, today's shapes; new shapes marked)

Multipliers are on power (Str, or Int x `spellMult`). `t3` replaces whole fields.

```ts
export const GREEK_SKILLS: readonly SkillDef[] = [
  {
    id: 'aegis',
    path: 'athena-aegis',
    name: 'Aegis',
    trigger: { kind: 'crowd', n: 2, radius: 150 },
    cooldownS: 15,
    target: 'self',
    shape: { kind: 'circle', radius: 150 },
    effects: [
      { kind: 'taunt', s: 4 },
      { kind: 'buff', stat: 'armour', amount: 0.5, s: 4, to: 'self' },
    ],
    visual: ['aura', 'shield'],
    t3: {
      effects: [
        { kind: 'taunt', s: 4 },
        { kind: 'buff', stat: 'armour', amount: 0.5, s: 4, to: 'self' },
        { kind: 'damage', mult: 0, type: 'frost', rider: 'chill' },
      ],
    },
  },
  {
    id: 'owls-insight',
    path: 'athena-owlsage',
    name: "Owl's Insight",
    trigger: { kind: 'ready', range: 300 },
    cooldownS: 16,
    target: 'self',
    shape: { kind: 'circle', radius: 200 },
    effects: [{ kind: 'buff', stat: 'crit', amount: 0.2, s: 6, to: 'allies' }],
    visual: ['aura'],
    t3: {
      effects: [
        { kind: 'buff', stat: 'crit', amount: 0.3, s: 6, to: 'allies' },
        { kind: 'buff', stat: 'attackSpeed', amount: 0.15, s: 6, to: 'allies' },
      ],
    },
  },
  {
    id: 'frenzy',
    path: 'ares-bloodrager',
    name: 'Frenzy',
    trigger: {
      any: [
        { kind: 'kill', radius: 120 },
        { kind: 'selfHurt', below: 0.5 },
      ],
    },
    cooldownS: 12,
    target: 'self',
    shape: { kind: 'single' },
    effects: [
      { kind: 'buff', stat: 'attackSpeed', amount: 0.5, s: 5, to: 'self' },
      // NEW SHAPE: { kind: 'lifesteal', pct: 0.05, s: 5 }  heals 5% max hp per landed hit
    ],
    visual: ['aura'],
    // Tier 3: a kill during Frenzy refreshes it. NEW: Sim resets the cooldown on a kill while
    // the buff runs (`refreshOnKill: true` on the SkillDef).
  },
  {
    id: 'war-cry',
    path: 'ares-warlord',
    name: 'War Cry',
    trigger: { kind: 'crowd', n: 2, radius: 150 },
    cooldownS: 18,
    target: 'self',
    shape: { kind: 'circle', radius: 200 },
    effects: [
      { kind: 'buff', stat: 'damage', amount: 0.25, s: 6, to: 'allies' },
      { kind: 'stagger' }, // spec r 150; effect-level shape (NEW) until then r 200
    ],
    visual: ['burst'],
    t3: {
      effects: [
        { kind: 'buff', stat: 'damage', amount: 0.35, s: 6, to: 'allies' },
        { kind: 'stagger' },
        // NEW SHAPE: { kind: 'noFlee', to: 'allies' }  the party does not flee this fight
      ],
    },
  },
  {
    id: 'sun-arrow',
    path: 'apollo-sunarcher',
    name: 'Sun Arrow',
    trigger: { kind: 'engage', min: 120, max: 260 },
    cooldownS: 10,
    target: 'foe',
    shape: { kind: 'single' },
    effects: [{ kind: 'damage', mult: 2.0, type: 'holy', rider: 'sear', sure: true }],
    visual: ['bolt', 'pillar'],
    t3: {
      effects: [
        { kind: 'damage', mult: 2.0, type: 'holy', rider: 'sear', sure: true },
        // NEW SHAPE: { kind: 'volley', count: 3, radius: 80, mult: 1.2, type: 'holy' }
        //   then 3 arrows on random foes within 80 of the target
      ],
    },
  },
  {
    id: 'hymn-of-healing',
    path: 'apollo-paean',
    name: 'Hymn of Healing',
    trigger: { kind: 'allyHurt', below: 0.6, radius: 220, n: 2 },
    cooldownS: 14,
    target: 'self',
    shape: { kind: 'circle', radius: 220 },
    effects: [{ kind: 'heal', mult: 1 }],
    visual: ['aura'],
    t3: {
      effects: [
        { kind: 'heal', mult: 1 },
        // NEW SHAPE: { kind: 'cleanse' }  clears riders on allies
        // NEW SHAPE: { kind: 'hot', pct: 0.02, s: 5 }  heals 2% max hp per second
      ],
    },
  },
  {
    id: 'riptide',
    path: 'poseidon-trident',
    name: 'Riptide',
    trigger: { kind: 'crowd', n: 2, radius: 120 },
    cooldownS: 10,
    target: 'foe',
    shape: { kind: 'line', length: 140 },
    effects: [
      { kind: 'damage', mult: 1.4, type: 'physical' },
      // NEW SHAPE: { kind: 'knockback', dist: 60 }
    ],
    visual: ['line'],
    t3: {
      shape: { kind: 'line', length: 200 },
      effects: [
        { kind: 'damage', mult: 1.4, type: 'frost', rider: 'chill' },
        // NEW SHAPE: { kind: 'knockback', dist: 60 }
      ],
    },
  },
  {
    id: 'crashing-wave',
    path: 'poseidon-tidecaller',
    name: 'Crashing Wave',
    trigger: { kind: 'crowd', n: 3, radius: 100 },
    cooldownS: 13,
    target: 'foe',
    shape: { kind: 'circle', radius: 100 },
    effects: [
      { kind: 'damage', mult: 1.2, type: 'frost', rider: 'chill' },
      // NEW SHAPE: { kind: 'knockback', dist: 50 }
    ],
    visual: ['burst'],
    t3: {
      shape: { kind: 'circle', radius: 140 },
      effects: [
        { kind: 'damage', mult: 1.6, type: 'frost', rider: 'chill' },
        // NEW SHAPE: { kind: 'knockback', dist: 50 }
      ],
    },
  },
];
```

- **Riptide's line hits up to 3 foes** (`paths-and-skills.md`). Today's `line` has no cap;
  with crowds of 2-4 it rarely matters, so no new field.
- **Aegis's chill at tier 3** uses a 0-damage strike that carries only the rider, as Seidr Ward
  does.
- **Aegis's trigger** is 2 foes within 150 of the caster (the spec said "near a party mate");
  a tank in front reads the same and needs no new trigger.

### New Sim shapes (one row, section 7)

| Shape                 | Fields                            | Used by                             |
| --------------------- | --------------------------------- | ----------------------------------- |
| `knockback`           | `dist`                            | Riptide, Crashing Wave, Earthshaker |
| `lifesteal`           | `pct`, `s`                        | Frenzy                              |
| `refreshOnKill`       | SkillDef flag                     | Frenzy tier 3                       |
| `noFlee`              | (none; lasts the fight)           | War Cry tier 3                      |
| `cleanse`, `hot`      | `hot`: `pct`, `s`                 | Hymn of Healing tier 3              |
| `volley`              | `count`, `radius`, `mult`, `type` | Sun Arrow tier 3                    |
| effect `shape`        | per-effect shape                  | War Cry stagger (r 150)             |
| `regen` (passive key) | `pct` per second in fights        | Apollo's favour card                |

## 5. Budget check (for the Sim bot)

| Path       | Casts per 25 s fight | Skill share of output                       | Within 15-25%? |
| ---------- | -------------------- | ------------------------------------------- | -------------- |
| Aegis      | 1-2, in crowds       | survival (armour, taunt), not damage        | n/a            |
| Owlsage    | 2                    | about 15% (party crit), more with crit gear | yes, low end   |
| Bloodrager | 2 (kills reset)      | about 25% (attack speed +50% for 5 s)       | yes, top end   |
| Warlord    | 1-2                  | about 20% (party +25% for 6 s)              | yes            |
| Sunarcher  | 2 (opener + 1)       | about 20%                                   | yes            |
| Paean      | 1-2                  | about 25% of healing                        | yes            |
| Trident    | 2                    | about 18% with 2-3 foes in line             | yes            |
| Tidecaller | 2                    | about 22% with 3+ foes                      | yes            |

## 6. Greek cards (from `progression.md`)

### Pantheon cards (need a Greek hero in the party)

| Id      | Name    | Rarity | Effect                                                                                    |
| ------- | ------- | ------ | ----------------------------------------------------------------------------------------- |
| phalanx | Phalanx | common | +3 armour while 3 members stand within 100                                                |
| kleos   | Kleos   | rare   | +50% gold from flags and lairs; a kill shout per kill, within the bark tempo (`barks.md`) |
| metis   | Metis   | epic   | +10% crit; crits stagger                                                                  |

### Favour cards (level 7, one per god in the party, epic)

A stronger form of the god's passive for the whole party (`progression.md`).

| Id              | God      | Name             | Effect                                                              |
| --------------- | -------- | ---------------- | ------------------------------------------------------------------- |
| favour-athena   | Athena   | Athena's Plan    | party: +4 armour, and the party always wins first strike            |
| favour-ares     | Ares     | Blood for Ares   | party: +6% attack speed per kill this fight, up to 5 stacks         |
| favour-apollo   | Apollo   | Light of Delphi  | party: rests twice as fast and heals 1% max hp per second in fights |
| favour-poseidon | Poseidon | Wrath of the Sea | party: every 4th strike staggers and knocks back 40                 |

## 7. Proposed backlog rows

### Balance (data)

| Order | Row                                                                            |
| ----- | ------------------------------------------------------------------------------ |
| 10    | Owlsage and Tidecaller bonus to Int (section 2); passives (section 3)          |
| 20    | The 8 Greek skills (section 4), the 5 without new shapes first                 |
| 30    | Greek pantheon and favour cards (section 6) once card families and needs exist |
| 40    | Bot pass with a Greek-lean run against the section 5 budget                    |

### Sim

| Order | Row                                                                                 |
| ----- | ----------------------------------------------------------------------------------- |
| 10    | Effect shapes `knockback`, `lifesteal`, `noFlee`, `cleanse`, `hot`; `refreshOnKill` |

### Scene

| Order | Row                                                                                   |
| ----- | ------------------------------------------------------------------------------------- |
| 10    | Knockback slide (0.2 s), noFlee banner flash, cleanse sparkle; Greek temple and looks |

### Art

| Order | Row                                                                                           |
| ----- | --------------------------------------------------------------------------------------------- |
| 10    | Greek heroes per `paths-and-skills.md` "How each path looks"; Greek temple per `buildings.md` |
