// Graybox content (M1). Lead owns these numbers; Sim reads them. Ids match the art manifest
// types (`hero_<class>`, `mon_<type>`, `bld_<type>`), so `bld_${id}_t${tier}` finds the sprite.
import type {
  ClassDef,
  GameData,
  GodDef,
  ItemDef,
  LairDef,
  MonsterDef,
  PathDef,
  SkillDef,
  SummonDef,
  UpgradeDef,
} from '../sim/types';

// Derived (Sim): hp = sta * 8 + str * 4, damage = str, attack time = weapon base reduced by dex.

// Recruited by temple_aesir in M1 (pantheon temples split this in M3).
export const CLASSES: readonly ClassDef[] = [
  {
    id: 'warrior',
    attrs: { str: 6, dex: 3, sta: 6, cha: 3, per: 3, int: 2, wp: 5 },
    weapon: { baseAttackS: 1.6, range: 40 },
    startGold: 40,
    kit: 'heavy',
    armour: 6,
  },
  {
    id: 'ranger',
    attrs: { str: 4, dex: 6, sta: 4, cha: 3, per: 6, int: 3, wp: 4 },
    weapon: { baseAttackS: 1.4, range: 220 },
    startGold: 50,
    kit: 'light',
    armour: 3,
  },
  // Wizard: spell power is Int x spellMult; Str only adds hp.
  {
    id: 'wizard',
    attrs: { str: 5, dex: 4, sta: 3, cha: 3, per: 5, int: 7, wp: 5 },
    weapon: { baseAttackS: 1.9, range: 200 },
    startGold: 45,
    kit: 'robe',
    armour: 0,
    spellMult: 1,
  },
  {
    id: 'paladin',
    attrs: { str: 5, dex: 2, sta: 8, cha: 4, per: 3, int: 3, wp: 7 },
    weapon: { baseAttackS: 1.9, range: 40 },
    startGold: 40,
    kit: 'heavy',
    armour: 10,
  },
  {
    id: 'rogue',
    attrs: { str: 4, dex: 8, sta: 4, cha: 3, per: 5, int: 3, wp: 3 },
    weapon: { baseAttackS: 1.1, range: 40 },
    startGold: 60,
    kit: 'light',
    armour: 3,
  },
  // Healer: mends the most hurt party mate below the heal threshold, otherwise casts a bolt.
  {
    id: 'healer',
    attrs: { str: 2, dex: 3, sta: 4, cha: 4, per: 4, int: 6, wp: 6 },
    weapon: { baseAttackS: 1.6, range: 200 },
    startGold: 40,
    kit: 'robe',
    heals: true,
    armour: 1,
    spellMult: 0.6,
  },
];

// Gods (docs/game-design.md, "Gods and paths", decision 2026-10-13): a temple calls a child of
// one of its pantheon's gods. `template` is the hidden ClassDef a tier 1 child uses.
export const GODS: readonly GodDef[] = [
  {
    id: 'odin',
    pantheon: 'aesir',
    name: 'Odin',
    template: 'wizard',
    damageType: 'death',
    passive: {
      id: 'allfather-eye',
      name: "All-Father's Eye",
      effects: [{ scope: 'party', range: 300, keys: { attr: { per: 3 }, firstStrike: true } }],
    },
  },
  {
    id: 'thor',
    pantheon: 'aesir',
    name: 'Thor',
    template: 'warrior',
    passive: {
      id: 'giant-bane',
      name: 'Giant-Bane',
      effects: [{ scope: 'self', keys: { vsTag: { giant: 1.3 } } }],
    },
  },
  {
    id: 'loki',
    pantheon: 'aesir',
    name: 'Loki',
    template: 'rogue',
    passive: {
      id: 'slippery',
      name: 'Slippery',
      effects: [{ scope: 'self', keys: { firstHitMisses: true, dodge: 0.05 } }],
    },
  },
  {
    id: 'freyja',
    pantheon: 'aesir',
    name: 'Freyja',
    template: 'healer',
    damageType: 'holy',
    passive: {
      id: 'chooser',
      name: 'Chooser of the Slain',
      effects: [{ scope: 'mates', range: 300, keys: { koGoldLoss: 0, koMult: 0.667 } }],
    },
  },
  { id: 'athena', pantheon: 'greek', name: 'Athena', template: 'paladin' },
  { id: 'ares', pantheon: 'greek', name: 'Ares', template: 'warrior' },
  { id: 'apollo', pantheon: 'greek', name: 'Apollo', template: 'ranger' },
  { id: 'poseidon', pantheon: 'greek', name: 'Poseidon', template: 'warrior' },
  { id: 'horus', pantheon: 'egyptian', name: 'Horus', template: 'ranger' },
  { id: 'anubis', pantheon: 'egyptian', name: 'Anubis', template: 'warrior' },
  { id: 'sekhmet', pantheon: 'egyptian', name: 'Sekhmet', template: 'rogue' },
  { id: 'isis', pantheon: 'egyptian', name: 'Isis', template: 'healer', damageType: 'holy' },
];

