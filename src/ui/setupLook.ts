import { metaRules, pantheonsOf, trialsOpen, type GameData, type MetaState } from '../sim/api';
import { PORTENT, pantheonName } from './altarLook';

// The run setup (docs/systems/meta-ui.md section 5) as plain data over the meta save.

// The pantheon the next run leans on: the one chosen at the Altar if it is open, else the first open.
export function chosenLean(data: GameData, meta: MetaState): string {
  const open = pantheonsOf(data, meta);
  return meta.lean && open.includes(meta.lean) ? meta.lean : (open[0] ?? '');
}

export const portentLine = (lean: string): string => PORTENT[lean] ?? pantheonName(lean);

export interface TrialRow {
  id: string;
  name: string;
  text: string;
  // Won with this Trial on before.
  won: boolean;
}

// The Trials to offer: none before they are unlocked (the first win).
export function trialRows(data: GameData, meta: MetaState): TrialRow[] {
  if (!trialsOpen(data, meta)) return [];
  return metaRules(data).trials.map((t) => ({
    id: t.id,
    name: t.name,
    text: t.text,
    won: meta.trialsWon.includes(t.id),
  }));
}

// The Essence a won run pays extra for the chosen Trials.
export const trialBonus = (data: GameData, count: number): number =>
  count * metaRules(data).essence.perTrial;

// Toggles a Trial id in a list (new array).
export const toggled = (list: readonly string[], id: string): string[] =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
