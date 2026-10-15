import { MON_DEFS } from './heroParts.gen';
import type { PartsDef, PartsLook } from './heroParts';

// Monsters on the same compact parts rig as the heroes (small body, floating hands and feet moved
// in code; the pieces may be painted, data/heroKits.ts). A monster type has a parts look when
//   - the style prototype has a row for it (MON_DEFS, ported to heroParts.gen.ts), and
//   - it is switched on here (MONSTER_RIG) or by `?monsterrig=draugr,troll` in the URL (for
//     trying a row before it ships).
// Anything else keeps today's picture or shape: the game never breaks for lack of a row.
const DEFS = MON_DEFS as unknown as Record<string, PartsDef>;

// Monster types drawn from the rig. Empty until a rig look is approved for a type.
export const MONSTER_RIG: ReadonlySet<string> = new Set<string>([]);

// The URL does not change during a run: read it once.
const ASKED: ReadonlySet<string> = (() => {
  if (typeof location === 'undefined') return new Set<string>();
  const raw = new URLSearchParams(location.search).get('monsterrig');
  return new Set(raw ? raw.split(',').map((s) => s.trim()) : []);
})();

// The monster types that have a prototype row (for the review page and tests).
export function monsterPartsTypes(): string[] {
  return Object.keys(DEFS);
}

// The parts look of a monster type and tier, or undefined (the picture or shape is used then).
// One baked set per type and tier: tier 2 and 3 grow in size and effects like a hero's tier.
export function monsterPartsLook(type: string, tier: number): PartsLook | undefined {
  const def = DEFS[type];
  if (!def) return undefined;
  if (!MONSTER_RIG.has(type) && !ASKED.has(type)) return undefined;
  const t = Math.min(3, Math.max(1, Math.round(tier)));
  return { id: `mon_${type}_t${t}`, def: { ...def, kit: `mon_${type}` } };
}
