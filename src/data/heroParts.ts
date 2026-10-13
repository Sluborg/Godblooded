// How a hero looks when drawn from parts (Scene's part-based renderer, src/ui/parts/). Each row
// is data: colours, head, gear. The tier 1 row of a god has the god's id (`thor`); a path row has
// the path's id (`thor-hammerborn`) and only lists what it changes: the hero keeps the face, the
// hair, the palette and the silhouette and ADDS gear (a helm, a shield, plate, a crackling weapon,
// another raven). Tier 3 is the tier 2 look with `t3` added on top.
//
// Owner: Scene (look rows only, approved by Lead). Drawing code: src/ui/parts/heroDraw.ts.

export type WeaponKind =
  | 'hammer'
  | 'lstaff'
  | 'staff'
  | 'eyestaff'
  | 'froststaff'
  | 'spear'
  | 'dagger'
  | 'wand'
  | 'fire'
  | 'axe'
  | 'club';
export type HeadKind =
  | 'hair'
  | 'braids'
  | 'helm'
  | 'winghelm'
  | 'widehat'
  | 'tallhat'
  | 'hood'
  | 'hornhood'
  | 'frosthood';
// How the swing is drawn: swing (overhead), stab (two quick thrusts), thrust, cast (raised arm).
export type AttackStyle = 'swing' | 'stab' | 'thrust' | 'cast';

export interface HeroPartsRow {
  skin: string;
  body: string;
  trim: string;
  boots: string;
  head: HeadKind;
  hairCol?: string;
  hoodCol?: string;
  hatCol?: string;
  beard?: 'big' | 'long';
  beardCol?: string;
  patch?: boolean; // eye patch
  robe?: boolean;
  plate?: boolean;
  cape?: string;
  feathers?: boolean; // feathered cloak
  weapon: WeaponKind;
  off?: WeaponKind | 'shield';
  shield?: [string, string];
  blade?: string; // dagger blade colour
  fx?: 'spark' | 'storm' | 'raven' | 'greenflame' | 'fire' | 'gold';
  ravens?: number;
  style: AttackStyle;
  // Proportions (prototype units; defaults suit a standard hero).
  bw?: number;
  bh?: number;
  hx?: number;
  hy?: number;
  hr?: number;
  scale?: number;
}

export type PartsOverride = Partial<HeroPartsRow>;

// Tier 1: one row per god (the four Aesir gods so far; the others fall back to the pictures).
export const GOD_PARTS: Readonly<Record<string, HeroPartsRow>> = {
  thor: {
    skin: '#eab48c',
    body: '#8a5434',
    trim: '#d9a441',
    boots: '#4a3222',
    head: 'hair',
    hairCol: '#cf5a2c',
    beard: 'big',
    beardCol: '#cf5a2c',
    cape: '#a8392c',
    weapon: 'hammer',
    fx: 'spark',
    style: 'swing',
  },
  odin: {
    skin: '#e2b08e',
    body: '#41507a',
    robe: true,
    trim: '#c8b27a',
    boots: '#3a3030',
    head: 'widehat',
    hatCol: '#5a6474',
    hairCol: '#c9c9c0',
    beard: 'long',
    beardCol: '#dcdad0',
    patch: true,
    weapon: 'staff',
    fx: 'raven',
    style: 'cast',
  },
  loki: {
    skin: '#e6b591',
    body: '#33402c',
    trim: '#8fbf4a',
    boots: '#2c2a22',
    head: 'hood',
    hoodCol: '#4f8a3a',
    weapon: 'dagger',
    off: 'dagger',
    fx: 'greenflame',
    style: 'stab',
  },
  freyja: {
    skin: '#f0c29c',
    body: '#9d4f6a',
    trim: '#e9c46a',
    boots: '#5a3a2a',
    head: 'braids',
    hairCol: '#e8c65a',
    cape: '#f1e8d4',
    feathers: true,
    weapon: 'wand',
    fx: 'gold',
    style: 'cast',
  },
};

// Tier 2: what each path changes on its god's row, keyed by the path id.
export const PATH_PARTS: Readonly<Record<string, PartsOverride>> = {
  'thor-hammerborn': {
    head: 'helm',
    body: '#9aa3ab',
    plate: true,
    off: 'shield',
    shield: ['#b03a2e', '#efe3c8'],
  },
  'thor-stormcaller': {
    weapon: 'lstaff',
    cape: '#35588f',
    body: '#4e5f86',
    fx: 'storm',
    style: 'cast',
  },
  'odin-seer': { head: 'tallhat', weapon: 'eyestaff', ravens: 2 },
  'odin-wanderer': {
    weapon: 'spear',
    robe: false,
    body: '#5c6070',
    cape: '#76705c',
    style: 'thrust',
  },
  'loki-trickster': { head: 'hornhood', hoodCol: '#6a3f8a', trim: '#b78be0', blade: '#d7c8ff' },
  'loki-flamebinder': {
    weapon: 'fire',
    off: 'fire',
    hoodCol: '#3f6b2e',
    trim: '#ff9a3c',
    fx: 'fire',
    style: 'cast',
  },
  'freyja-valkyrie': {
    head: 'winghelm',
    weapon: 'spear',
    off: 'shield',
    shield: ['#3d6fa8', '#efe3c8'],
    body: '#8f9aa6',
    plate: true,
    style: 'thrust',
  },
  'freyja-seidkona': {
    head: 'frosthood',
    hoodCol: '#9cc6e0',
    weapon: 'froststaff',
    cape: '#dfeef7',
    body: '#4f6f96',
    style: 'cast',
  },
};

// Tier 3 looks like tier 2, only more so: richer trim and a faint glow.
export const TIER3_PARTS: PartsOverride = { trim: '#f2c14e', scale: 1.08 };

// The parts row for a hero, or undefined when the data has none (the picture is used then).
// `path` is the path id taken at tier 2, `tier` the hero's tier.
export function heroPartsRow(
  god: string | null,
  path: string | null,
  tier: number,
): HeroPartsRow | undefined {
  if (!god) return undefined;
  const base = GOD_PARTS[god];
  if (!base) return undefined;
  const over = path ? PATH_PARTS[path] : undefined;
  if (tier >= 2 && path && !over) return undefined;
  const row: HeroPartsRow = { ...base, ...(tier >= 2 ? over : undefined) };
  return tier >= 3 ? { ...row, ...TIER3_PARTS } : row;
}

// A stable id for the baked pictures of a hero look (one set per distinct look).
export function heroPartsId(god: string, path: string | null, tier: number): string {
  return `${path ?? god}_t${Math.min(3, Math.max(1, tier))}`;
}
