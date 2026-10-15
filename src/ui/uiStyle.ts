// The look of the code-drawn UI as named parameters (Stefan's taste test, docs/decisions.md
// 2026-10-14: wood-and-parchment frames). Colours are the style prototype's `woodFrame`
// (docs/reference/style-test.html). Code-drawn until Art's UI kit (U8) ships wood pictures.
export const UI_STYLE = {
  // false: always draw the wood look in code. true: use the manifest's `ui_panel` and `ui_button*`
  // pictures when present (flip when Art's wood kit replaces the iron one).
  preferKitPictures: true,
  // Frame width of a panel in px: at least `border`, 2.2% of its short side, at most `borderMax`.
  border: 6,
  borderMax: 16,
  nails: true,
  // The inside of a panel: dark parchment, so the light text keeps its contrast. Light parchment
  // (the prototype's #f7e9c6 to #dcc08a) needs dark ink text in every panel first.
  centreInner: 0x6e5a3e,
  centreOuter: 0x4d3d2a,
  centreEdge: 0x2b2014,
  nail: 0xc9a25a,
} as const;

// Multiplies the neutral kit's light parchment centre down to a dark parchment (the light UI text
// keeps its contrast); the steel frame goes darker with it.
export const PANEL_TINT = 0x786a5a;

export interface WoodPalette {
  top: number;
  mid: number;
  bottom: number;
  outline: number;
  grain: number;
  highlight: number;
}

// Wood of the frame (the prototype's browns).
export const WOOD: WoodPalette = {
  top: 0x9a6a3e,
  mid: 0x7d5130,
  bottom: 0x5e3b20,
  outline: 0x3a2210,
  grain: 0x281408,
  highlight: 0xffd7a0,
};

export type WoodState = 'normal' | 'active' | 'disabled' | 'pressed';

// Button wood per state: the same planks, lit, reddened (selected), greyed or shaded.
export const WOOD_BUTTON: Record<WoodState, WoodPalette> = {
  normal: WOOD,
  active: {
    top: 0xb5683a,
    mid: 0x95472b,
    bottom: 0x6b2c1c,
    outline: 0x3a1410,
    grain: 0x2a0e08,
    highlight: 0xffc890,
  },
  disabled: {
    top: 0x6a5a48,
    mid: 0x5a4c3d,
    bottom: 0x453a2f,
    outline: 0x2a221b,
    grain: 0x1e1812,
    highlight: 0xb8a890,
  },
  pressed: {
    top: 0x6b4a2c,
    mid: 0x59391f,
    bottom: 0x44290f,
    outline: 0x2a170a,
    grain: 0x1c0e04,
    highlight: 0xb88858,
  },
};
