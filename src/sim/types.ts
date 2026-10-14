// Plain data shapes shared by the sim and its API. No Phaser, no DOM.

export interface Vec2 {
  x: number;
  y: number;
}

// Content row shapes the sim reads. Lead owns the rows in src/data/ and imports these types.
export interface BuildingDef {
  id: string;
  cost: number;
  // Temples: the pantheon whose gods' children the temple calls. Missing on an id like
  // `temple_aesir` means the part after `temple_`.
  pantheon?: string;
  // Gold for tier 2 and tier 3 (index = current tier - 1). Missing: the building's cost times
  // tuning.building.upgradeCostMult.
  upgradeCost?: readonly number[];
  // Half width and half height of the building's footprint: units walk around it.
  footprint?: readonly [number, number];
  // One plain line for the build menu and tooltips (Design, buildings.md). Display only.
  text?: string;
}

// A god: heroes are children of a god, called by a temple of its pantheon. `template` is the
// ClassDef id (a hidden stats, weapon and strike template) a tier 1 child uses.
export type DamageType = 'physical' | 'fire' | 'frost' | 'lightning' | 'death' | 'holy';

export interface GodDef {
  id: string;
  pantheon: string;
  name: string;
  template: string;
  // The two bodies this god's children come in (hero-kit.md section 3): a new hero gets one of them
  // by a seeded draw and keeps it. Scene owns what a build looks like.
  builds?: readonly [string, string];
  // The type a caster child of this god strikes with at tier 1 (weapon templates are physical).
  damageType?: DamageType;
  // Always-on trait of the god's children from tier 1 (see PassiveDef).
  passive?: PassiveDef;
}

// The keys a passive effect can set (docs/systems/paths-and-skills.md section 5), each
// implemented once in the rule it belongs to (see PassiveEffect for who gets them).
export interface PassiveKeys {
  // Flat attributes.
  attr?: Partial<Attributes>;
  // Wins the first-strike check: the foe opens with the delay.
  firstStrike?: boolean;
  // Damage multiplier against a monster tag ({ giant: 1.3 }).
  vsTag?: Record<string, number>;
  // The first strike against the unit each fight misses.
  firstHitMisses?: boolean;
  // Flat chance added after the curve.
  dodge?: number;
  crit?: number;
  // Knockout rules for the hero: gold lost (multiplier; read with the knockout cost row, Sim
  // 230) and the knockout timer multiplier.
  koGoldLoss?: number;
  koMult?: number;
  // Flat armour.
  armour?: number;
  // `per` of a buff stat for every kill this fight, up to `max` stacks.
  onKillStack?: { stat: BuffStat; per: number; max: number };
  // Resting heals this many times faster.
  restMult?: number;
  // Every `n`th basic strike also runs these effects on its target (stagger today).
  everyNth?: { n: number; effects: readonly SkillEffect[] };
  // Aggro range multiplier.
  aggroMult?: number;
  // Added to the boss death chance on a knockout (read with Sim 230).
  bossDeathAdd?: number;
  // A buff while below a share of max hp.
  belowHp?: { below: number; stat: BuffStat; amount: number };
  // Healing received multiplier.
  healTakenMult?: number;
  // Extra potions a hero may carry.
  potionSlots?: number;
  // Multiplies skill cooldowns (0.8: 20% shorter).
  cooldownMult?: number;
  // Multiplies the radius and range of skills (1.25: 25% more).
  rangeMult?: number;
  // Basic strikes carry this rider.
  rider?: RiderId;
}

// One effect of a passive: a set of keys and who gets them. `scope` 'self' is the owner only,
// 'mates' the owner's living party mates within `range` (not the owner), 'party' both. A party
// effect does not stack with itself (two Odin children give +3 Per, not +6).
export interface PassiveEffect {
  scope: 'self' | 'mates' | 'party';
  range?: number;
  keys: PassiveKeys;
}

// A god's passive: one or more effects, each with its own scope (Anubis: +25% vs undead for
// himself, a lower boss death chance for the party).
export interface PassiveDef {
  id: string;
  name: string;
  effects: readonly PassiveEffect[];
}

// A path of a god: the tier 2 and 3 identity a child of `god` takes at party level 3. A hero
// can only take one of its own god's paths, and a path is held by one hero at a time.
export interface PathDef {
  id: string;
  // GodDef id.
  god: string;
  // ClassDef id used from tier 2 on (stats, weapon, strike).
  template: string;
  name: string;
  // The type a caster on this path strikes with (tier 2 and 3).
  damageType?: DamageType;
  // Attribute bonus on top of the path template attributes: [tier 2, tier 3]. The tier 3 entry
  // is the total bonus at tier 3, not added to the tier 2 one.
  attrs: readonly [Partial<Attributes>, Partial<Attributes>];
}

// Attributes from the Coda combat reference (1..10 at tier 1).
export interface Attributes {
  str: number;
  dex: number;
  sta: number;
  cha: number;
  per: number;
  int: number;
  wp: number;
}

export interface MonsterDef {
  id: string;
  // The damage type of its plain strike (default physical: dodged and armoured). Death and fire
  // strikes are cut by Willpower instead, and a hero's resist rows apply.
  strikeType?: DamageType;
  // Body radius for keeping apart (default tuning.collision.monsterRadius or bossRadius).
  radius?: number;
  attrs: Attributes;
  // Seconds between attacks before dex; range in world units.
  weapon: { baseAttackS: number; range: number };
  bounty: number;
  xp: number;
  // Flat armour (scaled by lair tier like the attributes); missing means 0.
  armour?: number;
  // Tags for rules like holy's sear: undead, beast, giant, demon, flyer, boss.
  tags?: readonly string[];
  // Damage type to multiplier: weak 1.5, resist 0.5, immune 0. Missing types are 1.
  types?: Partial<Record<DamageType, number>>;
  // A boss: one unit per final lair (docs/systems/combat.md section 7). The object overrides
  // tuning.boss for this boss; `{}` takes the defaults.
  boss?: Partial<BossTuning>;
  // Boss only: its signature move, which replaces the generic cleave (monsters-and-bosses.md 3).
  move?: BossMove;
  // Boss only: its own hit points instead of Sta * 8 + Str * 4 (scaled by lair tier).
  hp?: number;
  // How it behaves (docs/systems/monsters-and-bosses.md section 1); missing is a brute.
  role?: MonsterRole;
  // One always-on trick (docs/systems/monsters-and-bosses.md, Monster quirks).
  quirk?: MonsterQuirk;
}

export interface MonsterQuirk {
  // Regrowth: heals pctS of max hp per second; a hit of type `stopOnType` stops it for stopS.
  regen?: { pctS: number; stopOnType?: DamageType; stopS?: number };
  // Snatch: a landed strike steals this much gold from a hero; the hero that kills it gets it.
  stealGold?: number;
  // Grave-cold: a hero it knocks out wakes this many times slower (1.5: 50% slower).
  koMult?: number;
  // Scavenger: it and its pack mates within packRadius of the fallen heal this share of max hp
  // when it knocks a hero out.
  healOnKo?: number;
  // Bull rush: its charge cannot be dodged.
  chargeSure?: boolean;
}

export type MonsterRole = 'brute' | 'harrier' | 'charger' | 'pack' | 'swarm';

// Monster roles. Raiders of a harrier or swarm role walk raidSpeedMult faster.
export interface RoleTuning {
  // Harrier: flees to its lair below this share of max hp, heals healPctS of max hp per second
  // there, and comes back at returnHp.
  harrierFleeHp: number;
  harrierHealPctS: number;
  harrierReturnHp: number;
  // Charger: charges a hero chargeMin to chargeMax away at chargeSpeedMult x its speed; the
  // first strike is chargeMult x with a knockback of chargeKnockback, and it charges once per
  // fight (again after chargeResetMs without a foe). A charger's hits on buildings are
  // buildingMult x.
  chargeMin: number;
  chargeMax: number;
  chargeSpeedMult: number;
  chargeMult: number;
  chargeKnockback: number;
  chargeResetMs: number;
  // The charge is announced this long before it starts (event windup).
  chargeWindupMs: number;
  buildingMult: number;
  // Pack: +packBonus damage per other pack mate within packRadius, at most packMax.
  packBonus: number;
  packRadius: number;
  packMax: number;
  // Swarm: its lair keeps swarmAliveMult x as many alive; a raid has swarmRaidMult x as many
  // with swarmRaidHpMult of the hp; at 0 hp it splits once into two halves of swarmSplitShare
  // of the hp and damage, worth swarmSplitShare of the reward each.
  swarmAliveMult: number;
  swarmRaidMult: number;
  swarmRaidHpMult: number;
  swarmSplitShare: number;
  raidSpeedMult: number;
}

