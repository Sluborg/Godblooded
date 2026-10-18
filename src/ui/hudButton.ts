import Phaser from 'phaser';
import { MIN_TOUCH, RENDER_SCALE, TAP_SLOP } from '../config';
import { bakedScale, bakeTexture } from './bake';
import type { Button } from './button';
import { addIcon } from './icons';
import { getSfx } from './sfxPlayer';
import { ASSETS_KEY, type ManifestAsset } from './assets';
import { nineSliceArgs } from './nineSlice';
import { UI_STYLE } from './uiStyle';

// The top bar's buttons (Stefan, run 3: "the buttons are so ugly"): a flat dark plate with a gold
// hairline, an icon, and a hit area larger than the drawing. Matches the title screen's flat
// buttons. `glyph` draws a small shape when the kit has no icon for it.

export type Glyph = 'heroes' | 'eye';

export interface HudButtonOptions {
  // The visible plate (design px); the hit area is at least MIN_TOUCH on both sides.
  plateW?: number;
  plateH?: number;
  // A kit icon id, or a code-drawn glyph.
  icon?: string;
  glyph?: Glyph;
  // A small label beside the icon ("2x").
  label?: string;
  sfx?: string;
}

type State = 'normal' | 'active' | 'pressed';

function plate(scene: Phaser.Scene, w: number, h: number, state: State): string {
  return bakeTexture(scene, `hudbtn:${w}x${h}:${state}`, w / 2 + 3, h / 2 + 5, (g) => {
    const fill = { normal: 0x1b130e, active: 0x4a2a18, pressed: 0x0f0a07 }[state];
    g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2 + 1, -h / 2 + 3, w, h, 10);
    g.fillStyle(fill, 0.9).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.lineStyle(
      state === 'active' ? 2.5 : 1.5,
      0xc9a45c,
      state === 'active' ? 1 : 0.7,
    ).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  });
}

// A glyph baked once: warm off-white shapes, about 26 px.
function glyphTexture(scene: Phaser.Scene, glyph: Glyph): string {
  return bakeTexture(scene, `hudglyph:${glyph}`, 16, 16, (g) => {
    g.fillStyle(0xe8dcc0, 1).lineStyle(2, 0xe8dcc0, 1);
    if (glyph === 'heroes') {
      g.fillCircle(-5, -5, 4.2).fillCircle(6, -3, 3.6);
      g.fillEllipse(-5, 7, 14, 9).fillEllipse(6, 7, 11, 8);
    } else {
      g.strokeEllipse(0, 0, 28, 14);
      g.fillCircle(0, 0, 4.5);
    }
  });
}

export function makeHudButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onTap: () => void,
  opts: HudButtonOptions = {},
): Button {
  // The kit's 9-slice insets are 16 + 16 wide and 17 + 17 high: a smaller plate folds its corners.
  const pw = Math.max(34, opts.plateW ?? 56);
  const ph = Math.max(36, opts.plateH ?? 46);
  const hw = Math.max(MIN_TOUCH, pw + 24);
  const hh = Math.max(MIN_TOUCH, ph + 24);
  let state: State = 'normal';
  let active = false;
  // The neutral kit's button (a 9-slice, lit when active, sunk when pressed) when the manifest has
  // it; else the baked flat plate.
  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  const slice = ['ui_button', 'ui_button_pressed'].map((id) =>
    scene.textures.exists(id) ? nineSliceArgs(rows?.get(id)) : null,
  );
  const kit = UI_STYLE.preferKitPictures && slice.every((k) => k !== null);
  const art = kit
    ? scene.add.nineslice(
        0,
        0,
        'ui_button',
        undefined,
        pw,
        ph,
        ...(slice[0] as NonNullable<(typeof slice)[0]>),
      )
    : null;
  const bg = art
    ? null
    : scene.add.image(0, 0, plate(scene, pw, ph, 'normal')).setScale(1 / RENDER_SCALE);
  const parts: Phaser.GameObjects.GameObject[] = [(art ?? bg) as Phaser.GameObjects.GameObject];
  const label = opts.label
    ? scene.add
        .text(0, 0, opts.label, {
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
          color: '#f2e8cf',
        })
        .setOrigin(0.5)
    : null;
  let iconObj: Phaser.GameObjects.Image | null = null;
  if (opts.icon) iconObj = addIcon(scene, opts.icon, 0, 0, 30);
  else if (opts.glyph)
    iconObj = scene.add.image(0, 0, glyphTexture(scene, opts.glyph)).setScale(1 / RENDER_SCALE);
  if (iconObj) parts.push(iconObj);
  if (label) parts.push(label);
  // Icon and label side by side when both are there.
  const lay = () => {
    if (iconObj && label) {
      const total = iconObj.displayWidth + 6 + label.width;
      iconObj.x = -total / 2 + iconObj.displayWidth / 2;
      label.x = total / 2 - label.width / 2;
    }
  };
  lay();
  const hit = scene.add
    .rectangle(0, 0, hw, hh, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  parts.push(hit);
  const container = scene.add.container(x, y, parts);
  const refresh = () => {
    if (art) {
      art.setTexture(state === 'pressed' ? 'ui_button_pressed' : 'ui_button');
      // Lit: a warm gold wash over the brown while the button is switched on.
      if (active && state !== 'pressed') art.setTint(0xffd98a);
      else art.clearTint();
    } else if (bg) {
      bg.setTexture(
        plate(scene, pw, ph, state === 'pressed' ? 'pressed' : active ? 'active' : 'normal'),
      );
      bg.setScale(bakedScale(bg));
    }
    container.setScale(state === 'pressed' ? 0.95 : 1);
  };
  hit.on('pointerdown', () => {
    state = 'pressed';
    refresh();
  });
  hit.on('pointerout', () => {
    state = 'normal';
    refresh();
  });
  hit.on('pointerup', (p: Phaser.Input.Pointer) => {
    const was = state === 'pressed';
    state = 'normal';
    refresh();
    if (!was || p.getDistance() > TAP_SLOP) return;
    getSfx(scene).play({ id: opts.sfx ?? 'sfx_ui_tap' });
    onTap();
  });
  return {
    container,
    rect: new Phaser.Geom.Rectangle(x - hw / 2, y - hh / 2, hw, hh),
    setLabel(t: string) {
      label?.setText(t);
      lay();
    },
    setEnabled(e: boolean) {
      container.setAlpha(e ? 1 : 0.45);
      if (e) hit.setInteractive();
      else hit.disableInteractive();
    },
    setActive(a: boolean) {
      if (a === active) return;
      active = a;
      refresh();
    },
  };
}
