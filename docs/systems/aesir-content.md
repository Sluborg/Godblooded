# Aesir content sheet (M2)

Design owns this spec. Lead pastes the blocks below into `src/data/` (the rows that need a
new Sim shape say so). It is the concrete content for M2 "Aesir, alive"
(`content-roadmap.md`): the 4 Aesir gods, their 8 paths, damage types, the 4 passives, the 8
signature skills with their tier 3 forms, the template numbers they stand on, and the M2 card
list. Rules come from `combat.md` and `paths-and-skills.md`; this sheet only fixes numbers.

## Bottom line

- **Ready to paste today:** template armour and `spellMult` (Sim already reads both), god and
  path `damageType` (Sim already reads it). Section 2.
- **Ready when Sim ships the shapes:** 4 passives (PassiveDef keys) and 8 skills (SkillDef,
  hooks, the decoy summon). Sections 3 and 4, written in the shapes `paths-and-skills.md`
  proposes, so Sim's types should match them or Lead adjusts the field names once.
- **Path attribute bonuses stay as shipped** (+1/+2 per tier): the tier is the visual reward,
  skills are the power.
- **Budget:** each tier 2 skill adds 15-25% to its hero's fight output; section 5 gives the
  expected numbers so the Sim bot run can check them.

## 1. The Aesir at a glance

| God    | Tier 1 (template, strike) | Passive              | Path 1 (template, type)        | Skill                    | Path 2 (template, type)         | Skill           |
| ------ | ------------------------- | -------------------- | ------------------------------ | ------------------------ | ------------------------------- | --------------- |
| Odin   | wizard, death             | All-Father's Eye     | Seer (wizard, death)           | Raven Omen               | Wanderer (warrior, physical)    | Gungnir         |
| Thor   | warrior, physical         | Giant-Bane           | Hammerborn (paladin, physical) | Mjolnir Slam (lightning) | Stormcaller (wizard, lightning) | Chain Lightning |
| Loki   | rogue, physical           | Slippery             | Trickster (rogue, physical)    | Mirror Double            | Flamebinder (wizard, fire)      | Wildfire        |
| Freyja | healer, holy              | Chooser of the Slain | Valkyrie (warrior, physical)   | Valkyrie's Swoop         | Seidkona (healer, frost)        | Seidr Ward      |

All six damage types appear: physical, lightning, fire, frost, death, holy. A
party of Aesir heroes shows 3-4 colours in a fight by tier 2 (the M2 fun check).

## 2. Paste now (Sim reads these fields today)

### Template additions (`CLASSES` in `src/data/graybox.ts`)

From `combat.md` section 5 and section 9. Add to the existing rows; nothing else changes.

```ts
// warrior
armour: 6,
// ranger
armour: 3,
// wizard
armour: 0, spellMult: 0.8,
// paladin
armour: 10,
// rogue
armour: 3,
// healer
armour: 1, spellMult: 0.5,
```

### Gods (`GODS`, the Aesir four)

```ts
{ id: 'odin', pantheon: 'aesir', name: 'Odin', template: 'wizard', damageType: 'death' },
{ id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'warrior' },
{ id: 'loki', pantheon: 'aesir', name: 'Loki', template: 'rogue' },
{ id: 'freyja', pantheon: 'aesir', name: 'Freyja', template: 'healer', damageType: 'holy' },
```

### Paths (`PATHS`, the Aesir eight; `attrs` as shipped, `damageType` added on casters)

```ts
{ id: 'odin-seer', god: 'odin', template: 'wizard', name: 'Seer', damageType: 'death',
  attrs: [{ str: 1, int: 1 }, { str: 2, int: 2 }] },
{ id: 'odin-wanderer', god: 'odin', template: 'warrior', name: 'Wanderer',
  attrs: [{ str: 1, sta: 1 }, { str: 2, sta: 2 }] },
{ id: 'thor-hammerborn', god: 'thor', template: 'paladin', name: 'Hammerborn',
  attrs: [{ sta: 1, wp: 1 }, { sta: 2, wp: 2 }] },
{ id: 'thor-stormcaller', god: 'thor', template: 'wizard', name: 'Stormcaller',
  damageType: 'lightning', attrs: [{ str: 1, int: 1 }, { str: 2, int: 2 }] },
{ id: 'loki-trickster', god: 'loki', template: 'rogue', name: 'Trickster',
  attrs: [{ dex: 1, str: 1 }, { dex: 2, str: 2 }] },
{ id: 'loki-flamebinder', god: 'loki', template: 'wizard', name: 'Flamebinder',
  damageType: 'fire', attrs: [{ str: 1, int: 1 }, { str: 2, int: 2 }] },
{ id: 'freyja-valkyrie', god: 'freyja', template: 'warrior', name: 'Valkyrie',
  attrs: [{ str: 1, sta: 1 }, { str: 2, sta: 2 }] },
{ id: 'freyja-seidkona', god: 'freyja', template: 'healer', name: 'Seidkona',
  damageType: 'frost', attrs: [{ int: 1, wp: 1 }, { int: 2, wp: 2 }] },
```