// A boss's signature move. Only the breath so far (Fafnir); the others arrive as rows of the same
// shape.
export interface BossMove {
  // Fire Breath: every everyN-th strike (enragedEveryN once enraged) is a cone in front of the
  // boss: range, a full angle in degrees, mult x its strike, of a type with an optional rider.
  // It is announced windupMs ahead, cannot be dodged, and hits every hero inside the cone.
  breath?: {
    everyN: number;
    enragedEveryN: number;
    range: number;
    angleDeg: number;
    mult: number;
    type: DamageType;
    rider?: RiderId;
    windupMs: number;
  };
  // Venom (Jormungandr): every everyS seconds it spits on the hero with the most hp in reach; that
  // hero and every hero within radius of it are poisoned, dotPct of max hp per second as death for
  // s seconds. Any heal on a hero ends its poison.
  venom?: TimedMove & { radius: number; dotPct: number; s: number };
  // Howl (Cerberus): heroes within radius below belowHp break and flee for fleeS (brave and proud
  // heroes ignore it); it calls `calls` guards from its lair.
  howl?: TimedMove & { radius: number; belowHp: number; fleeS: number; calls: number };
  // Riddle (Sphinx): asks the hero in reach with the lowest Int: intAtLeast or more answers (+buff
  // damage for buffS), less is turned to stone for stoneS (no actions, half damage taken).
  riddle?: TimedMove & { intAtLeast: number; buff: number; buffS: number; stoneS: number };
  // Swallow (Apep): the hero with the most hp in reach is swallowed for s seconds (out of the
  // fight, dotPct of max hp per second as death); freePct of the boss's max hp in damage frees it.
  swallow?: TimedMove & { s: number; dotPct: number; freePct: number };
  // Three Heads (Hydra): every strike hits up to `heads` heroes in reach; at each hp share of
  // cutAt a head is cut and regrows after regrowS (enragedRegrowS) unless a hit of stopType lands
  // on the boss meanwhile (then it stays cut).
  heads?: {
    count: number;
    cutAt: number[];
    regrowS: number;
    enragedRegrowS: number;
    stopType: DamageType;
  };
}

// A move on a timer: every everyS seconds (enragedEveryS once enraged), announced windupMs ahead.
export interface TimedMove {
  everyS: number;
  enragedEveryS: number;
  windupMs: number;
}

// A cone on the ground a strike hits, fixed when the windup starts.
export interface ConeArea {
  from: Vec2;
  // Unit vector the cone opens along.
  dir: Vec2;
  range: number;
  angleDeg: number;
}

// Boss numbers. Defaults in tuning.boss; a MonsterDef.boss row can override any of them.
export interface BossTuning {
  // The boss comes out of its lair when the lair is below this share of its hp.
  emergeBelow: number;
  // Every cleaveEvery-th strike is a cleave: a long windup with a ground marker, cannot be
  // dodged, and it hits every hero within cleaveRadius of the target for cleaveShare of the hit.
  cleaveEvery: number;
  cleaveRadius: number;
  cleaveShare: number;
  cleaveWindupMs: number;
  // At this share of its hp the boss enrages: its attack time is multiplied by
  // enrageAttackMult and it calls enrageCalls monsters (LairDef.escort) from its lair.
  enrageAt: number;
  enrageAttackMult: number;
  enrageCalls: number;
  // A boss lair is sealed (cannot be attacked, its boss cannot come out) until the run reaches
  // sealUntilMs or sealLairs other lairs have fallen, whichever comes first.
  sealUntilMs: number;
  sealLairs: number;
  // Vanguard (docs/systems/events.md section 1): once the boss lair is unsealed it raids with its
  // escort, vanguardSize of them (0 = off), then half as many every vanguardEveryMs, until the boss
  // is out or the lair has fallen. Each is announced vanguardWarnMs ahead.
  vanguardSize: number;
  vanguardEveryMs: number;
  vanguardWarnMs: number;
}

export interface LairDef {
  id: string;
  monster: string;
  // Seconds between spawns and the most monsters alive from this lair.
  spawnS: number;
  maxAlive: number;
  hp: number;
  // The monster that spawns from this lair when `monster` is a boss (and that a boss calls when
  // it enrages). A lair whose monster is a boss spawns nothing regular without it.
  escort?: string;
}

export interface ClassDef {
  id: string;
  // Body radius for keeping apart (default tuning.collision.heroRadius).
  radius?: number;
  attrs: Attributes;
  // Seconds between attacks before dex; range in world units (melee about 40).
  weapon: { baseAttackS: number; range: number };
  // Gold a hero of this class carries on arrival.
  startGold: number;
  // A healer casts a heal on a hurt party mate in range instead of attacking.
  heals?: boolean;
  // Flat armour: takes a share off physical strikes (curve in tuning.combat.armourK).
  armour?: number;
  // Casters (wizard 0.8, healer 0.5): the strike is a spell, power Int times this, it cannot be
  // dodged and it is resisted by Willpower, not armour. Missing: a weapon strike.
  spellMult?: number;
  // Armour kit: how much of an armour level turns into armour and Willpower (default heavy).
  kit?: Kit;
}

// Items and shops (docs/systems/items-and-shops.md): every hero has four slots. Weapon and armour
// are levels (0 to 3) bought at the smithy; potions and one charm come from the market.
export type Kit = 'heavy' | 'light' | 'robe';
export type ItemSlot = 'weapon' | 'armour' | 'headgear' | 'offhand' | 'potion' | 'charm';

export interface ItemEffects {
  // Weapon (and a caster's focus in the off-hand): added to power (Str for weapon templates,
  // Int x spellMult for casters).
  power?: number;
  // Armour, headgear and a shield: armour and Willpower by kit.
  kits?: Partial<Record<Kit, { armour: number; wp: number }>>;
  // Potion: share of max hp healed.
  healPct?: number;
  // Charm, headgear, off-hand (a second blade's crit): added to crit and dodge chance.
  crit?: number;
  dodge?: number;
  // Charm: a share cut off hits of these damage types (fire 0.25 = fire hits 25% softer).
  softer?: Partial<Record<string, number>>;
  // Charm: the wither rider does not take hold on the wearer.
  noWither?: boolean;
  // Charm: heals this share of max hp per kill.
  healOnKill?: number;
  // Charm: the first landed hit of each fight is multiplied by this (0.5: halved).
  firstHitMult?: number;
}

export interface ItemDef {
  id: string;
  slot: ItemSlot;
  // Weapon, armour, headgear and off-hand: the level this row is (1 to 3).
  level?: number;
  price: number;
  shop: 'smithy' | 'market';
  // The shop tier that sells it.
  shopTier: number;
  name?: string;
  effects: ItemEffects;
}

// What a hero carries. Missing on a unit: level 0, no potions, no charm.
export interface HeroItems {
  weapon: number;
  armour: number;
  // Headgear and off-hand levels (hero-kit.md); missing on an older hero: level 0.
  headgear?: number;
  offhand?: number;
  potions: number;
  // The potions carried, by item id (so small and greater ones keep their own heal). Its
  // length is `potions`; missing means that many plain 40% potions.
  flasks?: string[];
  charm: string | null;
}

// One of 3 cards offered when a party levels up. `effect` keys are read by Sim.
export type CardFamily = 'stats' | 'sustain' | 'nerve' | 'skill' | 'pantheon' | 'favour';
export type CardRarity = 'common' | 'rare' | 'epic';

// What a party needs for a card to be offered: every key set must hold for some member (tier:
// some member at that tier or above; caster, healer: some member of such a template).
export interface CardNeeds {
  god?: string;
  path?: string;
  pantheon?: string;
  template?: string;
  tier?: number;
  caster?: boolean;
  healer?: boolean;
}

export interface UpgradeDef {
  id: string;
  name: string;
  text: string;
  effect: {
    attr?: Partial<Attributes>;
    healPct?: number;
    flee?: number;
    // Party-wide keys, the same ones a god passive sets (PassiveKeys), summed over the cards taken.
    keys?: PassiveKeys;
  };
  // Offer rules (docs/systems/progression.md section 2). A card with none of these behaves as
  // before: common, no needs, offered however often.
  family?: CardFamily;
  rarity?: CardRarity;
  needs?: CardNeeds;
  // Who offers it and what the party's leader looks for (auto-pick, level-ups.md):
  // attack, defence, sustain, sight, gold or nerve.
  god?: string;
  pickTag?: string;
  // Times a party may take it: stats cards 3, every other family 1, a card with no family any.
  stack?: number;
}

export type TraitId = 'brave' | 'coward' | 'greedy' | 'proud' | 'loyal' | 'vengeful' | 'curious';

// How a run's lairs are laid out when GameData has no fixed lairSites: from the seed, with the
// boss lair always placed as far from the town as the map allows.
export interface MapRules {
  // Lairs per run, boss included: a whole number between the two (inclusive).
  lairs: readonly [number, number];
  // The lairs a run may draw from, each with its pantheon (for the lean) and a weight (default 1).
  // Drawn without repeats until the pool is used up.
  pool: readonly { lair: string; pantheon: string; weight?: number }[];
  // LairDef id of the boss lair: always placed, and the run is won when it falls.
  boss: string;
  // Each run leans on this many pantheons; pool lairs of those pantheons weigh leanWeight times more.
  leanCount: number;
  leanWeight: number;
  // Lairs keep this far from the map edge, minTownDist from the town hall and minLairDist from
  // each other (relaxed if the map is too crowded).
  margin: number;
  minTownDist: number;
  minLairDist: number;
}

// Where a lair stands on the map.
export interface LairSite {
  lair: string;
  pos: Vec2;
  // This lair's first tier-up (else from tuning.lair: first tier-up plus its stagger).
  firstTierUpMs?: number;
}

