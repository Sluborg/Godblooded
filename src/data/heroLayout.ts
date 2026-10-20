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
  collar?: PlacedPart & { kind: string };
  handF: PlacedPart;
  handB: PlacedPart;
  footF: PlacedPart;
  footB: PlacedPart;
  weapon: PlacedPart & { id: string; tier: number };
  // Back to front.
  order: readonly string[];
  motion: { step: number; lift: number; bob: number; swing: number; speed: number };
}

// Stefan's "best-i-can-do" (the one Thorblood man: neckless head, fur-ruff egg body, hammer). The
// collar is dormant on this hero: it is left out of `order`.
export const BEST_I_CAN_DO: HeroLayout = {
  head: { id: 'head_thorblood_m1_nn', x: -0.1, y: -20.9, s: 0.64, r: 0 },
  body: { kind: 'ruff', x: 0, y: -14.5, s: 1, r: 0, w: 19, h: 26 },
  cape: { x: -1.8, y: -23, s: 0.85, r: 0, tint: '#a8342f' },
  collar: { kind: 'painted', x: -1.4, y: -21, s: 1.09, r: 0, w: 16, h: 8.6 },
  handF: { x: 9.5, y: -12.5, s: 1, w: 6, h: 6 },
  handB: { x: -7.5, y: -12.7, s: 1, w: 6, h: 6 },
  footF: { x: 1.1, y: 0.2, w: 7, h: 3.8 },
  footB: { x: -0.1, y: 0.2, w: 7, h: 3.8 },
  weapon: { id: 'hammer', tier: 0, x: 0.2, y: -0.3, s: 1.01, r: 2 },
  order: ['cape', 'footB', 'footF', 'body', 'collar', 'head', 'handF', 'weapon', 'handB'],
  motion: { step: 3.4, lift: 1.2, bob: 0.6, swing: 1.6, speed: 0.55 },
};