- Casters' path bonus gives `str` today because the wizard used Str as spell power before
  `spellMult` existed. With spell power from Int, Lead may move the Seer, Stormcaller and
  Flamebinder bonus to `{ int: 2 }` / `{ int: 4 }` in the balance pass; this sheet keeps the
  shipped numbers so nothing moves twice.

## 3. Passives (paste when Sim ships PassiveDef)

Keys from `paths-and-skills.md` section 7 (passive keys table).

```ts
// on GodDef as `passive`
odin:   { id: 'allfather-eye', name: "All-Father's Eye", scope: 'party', range: 300,
          keys: { attr: { per: 3 }, firstStrike: true } },
thor:   { id: 'giant-bane', name: 'Giant-Bane', scope: 'self',
          keys: { vsTag: { giant: 1.3 } } },
loki:   { id: 'slippery', name: 'Slippery', scope: 'self',
          keys: { firstHitMisses: true, dodge: 0.05 } },
freyja: { id: 'chooser', name: 'Chooser of the Slain', scope: 'party', range: 300,
          keys: { koGoldLoss: 0, koMult: 0.5 } },
```

## 4. Skills (paste when Sim ships SkillDef, hooks and the decoy)

Shape from `paths-and-skills.md` section 7. Multipliers are on power (Str, or Int x
`spellMult`). `t3` lists only what changes.

```ts
export const AESIR_SKILLS = [
  {
    id: 'raven-omen',
    path: 'odin-seer',
    name: 'Raven Omen',
    trigger: { kind: 'ready', range: 300 },
    cooldownS: 12,
    target: 'foe',
    pick: 'mostHp',
    shape: { kind: 'single' },
    effects: [{ mark: 0.25, s: 6 }],
    visual: ['mark'],
    t3: { shape: { kind: 'circle', radius: 200, max: 3 }, effects: [{ mark: 0.35, s: 6 }] },
  },

  {
    id: 'gungnir',
    path: 'odin-wanderer',
    name: 'Gungnir',
    trigger: { kind: 'engage', min: 120, max: 300 },
    cooldownS: 14,
    target: 'foe',
    shape: { kind: 'line', length: 300, max: 1 },
    effects: [{ damage: 2.5, type: 'physical', sure: true }],
    visual: ['line'],
    t3: {
      shape: { kind: 'line', length: 300 },
      effects: [
        { damage: 2.5, type: 'physical', sure: true },
        { damage: 1.0, type: 'physical', sure: true, on: 'cast', target: 'foe' },
      ],
    },
  },

  {
    id: 'mjolnir-slam',
    path: 'thor-hammerborn',
    name: 'Mjolnir Slam',
    trigger: { kind: 'crowd', n: 2, area: { radius: 90 } },
    cooldownS: 10,
    target: 'self',
    shape: { kind: 'circle', radius: 90 },
    effects: [{ damage: 1.5, type: 'lightning' }, { stagger: true }],
    visual: ['pillar', 'burst'],
    t3: {
      shape: { kind: 'circle', radius: 130 },
      effects: [{ damage: 2.0, type: 'lightning', rider: 'arc' }, { stagger: true }],
    },
  },

  {
    id: 'chain-lightning',
    path: 'thor-stormcaller',
    name: 'Chain Lightning',
    trigger: { kind: 'ready', range: 220 },
    cooldownS: 9,
    target: 'foe',
    shape: { kind: 'chain', jumps: 3, radius: 120, falloff: 0.7 },
    effects: [{ damage: 1.4, type: 'lightning' }],
    visual: ['chain'],
    t3: {
      shape: { kind: 'chain', jumps: 5, radius: 120, falloff: 0.7 },
      effects: [
        { damage: 1.4, type: 'lightning' },
        { damage: 1.0, type: 'lightning', at: 'lastHit', visual: 'pillar' },
      ],
    },
  },

  {
    id: 'mirror-double',
    path: 'loki-trickster',
    name: 'Mirror Double',
    trigger: {
      any: [
        { kind: 'selfHurt', below: 0.6 },
        { kind: 'selfHurt', n: 2 },
      ],
    },
    cooldownS: 16,
    target: 'self',
    shape: { kind: 'single' },
    effects: [
      { summon: 'decoy', count: 1, s: 6 },
      { buff: { dodge: 0.3 }, s: 6 },
    ],
    visual: ['summon'],
    t3: {
      effects: [
        { summon: 'decoy', count: 2, s: 6 },
        { buff: { dodge: 0.3 }, s: 6 },
        { damage: 1.0, type: 'fire', on: 'expire', shape: { kind: 'circle', radius: 60 } },
      ],
    },
  },

  {
    id: 'wildfire',
    path: 'loki-flamebinder',
    name: 'Wildfire',
    trigger: { kind: 'ready', range: 220 },
    cooldownS: 10,
    target: 'foe',
    shape: { kind: 'circle', radius: 70 },
    effects: [{ damage: 1.2, type: 'fire', rider: 'burn' }],
    visual: ['bolt', 'burst'],
    t3: {
      shape: { kind: 'circle', radius: 100 },
      effects: [{ damage: 1.2, type: 'fire', rider: 'burn', riderS: 6 }],
    },
  },

  {
    id: 'valkyrie-swoop',
    path: 'freyja-valkyrie',
    name: "Valkyrie's Swoop",
    trigger: { kind: 'allyHurt', below: 0.35, radius: 300 },
    cooldownS: 14,
    target: 'allyAttacker',
    shape: { kind: 'single' },
    effects: [
      { dash: true },
      { damage: 1.8, type: 'physical' },
      { shield: { pct: 0.2 }, s: 5, to: 'ally' },
    ],
    visual: ['dash', 'shield'],
    t3: {
      effects: [
        { dash: true },
        { damage: 1.8, type: 'physical' },
        { damage: 1.0, type: 'physical', shape: { kind: 'circle', radius: 70 } },
        { shield: { pct: 0.35 }, s: 5, to: 'ally' },
      ],
    },
  },

  {
    id: 'seidr-ward',
    path: 'freyja-seidkona',
    name: 'Seidr Ward',
    trigger: { kind: 'allyHurt', below: 0.5, radius: 220 },
    cooldownS: 12,
    target: 'ally',
    shape: { kind: 'single' },
    effects: [
      { shield: { mult: 2 }, s: 6 },
      { damage: 0, type: 'frost', rider: 'chill', to: 'allyAttacker' },
    ],
    visual: ['shield'],
    t3: { shape: { kind: 'circle', radius: 200, who: 'party' } },
  },
];

export const SUMMONS = [
  { id: 'decoy', hpShare: 0.2, strike: null, taunt: { radius: 120 }, look: 'casterTinted' },
];
```