// Trait behaviours (docs/systems/hero-ai.md section 4).
export interface TraitTuning {
  // Brave: moves faster for braveChargeMs after taking a foe it was not fighting before.
  braveChargeMs: number;
  braveChargeSpeed: number;
  // Coward: in a party fight it stops this far behind the party's front member.
  cowardHangBack: number;
  // Loyal: it walks to a knocked out party mate and stands within this range of it.
  loyalGuardRange: number;
}

// Units keep apart and walk around buildings (collision.ts). Radii are world units; two melee
// units must still reach each other, so a pair of radii stays under a weapon's range (about 40).
export interface CollisionTuning {
  enabled: boolean;
  heroRadius: number;
  monsterRadius: number;
  bossRadius: number;
  // Town workers: gatherers, guards, the tax collector and summons.
  smallRadius: number;
  // Building footprints (half width and half height) unless the BuildingDef has its own.
  buildingHalf: readonly [number, number];
  hallHalf: readonly [number, number];
  // Heroes strike a lair from this far from its middle on top of their range (monsters stand around it).
  lairRadius: number;
  // How close to a footprint's edge a unit goes to visit a building.
  visitMargin: number;
  // Share of an overlap undone each tick, and the most one unit is moved by it.
  relax: number;
  maxPush: number;
  // Cell size of the neighbour grid.
  cell: number;
}

export interface HeroTuning {
  firstRecruitMs: number;
  recruitMs: number;
  maxPerTemple: number;
  // Most children of one god alive in town (knocked-out ones count); temples skip a full god.
  maxPerGod: number;
  koMs: number;
  reviveHp: number;
  restPerS: number;
  shrineMult: number;
  shopMinGold: number;
  // A shopping trip for an exploring hero that is not in a fight: -1 off (only the rest stop
  // shops); 0 when its plan buys a weapon or armour level; above 0 when it carries that much
  // gold and has anything to buy. Checked every 20 ticks, party leaders and lone heroes only, and
  // never while heading for a flag or a lair.
  shopTripGold: number;
  spendShare: number;
  // Spend share of a greedy (hoards) and a proud (wants the best) hero, when item rows exist.
  greedySpend: number;
  proudSpend: number;
  // Potions a hero may carry, by market tier.
  potionMax: number[];
  // A hero holding a charm swaps it only for one priced at least this much (and dearer).
  charmSwapPrice: number;
  // A hero drinks below its flee threshold plus this (points as a share of max hp), a coward
  // plus cowardDrinkAdd; one that never flees drinks at neverFleeDrink. A drink takes drinkMs.
  potionDrinkAdd: number;
  cowardDrinkAdd: number;
  neverFleeDrink: number;
  // Heal share (percent of max hp) of a potion with no item row.
  plainPotionPct: number;
  drinkMs: number;
  taxRate: number;
  // Share of a monster or lair bounty the town takes before the hero's purse gets it (the town's
  // income besides shop tax). Flags are not taxed.
  tithe: number;
  arrive: number;
  lairSearchRadius: number;
  lairSearchShare: number;
}

export interface PartyTuning {
  maxParty: number;
  mergeRange: number;
  mergeEveryTicks: number;
  xpPerLevel: number;
  offerSize: number;
  // The party stops levelling here (its XP still counts).
  maxLevel: number;
  // The party picks its level-up card itself, by its leader's personality (no pause, no player
  // choice). Off: the run waits for the player's pick.
  autoPick: boolean;
  // While a pick is open (a path card, or an upgrade offer with autoPick off) the run goes at
  // this share of its speed; 0 freezes it.
  offerSlowdown: number;
  // A card matching the leader's trait weighs this many times a plain one in the auto-pick draw.
  traitPickWeight: number;
  // The level whose offer is the party's god's favour cards.
  favourLevel: number;
  // Rarity weights [common, rare, epic] by party level: 2-3, 4-5, 6 and up.
  rarity: { low: number[]; mid: number[]; high: number[] };
  bondCap: number;
  baseFlee: number;
  // Half of the members in combat (retreatShare, rounded up) below the retreat line, baseFlee plus
  // retreatMargin, make the whole party retreat together; a proud hero holds on until
  // proudRetreatAt of its hp.
  retreatShare: number;
  retreatMargin: number;
  // A party retreat needs at least this many members actually in combat.
  retreatMinFighting: number;
  proudRetreatAt: number;
  // Rivalries: heroes whose bond is at or below this are rivals (bonds run from -3 up).
  rivalBelow: number;
  // Rivals this close argue, at most once per argueEveryMs per pair.
  argueRange: number;
  argueEveryMs: number;
  // A vengeful hero whose bond with a knocked-out hero is at least this swears revenge on the
  // monster that did it, and hunts it for up to revengeMs.
  friendBond: number;
  revengeMs: number;
}

export interface MonsterTuning {
  wanderRadius: number;
  idleMinMs: number;
  idleMaxMs: number;
  leash: number;
  // Gold and party xp for destroying a lair.
  lairBounty: number;
  lairXp: number;
  // How far a hero notices a lair, in world units.
  lairAggro: number;
}

// Lair growth: every tierUpEveryMs a lair goes up one tier (to maxTier). The arrays are indexed
// by tier - 1 (the last entry holds for higher tiers).
export interface LairTuning {
  // 0 turns growth off.
  tierUpEveryMs: number;
  // First tier-up of the nearest lair (0: the same as tierUpEveryMs), and how much later each
  // lair farther from the town goes up (rank by distance), so the map does not jump at once.
  firstTierUpMs: number;
  tierUpStaggerMs: number;
  // A lair whose monsters knock out this many heroes goes up a tier early (0: off).
  pressureKos: number;
  maxTier: number;
  // Multiplies the lair's spawn interval.
  spawnMult: number[];
  // Added to the lair's maxAlive.
  maxAliveAdd: number[];
  // Multiplies every attribute of the monsters the lair spawns (they keep the tier they spawned at).
  statMult: number[];
  // Multiplies the lair's own hp (a tier up adds the difference to its current hp).
  hpMult: number[];
  // Multiplies the bounty and xp of the monsters of that tier.
  rewardMult: number[];
}

// Building tiers: the `upgrade` command takes a building from tier 1 to maxTier. The arrays are
// indexed by tier - 1 (the last entry holds for higher tiers).
export interface BuildingTuning {
  maxTier: number;
  // Cost of the next tier as a multiple of the building's cost (index = current tier - 1).
  upgradeCostMult: number[];
  // Multiplies the building's hp (an upgrade adds the difference to its current hp).
  hpMult: number[];
  // Temples: multiplies the recruit timer, and added to maxPerTemple.
  templeRecruitMult: number[];
  templeCapAdd: number[];
  // Markets: multiplies the tax rate, and caps the gold one visit can spend (the stock).
  marketTaxMult: number[];
  // Tax multiplier by shop tier for item purchases (smithy and market).
  shopTaxMult: number[];
  marketStock: number[];
  // Towers shoot the nearest monster in range: range in world units, flat damage per shot,
  // and the time between shots.
  towerRange: number[];
  towerDamage: number[];
  towerCooldownMs: number[];
}

export interface SaveTuning {
  // The sim emits an `autosave` event every this many ms of run time (0 = never); Scene answers
  // it with saveWorld(). Not emitted while the world waits for a card pick.
  autosaveMs: number;
}

// What a miracle does at its spot. Damage is flat (gods have no attributes) and goes through the
// strike pipeline as a spell: no dodge, no crit, resisted by Willpower.
export interface MiracleEffect {
  kind: 'damage' | 'heal' | 'shield' | 'buff';
  // Foes are the monsters within the miracle's radius, heroes every hero within it.
  to: 'foes' | 'heroes';
  // Only targets with this tag (undead).
  tag?: string;
  // Damage: flat per strike, its type (default 'magic') and rider (arc, sear).
  amount?: number;
  type?: string;
  rider?: RiderId;
  // Damage: this many strikes on random foes (one each), spread evenly over `overS` seconds.
  // Without it every target is struck once.
  strikes?: number;
  overS?: number;
  // Heal and shield: share of max hp.
  pct?: number;
  // Shield and buff: seconds, and the buff's stat and amount.
  s?: number;
  stat?: BuffStat;
  buff?: number;
}

export interface MiracleDef {
  id: string;
  pantheon: string;
  radius: number;
  effects: readonly MiracleEffect[];
  // Names for Scene's tell and effect art.
  visual?: readonly string[];
}

// God favours (docs/systems/events.md section 3): temples fill a bar per pantheon; a full bar
// makes the god cast its miracle where its children are in the most danger.
export interface FavourTuning {
  // Bar points per second per temple tier is 1 / perTempleTierS.
  perTempleTierS: number;
  // Added when a hero of the pantheon tiers up, and when a party with one of its heroes clears a lair.
  tierUpGain: number;
  lairGain: number;
  max: number;
  // A hero below this share of max hp is in danger.
  dangerHp: number;
  // The tell lasts this long before the miracle lands.
  tellMs: number;
}

export interface StatsTuning {
  // Town gold is sampled this often for the end screen's gold curve (0 turns it off).
  goldSampleMs: number;
}