// Two paths per god, taken at the first tier-up; ids match the art (hero_<id>_t2_front). Bonus is
// [tier 2, tier 3 total] on top of the path template, kept modest: the tier is the visual reward.
export const PATHS: readonly PathDef[] = [
  {
    id: 'odin-seer',
    god: 'odin',
    template: 'wizard',
    name: 'Seer',
    damageType: 'death',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'odin-wanderer',
    god: 'odin',
    template: 'warrior',
    name: 'Wanderer',
    attrs: [
      { str: 1, sta: 1 },
      { str: 2, sta: 2 },
    ],
  },
  {
    id: 'thor-hammerborn',
    god: 'thor',
    template: 'paladin',
    name: 'Hammerborn',
    attrs: [
      { sta: 1, wp: 1 },
      { sta: 2, wp: 2 },
    ],
  },
  {
    id: 'thor-stormcaller',
    god: 'thor',
    template: 'wizard',
    name: 'Stormcaller',
    damageType: 'lightning',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'loki-trickster',
    god: 'loki',
    template: 'rogue',
    name: 'Trickster',
    attrs: [
      { dex: 1, str: 1 },
      { dex: 2, str: 2 },
    ],
  },
  {
    id: 'loki-flamebinder',
    god: 'loki',
    template: 'wizard',
    name: 'Flamebinder',
    damageType: 'fire',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'freyja-valkyrie',
    god: 'freyja',
    template: 'warrior',
    name: 'Valkyrie',
    attrs: [
      { str: 1, sta: 1 },
      { str: 2, sta: 2 },
    ],
  },
  {
    id: 'freyja-seidkona',
    god: 'freyja',
    template: 'healer',
    name: 'Seidkona',
    damageType: 'frost',
    attrs: [
      { int: 1, wp: 1 },
      { int: 2, wp: 2 },
    ],
  },
  {
    id: 'athena-aegis',
    god: 'athena',
    template: 'paladin',
    name: 'Aegis',
    attrs: [
      { sta: 1, wp: 1 },
      { sta: 2, wp: 2 },
    ],
  },
  {
    id: 'athena-owlsage',
    god: 'athena',
    template: 'wizard',
    name: 'Owlsage',
    damageType: 'lightning',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'ares-bloodrager',
    god: 'ares',
    template: 'rogue',
    name: 'Bloodrager',
    attrs: [
      { dex: 1, str: 1 },
      { dex: 2, str: 2 },
    ],
  },
  {
    id: 'ares-warlord',
    god: 'ares',
    template: 'warrior',
    name: 'Warlord',
    attrs: [
      { str: 1, sta: 1 },
      { str: 2, sta: 2 },
    ],
  },
  {
    id: 'apollo-sunarcher',
    god: 'apollo',
    template: 'ranger',
    name: 'Sunarcher',
    attrs: [
      { dex: 1, per: 1 },
      { dex: 2, per: 2 },
    ],
  },
  {
    id: 'apollo-paean',
    god: 'apollo',
    template: 'healer',
    name: 'Paean',
    damageType: 'holy',
    attrs: [
      { int: 1, wp: 1 },
      { int: 2, wp: 2 },
    ],
  },
  {
    id: 'poseidon-trident',
    god: 'poseidon',
    template: 'warrior',
    name: 'Trident',
    attrs: [
      { str: 1, sta: 1 },
      { str: 2, sta: 2 },
    ],
  },
  {
    id: 'poseidon-tidecaller',
    god: 'poseidon',
    template: 'wizard',
    name: 'Tidecaller',
    damageType: 'frost',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'horus-falconer',
    god: 'horus',
    template: 'ranger',
    name: 'Falconer',
    attrs: [
      { dex: 1, per: 1 },
      { dex: 2, per: 2 },
    ],
  },
  {
    id: 'horus-skyguard',
    god: 'horus',
    template: 'paladin',
    name: 'Skyguard',
    attrs: [
      { sta: 1, wp: 1 },
      { sta: 2, wp: 2 },
    ],
  },
  {
    id: 'anubis-gravewarden',
    god: 'anubis',
    template: 'warrior',
    name: 'Gravewarden',
    attrs: [
      { str: 1, sta: 1 },
      { str: 2, sta: 2 },
    ],
  },
  {
    id: 'anubis-embalmer',
    god: 'anubis',
    template: 'wizard',
    name: 'Embalmer',
    damageType: 'death',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'sekhmet-lioness',
    god: 'sekhmet',
    template: 'rogue',
    name: 'Lioness',
    attrs: [
      { dex: 1, str: 1 },
      { dex: 2, str: 2 },
    ],
  },
  {
    id: 'sekhmet-plaguefire',
    god: 'sekhmet',
    template: 'wizard',
    name: 'Plaguefire',
    damageType: 'fire',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'isis-lifegiver',
    god: 'isis',
    template: 'healer',
    name: 'Lifegiver',
    damageType: 'holy',
    attrs: [
      { int: 1, wp: 1 },
      { int: 2, wp: 2 },
    ],
  },
  {
    id: 'isis-enchantress',
    god: 'isis',
    template: 'wizard',
    name: 'Enchantress',
    damageType: 'lightning',
    attrs: [{ int: 2 }, { int: 4 }],
  },
];