- `pick: 'mostHp'`, `at: 'lastHit'`, `to: 'ally' | 'allyAttacker'` and `riderS` are small
  helper fields the shapes above need; Sim names them once, then they are data.
- The Valkyrie's tier 1 is Freyja's healer; the path turns her into a warrior. Her skill
  replaces healing with the swoop, so a Freyja party wanting a healer needs the Seidkona.

## 5. Budget check (for the Sim bot)

Expected skill share of a hero's damage or healing in a 20-30 s fight at tier 2, from the
multipliers and cooldowns above (casts per fight x multiplier vs basic strikes).

| Path        | Casts per 25 s fight | Skill share of output | Within 15-25%? |
| ----------- | -------------------- | --------------------- | -------------- |
| Seer        | 2 (mark helps all)   | about 20% (party)     | yes            |
| Wanderer    | 1 (opener)           | about 15%             | yes            |
| Hammerborn  | 2, in crowds         | about 25%             | yes, top end   |
| Stormcaller | 2-3                  | about 25%             | yes, top end   |
| Trickster   | 1, defensive         | survival, not damage  | n/a            |
| Flamebinder | 2                    | about 20% plus burn   | yes            |
| Valkyrie    | 1, on a hurt ally    | about 15% plus shield | yes            |
| Seidkona    | 2 shields            | about 25% of healing  | yes            |

The bot run after the skill engine lands checks this with the per-fight records
(`content-roadmap.md`, Sim row 10).

## 6. M2 cards (from `progression.md`)

The 9 shipped plus these 6, all common or rare, no pantheon or skill cards in M2:

| Id             | Name           | Family  | Rarity | Effect                                    |
| -------------- | -------------- | ------- | ------ | ----------------------------------------- |
| keen-mind      | Keen Mind      | stats   | common | +2 Int (needs a caster in the party)      |
| giants-blood   | Giant's Blood  | stats   | rare   | +2 Str, +2 Sta, -1 Dex                    |
| field-dressing | Field Dressing | sustain | common | rest 50% faster                           |
| deep-pockets   | Deep Pockets   | sustain | rare   | +1 potion slot each                       |
| oath-brothers  | Oath-Brothers  | nerve   | common | bonds grow twice as fast                  |
| bounty-hunters | Bounty Hunters | nerve   | common | bounty flags look 50% richer to the party |

## 7. Proposed backlog rows

### Lead (data)

| Order | Row                                                                      |
| ----- | ------------------------------------------------------------------------ |
| 10    | Paste section 2 (template armour and spellMult, god and path damageType) |
| 20    | Paste section 6 (6 cards) once rarity and needs exist                    |
| 30    | Paste sections 3 and 4 when Sim's PassiveDef and SkillDef land           |
| 40    | Balance pass with the Sim bot against the section 5 budget               |

### Sim

| Order | Row                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------ |
| 10    | Type the helper fields used in section 4 (`pick`, `at`, `to`, `riderS`, `count`) with the skill engine |

## OPEN (Stefan decides)

1. **Casters' path bonus to Int** instead of Str (cleaner now that spells use Int)?
2. **The Valkyrie stops healing** (she becomes a warrior): fine, or should she keep a small
   heal on her swoop?
