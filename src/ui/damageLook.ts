// How a damage number looks (docs/systems/combat.md, "What the player sees"): the damage type's
// colour, bigger with "!" on a crit, the word "miss" on a dodge, a small "weak" tag on a hit the
// target's type row made x1.5 or more, and a grey number on a resisted one. Pure, so it is tested.

export interface HitInfo {
  // Damage type of the strike ('physical', 'fire', ...; 'magic' for an untyped spell).
  type: string;
  crit?: boolean;
<<<<<<< HEAD
  // A burn tick rather than a strike: a small number, no impact.
  tick?: boolean;
=======
>>>>>>> origin/main
  weak?: boolean;
  resist?: boolean;
}

export const TYPE_COLORS: Record<string, string> = {
  physical: '#ffd9d9',
  magic: '#c9b8ff',
  fire: '#ff9a4d',
  frost: '#9fe0ff',
  lightning: '#fff06a',
  death: '#b98cff',
  holy: '#fff6c2',
};

export const RESIST_COLOR = '#9a9a9a';
export const MISS_COLOR = '#d8d8d8';

// Bolt and spark tint of a type as 0xRRGGBB, or null for plain (physical) damage.
export function typeTint(type: string | undefined): number | null {
  if (!type || type === 'physical') return null;
  const c = TYPE_COLORS[type];
  return c ? parseInt(c.slice(1), 16) : null;
}

export interface FloatLook {
  text: string;
  color: string;
  fontSize: number;
  // A small second line ("weak"), or null.
  tag: string | null;
}

// The number to float over a target, or null when nothing should show (a zero-damage hit).
export function damageLook(damage: number, dodged: boolean, info?: HitInfo): FloatLook | null {
  if (dodged) return { text: 'miss', color: MISS_COLOR, fontSize: 22, tag: null };
  if (damage <= 0) return null;
<<<<<<< HEAD
  if (info?.tick) {
    const col = TYPE_COLORS[info.type] ?? TYPE_COLORS.physical;
    return { text: `${damage}`, color: col, fontSize: 18, tag: null };
  }
=======
>>>>>>> origin/main
  const crit = info?.crit === true;
  const color = info?.resist
    ? RESIST_COLOR
    : (TYPE_COLORS[info?.type ?? 'physical'] ?? TYPE_COLORS.physical);
  return {
    text: crit ? `${damage}!` : `${damage}`,
    color,
    fontSize: crit ? 38 : 26,
    tag: info?.weak ? 'weak' : null,
  };
}

// At most this many floating numbers at once; the oldest goes first (no number soup on a phone).
export const MAX_FLOATS = 6;
