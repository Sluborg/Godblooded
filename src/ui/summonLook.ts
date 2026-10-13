import type { UnitState } from '../sim/api';

// "decoy" -> "Decoy", "stone-thrall" -> "Stone thrall": a summon is labelled by its definition id.
export function summonName(u: Pick<UnitState, 'kind' | 'type' | 'summon'>): string {
  const id = u.kind === 'summon' ? (u.summon?.def ?? u.type) : u.type;
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/[-_]+/g, ' ');
}