// Skills (docs/systems/paths-and-skills.md): a hero on a path casts its path's skill on its own.
// A trigger says when, a shape where, effects what. All numbers are rows, the engine is code.
export type SkillTrigger =
  // The cooldown is up and a foe is within `range` (default 300).
  | { kind: 'ready'; range?: number }
  // At least `n` foes within `radius` of the skill's centre (the caster, or its foe target);
  // `angle` (degrees) makes it a cone opening from the caster toward that centre.
  | { kind: 'crowd'; n: number; radius: number; angle?: number }
  // At least `n` (default 1) party mates within `radius` are below `below` of max hp.
  | { kind: 'allyHurt'; below: number; radius: number; n?: number }
  // The caster is below `below` of max hp, or `n` foes target it. Coward +15 points, brave -15.
  | { kind: 'selfHurt'; below?: number; n?: number }
  // A foe is between `min` and `max` away (opens a fight from a distance).
  | { kind: 'engage'; min: number; max: number }
  // A monster died within `radius` of the caster in the last 3 s.
  | { kind: 'kill'; radius: number }
  // Either holds; the first that does decides the target.
  | { any: readonly SkillTrigger[] };

export type SkillShape =
  | { kind: 'single' }
  | { kind: 'circle'; radius: number }
  // Opens from the caster toward the centre; `angle` in degrees.
  | { kind: 'cone'; radius: number; angle: number }
  // From the caster through the centre, `length` long and `width` wide (default 40).
  | { kind: 'line'; length: number; width?: number }
  // The target, then `jumps` times the nearest foe not yet hit within `radius`, each at
  // `falloff` times the last.
  | { kind: 'chain'; jumps: number; radius: number; falloff: number };

// When an effect runs. Only 'cast' (the default) exists until statuses and summons arrive.
export type SkillHook = 'cast' | 'hit' | 'kill' | 'expire' | 'death';

export type BuffStat = 'attackSpeed' | 'dodge' | 'armour' | 'damage' | 'crit';

interface EffectBase {
  // Defaults to 'cast'.
  on?: SkillHook;
  // Who the effect lands on, out of the shape: foes (damage, stagger, mark, taunt), allies
  // (heal, shield, buff; the caster counts as one), or the caster alone (dash). Override here.
  to?: 'foes' | 'allies' | 'self';
}

// `mult` x power (a weapon hero's Str, a caster's Int x spellMult) of `type` (default: the
// caster's own); `mult` 0 applies only the rider; `sure` skips the dodge roll.
export interface DamageEffect extends EffectBase {
  kind: 'damage';
  mult: number;
  type?: DamageType;
  rider?: RiderId;
  sure?: boolean;
}

// Heals `mult` x (Int + Wp) of the caster, like a healer's heal.
export interface HealEffect extends EffectBase {
  kind: 'heal';
  mult: number;
}

// Absorbs `mult` x (Int + Wp) of the caster, or `pct` of the target's max hp, for `s` seconds.
export interface ShieldEffect extends EffectBase {
  kind: 'shield';
  mult?: number;
  pct?: number;
  s: number;
}

// For `s` seconds: attackSpeed, dodge, damage and crit add `amount` (0.25 = +25%, dodge and crit
// as flat chance added after the curve); armour is multiplied by 1 + amount. A new buff of the
// same stat replaces the old one.
export interface BuffEffect extends EffectBase {
  kind: 'buff';
  stat: BuffStat;
  amount: number;
  s: number;
}

// Cancels the targets' windups (and casts): their strike starts over.
export interface StaggerEffect extends EffectBase {
  kind: 'stagger';
}

// Targets take `pct` more damage from everyone for `s` seconds (0.25 = +25%).
export interface MarkEffect extends EffectBase {
  kind: 'mark';
  pct: number;
  s: number;
}

// Foes in the shape go for the caster for `s` seconds (bosses ignore it).
export interface TauntEffect extends EffectBase {
  kind: 'taunt';
  s: number;
}

// The caster steps to the cast point (stopping in melee reach), before the other effects.
export interface DashEffect extends EffectBase {
  kind: 'dash';
}

// A unit a skill calls (docs/systems/paths-and-skills.md section 7). `hp` is flat, `hpShare` a share of
// the caster's max hp; `fromDead` makes a thrall of a monster that just died (stats x share).
export interface SummonDef {
  id: string;
  hp?: number;
  hpShare?: number;
  // Strikes every `everyS` for `mult` x the caster's power (the monster's own strike for a thrall).
  strike?: { mult: number; everyS: number; sure?: boolean };
  // Foes within `radius` of it go for it (a decoy).
  taunt?: { radius: number };
  // Cannot be targeted by melee attackers.
  flies?: boolean;
  // Called again this long after it dies (not after it ends), while the caster stands.
  respawnS?: number;
  fromDead?: { share: number };
}

// Calls `count` units of a summon row for `s` seconds (omitted: until killed). At the cast point,
// or on the recent kill for a thrall. `end` runs when it ends or dies: effects on the foes within
// `radius` of it, as the caster (Mirror Double's burst).
export interface SummonEffect extends EffectBase {
  kind: 'summon';
  summon: string;
  count?: number;
  s?: number;
  end?: { radius: number; effects: readonly SkillEffect[] };
}

// Pushes the targets `dist` away from the caster (bosses cannot be knocked back).
export interface KnockbackEffect extends EffectBase {
  kind: 'knockback';
  dist: number;
}

// Targets cannot move and attack 50% slower for `s` seconds (a boss: half the time).
export interface BindEffect extends EffectBase {
  kind: 'bind';
  s: number;
}

// Stands a knocked out party mate in the shape up at `pct` of max hp, once per fight.
export interface ReviveEffect extends EffectBase {
  kind: 'revive';
  pct: number;
}

// Foes in the shape below `below` of max hp die (not bosses).
export interface ExecuteEffect extends EffectBase {
  kind: 'execute';
  below: number;
}

// Removes the riders (burn, chill, wither) from the targets.
export interface CleanseEffect extends EffectBase {
  kind: 'cleanse';
}

// Heals the targets `pct` of max hp per second for `s` seconds.
export interface HotEffect extends EffectBase {
  kind: 'hot';
  pct: number;
  s: number;
}

// Restarts the timer of the buffs, shield and heal over time this skill put on the caster.
export interface RefreshEffect extends EffectBase {
  kind: 'refresh';
}

export type SkillEffect =
  | SummonEffect
  | DamageEffect
  | KnockbackEffect
  | BindEffect
  | ReviveEffect
  | ExecuteEffect
  | CleanseEffect
  | HotEffect
  | RefreshEffect
  | HealEffect
  | ShieldEffect
  | BuffEffect
  | StaggerEffect
  | MarkEffect
  | TauntEffect
  | DashEffect;

export interface SkillDef {
  id: string;
  // PathDef id.
  path: string;
  name: string;
  trigger: SkillTrigger;
  cooldownS: number;
  // Where the shape sits: on the caster, its foe, an ally in need, or the trigger's point.
  target: 'self' | 'foe' | 'ally' | 'point';
  shape: SkillShape;
  effects: readonly SkillEffect[];
  // Picture ids for Scene (bolt, burst, cone, line, chain, aura, shield, dash, mark, pillar).
  visual: readonly string[];
  // Fields that change at tier 3 (replace the field whole).
  t3?: Partial<Pick<SkillDef, 'trigger' | 'cooldownS' | 'target' | 'shape' | 'effects' | 'visual'>>;
}

export interface SkillTuning {
  // A cast's own windup, longer than a basic strike's (Scene shows the glow).
  castWindupMs: number;
  // `kill` triggers see monsters that died this recently.
  killWindowMs: number;
  // Self-hurt triggers fire this share of max hp earlier for a coward, later for a brave hero.
  traitNudge: number;
  // A single-target cast hits its target (or the nearest foe) within this of the cast point.
  pointReach: number;
  // One cast in this many carries `say` (Scene shows the skill name as a speech bubble).
  speechEvery: number;
}

export type RiderId = 'burn' | 'chill' | 'arc' | 'wither' | 'sear';

// Riders ride on a strike (skills carry them; a basic attack never does). Numbers per
// docs/systems/combat.md section 3.
export interface RiderTuning {
  // burn (fire): `ticks` more hits, `everyMs` apart, each `share` of the hit that lit it.
  burnTicks: number;
  burnShare: number;
  burnEveryMs: number;
  // chill (frost): move and attack `chillSlow` slower for `chillMs`; bosses take chillBossMult of it.
  chillSlow: number;
  chillMs: number;
  chillBossMult: number;
  // arc (lightning): jumps to the nearest other foe within `arcRadius` for `arcShare` of the hit.
  arcRadius: number;
  arcShare: number;
  // wither (death): healing on the target is multiplied by `witherHealMult` for `witherMs`.
  witherHealMult: number;
  witherMs: number;
  // sear (holy): against undead and demons a weak row's bonus is multiplied by this (0.5 -> 1.0).
  searBonusMult: number;
}

