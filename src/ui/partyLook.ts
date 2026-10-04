import type { TraitId, UnitMode } from '../sim/api';

// One colour per party so groups can be told apart on the map and in the panel.
const PARTY_COLORS = [
  0xe6b422, 0xd9534f, 0x5bc0de, 0xa569bd, 0xf0ad4e, 0x5cb85c, 0xff8fb1, 0xb0b8c0,
];

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
