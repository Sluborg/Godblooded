import {
  advanceTick,
  command,
  createWorld,
  snapshot,
  startClock,
  type World,
  type WorldOptions,
} from './world';
import { replayPlay } from './meta';
import type { Command, GameData, PlayInputs, SimEvent } from './types';

// Replay code: the seed and every command that took effect, with its tick, as base64 of compact
// JSON. A run is a pure function of the seed, the data and the commands, so `runReplay` plays it
// back and gets the same run. Paste the code on the end screen to a developer, or to
// `npm run replay -- <code>`.

const VERSION = 1;

// Command kinds by position, to keep the code short; a kind not listed is written out.
const KINDS = [
  'build',
  'placeBounty',
  'cancelBounty',
  'raiseBounty',
  'pickUpgrade',
  'pickPath',
  'upgrade',
  'hireGatherer',
  'sendGatherer',
  'recallGatherers',
  'sendGuard',
  'placeEscort',
  'upgradeWithAmbrosia',
  'offering',
  'recallFallen',
  'rebuildRuin',
  'clearRuin',
];

export interface ReplayCode {
  v: number;
  seed: number;
  // A short hash of the game data the run used: a replay on other data may play out differently.
  hash: string;
  // The tick the run had reached when the code was made.
  end: number;
  // The createWorld options the run started with (a first run, a boss to avoid).
  opts: WorldOptions;
  // How the data was shaped for the run (Altar ranks, Trials, unlock filter): null for plain data.
  play: PlayInputs | null;
  log: { tick: number; cmd: Command }[];
}

// FNV-1a over the data's JSON text.
export function replayHash(data: GameData): string {
  const text = JSON.stringify(data);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

const b64 = (s: string): string =>
  typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
const unb64 = (s: string): string =>
  typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');

export function encodeReplay(world: World): string {
  let last = 0;
  const log = world.commandLog.map(({ tick, cmd }) => {
    const { kind, ...args } = cmd;
    const k = KINDS.indexOf(kind);
    const row = [tick - last, k >= 0 ? k : kind, args];
    last = tick;
    return row;
  });
  const body = JSON.stringify([
    VERSION,
    world.seed,
    replayHash(world.data),
    world.tick,
    log,
    world.options,
    world.play,
  ]);
  // btoa wants Latin-1: escape anything beyond it.
  return b64(unescape(encodeURIComponent(body)));
}

export function decodeReplay(code: string): ReplayCode {
  let raw: unknown;
  try {
    raw = JSON.parse(decodeURIComponent(escape(unb64(code.trim()))));
  } catch {
    throw new Error('not a replay code');
  }
  if (!Array.isArray(raw) || raw[0] !== VERSION || !Array.isArray(raw[4])) {
    throw new Error('not a replay code (or from another version)');
  }
  const [, seed, hash, end, rows, opts, play] = raw as [
    number,
    number,
    string,
    number,
    unknown[][],
    WorldOptions | undefined,
    PlayInputs | null | undefined,
  ];
  let tick = 0;
  const log = rows.map((row) => {
    tick += Number(row[0]);
    const kind = typeof row[1] === 'number' ? KINDS[row[1]] : String(row[1]);
    return { tick, cmd: { kind, ...(row[2] as object) } as Command };
  });
  return { v: VERSION, seed, hash, end, opts: opts ?? {}, play: play ?? null, log };
}

// Plays a replay code back on the given data. `onTick` sees each tick's events (as a snapshot
// would drain them), for tools that print key moments. Stops at the tick the code was made at.
export function runReplay(
  code: string | ReplayCode,
  data: GameData,
  onTick?: (world: World, events: SimEvent[]) => void,
): { world: World; code: ReplayCode; dataMatches: boolean } {
  const rc = typeof code === 'string' ? decodeReplay(code) : code;
  // A run played with Altar ranks or Trials is replayed on the base data shaped the same way.
  const played = rc.play && !data.play ? replayPlay(data, rc.play) : data;
  const world = createWorld(rc.seed, played, rc.opts);
  let next = 0;
  // Not stopped by the run ending: a step() that ends the run goes on to the end of its frame.
  while (world.tick < rc.end) {
    while (next < rc.log.length && rc.log[next].tick <= world.tick) {
      command(world, rc.log[next].cmd);
      next++;
    }
    startClock(world);
    advanceTick(world);
    if (onTick) onTick(world, snapshot(world).events as SimEvent[]);
  }
  return { world, code: rc, dataMatches: rc.hash === replayHash(played) };
}
