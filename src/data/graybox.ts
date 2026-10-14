// Graybox content (M1). Lead owns these numbers; Sim reads them. Ids match the art manifest
// types (`hero_<class>`, `mon_<type>`, `bld_<type>`), so `bld_${id}_t${tier}` finds the sprite.
import type {
  ClassDef,
  GameData,
  GodDef,
  ItemDef,
  LairDef,
  MonsterDef,
  OmenDef,
  PathDef,
  SkillDef,
  SummonDef,
  UpgradeDef,
} from '../sim/types';
import { NAMES } from './names';

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
    builds: ['tall', 'lean'],
    faces: ['head_odin_a', 'head_odin_b'],
    cloak: 'cloak_odin',
    colours: ['#41507a', '#c8b27a'],
    emblem: 'layer_cloak_emblem_raven',
    weapon: 'staff',
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
    builds: ['broad', 'short'],
    faces: ['head_thor_a', 'head_thor_b'],
    cloak: 'cloak_thor',
    colours: ['#a8392c', '#d9a441'],
    emblem: 'layer_cloak_emblem_hammer',
    weapon: 'hammer',
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
    builds: ['lean', 'short'],
    faces: ['head_loki_a', 'head_loki_b'],
    cloak: 'cloak_loki',
    colours: ['#4f8a3a', '#8fbf4a'],
    emblem: 'layer_cloak_emblem_serpent',
    weapon: 'daggers',
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
    builds: ['lean', 'broad'],
    faces: ['head_freyja_a', 'head_freyja_b'],
    cloak: 'cloak_freyja',
    colours: ['#9d4f6a', '#f1e8d4'],
    emblem: 'layer_cloak_emblem_feather',
    weapon: 'wand',
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
    cloak: 'cloak_odin_seer',
    weapon: 'staff',
    damageType: 'death',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'odin-wanderer',
    god: 'odin',
    template: 'warrior',
    name: 'Wanderer',
    cloak: 'cloak_odin_wanderer',
    weapon: 'spear',
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
    cloak: 'cloak_thor_hammerborn',
    weapon: 'hammer',
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
    cloak: 'cloak_thor_stormcaller',
    weapon: 'staff',
    damageType: 'lightning',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'loki-trickster',
    god: 'loki',
    template: 'rogue',
    name: 'Trickster',
    cloak: 'cloak_loki_trickster',
    weapon: 'daggers',
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
    cloak: 'cloak_loki_flamebinder',
    weapon: 'daggers',
    damageType: 'fire',
    attrs: [{ int: 2 }, { int: 4 }],
  },
  {
    id: 'freyja-valkyrie',
    god: 'freyja',
    template: 'warrior',
    name: 'Valkyrie',
    cloak: 'cloak_freyja_valkyrie',
    weapon: 'spear',
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
    cloak: 'cloak_freyja_seidkona',
    weapon: 'staff',
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

// Roles and quirks: docs/systems/monsters-and-bosses.md sections 1-2. Fafnir's Fire Breath
// (section 3) replaces the generic cleave.
export const MONSTERS: readonly MonsterDef[] = [
  {
    id: 'draugr',
    role: 'brute',
    quirk: { koMult: 1.5 },
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
    role: 'brute',
    quirk: { regen: { pctS: 0.01, stopOnType: 'fire', stopS: 5 } },
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
    role: 'harrier',
    quirk: { stealGold: 2 },
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
    role: 'pack',
    quirk: { healOnKo: 0.1 },
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
    role: 'charger',
    quirk: { chargeSure: true },
    attrs: { str: 9, dex: 3, sta: 10, cha: 1, per: 3, int: 1, wp: 5 },
    weapon: { baseAttackS: 2.1, range: 50 },
    bounty: 34,
    xp: 30,
    armour: 5,
    tags: ['beast', 'giant'],
    types: { frost: 1.5, physical: 0.75 },
  },
  // Fafnir (monsters-and-bosses.md section 3): hp 1200, Str 14, Fire Breath instead of the cleave.
  {
    id: 'wyrm',
    move: {
      breath: {
        everyN: 3,
        enragedEveryN: 2,
        range: 160,
        angleDeg: 70,
        mult: 1.2,
        type: 'fire',
        rider: 'burn',
        windupMs: 1200,
      },
    },
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
  // Scarab swarm (monsters-and-bosses.md section 1): the swarm role keeps twice the lair's maxAlive
  // and splits once into two halves at 0 hp.
  {
    id: 'scarab',
    role: 'swarm',
    attrs: { str: 3, dex: 4, sta: 3, cha: 1, per: 2, int: 1, wp: 2 },
    weapon: { baseAttackS: 0.9, range: 30 },
    bounty: 6,
    xp: 5,
    armour: 1,
    tags: ['beast'],
    types: { fire: 1.5, physical: 0.75 },
  },
  // The other five bosses (monsters-and-bosses.md section 3), scaled like Fafnir: about half the
  // draft hp and a little less armour. Bot pass (each boss forced, human bot, seeds 1-30): every
  // boss is beaten in 9 of 10 runs that reach it (wins 60-63%, Fafnir 60%), first hit to the end
  // of the run 2.8-3.5 min (Fafnir 3.9). Their moves replace the cleave. Apep and Jormungandr strike
  // with death, Cerberus with fire (strikeType).
  {
    id: 'hydra',
    move: {
      heads: { count: 3, cutAt: [0.66, 0.33], regrowS: 8, enragedRegrowS: 5, stopType: 'fire' },
    },
    attrs: { str: 14, dex: 3, sta: 12, cha: 1, per: 4, int: 2, wp: 8 },
    weapon: { baseAttackS: 1.6, range: 80 },
    bounty: 400,
    xp: 300,
    armour: 7,
    tags: ['boss'],
    boss: {},
    hp: 900,
    types: { fire: 1.5, frost: 0.5 },
  },
  {
    id: 'apep',
    strikeType: 'death',
    move: {
      swallow: { everyS: 15, enragedEveryS: 10, windupMs: 1000, s: 4, dotPct: 0.08, freePct: 0.25 },
    },
    attrs: { str: 18, dex: 3, sta: 12, cha: 1, per: 4, int: 2, wp: 8 },
    weapon: { baseAttackS: 2.2, range: 70 },
    bounty: 400,
    xp: 300,
    armour: 8,
    tags: ['boss'],
    boss: {},
    hp: 1300,
    types: { holy: 1.5, death: 0.5 },
  },
  {
    id: 'jormungandr',
    strikeType: 'death',
    move: {
      venom: { everyS: 12, enragedEveryS: 8, windupMs: 1000, radius: 60, dotPct: 0.03, s: 8 },
    },
    attrs: { str: 20, dex: 3, sta: 12, cha: 1, per: 4, int: 2, wp: 8 },
    weapon: { baseAttackS: 2.2, range: 90 },
    bounty: 400,
    xp: 300,
    armour: 8,
    tags: ['boss'],
    boss: {},
    hp: 1300,
    types: { lightning: 1.5, frost: 0.5, death: 0.5 },
  },
  {
    id: 'cerberus',
    strikeType: 'fire',
    move: {
      howl: {
        everyS: 15,
        enragedEveryS: 10,
        windupMs: 800,
        radius: 200,
        belowHp: 0.5,
        fleeS: 3,
        calls: 1,
      },
    },
    attrs: { str: 16, dex: 3, sta: 12, cha: 1, per: 4, int: 2, wp: 8 },
    weapon: { baseAttackS: 1.4, range: 70 },
    bounty: 400,
    xp: 300,
    armour: 7,
    tags: ['boss', 'demon'],
    boss: {},
    hp: 950,
    types: { holy: 1.5, fire: 0.5 },
  },
  {
    id: 'sphinx',
    move: {
      riddle: {
        everyS: 18,
        enragedEveryS: 12,
        windupMs: 1200,
        intAtLeast: 8,
        buff: 0.3,
        buffS: 6,
        stoneS: 3,
      },
    },
    attrs: { str: 17, dex: 3, sta: 12, cha: 1, per: 4, int: 2, wp: 8 },
    weapon: { baseAttackS: 2.0, range: 70 },
    bounty: 400,
    xp: 300,
    armour: 9,
    tags: ['boss'],
    boss: {},
    hp: 1200,
    types: { frost: 1.5, holy: 0.5, physical: 0.8 },
  },
];

// Lairs from docs/systems/monsters-and-bosses.md section 4; the wyrm nest is the boss lair (the
// run is won when it falls) and spawns draugr guards. Balance passes (Lead 80, 90 and the human-bot
// pass): big lairs 4800 hp, small 2400-2800, the nest 8000 (spec 9000 and 16000). Playtest trim for
// collision and the live verbs: non-boss lairs at 70% (big 4200, small 2100-2450). With the omen
// deck and elites: 60% (big 3600, small 1800-2100).
export const LAIRS: readonly LairDef[] = [
  { id: 'barrow', monster: 'draugr', spawnS: 10, maxAlive: 6, hp: 2100 },
  { id: 'troll-den', monster: 'troll', spawnS: 25, maxAlive: 4, hp: 3600 },
  { id: 'harpy-roost', monster: 'harpy', spawnS: 9, maxAlive: 6, hp: 1800 },
  { id: 'jackal-camp', monster: 'jackal-man', spawnS: 10, maxAlive: 6, hp: 2100 },
  { id: 'labyrinth', monster: 'minotaur', spawnS: 24, maxAlive: 4, hp: 3600 },
  // The swarm role doubles maxAlive: 10 scarabs at tier 1; 60% hp like the other small lairs.
  { id: 'scarab-pit', monster: 'scarab', spawnS: 6, maxAlive: 5, hp: 1800 },
  { id: 'wyrm-nest', monster: 'wyrm', spawnS: 30, maxAlive: 3, hp: 8000, escort: 'draugr' },
  // The other boss lairs at the nest's 8000 (spec 16000). The Greek boss lairs are guarded by harpies
  // (minotaur guards plus Cerberus's howl calls made them a wall: 11 of 30 wins forced, the others
  // 18-19); with Hydra 900 hp and Cerberus 950 they win 18 and 17 of 30, as Fafnir does.
  {
    id: 'serpent-shore',
    monster: 'jormungandr',
    spawnS: 30,
    maxAlive: 3,
    hp: 8000,
    escort: 'draugr',
  },
  { id: 'hydra-marsh', monster: 'hydra', spawnS: 30, maxAlive: 3, hp: 8000, escort: 'harpy' },
  {
    id: 'gate-of-hades',
    monster: 'cerberus',
    spawnS: 30,
    maxAlive: 3,
    hp: 8000,
    escort: 'harpy',
  },
  { id: 'apep-tomb', monster: 'apep', spawnS: 30, maxAlive: 3, hp: 8000, escort: 'jackal-man' },
  {
    id: 'sphinx-plinth',
    monster: 'sphinx',
    spawnS: 30,
    maxAlive: 3,
    hp: 8000,
    escort: 'jackal-man',
  },
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
// Elite monster skills (monsters-and-bosses.md, Elite skills): cast by elites of the monster through
// the skill engine.
const ms = (s: Omit<SkillDef, 'path' | 'owner'>): SkillDef => ({
  ...s,
  path: '',
  owner: 'monster',
});
export const MONSTER_SKILLS: readonly SkillDef[] = [
  ms({
    id: 'grave-breath',
    monster: 'draugr',
    name: 'Grave Breath',
    trigger: { kind: 'crowd', n: 2, radius: 100, angle: 90 },
    cooldownS: 12,
    target: 'foe',
    shape: { kind: 'cone', radius: 100, angle: 90 },
    effects: [{ kind: 'damage', mult: 1, type: 'frost', rider: 'chill' }],
    visual: ['cone'],
  }),
  ms({
    id: 'boulder',
    monster: 'troll',
    name: 'Boulder',
    trigger: { kind: 'engage', min: 120, max: 300 },
    cooldownS: 14,
    target: 'foe',
    shape: { kind: 'single' },
    effects: [{ kind: 'damage', mult: 1.8, type: 'physical' }, { kind: 'stagger' }],
    visual: ['bolt'],
  }),
  ms({
    id: 'shriek',
    monster: 'harpy',
    name: 'Shriek',
    trigger: { kind: 'crowd', n: 2, radius: 100 },
    cooldownS: 15,
    target: 'self',
    shape: { kind: 'circle', radius: 100 },
    effects: [{ kind: 'stagger', to: 'foes' }],
    visual: ['burst'],
  }),
  ms({
    id: 'gore',
    monster: 'minotaur',
    name: 'Gore',
    trigger: { kind: 'ready' },
    cooldownS: 10,
    target: 'foe',
    shape: { kind: 'line', length: 80 },
    effects: [
      { kind: 'damage', mult: 2.2, type: 'physical' },
      { kind: 'knockback', dist: 80 },
    ],
    visual: ['line'],
  }),
  ms({
    id: 'pack-howl',
    monster: 'jackal-man',
    name: 'Howl',
    trigger: { kind: 'ready' },
    cooldownS: 18,
    target: 'self',
    shape: { kind: 'circle', radius: 150 },
    effects: [{ kind: 'buff', stat: 'attackSpeed', amount: 0.25, s: 6, to: 'allies' }],
    visual: ['aura'],
  }),
  ms({
    id: 'devour',
    monster: 'scarab',
    name: 'Devour',
    trigger: { kind: 'ready' },
    cooldownS: 8,
    target: 'foe',
    shape: { kind: 'single' },
    effects: [{ kind: 'damage', mult: 0.8, type: 'death', rider: 'wither' }],
    visual: ['burst'],
  }),
];

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
  // Elite monster skills (below), run by the same engine.
  ...MONSTER_SKILLS,
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
    price: 20,
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
    price: 20,
    shop: 'smithy',
    shopTier: 1,
    effects: {
      kits: {
        heavy: { armour: 4, wp: 0 },
        light: { armour: 2, wp: 1 },
        robe: { armour: 0, wp: 2 },
      },
    },
    icon: 'ui_item_armour_1',
    worn: {
      heavy: 'layer_torso_heavy_1',
      light: 'layer_torso_light_1',
      robe: 'layer_torso_robe_1',
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
    icon: 'ui_item_armour_2',
    worn: {
      heavy: 'layer_torso_heavy_2',
      light: 'layer_torso_light_2',
      robe: 'layer_torso_robe_2',
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
    icon: 'ui_item_armour_3',
    worn: {
      heavy: 'layer_torso_heavy_3',
      light: 'layer_torso_light_3',
      robe: 'layer_torso_robe_3',
    },
  },
  // Headgear and off-hand (hero-kit.md section 2): headgear about a third of the armour row by
  // kit; an off-hand is a shield (heavy kit: armour), a second blade (light: crit) or a focus
  // (robe: power); about half the armour price. Icon and worn ids follow asset-spec.md
  // (Item ids): armour's worn id names its torso layer; the thigh and boot layers follow the same
  // <kit>_<level> (layer_thigh_heavy_1, layer_boot_heavy_1).
  {
    id: 'headgear-1',
    slot: 'headgear',
    level: 1,
    name: 'Plain',
    price: 10,
    shop: 'smithy',
    shopTier: 1,
    effects: {
      kits: {
        heavy: { armour: 1, wp: 0 },
        light: { armour: 1, wp: 0 },
        robe: { armour: 0, wp: 1 },
      },
    },
    icon: 'ui_item_headgear_1',
    worn: {
      heavy: 'layer_headgear_helm_1',
      light: 'layer_headgear_hood_1',
      robe: 'layer_headgear_hat_1',
    },
  },
  {
    id: 'headgear-2',
    slot: 'headgear',
    level: 2,
    name: 'Fine',
    price: 65,
    shop: 'smithy',
    shopTier: 2,
    effects: {
      kits: {
        heavy: { armour: 3, wp: 0 },
        light: { armour: 1, wp: 1 },
        robe: { armour: 0, wp: 1 },
      },
    },
    icon: 'ui_item_headgear_2',
    worn: {
      heavy: 'layer_headgear_helm_2',
      light: 'layer_headgear_hood_2',
      robe: 'layer_headgear_hat_2',
    },
  },
  {
    id: 'headgear-3',
    slot: 'headgear',
    level: 3,
    name: 'Godwrought',
    price: 140,
    shop: 'smithy',
    shopTier: 3,
    effects: {
      kits: {
        heavy: { armour: 4, wp: 1 },
        light: { armour: 2, wp: 1 },
        robe: { armour: 1, wp: 2 },
      },
    },
    icon: 'ui_item_headgear_3',
    worn: {
      heavy: 'layer_headgear_helm_3',
      light: 'layer_headgear_hood_3',
      robe: 'layer_headgear_hat_3',
    },
  },
  {
    id: 'offhand-1',
    slot: 'offhand',
    level: 1,
    name: 'Plain',
    price: 10,
    shop: 'smithy',
    shopTier: 1,
    effects: {
      kits: {
        heavy: { armour: 1, wp: 0 },
        light: { armour: 0, wp: 0, crit: 0.03 },
        robe: { armour: 0, wp: 0, power: 1 },
      },
    },
    icon: 'ui_item_offhand_1',
    worn: {
      heavy: 'offhand_shield_1',
      light: 'offhand_blade_1',
      robe: 'offhand_focus_1',
    },
  },
  {
    id: 'offhand-2',
    slot: 'offhand',
    level: 2,
    name: 'Fine',
    price: 65,
    shop: 'smithy',
    shopTier: 2,
    effects: {
      kits: {
        heavy: { armour: 3, wp: 0 },
        light: { armour: 0, wp: 0, crit: 0.05 },
        robe: { armour: 0, wp: 0, power: 2 },
      },
    },
    icon: 'ui_item_offhand_2',
    worn: {
      heavy: 'offhand_shield_2',
      light: 'offhand_blade_2',
      robe: 'offhand_focus_2',
    },
  },
  {
    id: 'offhand-3',
    slot: 'offhand',
    level: 3,
    name: 'Godwrought',
    price: 140,
    shop: 'smithy',
    shopTier: 3,
    effects: {
      kits: {
        heavy: { armour: 4, wp: 0 },
        light: { armour: 0, wp: 0, crit: 0.08 },
        robe: { armour: 0, wp: 0, power: 3 },
      },
    },
    icon: 'ui_item_offhand_3',
    worn: {
      heavy: 'offhand_shield_3',
      light: 'offhand_blade_3',
      robe: 'offhand_focus_3',
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

// The omen deck (docs/systems/events.md section 2): announced 20 s ahead, one at a time, first at
// 3:00 then every 100-140 s; the lean pantheon's omens weigh double.
// Bot pass on the full stack (late recruits, boss call, trim; human bot, seeds 1 and 1001, 40
// runs, 35-min cap): with the deck and elites and non-boss lairs at 60%, wins 65% and 65%; at 70%
// lairs 48% and 68% (57% and 73% without omens and elites). A later first omen, no elites or a
// later first raid did not lift seed 1 above 53%.
export const OMENS: readonly OmenDef[] = [
  {
    id: 'fallen-star',
    name: 'Fallen Star',
    text: 'A star falls beyond the fog.',
    weight: 1,
    durationMs: 60_000,
    star: { xp: 60 },
  },
  {
    id: 'wandering-champion',
    name: 'Wandering Champion',
    text: 'A champion walks near the town.',
    weight: 1,
    // Until it falls; 4 minutes at most.
    durationMs: 240_000,
    untilKilled: true,
    spawn: { monster: 'strongest', count: 1, at: 'town', elite: true, bounty: 150 },
  },
  {
    id: 'merchant-caravan',
    name: 'Merchant Caravan',
    text: 'Potions and charms sell cheap.',
    weight: 1,
    durationMs: 60_000,
    mods: { shopDiscount: 0.3 },
  },
  {
    id: 'red-sky',
    name: 'Red Sky',
    text: 'Monsters hit harder; bounties pay x2.',
    weight: 1,
    durationMs: 60_000,
    mods: { monsterDamage: 1.2, bountyMult: 2 },
  },
  {
    id: 'fimbul-frost',
    name: 'Fimbul Frost',
    text: 'The winter of the gods slows every step.',
    pantheon: 'aesir',
    weight: 1,
    durationMs: 60_000,
    mods: { moveSpeed: 0.85, typeDamage: { frost: 1.25 } },
  },
  {
    id: 'games-of-olympia',
    name: 'Games of Olympia',
    text: 'Most kills win the favour of Zeus.',
    pantheon: 'greek',
    weight: 1,
    durationMs: 45_000,
    contest: true,
  },
  {
    id: 'plague-of-scarabs',
    name: 'Plague of Scarabs',
    text: 'Scarabs burst from the ground near town.',
    pantheon: 'egyptian',
    weight: 1,
    durationMs: 45_000,
    spawn: { monster: 'scarab', count: 6, at: 'plot', raid: true },
  },
  {
    id: 'eclipse-of-ra',
    name: 'Eclipse of Ra',
    text: 'The dead grow strong; holy light burns.',
    pantheon: 'egyptian',
    weight: 1,
    durationMs: 45_000,
    mods: { undeadDamage: 1.25, typeDamage: { holy: 1.5 } },
  },
];

export const GRAYBOX: GameData = {
  startGold: 480,
  map: { width: 3000, height: 2000 },
  townHall: { x: 1500, y: 1000 },
  // Balance pass (human-bot pass: spacing option B, tax collector on with a 30% tithe, lairs at
  // 80% hp; on top of flag pricing, gear first, roles, raids and the Aesir rows; 200 runs, seeds 1
  // and 1001): the human-like bot that builds a smithy after the market (--human --hints) wins
  // 67-74%, gears 88-90% of its heroes by 8:00 and kills its first lair at about 5.8 min; the full
  // bot 62%. Town income is the collector's tithe plus shop tax (55%): start gold 480. Unset keys
  // use DEFAULT_TUNING.
  // A player's first run (docs/systems/onboarding.md section 4): the first raid at 8:00 instead of
  // 6:00, every lair's first tier-up 2 minutes later (the stagger is unchanged), the first omen at
  // 6:00 instead of 3:00.
  firstRun: {
    town: { raidFirstMs: 480_000 },
    lair: { firstTierUpMs: 480_000 },
    events: { omenFirstMs: 360_000 },
  },
  tuning: {
    hero: { maxPerTemple: 7, recruitMs: 22_000, taxRate: 0.55, shopTripGold: 0, tithe: 0.3 },
    // Town income besides shop tax (docs/systems/tax-collector.md): the collector walks the tills.
    collector: { enabled: true },
    // Vanguard (events.md section 1): the unsealed boss lair raids the town with 1 of its escort
    // every 90 s until the boss is out.
    boss: { vanguardSize: 1 },
    // The boss call (hero-ai.md 5c): from the unseal the boss lair scores 80 more for parties, so
    // they head for it instead of exploring an empty map. Human bot with the trim, 40 runs, seeds 1
    // and 1001, 35-min cap: wins 63% and 68% (60% and 65% at 30 min), median run 14.9 and 14.7 min,
    // longest quiet stretch p90 102 and 80 s (156 s without the call; Sim's default 40 gave 55%
    // and 95 s).
    ai: { bossCallBonus: 80 },
    // Raids after a lair tier-up are on (Stefan): one raider on every tier-up.
    // Playtest trim (main + collision + live verbs + vanguard, human bot, seeds 1 and 1001, 40 runs
    // each, 35-min cap): the first raid at 7:00 and one every 3.5 min instead of 6:00 and 3 min,
    // with the 70% lairs: wins 63% and 70% (57% and 63% at the bot's default 30-min cap); main
    // without the trim 50% and 63% (48% and 53% at 30 min).
    town: {
      raidFirstMs: 420_000,
      raidEveryMs: 210_000,
      raidGrowEveryMs: 400_000,
      raidSize: 1,
      raidOnTierUp: true,
      tierRaidSize: 1,
      tierRaidEvery: 1,
    },
    // Flags that steer (docs/systems/hero-ai.md 5b): danger costs less, and a flat bonus plus a
    // cheaper walk let the smallest flag pull a party from about 600 away.
    bounty: { costPerDanger: 8, flagBonus: 15, flagDistanceCost: 0.02 },
    // Pacing (docs/systems/pacing-review.md): slower levels and a staggered lair clock.
    party: { xpPerLevel: 45 },
    // Elites (progression.md): a quarter of tier 2 spawns, 35% at tier 3.
    lair: {
      firstTierUpMs: 360_000,
      tierUpStaggerMs: 120_000,
      tierUpEveryMs: 420_000,
      eliteShare: [0, 0.25, 0.35],
    },
  },
  classes: CLASSES,
  gods: GODS,
  paths: PATHS,
  upgrades: UPGRADES,
  monsters: MONSTERS,
  lairs: LAIRS,
  items: ITEMS,
  // Hero names by pantheon (src/data/names.ts).
  names: NAMES,
  skills: SKILLS,
  omens: OMENS,
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
      { lair: 'scarab-pit', pantheon: 'egyptian' },
    ],
    boss: 'wyrm-nest',
    // The boss follows the lean: one of its pantheon's two, seeded, never last run's. The pick
    // draws from the map stream, so every seed's map differs from runs before this row.
    bossesByPantheon: {
      aesir: ['wyrm-nest', 'serpent-shore'],
      greek: ['hydra-marsh', 'gate-of-hades'],
      egyptian: ['apep-tomb', 'sphinx-plinth'],
    },
    leanCount: 1,
    leanWeight: 3,
    margin: 150,
    minTownDist: 800,
    minLairDist: 500,
  },
  // 8 build plots on a 520 x 380 ring around the town hall (plot id = index): room to read the town.
  plots: [
    { x: 2020, y: 1000 },
    { x: 1868, y: 1269 },
    { x: 1500, y: 1380 },
    { x: 1132, y: 1269 },
    { x: 980, y: 1000 },
    { x: 1132, y: 731 },
    { x: 1500, y: 620 },
    { x: 1868, y: 731 },
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
      text: 'Sells weapons and armour; the town takes a tax on every sale.',
    },
  ],
};
