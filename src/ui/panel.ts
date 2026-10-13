import Phaser from 'phaser';
import { COLORS } from '../config';
import { ASSETS_KEY, type ManifestAsset } from './assets';
import { nineSliceArgs } from './nineSlice';

// A framed panel centred on (x, y): the UI kit's `ui_panel` 9-slice when the manifest has it,
// else a dark panel with a bronze rim. Returns the game object so callers can destroy it.
export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 0.94,
): Phaser.GameObjects.GameObject {
  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  const slice = scene.textures.exists('ui_panel') ? nineSliceArgs(rows?.get('ui_panel')) : null;
  if (slice) return scene.add.nineslice(x, y, 'ui_panel', undefined, w, h, ...slice);
  const g = scene.add.graphics().setPosition(x, y);
  g.fillStyle(0xb08a4a, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
  g.fillStyle(0x15110d, alpha).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, 11);
  g.lineStyle(2, COLORS.gold, 0.35).strokeRoundedRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 8);
  return g;
}
