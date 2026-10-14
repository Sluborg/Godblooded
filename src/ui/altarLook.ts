import {
  altarCost,
  altarRank,
  metaRules,
  pantheonsOf,
  type AltarDef,
  type GameData,
  type MetaState,
  type UnlockCondition,
} from '../sim/api';

// What the Altar screen shows (docs/systems/meta-ui.md section 3), as plain rows over the meta
// save: pure, so it is tested without Phaser. The sim decides every rule (buyRank, refundAltar).

export type RowState = 'buy' | 'poor' | 'full' | 'locked';

export interface AltarRow {
  // The Altar id and, for a per-pantheon row, its pantheon.
  id: string;
  pantheon?: string;
  name: string;
  text: string;
  rank: number;
  ranks: number;
  // Essence the next rank costs (null when full or locked).
  cost: number | null;
  state: RowState;
  // Essence still missing for a poor row; the unlock goal for a locked one.
  need: number;
  goal: string;
}

export const PANTHEON_NAME: Readonly<Record<string, string>> = {
  aesir: 'Aesir',
  greek: 'Greek',
  egyptian: 'Egyptian',
};
export const pantheonName = (p: string): string =>
  PANTHEON_NAME[p] ?? p.replace(/^./, (c) => c.toUpperCase());

// The portent line of a pantheon (meta-ui.md section 5).
export const PORTENT: Readonly<Record<string, string>> = {
  aesir: 'The north stirs',
  greek: 'The sea grows restless',
  egyptian: 'The sands whisper',
};

// A goal in words for a locked row ("Win a run").
export function conditionText(c: UnlockCondition): string {
  switch (c.kind) {
    case 'finishRun':
      return 'Finish a run';
    case 'win':
      return 'Win a run';
    case 'heroTier':
      return `Raise a hero to tier ${c.tier}`;
    case 'winOrRuns':
      return `Win once or play ${c.runs} runs`;
    case 'peakLevel':
      return `Reach level ${c.level}${c.pantheon ? ` with the ${pantheonName(c.pantheon)} gods` : ''}`;
    case 'winWithPantheon':
      return `Win with the ${pantheonName(c.pantheon)} gods`;
    case 'gearLevel':
      return `Get gear to level ${c.level}`;
    case 'partyLevel':
      return `Get a party to level ${c.level}`;
    case 'winAllTemples':
      return 'Win with every temple built';
  }
}

const allPantheons = (data: GameData): string[] => [
  ...new Set((data.gods ?? []).map((g) => g.pantheon)),
];

// The goal that opens a pantheon, in words ('' when none is known).
export function pantheonGoal(data: GameData, p: string): string {
  const u = metaRules(data).unlocks.find((x) => x.locks?.pantheons?.includes(p));
  return u ? conditionText(u.condition) : '';
}

function rowFor(data: GameData, meta: MetaState, def: AltarDef, pantheon?: string): AltarRow {
  const open = !pantheon || pantheonsOf(data, meta).includes(pantheon);
  const rank = altarRank(meta, def, pantheon);
  const cost = open ? altarCost(meta, def, pantheon) : null;
  let state: RowState = 'buy';
  if (!open) state = 'locked';
  else if (cost === null) state = 'full';
  else if (meta.essence < cost) state = 'poor';
  return {
    id: def.id,
    pantheon,
    name: pantheon ? `${def.name}: ${pantheonName(pantheon)}` : def.name,
    text: def.text,
    rank,
    ranks: def.ranks.length,
    cost,
    state,
    need: state === 'poor' && cost !== null ? cost - meta.essence : 0,
    goal: state === 'locked' && pantheon ? pantheonGoal(data, pantheon) : '',
  };
}

// Every row in meta.md order; a per-pantheon upgrade has one row per pantheon.
export function altarRows(data: GameData, meta: MetaState): AltarRow[] {
  const out: AltarRow[] = [];
  for (const def of metaRules(data).altar) {
    if (def.perPantheon) for (const p of allPantheons(data)) out.push(rowFor(data, meta, def, p));
    else out.push(rowFor(data, meta, def));
  }
  return out;
}

// True when any row can be bought now (the Altar button pulses).
export const canAfford = (data: GameData, meta: MetaState): boolean =>
  altarRows(data, meta).some((r) => r.state === 'buy');

// A hold-to-buy button: how far its ring has filled after `elapsedMs`.
export const holdFraction = (elapsedMs: number, holdMs: number): number =>
  Math.max(0, Math.min(1, elapsedMs / holdMs));

export const BUY_HOLD_MS = 600;
export const REFUND_HOLD_MS = 1200;

// "Need 40 more Essence" for a poor row.
export const needLine = (need: number): string => `Need ${need} more Essence`;