export const MONSTERS: readonly MonsterDef[] = [
  {
    id: 'draugr',
    attrs: { str: 5, dex: 3, sta: 5, cha: 1, per: 3, int: 1, wp: 6 },
    weapon: { baseAttackS: 1.7, range: 40 },
    bounty: 12,
    xp: 10,
    armour: 2,
    tags: ['undead'],
    types: { holy: 1.5, fire: 1.5, death: 0.5, frost: 0.5 },
  },
  {
    id: 'troll',
    attrs: { str: 10, dex: 2, sta: 11, cha: 1, per: 2, int: 1, wp: 4 },
    weapon: { baseAttackS: 2.4, range: 50 },
    bounty: 40,
    xp: 35,
    armour: 4,
    tags: ['giant'],
    types: { fire: 1.5, frost: 0.5 },
  },
  {
    id: 'harpy',
    attrs: { str: 4, dex: 7, sta: 4, cha: 1, per: 5, int: 1, wp: 3 },
    weapon: { baseAttackS: 1.3, range: 40 },
    bounty: 14,
    xp: 12,
    armour: 1,
    tags: ['beast', 'flyer'],
    types: { lightning: 1.5 },
  },
  {
    id: 'jackal-man',
    attrs: { str: 6, dex: 5, sta: 6, cha: 1, per: 4, int: 2, wp: 5 },
    weapon: { baseAttackS: 1.6, range: 45 },
    bounty: 18,
    xp: 15,
    armour: 2,
    tags: ['undead'],
    types: { holy: 1.5, death: 0.5 },
  },
  {
    id: 'minotaur',
    attrs: { str: 9, dex: 3, sta: 10, cha: 1, per: 3, int: 1, wp: 5 },
    weapon: { baseAttackS: 2.1, range: 50 },
    bounty: 34,
    xp: 30,
    armour: 5,
    tags: ['beast', 'giant'],
    types: { frost: 1.5, physical: 0.75 },
  },
  // Fafnir (monsters-and-bosses.md section 3). Balance pass: hp 1200 and Str 14 (spec 2400 and 22)
  // for the graybox parties, which are weaker than the spec's four tier 3 heroes.
  {
    id: 'wyrm',
    attrs: { str: 14, dex: 3, sta: 12, cha: 1, per: 4, int: 2, wp: 8 },
    weapon: { baseAttackS: 2.0, range: 70 },
    bounty: 400,
    xp: 300,
    armour: 7,
    tags: ['boss'],
    boss: {},
    hp: 1200,
    types: { frost: 1.5, fire: 0.5, physical: 0.75 },
  },
];

