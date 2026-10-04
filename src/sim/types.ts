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

// Where a lair stands on the map.
export interface LairSite {
  lair: string;
  pos: Vec2;
}

export interface GameData {
  buildings: readonly BuildingDef[];
  monsters: readonly MonsterDef[];
  lairs: readonly LairDef[];
  lairSites: readonly LairSite[];
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
  hp: number;
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
  kind: 'monster';
  type: string;
  tier: number;
  pos: Vec2;
  // Unit vector of the last move; Scene picks front/back view and mirrors from it.
  facing: Vec2;
  hp: number;
  maxHp: number;
}

export interface BountyState {
  id: number;
  pos: Vec2;
  gold: number;
}

export type SimEvent =
  | { kind: 'built'; building: number; type: string }
  | { kind: 'spawned'; unit: number; type: string; lair: number }
  | { kind: 'bountyPlaced'; bounty: number; gold: number };

export type Command =
  { kind: 'build'; type: string; pos: Vec2 } | { kind: 'placeBounty'; pos: Vec2; gold: number };

export type CommandResult = { ok: true; id: number } | { ok: false; reason: string };

export interface Snapshot {
  readonly timeMs: number;
  readonly tick: number;
  readonly gold: number;
  readonly status: 'running' | 'won' | 'lost';
  readonly buildings: readonly Readonly<BuildingState>[];
  readonly lairs: readonly Readonly<LairState>[];
  readonly units: readonly Readonly<UnitState>[];
  readonly bounties: readonly Readonly<BountyState>[];
  // Events since the previous snapshot() call (speech bubbles, sounds, juice).
  readonly events: readonly SimEvent[];
}