// The tax collector (collector.ts). Off: shop tax and tithe go straight to the treasury.
export interface CollectorTuning {
  enabled: boolean;
  // Collectors per town hall tier, and one more once this many buildings stand besides the hall
  // (until the hall has tiers).
  perHallTier: number;
  secondAtBuildings: number;
  // A till below this is not worth a trip.
  minTill: number;
  // Gold it carries before it must go home.
  carryCap: number;
  // The stop at a building to empty its till.
  collectMs: number;
  // Walking speed as a share of a level-1 hero's.
  speedMult: number;
  hp: number;
  // A new collector comes this long after one fell.
  respawnMs: number;
  // How close counts as arrived at a till, a pile or the town hall.
  reach: number;
  // A monster this close sends it running home.
  fearRange: number;
  // With gold aboard it only goes on to stops this close, and a stop scores its gold minus
  // distanceCost per world unit.
  chainRange: number;
  distanceCost: number;
}

export interface TownTuning {
  townHallHp: number;
  // The town hall has tiers (docs/systems/buildings.md): off, it stays tier 1 and nothing is gated.
  // On: it is upgraded for hallUpgradeCost[tier - 1] gold, has hp hallHpByTier, opens
  // plotsByHallTier plots, and no building may pass its tier.
  hallTiers: boolean;
  hallHpByTier: readonly number[];
  hallUpgradeCost: readonly number[];
  plotsByHallTier: readonly number[];
  // Ruins and repair (docs/systems/buildings.md section 3). Off: a destroyed building just goes.
  // On: it leaves a ruin on its plot (the town hall never does), rebuildable for rebuildCostMult
  // of its cost; buildings heal repairPerS of their max hp a second with no monster within
  // repairSafeRange.
  ruins: boolean;
  rebuildCostMult: number;
  repairPerS: number;
  repairSafeRange: number;
  buildingHp: number;
  // Raids: monsters from every lair march on the town.
  raidFirstMs: number;
  raidEveryMs: number;
  raidSize: number;
  // How many standing lairs send a raid each time (picked at random; the boss lair never does).
  raidLairs: number;
  // Raids get one monster bigger per lair every this many ms.
  raidGrowEveryMs: number;
  // A resting hero at or above this hp fraction rejoins the fight when a monster comes within
  // defendRange of the town hall or defendBuildingRange of any building.
  defendHp: number;
  defendRange: number;
  defendBuildingRange: number;
  // A raid is announced this long before it arrives (event raidWarning), and a tower of tier 2
  // or more in town gives the warning towerWarnAddMs earlier still.
  raidWarnMs: number;
  towerWarnAddMs: number;
  // A lair that tiers up sends one raid of its own (announced raidWarnMs ahead).
  raidOnTierUp: boolean;
  // The size of a tier-up raid: 0 follows the clock raid (raidSize + growth), else this flat size.
  tierRaidSize: number;
  // Only every n-th tier-up (counted across all lairs) sends a raid; 1 is every one.
  tierRaidEvery: number;
  // Gold the town gets when every raider of a raid is dead ("the town cheers").
  raidBeatenGold: number;
}

// How a hero chooses (docs/systems/hero-ai.md section 3): flag, lair and explore all get a score;
// the best wins and holds for commitMs, and is replaced only by one that beats it by
// max(switchMin, switchMargin x |current|).
export interface AiTuning {
  // Score lost per world unit to a flag or a lair, and to an explore point.
  distanceCost: number;
  exploreDistanceCost: number;
  commitMs: number;
  switchMargin: number;
  switchMin: number;
  // What exploring is worth.
  exploreValue: number;
  // A party with a monster this close is mid-fight: its lair goal at the lair holds, and no new
  // flag pulls it away.
  stickyFoeRange: number;
  // A lair's xp counts this much next to its gold.
  lairXpWeight: number;
  // The boss call: once the boss lair is unsealed its score gets bossCallBonus; with no normal lair
  // standing, a party whose members are all above bossCallHp of their hp scores it at least
  // exploreValue + switchMin. 0 turns it off.
  bossCallBonus: number;
  bossCallHp: number;
}

export interface BountyTuning {
  // Monsters within this radius of a flag count as its danger.
  dangerRadius: number;
  // A lair near the flag adds this much danger.
  lairDanger: number;
  // Gold a hero wants per point of danger.
  costPerDanger: number;
  // A hero standing this close to a cleared flag claims it.
  claimRadius: number;
  // Flat score added to every flag (a small flag still pulls), and the score a flag loses per
  // world unit of walk: -1 follows ai.distanceCost.
  flagBonus: number;
  flagDistanceCost: number;
  // A flag with no monster within this of it is clear (a hunt flag is claimed by the kill).
  claimClearRadius: number;
  // A flag placed within this of a living monster (and not on a lair) is a hunt flag bound to it.
  huntSnap: number;
  // A flag this young (placed or raised) may break a party's commitment.
  freshFlagMs: number;
  // A flag scoring this share of a party's current goal, without winning, is "considered" (event
  // `considering`).
  considerShare: number;
  greedyGoldMult: number;
  curiousGoldMult: number;
  braveFearMult: number;
  cowardFearMult: number;
  // Proud heroes ignore flags paying less than this.
  proudMinGold: number;
  // Share of a flag's gold the town gets back when the flag is cancelled.
  cancelRefund: number;
}

export interface CombatTuning {
  // Time between an attacker committing to a swing and the strike landing (capped at 40% of
  // the attack cycle).
  windupMs: number;
  // Healers: how far a heal reaches, the party mate hp fraction below which they heal, and the
  // heal amount per point of (int + wp).
  healRange: number;
  healBelow: number;
  healPower: number;
  // Curves 0.9 * x / (x + K): never 100%, capped at 90% (docs/systems/combat.md).
  // Dodge uses 2 * Dex + Per, attack time Dex (floor 10% of the weapon base), crit Per, armour
  // the armour number, magic resist Wp.
  dodgeK: number;
  attackK: number;
  critK: number;
  armourK: number;
  resistK: number;
  // A crit multiplies the strike (1 = crits off in effect).
  critMult: number;
  // A fight ends once a unit has had no foe for this long; a new one starts a first strike.
  fightGapMs: number;
  // The side with the lower Dex + Per waits this share of its attack cycle before its first strike.
  firstStrikeDelay: number;
  // Fire deals this much more to buildings.
  buildingFireMult: number;
  // A knockout costs a hero this share of the gold it carries.
  koGoldLoss: number;
  // A hero knocked out by a boss, or by a monster of a tier 3 lair, dies with this chance, less
  // deathShrineStep per shrine tier in town and deathHealerStep with a healer alive in its
  // party, never below deathFloor.
  bossDeathChance: number;
  deathShrineStep: number;
  deathHealerStep: number;
  deathFloor: number;
  // A tier 3 lair's monster slays with this chance when the knockout is within lairDeathRange of the
  // lair; every cut to the boss chance cuts it by half as many points, never below 0.
  lairDeathChance: number;
  lairDeathRange: number;
}

export interface Tuning {
  combat: CombatTuning;
  hero: HeroTuning;
  party: PartyTuning;
  monster: MonsterTuning;
  lair: LairTuning;
  building: BuildingTuning;
  boss: BossTuning;
  rider: RiderTuning;
  skill: SkillTuning;
  save: SaveTuning;
  stats: StatsTuning;
  ai: AiTuning;
  role: RoleTuning;
  favour: FavourTuning;
  town: TownTuning;
  trait: TraitTuning;
  collector: CollectorTuning;
  collision: CollisionTuning;
  nodes: NodesTuning;
  bounty: BountyTuning;
}

export interface GameData {
  // Overrides for a player's first run (docs/systems/onboarding.md section 4): gentler numbers,
  // merged group by group over `tuning` when createWorld gets { firstRun: true }.
  firstRun?: NonNullable<GameData['tuning']>;
  buildings: readonly BuildingDef[];
  // Building plots; a plot id is its index. Optional until Lead's rows land.
  plots?: readonly Vec2[];
  // Optional until src/data and Scene's stub carry rows; missing means no lairs.
  classes?: readonly ClassDef[];
  // Gods a temple calls children of. Classes are hidden templates the gods and paths point at.
  gods?: readonly GodDef[];
  monsters?: readonly MonsterDef[];
  upgrades?: readonly UpgradeDef[];
  // Paths of the gods. A god with no path rows tiers up by party level alone.
  paths?: readonly PathDef[];
  // Item rows the smithy and market sell.
  items?: readonly ItemDef[];
  // Path skills, one per path (tier 2, upgraded at tier 3).
  skills?: readonly SkillDef[];
  // One miracle per pantheon (docs/systems/events.md section 3). Without rows no bar fills.
  miracles?: readonly MiracleDef[];
  // Rows for the units skills summon.
  summons?: readonly SummonDef[];
  // Any subset of the tunable numbers; the rest use DEFAULT_TUNING (src/sim/tuning.ts).
  tuning?: {
    combat?: Partial<CombatTuning>;
    hero?: Partial<HeroTuning>;
    party?: Partial<PartyTuning>;
    monster?: Partial<MonsterTuning>;
    lair?: Partial<LairTuning>;
    building?: Partial<BuildingTuning>;
    rider?: Partial<RiderTuning>;
    skill?: Partial<SkillTuning>;
    boss?: Partial<BossTuning>;
    save?: Partial<SaveTuning>;
    stats?: Partial<StatsTuning>;
    ai?: Partial<AiTuning>;
    role?: Partial<RoleTuning>;
    favour?: Partial<FavourTuning>;
    town?: Partial<TownTuning>;
    collector?: Partial<CollectorTuning>;
    collision?: Partial<CollisionTuning>;
    trait?: Partial<TraitTuning>;
    nodes?: Partial<NodesTuning>;
    bounty?: Partial<BountyTuning>;
  };
  lairs?: readonly LairDef[];
  // Fixed lair positions. Empty or missing with mapRules set: the map is generated from the seed.
  lairSites?: readonly LairSite[];
  mapRules?: MapRules;
  startGold: number;
  // Map size in world units (Scene maps units to pixels).
  map: { width: number; height: number };
  // Where the town hall stands.
  townHall: Vec2;
}

