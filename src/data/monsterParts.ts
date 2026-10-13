import type { WyrmLook } from '../ui/parts/wyrm';

// Monsters drawn from code parts (the part-based look, `docs/decisions.md` 2026-10-14). Look rows
// only; the drawing is in src/ui/parts. Owner: Scene (look rows, like heroParts.ts). A missing
// row means the monster keeps its picture, then its placeholder.
//
// Fafnir ("wyrm"): the tier shows in the eyes and the ring: amber at tier 1, red-orange at tier 2,
// white-hot at tier 3.
const WYRM_BASE = {
  body: '#30614d',
  belly: '#a39566',
  ridge: '#7a3224',
  horn: '#dcd2b0',
};

export const TIER_COLORS: Record<number, string> = {
  1: '#ffc233',
  2: '#ff6a2a',
  3: '#ffffff',
};

export interface MonsterPartsLook {
  id: string;
  kind: 'wyrm';
  look: WyrmLook;
  // The colour of the boss ring: the tier colour.
  ring: number;
}

export function monsterPartsLook(type: string, tier: number): MonsterPartsLook | null {
  if (type !== 'wyrm') return null;
  const t = Math.min(3, Math.max(1, Math.round(tier)));
  const eye = TIER_COLORS[t];
  return {
    id: `mon-wyrm_t${t}`,
    kind: 'wyrm',
    look: { ...WYRM_BASE, eye },
    ring: parseInt(eye.slice(1), 16),
  };
}
