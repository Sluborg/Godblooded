// Plain data shapes shared by the sim and its API. No Phaser, no DOM.

export interface Vec2 {
  x: number;
  y: number;
}

// Content rows the sim reads. Lead owns the rows in src/data/; the shape lives here until
// Lead's first rows land (backlog Lead 30), then data files import these types.
export interface BuildingDef {
  id: string;
  cost: number;
}

export interface GameData {
  buildings: readonly BuildingDef[];
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

export interface BountyState {
  id: number;
  pos: Vec2;
  gold: number;
}

export type SimEvent =
  | { kind: 'built'; building: number; type: string }
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
  readonly bounties: readonly Readonly<BountyState>[];
  // Events since the previous snapshot() call (speech bubbles, sounds, juice).
  readonly events: readonly SimEvent[];
}