// What a destroyed building leaves on its plot when tuning.town.ruins is on (ruins.ts): rebuilt at
// tier 1 for rebuildCostMult of its cost, or cleared for nothing.
export interface RuinState {
  id: number;
  type: string;
  plot: number;
  pos: Vec2;
}

export interface BuildingState {
  id: number;
  type: string;
  tier: number;
  pos: Vec2;
  // Plot the building stands on; null for the town hall.
  plot: number | null;
  hp: number;
  maxHp: number;
  // Gold the `upgrade` command costs now; null at the top tier (and for the town hall unless it has tiers).
  upgradeCost: number | null;
  // The town hall tier the next upgrade waits for; null when nothing blocks it.
  upgradeGate: number | null;
  // Gold waiting in the building for the tax collector (shop tax, tithe). Missing: none.
  till?: number;
}

// A building as the sim keeps it; the snapshot adds the upgrade cost.
export type BuildingCore = Omit<BuildingState, 'upgradeCost' | 'upgradeGate'>;

export interface PlotState {
  // Index into GameData.plots.
  id: number;
  pos: Vec2;
  occupied: boolean;
  building: number | null;
  // Closed until the town hall reaches `unlockTier` (always open without hall tiers).
  locked: boolean;
  unlockTier: number;
  // The ruin that stands on it, if any.
  ruin: number | null;
}

export interface LairState {
  id: number;
  type: string;
  // The boss lair of a generated map: destroying it wins the run.
  boss: boolean;
  tier: number;
  pos: Vec2;
  hp: number;
  maxHp: number;
  // Grew on a node late in the run (corrupt.ts): it does not count toward lair-count rules.
  sprouted?: true;
  // Snapshot only. The growth ring: ms until the next tier-up and the length of the current wait
  // (fill = 1 - nextTierMs / tierSpanMs); null at the top tier or with no tier clock.
  nextTierMs?: number | null;
  tierSpanMs?: number | null;
  // Snapshot only. The guards: living monsters of this lair wherever they are, how many it keeps
  // (after tier and swarm adds; 0 for a boss lair without an escort) and ms until its next spawn
  // (null when full).
  alive?: number;
  maxAlive?: number;
  nextSpawnMs?: number | null;
}

export interface UnitState {
  id: number;
  // 'summon': a unit a hero's skill called; it fights for the party and monsters can target it.
  kind: 'hero' | 'monster' | 'summon' | 'collector' | 'worker' | 'guard';
  // Monsters: the monster id. Heroes: the id of the template in use (ClassDef): the god's at
  // tier 1, the path's from tier 2. Look and strike fall back on it.
  type: string;
  tier: number;
  // Heroes: the GodDef id (null only for heroes spawned straight from a template, dev and
  // tests); monsters null.
  god: string | null;
  // Heroes: the path id taken at tier 2, else null.
  path: string | null;
  // Heroes: the body, one of the god's two builds (GodDef.builds), kept for life; absent without.
  build?: string;
  pos: Vec2;
  // Unit vector of the last move; Scene picks front/back view and mirrors from it.
  facing: Vec2;
  hp: number;
  maxHp: number;
  // Heroes: gear carried (absent: nothing). Monsters never have any.
  items?: HeroItems;
  // Summons: who called it, from which row, and when it ends (null: until it dies).
  // `monster` is the dead monster a thrall rose from (its stats); `type` stays the row id for art.
  summon?: { owner: number; def: string; until: number | null; src: string; monster?: string };
  // Unit being attacked, if any (Scene lunges toward it).
  target: number | null;
  // Knocked out (heroes only, monsters are removed). Out of the fight until revived.
  ko: boolean;
  // What the unit is doing. Monsters always 'wander'.
  mode: UnitMode;
  // Heroes: the party they belong to (0 for monsters) and their personality.
  party: number;
  trait: TraitId | null;
  // Gold carried (heroes; monsters 0).
  gold: number;
  // The bounty flag a hero is heading for (its party leader's pick for followers); null
  // otherwise and always for monsters.
  bounty: number | null;
}

export type UnitMode = 'wander' | 'explore' | 'return' | 'rest' | 'shop' | 'ko';

export type IntentKind =
  'flag' | 'escort' | 'lair' | 'revenge' | 'explore' | 'retreat' | 'shop' | 'rest' | 'defend';

// What a party is heading for: a flag or lair by id, with the place when it has one.
export interface PartyIntent {
  kind: IntentKind;
  target?: number;
  pos?: Vec2;
}

export interface PartyState {
  id: number;
  members: number[];
  level: number;
  xp: number;
  // XP needed for the next level.
  xpNext: number;
  upgrades: string[];
  // Upgrade ids offered right now; the sim waits for pickUpgrade while this is set.
  offer: string[] | null;
  // A hero with several free paths waits for pickPath (one hero at a time). While set,
  // pickUpgrade is refused: the path card comes first.
  pathOffer: { hero: number; options: string[] } | null;
  // What the party is doing now (its leader's intent), for the icon over its banner.
  intent: PartyIntent;
}

export interface PathState {
  id: string;
  // GodDef id and its pantheon.
  god: string;
  pantheon: string;
  // ClassDef id the path uses from tier 2.
  template: string;
  name: string;
  // A built temple of its pantheon exists.
  available: boolean;
  // Hero holding the path, or null.
  takenBy: number | null;
}

export interface GraveState {
  // The slain hero's unit id.
  id: number;
  type: string;
  god: string | null;
  path: string | null;
  tier: number;
  pos: Vec2;
  timeMs: number;
  // The party's level when it fell, and whether it has been recalled (once each). Old saves: 1.
  level?: number;
  recalled?: true;
}

// A celestial node (nodes.ts, docs/systems/nodes.md): under every non-boss lair. Locked while the
// lair stands; freed when it falls, then a pool of Ambrosia that refills slowly.
export interface NodeState {
  id: number;
  // The lair it lay under.
  lair: number;
  pos: Vec2;
  state: 'locked' | 'freed' | 'defiled';
  // Ambrosia in the pool (0 while locked) and the most it holds.
  pool: number;
  max: number;
  // Raiders have been at it since this time (corrupt.ts); the countdown to a defile.
  threatSinceMs?: number;
  // The raiders that stayed to hold it while defiled.
  defilers?: number[];
  // Time a hero or guard has stood on a defiled node with no foe near (the cleanse).
  cleanseMs?: number;
  // A lair will sprout here at this time (warned ahead).
  sproutAtMs?: number;
}

// Celestial nodes and Ambrosia (nodes.ts). Off: no nodes, nothing changes.
export interface NodesTuning {
  enabled: boolean;
  // A freed node opens with `start` Ambrosia and holds up to `max`; it refills `regenPerMin`.
  start: number;
  max: number;
  regenPerMin: number;
  // Both scale by 1 + distBonus per full distStep beyond distFrom from the town hall.
  distFrom: number;
  distStep: number;
  distBonus: number;
  // By lair tier (1-based; the last holds above).
  tierMult: readonly number[];
  // Gatherers (workers.ts): gold to hire, how many per town hall tier, body, and the loop: gather
  // for gatherMs, carry `carry` Ambrosia home. A hit sends one home at fleeMult x its speed; at
  // the hall it heals healPerS of its max hp a second.
  gathererCost: number;
  gathererCap: readonly number[];
  gathererHp: number;
  speedMult: number;
  gatherMs: number;
  carry: number;
  fleeMult: number;
  healPerS: number;
  // A gatherer that fled home waits at the hall until it has this share of its hp back before it
  // goes out again (0: goes straight back out).
  returnAtHp: number;
  reach: number;
  // Guards a tower lends (guards.ts): gold per trip, how many at a time by tower tier, body, a
  // spear of guardDamage x a level 1 hero's strength, how far it strays from its gatherer, how
  // long before the tower lends a replacement, and how long a dropped jar lies.
  // Ambrosia prices: the next temple tier (by the tier it has now), an Offering, a Recall.
  templeCost: readonly number[];
  offeringCost: number;
  recallCost: number;
  // Losing a node (corrupt.ts): raiders within defileRange stop, and after defileCountdownMs the
  // node is defiled with `defilers` of them left behind. Cleansing: a hero or guard within
  // cleanseRange for cleanseMs with no foe within cleanseFoeRange. From sproutFromMs a lair may
  // sprout on a free node (warned sproutWarnMs ahead), at most sproutMax a run and one per
  // sproutEveryMs; a sprouted lair's node reopens with its pool x sproutPoolMult.
  defileRange: number;
  defileCountdownMs: number;
  defilers: number;
  cleanseRange: number;
  cleanseMs: number;
  cleanseFoeRange: number;
  sproutFromMs: number;
  sproutWarnMs: number;
  sproutEveryMs: number;
  sproutMax: number;
  sproutPoolMult: number;
  escortGold: readonly number[];
  guardCost: number;
  guardPerTower: readonly number[];
  guardHp: number;
  guardArmour: number;
  guardDamage: number;
  guardRange: number;
  guardLeash: number;
  guardHeel: number;
  guardRelendMs: number;
  jarMs: number;
}

