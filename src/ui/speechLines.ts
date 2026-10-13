import type { SimEvent } from '../sim/api';
import type { BarkPriority } from './speechLimit';

// Short hero lines per sim event. Scene-side text, so tuning a line never touches the sim.
// Traits (coward, greedy, ...) will pick their own lines once the sim reports them.
const LINES = {
  arrived: ['Reporting in!', 'Where is the fight?', 'Fresh blood!'],
  fled: ['Run!', 'Not today!', 'Fall back!'],
  revived: ['I live again.', 'Back on my feet!', 'Gods, my head...'],
  shopped: ['Worth every coin.', 'Nice kit!', 'Gold well spent.'],
  knockout: ['Ugh...', "I'm down!", 'Cover me!'],
  died: ['Avenge me...', 'Tell them I fought...', 'Not like this...'],
} as const satisfies Record<string, readonly string[]>;

export type SpeechKind = keyof typeof LINES;

export function isSpeechEvent(e: SimEvent): e is Extract<SimEvent, { kind: SpeechKind }> {
  return Object.hasOwn(LINES, e.kind);
}

// Deterministic pick so a replay shows the same words: unit id plus how often it spoke.
export function pickLine(kind: SpeechKind, unitId: number, spoken: number): string {
  const lines: readonly string[] = LINES[kind];
  return lines[(unitId + spoken) % lines.length];
}

// Priority and chance per situation (docs/systems/barks.md section 1): big moments always speak,
// small ones only sometimes.
export const BARK_META: Record<SpeechKind, { priority: BarkPriority; chance: number }> = {
  arrived: { priority: 'high', chance: 1 },
  fled: { priority: 'high', chance: 1 },
  knockout: { priority: 'high', chance: 1 },
  died: { priority: 'high', chance: 1 },
  revived: { priority: 'mid', chance: 0.6 },
  shopped: { priority: 'low', chance: 0.25 },
};

// A deterministic roll in [0, 1) from the unit and how often it rolled, so a replay with the
// same views rolls the same (never the sim RNG).
export function barkRoll(unitId: number, tries: number): number {
  let h = Math.imul(unitId + 1, 0x9e3779b1) ^ Math.imul(tries + 1, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
