// The only module Scene imports from src/sim/. Changing it: write to Scene's inbox first.
export { createWorld, step, command, snapshot, TICK_MS } from './world';
export type { World } from './world';
export type {
  BountyState,
  BuildingDef,
  Attributes,
  BuildingState,
  Command,
  CommandResult,
  GameData,
  LairDef,
  LairSite,
  LairState,
  MonsterDef,
  SimEvent,
  Snapshot,
  UnitState,
  Vec2,
} from './types';
