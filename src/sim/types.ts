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
}

// A god: heroes are children of a god, called by a temple of its pantheon. `template` is the
// ClassDef id (a hidden stats, weapon and strike template) a tier 1 child uses.
export type DamageType = 'physical' | 'fire' | 'frost' | 'lightning' | 'death' | 'holy';

export interface GodDef {
  id: string;
  pantheon: string;
  name: string;
  template: string;
  // The type a caster child of this god strikes with at tier 1 (weapon templates are physical).
  damageType?: DamageType;
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
}

export interface LairDef {
  id: string;
  monster: string;
  // Seconds between spawns and the most monsters alive from this lair.
  spawnS: number;
  maxAlive: number;
  hp: number;
}

export interface ClassDef {
  id: string;
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
}

// One of 3 cards offered when a party levels up. `effect` keys are read by Sim.
export interface UpgradeDef {
  id: string;
  name: string;
  text: string;
  effect: { attr?: Partial<Attributes>; healPct?: number; flee?: number };
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
  spendShare: number;
  taxRate: number;
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
  bondCap: number;
  baseFlee: number;
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

interface EffectBase {
  // Defaults to 'cast'.
  on?: SkillHook;
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

// The other effects of the spec join this union with Sim 250.
export type SkillEffect = DamageEffect;

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

export interface TownTuning {
  townHallHp: number;
  buildingHp: number;
  // Raids: monsters from every lair march on the town.
  raidFirstMs: number;
  raidEveryMs: number;
  raidSize: number;
  // How many standing lairs send a raid each time (picked at random; the boss lair never does).
  raidLairs: number;
  // Raids get one monster bigger per lair every this many ms.
  raidGrowEveryMs: number;
  // A resting hero at or above this hp fraction rejoins the fight when raiders come near.
  defendHp: number;
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
  greedyGoldMult: number;
  curiousGoldMult: number;
  braveFearMult: number;
  cowardFearMult: number;
  // Proud heroes ignore flags paying less than this.
  proudMinGold: number;
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
}

export interface Tuning {
  combat: CombatTuning;
  hero: HeroTuning;
  party: PartyTuning;
  monster: MonsterTuning;
  lair: LairTuning;
  building: BuildingTuning;
  rider: RiderTuning;
  skill: SkillTuning;
  save: SaveTuning;
  stats: StatsTuning;
  town: TownTuning;
  bounty: BountyTuning;
}

export interface GameData {
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
  // Path skills, one per path (tier 2, upgraded at tier 3).
  skills?: readonly SkillDef[];
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
    save?: Partial<SaveTuning>;
    stats?: Partial<StatsTuning>;
    town?: Partial<TownTuning>;
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

export interface BuildingState {
  id: number;
  type: string;
  tier: number;
  pos: Vec2;
  // Plot the building stands on; null for the town hall.
  plot: number | null;
  hp: number;
  maxHp: number;
  // Gold the `upgrade` command costs now; null at the top tier and for the town hall.
  upgradeCost: number | null;
}

// A building as the sim keeps it; the snapshot adds the upgrade cost.
export type BuildingCore = Omit<BuildingState, 'upgradeCost'>;

export interface PlotState {
  // Index into GameData.plots.
  id: number;
  pos: Vec2;
  occupied: boolean;
  building: number | null;
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
}

export interface UnitState {
  id: number;
  kind: 'hero' | 'monster';
  // Monsters: the monster id. Heroes: the id of the template in use (ClassDef): the god's at
  // tier 1, the path's from tier 2. Look and strike fall back on it.
  type: string;
  tier: number;
  // Heroes: the GodDef id (null only for heroes spawned straight from a template, dev and
  // tests); monsters null.
  god: string | null;
  // Heroes: the path id taken at tier 2, else null.
  path: string | null;
  pos: Vec2;
  // Unit vector of the last move; Scene picks front/back view and mirrors from it.
  facing: Vec2;
  hp: number;
  maxHp: number;
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

export interface BountyState {
  id: number;
  pos: Vec2;
  gold: number;
}

export type SimEvent =
  | { kind: 'built'; building: number; type: string }
  | { kind: 'upgraded'; building: number; type: string; tier: number }
  | { kind: 'spawned'; unit: number; type: string; lair: number }
  | { kind: 'windup'; attacker: number; target: number; inMs: number }
  | { kind: 'heal'; healer: number; target: number; amount: number }
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
      // A burn tick rather than a strike.
      tick?: boolean;
      // The target's type row made it x1.5 or more (weak) or less than x1 (resist).
      weak?: boolean;
      resist?: boolean;
    }
  | { kind: 'knockout'; unit: number; by: number }
  | { kind: 'died'; unit: number; type: string; by: number; bounty: number; xp: number }
  | { kind: 'partyFormed'; party: number; members: number[] }
  | { kind: 'levelUp'; party: number; level: number; offer: string[] }
  | { kind: 'upgradePicked'; party: number; upgrade: string }
  | { kind: 'tierUp'; unit: number; tier: number; path: string | null }
  | { kind: 'pathOffer'; party: number; hero: number; options: string[] }
  | { kind: 'raid'; lair: number; size: number }
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
  | { kind: 'skill'; skill: string; caster: number; hits: number[]; point: Vec2 }
  | { kind: 'argue'; a: number; b: number }
  | { kind: 'revenge'; hero: number; target: number; victim: number }
  | { kind: 'avenged'; hero: number; target: number }
  | { kind: 'autosave' }
  | { kind: 'lairTierUp'; lair: number; tier: number }
  | { kind: 'lairDestroyed'; lair: number; type: string; by: number; bounty: number }
  | { kind: 'buildingDestroyed'; building: number; type: string }
  | { kind: 'bountyClaimed'; bounty: number; unit: number; gold: number }
  | { kind: 'won' }
  | { kind: 'lost' }
  | { kind: 'arrived'; unit: number; type: string; god: string | null }
  | { kind: 'fled'; unit: number }
  | { kind: 'revived'; unit: number }
  | { kind: 'shopped'; unit: number; spent: number; tax: number }
  | { kind: 'bountyPlaced'; bounty: number; gold: number };

export type Command =
  | { kind: 'build'; type: string; plot: number }
  | { kind: 'placeBounty'; pos: Vec2; gold: number }
  | { kind: 'pickUpgrade'; party: number; upgrade: string }
  | { kind: 'pickPath'; party: number; path: string }
  // Buy the next tier of a building.
  | { kind: 'upgrade'; building: number };

export type CommandResult = { ok: true; id: number } | { ok: false; reason: string };

export interface RunStats {
  monstersKilled: number;
  lairsDestroyed: number;
  heroesArrived: number;
  knockouts: number;
  buildingsLost: number;
  taxCollected: number;
}

// One hero's line on the end screen. `mvp` marks the best hero of the run (kills, five per
// lair destroyed, damage as tie-breaker); heroes come sorted best first.
export interface HeroReport {
  unit: number;
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
  outcome: 'won' | 'lost';
  timeMs: number;
  mvp: number | null;
  heroes: HeroReport[];
  // Lairs destroyed, in order: the lair id and type, when, and the hero that did it.
  lairsCleared: { lair: number; type: string; timeMs: number; by: number }[];
  // Town gold over the run, sampled every tuning.stats.goldSampleMs plus the final value.
  goldHistory: { timeMs: number; gold: number }[];
}

export interface Snapshot {
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
  // Pairs of living heroes who are rivals right now (lower id first).
  readonly rivals: readonly (readonly [number, number])[];
  // This run's map: the pantheons it leans on and the boss lair (null on a fixed map).
  readonly map: Readonly<{ lean: string[]; boss: number | null }>;
  // The end screen numbers once the run is won or lost; null while it is running. Totals for
  // the run are in `stats`.
  readonly report: Readonly<RunReport> | null;
  // Events since the previous snapshot() call (speech bubbles, sounds, juice).
  readonly events: readonly SimEvent[];
}