// A jar of Ambrosia lying on the ground (a fallen gatherer's, or a thief's when it falls).
export interface JarState {
  id: number;
  pos: Vec2;
  amount: number;
  untilMs: number;
}

// What a gatherer is doing: waiting at the hall, walking out, gathering, or carrying home.
export interface WorkerInfo {
  unit: number;
  node: number | null;
  phase: 'idle' | 'out' | 'gather' | 'back';
  carry: number;
  fleeing: boolean;
}

// A pile of gold on the ground (a fallen collector's load, a destroyed building's till): the
// town's, a collector picks it up. Heroes ignore it.
export interface PileState {
  id: number;
  pos: Vec2;
  gold: number;
  // Dropped by a fallen collector (counted in taxLost until a collector brings it home).
  fell?: boolean;
}

export interface BountyState {
  id: number;
  pos: Vec2;
  gold: number;
  // A hunt flag: bound to the monster it was placed on (pos follows it), paid to the hero that
  // lands the kill. Missing: a flag on open ground, claimed by standing on it once it is clear.
  target?: number;
  // When it was placed (a new flag may break a party's commitment for a while). Missing: old.
  placedMs?: number;
  // An escort bounty (escort.ts): follows this gatherer, taken by the first party to reach it
  // (`escortBy`, a hero of that party), paid when the gatherer gets home with its jar.
  escort?: number;
  escortBy?: number;
}

export type SimEvent =
  | { kind: 'built'; building: number; type: string }
  | { kind: 'upgraded'; building: number; type: string; tier: number }
  | { kind: 'spawned'; unit: number; type: string; lair: number }
  | {
      kind: 'windup';
      attacker: number;
      target: number;
      inMs: number;
      // A cleave: the ground marker Scene draws until the strike lands.
      area?: { x: number; y: number; r: number };
      // A breath: the cone Scene draws until the strike lands.
      cone?: ConeArea;
      // A timed boss move being announced (venom, howl, riddle, swallow).
      move?: 'venom' | 'howl' | 'riddle' | 'swallow';
    }
  | { kind: 'bossEmerged'; unit: number; lair: number }
  // The Sphinx asked `target`; `answered` is true when it knew the answer.
  | { kind: 'riddle'; boss: number; target: number; answered: boolean }
  // The Hydra lost or regrew a head; `heads` is how many it has now.
  | { kind: 'bossHeads'; unit: number; heads: number }
  | { kind: 'enraged'; unit: number }
  // `source: 'miracle'`: a god's doing; `healer` is 0 (no unit swings or casts).
  | { kind: 'heal'; healer: number; target: number; amount: number; source?: 'miracle' }
  | {
      kind: 'hit';
      attacker: number;
      target: number;
      damage: number;
      dodged: boolean;
      // Damage type of the strike ('physical', 'fire', ...; 'magic' for an untyped spell).
      type: string;
      // A critical strike (absent when it was not).
      crit?: boolean;
      // The part of the damage a shield took (`damage` is what reached the hp).
      absorbed?: number;
      // A burn tick rather than a strike.
      tick?: boolean;
      // `source: 'miracle'`: a god's doing; `attacker` is 0 (no unit swings or casts).
      source?: 'miracle';
      // The target's type row made it x1.5 or more (weak) or less than x1 (resist).
      weak?: boolean;
      resist?: boolean;
    }
  // `goldLost`: the gold it dropped (absent when none).
  | { kind: 'knockout'; unit: number; by: number; goldLost?: number }
  // A hero was killed for good (a boss or tier 3 lair knockout that rolled death). It leaves a
  // grave at `pos`; `goldLost` as for a knockout.
  | {
      kind: 'slain';
      unit: number;
      by: number;
      type: string;
      god: string | null;
      pos: Vec2;
      goldLost?: number;
    }
  | { kind: 'died'; unit: number; type: string; by: number; bounty: number; xp: number }
  | { kind: 'partyFormed'; party: number; members: number[] }
  | { kind: 'levelUp'; party: number; level: number; offer: string[] }
  // `auto`: the party chose the card itself (tuning.party.autoPick), `hero` its leader.
  // `god`: the god that offers the card (its own `god`, else the leader's) for "Thor offers: X".
  | {
      kind: 'upgradePicked';
      party: number;
      upgrade: string;
      auto?: boolean;
      hero?: number;
      god?: string;
    }
  | { kind: 'tierUp'; unit: number; tier: number; path: string | null }
  | { kind: 'pathOffer'; party: number; hero: number; options: string[] }
  // A hero saw a kind of monster or lair for the first time this run (hints, barks).
  | { kind: 'discovered'; what: 'monster' | 'lair'; type: string; unit: number; pos: Vec2 }
  // A charger starts its charge toward `to`.
  | { kind: 'charge'; unit: number; to: Vec2 }
  // A swarm splits into two halves.
  | { kind: 'split'; unit: number; into: number[] }
  // A monster snatched gold from a hero.
  | { kind: 'stolen'; thief: number; victim: number; gold: number }
  // A raid is coming from `from` (the lair) in `inMs`; `early` is the tower's longer warning.
  | {
      kind: 'raidWarning';
      raid: number;
      lair: number;
      size: number;
      inMs: number;
      from: Vec2;
      dir: Vec2;
      early?: boolean;
    }
  | { kind: 'raid'; lair: number; size: number; raid?: number }
  // Every raider of the raid is dead: the town cheers and gets `gold`.
  | { kind: 'raidBeaten'; raid: number; gold: number }
  // The lair fell before its announced raid left: no raid comes.
  | { kind: 'raidCancelled'; raid: number; lair: number }
  // A rider took hold on `target` (burn, chill, wither; arc and sear show in the hit itself).
  | { kind: 'rider'; target: number; rider: RiderId; by: number }
  // A hero starts casting a skill; it lands `inMs` later. `say`: Scene shows the skill name.
  | {
      kind: 'cast';
      skill: string;
      caster: number;
      target: number | null;
      point: Vec2;
      inMs: number;
      say?: boolean;
    }
  // A cast lands on `hits` (unit ids) around `point`.
  // `hits`: every unit an effect touched (foes, allies, the caster). `from`: where the caster
  // stood when it dashed (the dash is instant; Scene animates it from `from` to the caster).
  | { kind: 'skill'; skill: string; caster: number; hits: number[]; point: Vec2; from?: Vec2 }
  // A shield, mark, buff or taunt took hold on `unit` until run time `until`.
  | {
      kind: 'status';
      unit: number;
      status:
        | 'shield'
        | 'mark'
        | 'buff'
        | 'taunt'
        | 'bind'
        | 'hot'
        | 'poison'
        | 'fear'
        | 'stone'
        | 'swallowed';
      until: number;
    }
  | { kind: 'argue'; a: number; b: number }
  | { kind: 'revenge'; hero: number; target: number; victim: number }
  | { kind: 'avenged'; hero: number; target: number }
  | { kind: 'autosave' }
  // `pressure`: the lair grew early because its monsters knocked out too many heroes.
  | { kind: 'lairTierUp'; lair: number; tier: number; pressure?: boolean }
  | { kind: 'gathererHired'; unit: number }
  | { kind: 'workerHit'; unit: number }
  | { kind: 'jarHome'; unit: number; node: number | null; amount: number; total: number }
  | {
      kind: 'ambrosiaSpent';
      what: 'temple' | 'offering' | 'recall';
      building: number;
      cost: number;
    }
  | { kind: 'recalled'; unit: number; grave: number; building: number }
  | { kind: 'escortTaken'; bounty: number; unit: number; gatherer: number }
  | { kind: 'guardOut'; unit: number; escort: number; tower: number }
  | { kind: 'guardHome'; unit: number }
  | { kind: 'guardFell'; unit: number; pos: Vec2 }
  | { kind: 'jarDropped'; jar: number; pos: Vec2; amount: number }
  | { kind: 'jarStolen'; thief: number; victim: number; amount: number }
  | { kind: 'jarTaken'; jar: number; unit: number; amount: number }
  | { kind: 'workerFell'; unit: number; pos: Vec2; carried: number }
  | { kind: 'nodeThreat'; node: number; inMs: number }
  | { kind: 'nodeDefiled'; node: number; defilers: number[] }
  | { kind: 'lairSprouting'; node: number; inMs: number }
  | { kind: 'lairSprouted'; node: number; lair: number }
  | { kind: 'nodeFreed'; node: number; lair: number; pos: Vec2; pool: number }
  | { kind: 'lairDestroyed'; lair: number; type: string; by: number; bounty: number }
  | { kind: 'ruinLeft'; ruin: number; type: string; plot: number; pos: Vec2 }
  | { kind: 'ruinCleared'; ruin: number }
  | { kind: 'buildingDestroyed'; building: number; type: string }
  // A hero paid its tithe into the till of `building` (its home temple; the town hall, banked at
  // once, when none stands) as it started to rest.
  | { kind: 'tithe'; unit: number; building: number; gold: number }
  // Gold went into a building's till (shop tax or tithe): a coin pop over the building.
  | { kind: 'till'; building: number; gold: number; total: number }
  // The tax collector (docs/systems/tax-collector.md): comes out of the town hall; empties a till
  // or picks up a pile (source) and now carries `carried`; is hit (it turns for home); brings
  // `gold` home (`collected`); falls (its gold lies at pos as a pile).
  | { kind: 'collectorOut'; unit: number }
  | {
      kind: 'tillEmptied';
      unit: number;
      source: 'till' | 'pile';
      id: number;
      gold: number;
      carried: number;
    }
  | { kind: 'collectorHit'; unit: number }
  | { kind: 'collected'; unit: number; gold: number }
  | { kind: 'collectorFell'; unit: number; pos: Vec2; gold: number }
  | {
      kind: 'bountyClaimed';
      bounty: number;
      unit: number;
      gold: number;
      hunt?: true;
      escort?: true;
    }
  | { kind: 'won' }
  | { kind: 'lost' }
  | { kind: 'arrived'; unit: number; type: string; god: string | null }
  | { kind: 'fled'; unit: number }
  | { kind: 'revived'; unit: number }
  // A skill called a unit; it ended (`expired`), died (`died`) or its caster fell (`orphaned`).
  | { kind: 'summoned'; unit: number; owner: number; summon: string; skill: string; pos: Vec2 }
  | {
      kind: 'unsummoned';
      unit: number;
      owner: number;
      reason: 'expired' | 'died' | 'orphaned' | 'replaced';
    }
  // `item`: the item id of one purchase (absent for the plain market spend without item rows).
  // A hero drank a potion (`left` still carried) and healed `amount`.
  | { kind: 'drank'; unit: number; amount: number; left: number }
  | { kind: 'shopped'; unit: number; spent: number; tax: number; item?: string }
  // A party's intent changed (its leader chose a flag or a lair, retreats, rests ...).
  | { kind: 'intent'; party: number; intent: PartyIntent }
  // The party falls back together: these heroes turn for home (no bond is lost).
  | { kind: 'partyRetreat'; party: number; units: number[] }
  // A resting hero rejoins to defend the town.
  | { kind: 'defend'; unit: number }
  // The seal on a boss lair broke: it can be attacked now.
  | { kind: 'bossLairUnsealed'; lair: number; by: 'time' | 'lairs' }
  // A god starts its miracle at `pos`; it lands after `tellMs` (Scene draws the tell).
  | { kind: 'miracle'; id: string; pantheon: string; pos: Vec2; tellMs: number }
  // A party leader got a charm from a lair that fell.
  | { kind: 'relic'; unit: number; item: string; lair: number }
  | { kind: 'bountyPlaced'; bounty: number; gold: number; escort?: number; target?: number }
  // A party's score for a flag is at least consideringShare of its current goal's: Scene can
  // show it weighing the flag (it did not switch yet).
  | { kind: 'considering'; party: number; bounty: number }
  // `gold`: what the flag held; `refund`: what the town got back.
  | { kind: 'bountyCancelled'; bounty: number; gold: number; refund: number }
  | { kind: 'bountyRaised'; bounty: number; gold: number; total: number };