// Lairs from docs/systems/monsters-and-bosses.md section 4; the wyrm nest is the boss lair (the
// run is won when it falls) and spawns draugr guards. Balance pass (Lead 80): big lairs 6000 hp
// and the nest 8000 hp (spec 9000 and 16000) keep the median run at 15-18 min.
export const LAIRS: readonly LairDef[] = [
  { id: 'barrow', monster: 'draugr', spawnS: 10, maxAlive: 6, hp: 3500 },
  { id: 'troll-den', monster: 'troll', spawnS: 25, maxAlive: 4, hp: 6000 },
  { id: 'harpy-roost', monster: 'harpy', spawnS: 9, maxAlive: 6, hp: 3000 },
  { id: 'jackal-camp', monster: 'jackal-man', spawnS: 10, maxAlive: 6, hp: 3500 },
  { id: 'labyrinth', monster: 'minotaur', spawnS: 24, maxAlive: 4, hp: 6000 },
  { id: 'wyrm-nest', monster: 'wyrm', spawnS: 30, maxAlive: 3, hp: 8000, escort: 'draugr' },
];

// Level-up cards; a party is offered 3 and its leader auto-picks (level-ups.md): `god` offers
// the card, `pickTag` is what a leader trait looks for. Graybox set: stats, sustain, nerve.
export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'iron-arms',
    family: 'stats',
    rarity: 'common',
    god: 'thor',
    pickTag: 'attack',
    name: 'Iron Arms',
    text: '+2 Strength for the whole party',
    effect: { attr: { str: 2 } },
  },
  {
    id: 'thick-hide',
    family: 'stats',
    rarity: 'common',
    god: 'anubis',
    pickTag: 'defence',
    name: 'Thick Hide',
    text: '+2 Stamina for the whole party',
    effect: { attr: { sta: 2 } },
  },
  {
    id: 'quick-feet',
    family: 'stats',
    rarity: 'common',
    god: 'loki',
    pickTag: 'attack',
    name: 'Quick Feet',
    text: '+2 Dexterity: faster attacks, more dodges',
    effect: { attr: { dex: 2 } },
  },
  {
    id: 'hawk-eyes',
    family: 'stats',
    rarity: 'common',
    god: 'horus',
    pickTag: 'sight',
    name: 'Hawk Eyes',
    text: '+3 Perception: spot monsters from further away',
    effect: { attr: { per: 3 } },
  },
  {
    id: 'iron-will',
    family: 'stats',
    rarity: 'common',
    god: 'athena',
    pickTag: 'defence',
    name: 'Iron Will',
    text: '+2 Willpower and +1 Stamina',
    effect: { attr: { wp: 2, sta: 1 } },
  },
  {
    id: 'battle-hymn',
    family: 'stats',
    rarity: 'common',
    god: 'ares',
    pickTag: 'attack',
    name: 'Battle Hymn',
    text: '+1 Strength and +1 Dexterity',
    effect: { attr: { str: 1, dex: 1 } },
  },
  {
    id: 'odins-eye',
    family: 'nerve',
    rarity: 'common',
    god: 'odin',
    pickTag: 'nerve',
    name: "Odin's Eye",
    text: 'Heal 50% now; the party flees later (at 15% hp instead of 30%)',
    effect: { healPct: 50, flee: 0.15 },
  },
  {
    id: 'second-wind',
    family: 'sustain',
    rarity: 'common',
    god: 'freyja',
    pickTag: 'sustain',
    name: 'Second Wind',
    text: 'Heal the whole party to full now',
    effect: { healPct: 100 },
  },
  {
    id: 'berserker',
    family: 'nerve',
    rarity: 'rare',
    god: 'sekhmet',
    pickTag: 'nerve',
    name: 'Berserker',
    text: '+3 Strength, but the party never flees',
    effect: { attr: { str: 3 }, flee: 0 },
  },
  {
    id: 'keen-mind',
    god: 'odin',
    pickTag: 'attack',
    family: 'stats',
    rarity: 'common',
    needs: { caster: true },
    name: 'Keen Mind',
    text: '+2 Intelligence for the whole party',
    effect: { attr: { int: 2 } },
  },
  {
    id: 'giants-blood',
    god: 'thor',
    pickTag: 'defence',
    family: 'stats',
    rarity: 'rare',
    name: "Giant's Blood",
    text: '+2 Strength and +2 Stamina, -1 Dexterity',
    effect: { attr: { str: 2, sta: 2, dex: -1 } },
  },
  {
    id: 'field-dressing',
    god: 'freyja',
    pickTag: 'sustain',
    family: 'sustain',
    rarity: 'common',
    name: 'Field Dressing',
    text: 'The party rests 50% faster',
    effect: { keys: { restMult: 1.5 } },
  },
  {
    id: 'deep-pockets',
    god: 'loki',
    pickTag: 'sustain',
    family: 'sustain',
    rarity: 'rare',
    name: 'Deep Pockets',
    text: '+1 potion slot each',
    effect: { keys: { potionSlots: 1 } },
  },
  {
    id: 'tight-purse',
    god: 'loki',
    pickTag: 'gold',
    family: 'nerve',
    rarity: 'common',
    name: 'Tight Purse',
    text: 'Knocked-out members lose half as much gold',
    effect: { keys: { koGoldLoss: 0.5 } },
  },
  {
    id: 'wolf-blood',
    god: 'odin',
    pickTag: 'nerve',
    family: 'nerve',
    rarity: 'common',
    name: 'Wolf Blood',
    text: '+25% damage while below 30% hp',
    effect: { keys: { belowHp: { below: 0.3, stat: 'damage', amount: 0.25 } } },
  },
];

