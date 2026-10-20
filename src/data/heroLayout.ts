// A hero's layout as Stefan set it in the Hero Builder (collection "layouts", 2026-10-20): where each
// part sits, how big it is, and the walk. Game units (16 source px of art per unit at natural size),
// origin = the ground under the body, y down; the weapon is relative to the back hand, `s` is the
// part's scale against its natural unit size, `r` degrees clockwise. The rig reads it
// (ui/parts/builderLayout.ts); only used behind the test switch `?heroes=thorbloods`.
export interface PlacedPart {
  x: number;
  y: number;
  s?: number;
  r?: number;
  w?: number;
  h?: number;
}
export interface HeroLayout {
  head: PlacedPart & { id: string };
  body: PlacedPart & { kind: string };
  cape: PlacedPart & { tint: string };
  // The collar is a fabric piece tinted with the party colour like the cape (`cape.tint`).
  collar?: PlacedPart & { kind: string };
  // Hands: positions only (sizes are the rig constants below).
  handF: Pick<PlacedPart, 'x' | 'y'>;
  handB: Pick<PlacedPart, 'x' | 'y'>;
  // Both feet share one height (Stefan 2026-10-20): one `footY`, an x per foot.
  footY: number;
  footF: { x: number };
  footB: { x: number };
  weapon: PlacedPart & { id: string; tier: number };
  // Back to front.
  order: readonly string[];
  motion: { step: number; lift: number; bob: number; swing: number; speed: number };
}

// Stefan's "all-heads" layout (Hero Builder, saved 2026-10-20 21:18): the one Thorblood man with a
// thinner 16 x 26 body, feet lower, the collar drawn between the near hand and the head. The head
// of the layout itself is placed by `HEAD_FIT` per head (below). The collar is part of this order.
export const ALL_HEADS: HeroLayout = {
  head: { id: 'head_thorblood_m1_nn', x: -0.1, y: -20.9, s: 1, r: 0 },
  body: { kind: 'ruff', x: 0, y: -14.5, s: 1, r: 0, w: 16, h: 26 },
  cape: { x: -1.8, y: -23, s: 0.85, r: 0, tint: '#a8342f' },
  collar: { kind: 'painted', x: -1.4, y: -21, s: 1.09, r: 0, w: 16, h: 8.6 },
  handF: { x: 9.5, y: -12.5 },
  handB: { x: -7.5, y: -12.7 },
  footY: 1.2,
  footF: { x: 1.1 },
  footB: { x: -0.1 },
  weapon: { id: 'hammer', tier: 0, x: 0.2, y: -0.3, s: 1.01, r: 2 },
  order: ['cape', 'footB', 'footF', 'body', 'handF', 'collar', 'head', 'weapon', 'handB'],
  motion: { step: 3.4, lift: 1.2, bob: 0.6, swing: 1.6, speed: 0.55 },
};

// Where each head sits and how big it is (x, y of its neck pivot in game units, s = scale against its
// natural size), per head, as Stefan fitted them. Each head's fitted scale is baked into its size in
// HEAD_SIZE (2026-10-20), so every head sits at scale 1.
export const HEAD_FIT: Readonly<Record<string, { x: number; y: number; s: number; r: number }>> = {
  head_thorblood_m1_nn: { x: -0.1, y: -20.9, s: 1, r: 0 },
  head_thorblood_m2: { x: 2.6, y: -19.9, s: 1, r: 0 },
  head_thorblood_f1: { x: 4.1, y: -20.4, s: 1, r: 0 },
  head_thorblood_f2: { x: 3.1, y: -19.9, s: 1, r: 0 },
  head_a: { x: 1.6, y: -20.4, s: 1, r: 0 },
  head_b: { x: 0.1, y: -19.9, s: 1, r: 0 },
  head_c: { x: 0.1, y: -19.9, s: 1, r: 0 },
  head_d: { x: 1.1, y: -19.4, s: 1, r: 0 },
  head_e: { x: 1.1, y: -19.9, s: 1, r: 0 },
  head_f: { x: 1.6, y: -20.4, s: 1, r: 0 },
  head_g: { x: 1.1, y: -16.4, s: 1, r: 0 },
  head_h: { x: 1.1, y: -17.4, s: 1, r: 0 },
};

// Each head's canonical size in game units (width x height, the fitted scale baked in, so s = 1) and
// its neck pivot (fractions of the picture; the neckless head's is lower). The necked m1 is dropped
// as a duplicate of m1_nn.
export const HEAD_SIZE: Readonly<Record<string, { w: number; h: number }>> = {
  head_thorblood_m1_nn: { w: 15.39, h: 15.79 },
  head_thorblood_m2: { w: 14.77, h: 16.41 },
  head_thorblood_f1: { w: 14.95, h: 14.81 },
  head_thorblood_f2: { w: 14.71, h: 17.04 },
  head_a: { w: 15.2, h: 16.95 },
  head_b: { w: 15.2, h: 17.15 },
  head_c: { w: 15.2, h: 16.1 },
  head_d: { w: 15.2, h: 17.25 },
  head_e: { w: 15.2, h: 17.4 },
  head_f: { w: 13.49, h: 17.13 },
  head_g: { w: 15.2, h: 21.7 },
  head_h: { w: 12.16, h: 19.28 },
};
export const HEAD_PIVOT: Readonly<Record<string, readonly [number, number]>> = {
  head_thorblood_m1_nn: [0.55, 0.86],
  head_thorblood_m2: [0.7, 0.88],
  head_thorblood_f1: [0.7, 0.88],
  head_thorblood_f2: [0.7, 0.88],
};

// Rig constants (Stefan 2026-10-20): hand and foot sizes are locked, the same on every hero, with no
// per-hero scale; only their positions vary (the layout's x and y).
export const HAND_UNITS = 6;
export const FOOT_UNITS = { w: 7, h: 3.8 } as const;
// Hands take the face's skin tone per head (sampled from the art), or leather gloves if he picks them.
export const HEAD_SKIN = { m1: '#d9a77f', m2: '#d8ad89', f1: '#dab18d', f2: '#d0a987' } as const;
export const GLOVE_COLOR = '#7a5536';
export const USE_GLOVES = false;
export const FOOT_COLOR = '#6b4a2c';
