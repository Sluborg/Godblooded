// The only module Scene imports from src/sim/. Changing it: write to Scene's inbox first.
export { createWorld, step, command, snapshot, TICK_MS } from './world';
export type { World } from './world';
export type {
  BountyState,
  BuildingDef,
  BuildingState,
  Command,
  CommandResult,
  GameData,
  SimEvent,
  Snapshot,
  Vec2,
} from './types';