// Aesir path skills (docs/systems/aesir-content.md section 4), one per path, mapped onto the
// SkillDef shapes Sim shipped. Multipliers are on power (Str, or Int x spellMult).
export const SKILLS: readonly SkillDef[] = [
  // Approximation: the spec marks the foe with the most hp and caps tier 3 at 3 targets;
  // SkillDef marks the hero's own foe and every foe in the circle.
  {
    id: 'raven-omen',
    path: 'odin-seer',
    name: 'Raven Omen',
    trigger: { kind: 'ready', range: 300 },
    cooldownS: 12,
    target: 'foe',
    shape: { kind: 'single' },
    effects: [{ kind: 'mark', pct: 0.25, s: 6 }],
    visual: ['mark'],
    t3: {
      shape: { kind: 'circle', radius: 200 },
      effects: [{ kind: 'mark', pct: 0.35, s: 6 }],
    },
  },
  {
    id: 'gungnir',
    path: 'odin-wanderer',
    name: 'Gungnir',
    trigger: { kind: 'engage', min: 120, max: 300 },
    cooldownS: 14,
    target: 'foe',
    shape: { kind: 'single' },
    effects: [{ kind: 'damage', mult: 2.5, type: 'physical', sure: true }],
    visual: ['line'],
    // Tier 3 pierces the line. Approximation: the spec's extra 1.0x on the first foe has no field.
    t3: { shape: { kind: 'line', length: 300 } },
  },
  {
    id: 'mjolnir-slam',
    path: 'thor-hammerborn',
    name: 'Mjolnir Slam',
    trigger: { kind: 'crowd', n: 2, radius: 90 },
    cooldownS: 10,
    target: 'self',
    shape: { kind: 'circle', radius: 90 },
    effects: [{ kind: 'damage', mult: 1.5, type: 'lightning' }, { kind: 'stagger' }],
    visual: ['pillar', 'burst'],
    t3: {
      shape: { kind: 'circle', radius: 130 },
      effects: [
        { kind: 'damage', mult: 2.0, type: 'lightning', rider: 'arc' },
        { kind: 'stagger' },
      ],
    },
  },
  {
    id: 'chain-lightning',
    path: 'thor-stormcaller',
    name: 'Chain Lightning',
    trigger: { kind: 'ready', range: 220 },
    cooldownS: 10,
    target: 'foe',
    shape: { kind: 'chain', jumps: 3, radius: 120, falloff: 0.7 },
    effects: [{ kind: 'damage', mult: 0.9, type: 'lightning' }],
    visual: ['chain'],
    // Approximation: the spec's tier 3 pillar on the last foe hit has no field.
    t3: { shape: { kind: 'chain', jumps: 5, radius: 120, falloff: 0.7 } },
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
      { kind: 'summon', summon: 'decoy', count: 1, s: 6 },
      { kind: 'buff', stat: 'dodge', amount: 0.3, s: 6, to: 'self' },
    ],
    visual: ['summon'],
    t3: {
      effects: [
        {
          kind: 'summon',
          summon: 'decoy',
          count: 2,
          s: 6,
          end: { radius: 60, effects: [{ kind: 'damage', mult: 1.0, type: 'fire' }] },
        },
        { kind: 'buff', stat: 'dodge', amount: 0.3, s: 6, to: 'self' },
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
    effects: [{ kind: 'damage', mult: 1.2, type: 'fire', rider: 'burn' }],
    visual: ['bolt', 'burst'],
    // Approximation: the spec's 6 s burn at tier 3 has no field; the burn keeps its tuning length.
    t3: { shape: { kind: 'circle', radius: 100 } },
  },
  {
    id: 'valkyrie-swoop',
    path: 'freyja-valkyrie',
    name: "Valkyrie's Swoop",
    trigger: { kind: 'allyHurt', below: 0.35, radius: 300 },
    cooldownS: 14,
    target: 'point',
    shape: { kind: 'circle', radius: 70 },
    effects: [
      { kind: 'dash' },
      { kind: 'damage', mult: 1.8, type: 'physical' },
      { kind: 'shield', pct: 0.2, s: 5 },
    ],
    visual: ['dash', 'shield'],
    // Approximation: the spec hits the hurt ally's attacker; SkillDef hits every foe within 70 of
    // the ally (the attacker is one of them), and tier 3's 1.0x burst lands on the same circle.
    t3: {
      effects: [
        { kind: 'dash' },
        { kind: 'damage', mult: 1.8, type: 'physical' },
        { kind: 'damage', mult: 1.0, type: 'physical' },
        { kind: 'shield', pct: 0.35, s: 5 },
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
    // Approximation: the spec also chills the ally's attacker at tier 2; a single-ally shape holds
    // no foe, so the chill comes with the tier 3 circle.
    effects: [{ kind: 'shield', mult: 2, s: 6 }],
    visual: ['shield'],
    t3: {
      shape: { kind: 'circle', radius: 200 },
      effects: [
        { kind: 'shield', mult: 2, s: 6 },
        { kind: 'damage', mult: 0, type: 'frost', rider: 'chill' },
      ],
    },
  },
];

// Units the skills call.
export const SUMMONS: readonly SummonDef[] = [
  { id: 'decoy', hpShare: 0.2, taunt: { radius: 120 } },
];

// Gear (docs/systems/items-and-shops.md section 2). Weapon and armour levels come from the
// smithy, potions from the market; a shop of tier t sells every level up to t. Charms wait for
// their effects (Sim 310).
export const ITEMS: readonly ItemDef[] = [
  {
    id: 'weapon-1',
    slot: 'weapon',
    level: 1,
    name: 'Tempered',
    price: 60,
    shop: 'smithy',
    shopTier: 1,
    effects: { power: 2 },
  },
  {
    id: 'weapon-2',
    slot: 'weapon',
    level: 2,
    name: 'Master-forged',
    price: 150,
    shop: 'smithy',
    shopTier: 2,
    effects: { power: 4 },
  },
  {
    id: 'weapon-3',
    slot: 'weapon',
    level: 3,
    name: 'Godsteel',
    price: 320,
    shop: 'smithy',
    shopTier: 3,
    effects: { power: 7 },
  },
  {
    id: 'armour-1',
    slot: 'armour',
    level: 1,
    price: 50,
    shop: 'smithy',
    shopTier: 1,
    effects: {
      kits: {
        heavy: { armour: 4, wp: 0 },
        light: { armour: 2, wp: 1 },
        robe: { armour: 0, wp: 2 },
      },
    },
  },
  {
    id: 'armour-2',
    slot: 'armour',
    level: 2,
    price: 130,
    shop: 'smithy',
    shopTier: 2,
    effects: {
      kits: {
        heavy: { armour: 8, wp: 1 },
        light: { armour: 4, wp: 2 },
        robe: { armour: 1, wp: 4 },
      },
    },
  },
  {
    id: 'armour-3',
    slot: 'armour',
    level: 3,
    price: 280,
    shop: 'smithy',
    shopTier: 3,
    effects: {
      kits: {
        heavy: { armour: 13, wp: 2 },
        light: { armour: 7, wp: 3 },
        robe: { armour: 2, wp: 7 },
      },
    },
  },
  {
    id: 'healing',
    slot: 'potion',
    name: 'Healing potion',
    price: 20,
    shop: 'market',
    shopTier: 1,
    effects: { healPct: 40 },
  },
  {
    id: 'greater',
    slot: 'potion',
    name: 'Greater potion',
    price: 40,
    shop: 'market',
    shopTier: 2,
    effects: { healPct: 70 },
  },
];

export const GRAYBOX: GameData = {
  startGold: 420,
  map: { width: 2400, height: 1600 },
  townHall: { x: 1200, y: 800 },
  // Balance pass (Aesir skills and passives, items, potions, card auto-pick, level cap 8,
  // knockout cost, sealed boss lair, pacing review; 300 runs, seeds 1 and 1001). Town income is
  // item tax only: start gold 420 builds a temple, market and smithy, and tax is 60% of an
  // item's price. Unset keys use DEFAULT_TUNING.
  tuning: {
    hero: { maxPerTemple: 7, recruitMs: 22_000, taxRate: 0.6 },
    town: { raidFirstMs: 360_000, raidEveryMs: 180_000, raidGrowEveryMs: 300_000, raidSize: 1 },
    // Pacing (docs/systems/pacing-review.md): slower levels and a staggered lair clock.
    party: { xpPerLevel: 40 },
    lair: { firstTierUpMs: 360_000, tierUpStaggerMs: 120_000, tierUpEveryMs: 420_000 },
  },
  classes: CLASSES,
  gods: GODS,
  paths: PATHS,
  upgrades: UPGRADES,
  monsters: MONSTERS,
  lairs: LAIRS,
  items: ITEMS,
  skills: SKILLS,
  summons: SUMMONS,
  // Each run draws its own map (Sim 150): 4-6 lairs from the pool, leaning on one pantheon, and
  // the wyrm nest as the boss lair; the run is won when the boss falls.
  lairSites: [],
  mapRules: {
    lairs: [4, 6],
    pool: [
      { lair: 'barrow', pantheon: 'aesir', weight: 2 },
      { lair: 'troll-den', pantheon: 'aesir' },
      { lair: 'harpy-roost', pantheon: 'greek', weight: 2 },
      { lair: 'labyrinth', pantheon: 'greek' },
      { lair: 'jackal-camp', pantheon: 'egyptian', weight: 2 },
    ],
    boss: 'wyrm-nest',
    leanCount: 1,
    leanWeight: 3,
    margin: 150,
    minTownDist: 600,
    minLairDist: 350,
  },
  // 8 build plots in a ring around the town hall (plot id = index).
  plots: [
    { x: 1590, y: 800 },
    { x: 1476, y: 1012 },
    { x: 1200, y: 1100 },
    { x: 924, y: 1012 },
    { x: 810, y: 800 },
    { x: 924, y: 588 },
    { x: 1200, y: 500 },
    { x: 1476, y: 588 },
  ],
  buildings: [
    // `text`: one plain line for the build menu (docs/systems/buildings.md section 4).
    {
      id: 'temple_aesir',
      cost: 150,
      text: 'Calls the children of Odin, Thor, Loki and Freyja to your town.',
    },
    {
      id: 'market',
      cost: 100,
      text: 'Sells potions to heroes; the town takes a tax on every sale.',
    },
    { id: 'shrine', cost: 120, text: 'Wounded heroes rest here and heal fast.' },
    { id: 'tower', cost: 80, text: 'Shoots monsters that come near the town.' },
    {
      id: 'smithy',
      cost: 120,
      text: 'Sells weapons and armour to heroes; the town takes a tax.',
    },
  ],
};
