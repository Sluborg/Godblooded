import { GRAYBOX } from '../data/graybox';
import type { GodDef, PathDef } from '../sim/types';
import { getSettings, type PaletteId } from './settings';
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

// Colour-blind safe alternative (Okabe-Ito based, with lightness steps between neighbours).
export const PARTY_COLORS_CB = [
  0xe69f00, // orange
  0x56b4e9, // sky blue
  0xf0e442, // yellow
  0xcc79a7, // reddish purple
  0xffffff, // white
  0x0072b2, // blue
  0xd55e00, // vermillion
  0x9a9a9a, // grey
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

export function partyColor(party: number, palette: PaletteId = getSettings().palette): number {
  const colors = palette === 'colourblind' ? PARTY_COLORS_CB : PARTY_COLORS;
  return colors[(Math.max(1, party) - 1) % colors.length];
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

function capital(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function godName(god: string, gods: readonly GodDef[] = GRAYBOX.gods ?? []): string {
  return gods.find((g) => g.id === god)?.name ?? capital(god);
}

export function pathName(path: string, paths: readonly PathDef[] = GRAYBOX.paths ?? []): string {
  return paths.find((p) => p.id === path)?.name ?? capital(path.slice(path.indexOf('-') + 1));
}

// The one place a hero's name on screen comes from: "<God>-born" at tier 1 (and for a hero with
// no path yet), the path's name from tier 2 ("Hammerborn"). No class words.
export function heroLabel(
  u: { god: string | null; path: string | null; tier: number },
  gods?: readonly GodDef[],
  paths?: readonly PathDef[],
): string {
  if (u.path && u.tier > 1) return pathName(u.path, paths);
  return u.god ? `${godName(u.god, gods)}-born` : 'Godborn';
}
