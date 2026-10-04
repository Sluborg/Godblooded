import type { SimEvent } from '../sim/api';

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
