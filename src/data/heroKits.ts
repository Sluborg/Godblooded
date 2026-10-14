// A hero's painted look is a COMBO of kit parts (Stefan 2026-10-14: a few interchangeable heads,
// torsos, limbs, cloaks, weapons and off-hands, mixed per hero and animated by the parts rig). The
// part pictures live in the kit sheets of public/assets/manifest.json (rows `kit_*` with a `cells`
// object); this file says which parts a hero wears. A part id that has no picture falls back to the
// code shapes (the whole look, if a body part is missing). Owner: Scene (look rows, Lead approves).

// The slots of a kit hero. The limb parts are drawn on both sides (the far side a little darker).
export const KIT_SLOTS = [
  'cloak',
  'torso',
  'head',
  'headgear',
  'upperarm',
  'forearm',
  'thigh',
  'shin',
  'weapon',
  'offhand',
] as const;
export type KitSlot = (typeof KIT_SLOTS)[number];

// Parts a painted look cannot do without; any other slot may be empty.
export const KIT_REQUIRED: readonly KitSlot[] = [
  'torso',
  'head',
  'upperarm',
  'forearm',
  'thigh',
  'shin',
];

// Body builds are scale factors on the same art: width and height of the torso, length and width of
// the arms and legs, and the head. Sockets stay where the torso's pivots put them (scaled with it).
export interface Build {
  torso: readonly [number, number];
  arm: readonly [number, number];
  leg: readonly [number, number];
  head: number;
}
export const BUILDS = {
  standard: { torso: [1, 1], arm: [1, 1], leg: [1, 1], head: 1 },
  lean: { torso: [0.88, 1.02], arm: [1.05, 0.9], leg: [1.04, 0.9], head: 1 },
  broad: { torso: [1.2, 0.98], arm: [0.98, 1.2], leg: [0.96, 1.15], head: 1.03 },
  tall: { torso: [0.98, 1.08], arm: [1.1, 1], leg: [1.1, 1], head: 0.98 },
  short: { torso: [1.04, 0.92], arm: [0.92, 1.05], leg: [0.9, 1.05], head: 1.04 },
} as const satisfies Record<string, Build>;
export type BuildName = keyof typeof BUILDS;

export interface KitCombo {
  build?: BuildName;
  // Part id per slot, from the kit sheets (`head_hooded`, `weapon_staff`, ...).
  parts: Partial<Record<KitSlot, string>>;
  // Worn item layers over a base part, per slot: a layer has the same pivots as the part it covers
  // (`layer_torso_leather`). Missing: the base part shows.
  layers?: Partial<Record<KitSlot, string>>;
}

// Looks by parts-look id (`odin_t1`, `thor-hammerborn_t2`). The first is the Grim test kit.
export const HERO_KITS: Readonly<Record<string, KitCombo>> = {
  odin_t1: {
    build: 'standard',
    parts: {
      cloak: 'cloak_grim',
      torso: 'torso_grim',
      head: 'head_grim',
      headgear: 'headgear_grim_hood',
      upperarm: 'upperarm_grim',
      forearm: 'forearm_grim',
      thigh: 'thigh_grim',
      shin: 'shin_grim',
      weapon: 'weapon_staff',
    },
  },
};

// The combo of a look: its own row, a tier 3 look's tier 2 row, then the god's tier 1 row (a path
// keeps the god's face and body, the path adds gear and effects).
export function kitFor(lookId: string): KitCombo | undefined {
  const tries = [lookId];
  if (lookId.endsWith('_t3')) tries.push(`${lookId.slice(0, -3)}_t2`);
  const god = lookId.split(/[-_]/)[0];
  tries.push(`${god}_t1`);
  for (const id of tries) if (HERO_KITS[id]) return HERO_KITS[id];
  return undefined;
}
