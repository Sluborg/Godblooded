import { metaRules, type GameData, type MetaState, type SagaEntry } from '../sim/api';
import { conditionText } from './altarLook';
import { godName, pathName } from './partyLook';

// The Hall's Saga and Unlocks tabs (docs/systems/meta-ui.md section 4) as plain rows.

export interface HallRow {
  title: string;
  sub: string;
  // Right-hand note ("won", "3 kills").
  note: string;
  dim: boolean;
}

// "Thor-born Hammerborn" for a hero of the Saga.
export function sagaTitle(e: SagaEntry): string {
  const base = e.name ?? (e.god ? `${godName(e.god)}-born` : 'Godborn');
  return e.path ? `${base} ${pathName(e.path)}` : base;
}

const ENDING: Record<SagaEntry['ending'], string> = {
  won: 'Won the run',
  lost: 'The town fell',
  abandoned: 'Left the run',
};

// Newest first, at most the rules' sagaMax.
export function sagaRows(data: GameData, meta: MetaState): HallRow[] {
  const max = metaRules(data).sagaMax;
  return [...meta.saga]
    .reverse()
    .slice(0, max)
    .map((e) => ({
      title: sagaTitle(e),
      sub: `${ENDING[e.ending]}${e.slain ? ', fell in battle' : ''}  (run ${e.runs})`,
      note: `${e.kills} kills`,
      dim: false,
    }));
}

// Every goal: owned ones first, then the rest greyed with their goal and progress.
export function unlockRows(data: GameData, meta: MetaState): HallRow[] {
  const rows = metaRules(data).unlocks.map((u) => {
    const owned = meta.unlocks.includes(u.id);
    const c = u.condition;
    const progress =
      c.kind === 'winOrRuns' ? ` (${Math.min(meta.runs, c.runs)} of ${c.runs} runs)` : '';
    return {
      owned,
      row: {
        title: u.name,
        sub: owned ? u.text : `${conditionText(c)}${progress}`,
        note: owned ? 'Unlocked' : 'Locked',
        dim: !owned,
      } as HallRow,
    };
  });
  return [...rows.filter((r) => r.owned), ...rows.filter((r) => !r.owned)].map((r) => r.row);
}