export type Command =
  | { kind: 'build'; type: string; plot: number }
  // Gatherers (M3): hire at the town hall; send an idle one to a freed node (again for a second);
  // recall them from one node, or all.
  | { kind: 'hireGatherer' }
  | { kind: 'sendGatherer'; node: number }
  // A tower lends a guard to walk beside this gatherer (15 gold).
  | { kind: 'sendGuard'; unit: number }
  // Post an escort bounty on a gatherer: a moving flag heroes may take (25 or 50 gold).
  | { kind: 'placeEscort'; unit: number; gold: number }
  // Ambrosia buys (M3): a temple's next tier, an Offering that fills its pantheon's favour bar,
  // and the Recall of a slain hero of its pantheon at the temple.
  | { kind: 'upgradeWithAmbrosia'; building: number }
  | { kind: 'offering'; building: number }
  | { kind: 'recallFallen'; building: number; grave: number }
  | { kind: 'recallGatherers'; node?: number }
  | { kind: 'placeBounty'; pos: Vec2; gold: number }
  // Take a flag down and get cancelRefund (50%) of its gold back.
  | { kind: 'cancelBounty'; bounty: number }
  // Add gold to a flag that stands.
  | { kind: 'raiseBounty'; bounty: number; gold: number }
  // `upgrade` left out: the party's leader picks (as with autoPick).
  | { kind: 'pickUpgrade'; party: number; upgrade?: string }
  | { kind: 'pickPath'; party: number; path: string }
  // Buy the next tier of a building.
  | { kind: 'upgrade'; building: number }
  // A ruin: rebuild at tier 1 for half the cost, or clear it for nothing (frees the plot).
  | { kind: 'rebuildRuin'; ruin: number }
  | { kind: 'clearRuin'; ruin: number };

export type CommandResult = { ok: true; id: number } | { ok: false; reason: string };

export interface RunStats {
  monstersKilled: number;
  lairsDestroyed: number;
  heroesArrived: number;
  knockouts: number;
  buildingsLost: number;
  taxCollected: number;
  // Gold the collector carried when it fell (it lies as a pile; what no collector picks up is lost).
  taxLost: number;
}

// One hero's line on the end screen. `mvp` marks the best hero of the run (kills, five per
// lair destroyed, damage as tie-breaker); heroes come sorted best first.
export interface HeroReport {
  unit: number;
  // Killed for good (see `slain`).
  slain?: boolean;
  type: string;
  god: string | null;
  path: string | null;
  tier: number;
  kills: number;
  lairKills: number;
  // Gold from monster bounties, lair bounties and bounty flags (not shop spending).
  goldEarned: number;
  knockouts: number;
  damage: number;
  healing: number;
  mvp: boolean;
}

export interface RunReport {
  // The seed of the run (small text on the end screen: createWorld(seed, data) replays the map).
  seed: number;
  // Tax: banked at the hall, lost when a collector fell, and still in tills, piles and sacks at the
  // end ("left uncollected").
  taxBanked: number;
  taxLost: number;
  uncollected: number;
  // 'abandoned': the player quit a run that was still going (api.runReport).
  outcome: 'won' | 'lost' | 'abandoned';
  timeMs: number;
  mvp: number | null;
  heroes: HeroReport[];
  // Lairs destroyed, in order: the lair id and type, when, and the hero that did it.
  lairsCleared: { lair: number; type: string; timeMs: number; by: number }[];
  // Town gold over the run, sampled every tuning.stats.goldSampleMs plus the final value.
  goldHistory: { timeMs: number; gold: number }[];
}

export interface Snapshot {
  // A first run with no temple yet: the clock is stopped until one stands (docs/systems/onboarding.md).
  readonly waiting: boolean;
  readonly timeMs: number;
  readonly tick: number;
  readonly gold: number;
  readonly status: 'running' | 'won' | 'lost';
  readonly stats: Readonly<RunStats>;
  readonly plots: readonly Readonly<PlotState>[];
  readonly buildings: readonly Readonly<BuildingState>[];
  readonly lairs: readonly Readonly<LairState>[];
  readonly units: readonly Readonly<UnitState>[];
  readonly parties: readonly Readonly<PartyState>[];
  readonly paths: readonly Readonly<PathState>[];
  readonly bounties: readonly Readonly<BountyState>[];
  // Ruins of destroyed buildings (tuning.town.ruins).
  readonly ruins: readonly Readonly<RuinState>[];
  // Gold piles on the ground (a fallen tax collector's load).
  readonly piles: readonly Readonly<PileState>[];
  // Celestial nodes (empty while tuning.nodes.enabled is off) and the Ambrosia in the town's hands.
  readonly nodes: readonly Readonly<NodeState>[];
  readonly ambrosia: number;
  // Gatherers: what each is doing, and how many the town hall may keep.
  readonly workers: readonly Readonly<WorkerInfo>[];
  readonly jars: readonly Readonly<JarState>[];
  readonly gathererCap: number;
  // Favour bar of every pantheon with a miracle row (0 to max); a full bar waits for a fight.
  readonly favour: readonly Readonly<{ pantheon: string; value: number; max: number }>[];
  // Where heroes were slain; the markers stay for the run.
  readonly graves: readonly Readonly<GraveState>[];
  // Pairs of living heroes who are rivals right now (lower id first).
  readonly rivals: readonly (readonly [number, number])[];
  // This run's map: the pantheons it leans on and the boss lair (null on a fixed map).
  readonly map: Readonly<{ lean: string[]; boss: number | null; sealed: boolean }>;
  // The end screen numbers once the run is won or lost; null while it is running. Totals for
  // the run are in `stats`.
  readonly report: Readonly<RunReport> | null;
  // Events since the previous snapshot() call (speech bubbles, sounds, juice).
  readonly events: readonly SimEvent[];
}
