import Phaser from 'phaser';
import { ASSETS_KEY, type ManifestAsset } from './assets';
import { nineSliceArgs } from './nineSlice';
import { COLORS } from '../config';
import { UI_STYLE } from './uiStyle';
import { drawWoodPanel } from './woodFrame';

// A framed panel centred on (x, y): the UI kit's `ui_panel` 9-slice when the manifest has it and
// `UI_STYLE.preferKitPictures` is on, else a code-drawn wood frame with a dark-parchment centre. Returns the game object so callers can destroy it.
export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.94,
): Phaser.GameObjects.GameObject {
  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  const slice =
    UI_STYLE.preferKitPictures && scene.textures.exists('ui_panel')
      ? nineSliceArgs(rows?.get('ui_panel'))
      : null;
  if (slice) return scene.add.nineslice(x, y, 'ui_panel', undefined, w, h, ...slice);
  const g = scene.add.graphics().setPosition(x, y);
  drawWoodPanel(g, w, h);
  g.setAlpha(Math.max(alpha, 0.9));
  return g;
}

// Text colours for text that sits on a panel: dark ink on the kit's light parchment, light on the
// code-drawn dark-parchment wood panel. Button labels are not affected (they sit on leather).
export interface PanelInk {
  body: string;
  heading: string;
  muted: string;
  warn: string;
}
const INK_KIT: PanelInk = {
  body: '#2b1a0e',
  heading: '#6a4310',
  muted: '#5b4632',
  warn: '#8a2418',
};
const INK_WOOD: PanelInk = {
  body: COLORS.text,
  heading: '#f2c14e',
  muted: COLORS.textMuted,
  warn: '#e0645c',
};

export function panelInk(scene: Phaser.Scene): PanelInk {
  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  const kit =
    UI_STYLE.preferKitPictures &&
    scene.textures.exists('ui_panel') &&
    nineSliceArgs(rows?.get('ui_panel')) !== null;
  return kit ? INK_KIT : INK_WOOD;
}
