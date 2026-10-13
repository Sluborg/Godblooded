import type { Snapshot, UnitMode } from '../sim/api';
import { heroLabel } from './partyLook';

// The hero roster: every hero grouped by party (parties by id, solo heroes last), one row each.
// Pure, so grouping and paging are unit tested; the HUD draws the rows.

export interface RosterRow {
  unit: number;
  label: string;
  tier: number;
  // 0 for a hero in no party.
  party: number;
  partyLevel: number;
  hp: number;
  maxHp: number;
  gold: number;
  mode: UnitMode;
  ko: boolean;
  // First row of its party (the HUD draws a party header above it).
  firstOfParty: boolean;
}

export function buildRoster(snap: Pick<Snapshot, 'units' | 'parties'>): RosterRow[] {
  const heroes = snap.units.filter((u) => u.kind === 'hero');
  const levelOf = new Map(snap.parties.map((p) => [p.id, p.level]));
  const order = (u: { party: number; id: number }) => [u.party > 0 ? u.party : Infinity, u.id];
  const sorted = [...heroes].sort((a, b) => {
    const [pa, ia] = order(a);
    const [pb, ib] = order(b);
    return pa === pb ? ia - ib : pa < pb ? -1 : 1;
  });
  return sorted.map((u, i) => ({
    unit: u.id,
    label: heroLabel(u),
    tier: u.tier,
    party: u.party,
    partyLevel: levelOf.get(u.party) ?? 1,
    hp: Math.max(0, Math.ceil(u.hp)),
    maxHp: u.maxHp,
    gold: u.gold,
    mode: u.mode,
    ko: u.ko,
    firstOfParty: i === 0 || sorted[i - 1].party !== u.party,
  }));
}

export interface Page<T> {
  rows: T[];
  page: number;
  pages: number;
}

// One page of rows; the page number is clamped so a shrinking roster never shows an empty page.
export function paginate<T>(rows: readonly T[], page: number, perPage: number): Page<T> {
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const p = Math.min(Math.max(0, page), pages - 1);
  return { rows: rows.slice(p * perPage, (p + 1) * perPage), page: p, pages };
}
