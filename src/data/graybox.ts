// Graybox content (M1). Lead owns these numbers; Sim reads them. Ids match the art manifest
// types (`hero_<class>`, `mon_<type>`, `bld_<type>`), so `bld_${id}_t${tier}` finds the sprite.
import type {
  ClassDef,
  GameData,
  GodDef,
  LairDef,
  MonsterDef,
  PathDef,
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
    armour: 6,
  },
  {
    id: 'ranger',
    attrs: { str: 4, dex: 6, sta: 4, cha: 3, per: 6, int: 3, wp: 4 },
    weapon: { baseAttackS: 1.4, range: 220 },
    startGold: 50,
    armour: 3,
  },
  // Wizard: str stands for spell power until magic has its own stat.
  {
    id: 'wizard',
    attrs: { str: 5, dex: 4, sta: 3, cha: 3, per: 5, int: 7, wp: 5 },
    weapon: { baseAttackS: 1.9, range: 200 },
    startGold: 45,
    armour: 0,
    spellMult: 1,
  },
  {
    id: 'paladin',
    attrs: { str: 5, dex: 2, sta: 8, cha: 4, per: 3, int: 3, wp: 7 },
    weapon: { baseAttackS: 1.9, range: 40 },
    startGold: 40,
    armour: 10,
  },
  {
    id: 'rogue',
    attrs: { str: 4, dex: 8, sta: 4, cha: 3, per: 5, int: 3, wp: 3 },
    weapon: { baseAttackS: 1.1, range: 40 },
    startGold: 60,
    armour: 3,
  },
  // Healer: mends the most hurt party mate below the heal threshold, otherwise casts a bolt.
  {
    id: 'healer',
    attrs: { str: 2, dex: 3, sta: 4, cha: 4, per: 4, int: 6, wp: 6 },
    weapon: { baseAttackS: 1.6, range: 200 },
    startGold: 40,
    heals: true,
    armour: 1,
    spellMult: 0.6,
  },
];

// Gods (docs/game-design.md, "Gods and paths", decision 2026-10-13): a temple calls a child of
// one of its pantheon's gods. `template` is the hidden ClassDef a tier 1 child uses.
export const GODS: readonly GodDef[] = [
  { id: 'odin', pantheon: 'aesir', name: 'Odin', template: 'wizard', damageType: 'death' },
  { id: 'thor', pantheon: 'aesir', name: 'Thor', template: 'warrior' },
  { id: 'loki', pantheon: 'aesir', name: 'Loki', template: 'rogue' },
  { id: 'freyja', pantheon: 'aesir', name: 'Freyja', template: 'healer', damageType: 'holy' },
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
    attrs: [
      { str: 1, int: 1 },
      { str: 2, int: 2 },
    ],
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
    attrs: [
      { str: 1, int: 1 },
      { str: 2, int: 2 },
    ],
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
    attrs: [
      { str: 1, int: 1 },
      { str: 2, int: 2 },
    ],
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
    attrs: [
      { str: 1, int: 1 },
      { str: 2, int: 2 },
    ],
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
    attrs: [
      { str: 1, int: 1 },
      { str: 2, int: 2 },
    ],
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
    attrs: [
      { str: 1, int: 1 },
      { str: 2, int: 2 },
    ],
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
    attrs: [
      { str: 1, int: 1 },
      { str: 2, int: 2 },
    ],
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
    attrs: [
      { str: 1, int: 1 },
      { str: 2, int: 2 },
    ],
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
// and the nest 3500 hp (spec 9000 and 16000) keep the median run at 15-18 min.
export const LAIRS: readonly LairDef[] = [
  { id: 'barrow', monster: 'draugr', spawnS: 10, maxAlive: 6, hp: 3500 },
  { id: 'troll-den', monster: 'troll', spawnS: 25, maxAlive: 4, hp: 6000 },
  { id: 'harpy-roost', monster: 'harpy', spawnS: 9, maxAlive: 6, hp: 3000 },
  { id: 'jackal-camp', monster: 'jackal-man', spawnS: 10, maxAlive: 6, hp: 3500 },
  { id: 'labyrinth', monster: 'minotaur', spawnS: 24, maxAlive: 4, hp: 6000 },
  { id: 'wyrm-nest', monster: 'wyrm', spawnS: 30, maxAlive: 3, hp: 3500, escort: 'draugr' },
];

// Level-up cards; a party is offered 3 different ones. Graybox set: stats, sustain, nerve.
export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'iron-arms',
    name: 'Iron Arms',
    text: '+2 Strength for the whole party',
    effect: { attr: { str: 2 } },
  },
  {
    id: 'thick-hide',
    name: 'Thick Hide',
    text: '+2 Stamina for the whole party',
    effect: { attr: { sta: 2 } },
  },
  {
    id: 'quick-feet',
    name: 'Quick Feet',
    text: '+2 Dexterity: faster attacks, more dodges',
    effect: { attr: { dex: 2 } },
  },
  {
    id: 'hawk-eyes',
    name: 'Hawk Eyes',
    text: '+3 Perception: spot monsters from further away',
    effect: { attr: { per: 3 } },
  },
  {
    id: 'iron-will',
    name: 'Iron Will',
    text: '+2 Willpower and +1 Stamina',
    effect: { attr: { wp: 2, sta: 1 } },
  },
  {
    id: 'battle-hymn',
    name: 'Battle Hymn',
    text: '+1 Strength and +1 Dexterity',
    effect: { attr: { str: 1, dex: 1 } },
  },
  {
    id: 'odins-eye',
    name: "Odin's Eye",
    text: 'Heal 50% now; the party flees later (at 15% hp instead of 30%)',
    effect: { healPct: 50, flee: 0.15 },
  },
  {
    id: 'second-wind',
    name: 'Second Wind',
    text: 'Heal the whole party to full now',
    effect: { healPct: 100 },
  },
  {
    id: 'berserker',
    name: 'Berserker',
    text: '+3 Strength, but the party never flees',
    effect: { attr: { str: 3 }, flee: 0 },
  },
];

export const GRAYBOX: GameData = {
  startGold: 300,
  map: { width: 2400, height: 1600 },
  townHall: { x: 1200, y: 800 },
  // Balance pass (Lead 80, npm run sim, 300 runs, seeds 1, 1001, 2001): win rate 60-65%, median
  // run 17 min, timeouts 2%, about 24 knockouts per run. Unset keys use DEFAULT_TUNING.
  tuning: {
    hero: { maxPerTemple: 7, recruitMs: 22_000 },
    town: { raidFirstMs: 420_000, raidEveryMs: 180_000, raidGrowEveryMs: 240_000, raidSize: 1 },
  },
  classes: CLASSES,
  gods: GODS,
  paths: PATHS,
  upgrades: UPGRADES,
  monsters: MONSTERS,
  lairs: LAIRS,
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
    { id: 'temple_aesir', cost: 150 },
    { id: 'market', cost: 100 },
    { id: 'shrine', cost: 120 },
    { id: 'tower', cost: 80 },
  ],
};
