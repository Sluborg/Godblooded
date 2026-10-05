import type { TraitId, UnitMode } from '../sim/api';

// One colour per party so groups can be told apart on the map and in the panel. Eight colours
// that read on the green ground and next to each other (no green, no brown); a party's colour
// is fixed by its id, so it never changes while the party lives.
export const PARTY_COLORS = [
  0xe6b422, // gold
  0xd9534f, // red
  0x5bc0de, // cyan
  0xa569bd, // violet
  0xf0862a, // orange
  0xff8fb1, // pink
  0xffffff, // white
  0x3d6fe0, // royal blue
] as const;

export type PartyRole = 'leader' | 'member' | 'solo';

// A hero's place in its party: the leader is the first member; a party of one is solo and gets
// no party colour.
export function partyRole(
  unitId: number,
  partyId: number,
  parties: readonly { id: number; members: readonly number[] }[],
): PartyRole {
  if (partyId <= 0) return 'solo';
  const p = parties.find((x) => x.id === partyId);
  if (!p || p.members.length < 2) return 'solo';
  return p.members[0] === unitId ? 'leader' : 'member';
}

export function partyColor(party: number): number {
  return PARTY_COLORS[(Math.max(1, party) - 1) % PARTY_COLORS.length];
}

export function partyColorCss(party: number): string {
  return `#${partyColor(party).toString(16).padStart(6, '0')}`;
}

const MODE_LABELS: Record<UnitMode, string> = {
  wander: 'wandering',
  explore: 'hunting',
  return: 'heading home',
  rest: 'resting',
  shop: 'shopping',
  ko: 'knocked out',
};

export function modeLabel(mode: UnitMode): string {
  return MODE_LABELS[mode];
}

export function traitLabel(trait: TraitId | null): string {
  return trait ? trait[0].toUpperCase() + trait.slice(1) : 'No trait';
}

export function classLabel(type: string): string {
  return type[0].toUpperCase() + type.slice(1);
}
