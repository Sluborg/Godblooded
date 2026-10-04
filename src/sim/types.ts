// Plain data shapes shared by the sim and its API. No Phaser, no DOM.

export interface Vec2 {
  x: number;
  y: number;
}

// Content row shapes the sim reads. Lead owns the rows in src/data/ and imports these types.
export interface BuildingDef {
  id: string;
  cost: number;
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
}

// One of 3 cards offered when a party levels up. `effect` keys are read by Sim.
export interface UpgradeDef {
  id: string;
  name: string;
  text: string;
  effect: { attr?: Partial<Attributes>; healPct?: number; flee?: number };
}

export type TraitId = 'brave' | 'coward' | 'greedy' | 'proud' | 'loyal' | 'vengeful' | 'curious';

// Where a lair stands on the map.
export interface LairSite {
  lair: string;
  pos: Vec2;
}

export interface GameData {
  buildings: readonly BuildingDef[];
  // Building plots; a plot id is its index. Optional until Lead's rows land.
  plots?: readonly Vec2[];
  // Optional until src/data and Scene's stub carry rows; missing means no lairs.
  classes?: readonly ClassDef[];
  monsters?: readonly MonsterDef[];
  upgrades?: readonly UpgradeDef[];
  lairs?: readonly LairDef[];
  lairSites?: readonly LairSite[];
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
}

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
  tier: number;
  pos: Vec2;
  hp: number;
}

export interface UnitState {
  id: number;
  kind: 'hero' | 'monster';
  type: string;
  tier: number;
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
}

export interface BountyState {
  id: number;
  pos: Vec2;
  gold: number;
}

export type SimEvent =
  | { kind: 'built'; building: number; type: string }
  | { kind: 'spawned'; unit: number; type: string; lair: number }
  | { kind: 'hit'; attacker: number; target: number; damage: number; dodged: boolean }
  | { kind: 'knockout'; unit: number; by: number }
  | { kind: 'died'; unit: number; type: string; by: number; bounty: number; xp: number }
  | { kind: 'partyFormed'; party: number; members: number[] }
  | { kind: 'levelUp'; party: number; level: number; offer: string[] }
  | { kind: 'upgradePicked'; party: number; upgrade: string }
  | { kind: 'arrived'; unit: number; type: string }
  | { kind: 'fled'; unit: number }
  | { kind: 'revived'; unit: number }
  | { kind: 'shopped'; unit: number; spent: number; tax: number }
  | { kind: 'bountyPlaced'; bounty: number; gold: number };

export type Command =
  // `pos` is the legacy free-placement form, removed once Scene builds by plot.
  | { kind: 'build'; type: string; plot: number }
  | { kind: 'build'; type: string; pos: Vec2 }
  | { kind: 'placeBounty'; pos: Vec2; gold: number }
  | { kind: 'pickUpgrade'; party: number; upgrade: string };

export type CommandResult = { ok: true; id: number } | { ok: false; reason: string };

export interface Snapshot {
  readonly timeMs: number;
  readonly tick: number;
  readonly gold: number;
  readonly status: 'running' | 'won' | 'lost';
  readonly plots: readonly Readonly<PlotState>[];
  readonly buildings: readonly Readonly<BuildingState>[];
  readonly lairs: readonly Readonly<LairState>[];
  readonly units: readonly Readonly<UnitState>[];
  readonly parties: readonly Readonly<PartyState>[];
  readonly bounties: readonly Readonly<BountyState>[];
  // Events since the previous snapshot() call (speech bubbles, sounds, juice).
  readonly events: readonly SimEvent[];
}
