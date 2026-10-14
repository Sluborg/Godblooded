import Phaser from 'phaser';
import { COLORS, MIN_TOUCH, TAP_SLOP } from '../config';
import { ASSETS_KEY, type ManifestAsset } from './assets';
import { buttonState, type ButtonState } from './buttonStyle';
import { UI_STYLE, WOOD_BUTTON } from './uiStyle';
import { drawWoodSlab } from './woodFrame';
import { addIcon } from './icons';
import { getSfx } from './sfxPlayer';
import { nineSliceArgs } from './nineSlice';

export interface Button {
  container: Phaser.GameObjects.Container;
  rect: Phaser.Geom.Rectangle;
  setLabel(text: string): void;
  setEnabled(enabled: boolean): void;
  setActive(active: boolean): void;
}

// Draws the code-drawn button: a wood slab, lit, reddened when selected, greyed when disabled and
// shaded when pressed (palettes in uiStyle.ts).
function drawButton(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  state: ButtonState,
): void {
  g.clear();
  drawWoodSlab(g, w, h, WOOD_BUTTON[state]);
}

export interface ButtonOptions {
  // A kit icon id (`ui_icon_menu`): shown left of the label, or instead of it with `iconOnly`.
  icon?: string;
  iconOnly?: boolean;
  // The tap sound (default `sfx_ui_tap`); a Back or Close button uses `sfx_ui_back`.
  sfx?: string;
}

// A touch button centered on (x, y). Height and width are raised to MIN_TOUCH if smaller.
// `rect` is its screen-space hit area, so scenes can keep taps from reaching the map below.
// Uses the UI kit pictures (`ui_button`, `ui_button_pressed`, `ui_button_disabled`) when the
// manifest has them, else the code-drawn look. Pressing sinks the label and shrinks the button.
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onTap: () => void,
  opts: ButtonOptions = {},
): Button {
  w = Math.max(w, MIN_TOUCH);
  h = Math.max(h, MIN_TOUCH);
  let enabled = true;
  let active = false;
  let pressed = false;

  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  const kit = ['ui_button', 'ui_button_pressed', 'ui_button_disabled'].map((id) =>
    scene.textures.exists(id) ? nineSliceArgs(rows?.get(id)) : null,
  );
  const useKit = UI_STYLE.preferKitPictures && kit.every((k) => k !== null);
  const art = useKit
    ? scene.add.nineslice(
        0,
        0,
        'ui_button',
        undefined,
        w,
        h,
        ...(kit[0] as NonNullable<(typeof kit)[0]>),
      )
    : null;
  const g = useKit ? null : scene.add.graphics();
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: COLORS.text,
      align: 'center',
    })
    .setOrigin(0.5)
    .setShadow(0, 2, '#000000', 3, false, true);
  // The icon, when the picture exists: beside the label, or alone when asked.
  const icon = opts.icon ? addIcon(scene, opts.icon, 0, 0, Math.min(h - 24, 48)) : null;
  const iconBase = icon ? icon.scale : 1;
  // Icon and text centred together; the icon shrinks when the pair would poke past the frame.
  const layout = (): void => {
    if (!icon) return;
    text.setVisible(!(opts.iconOnly || text.text === ''));
    if (!text.visible) return;
    const gap = 10;
    icon.setScale(iconBase);
    const room = w - 20;
    const over = icon.displayWidth + gap + text.width - room;
    if (over > 0 && icon.displayWidth > over + 16)
      icon.setScale((iconBase * (icon.displayWidth - over)) / icon.displayWidth);
    const total = icon.displayWidth + gap + text.width;
    icon.x = -total / 2 + icon.displayWidth / 2;
    text.x = total / 2 - text.width / 2;
  };
  layout();
  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [
    (art ?? g) as Phaser.GameObjects.GameObject,
    text,
    ...(icon ? [icon] : []),
    hit,
  ]);

  const refresh = (): void => {
    const state = buttonState({ enabled, active, pressed });
    if (art) {
      const id =
        state === 'disabled'
          ? 'ui_button_disabled'
          : state === 'pressed'
            ? 'ui_button_pressed'
            : 'ui_button';
      art.setTexture(id);
      // An active (selected) kit button is tinted warm since the kit has no selected picture.
      if (state === 'active') art.setTint(0xffb0a0);
      else art.clearTint();
    } else if (g) {
      drawButton(g, w, h, state);
    }
    text.setAlpha(enabled ? 1 : 0.45);
    text.y = pressed ? 2 : 0;
    icon?.setAlpha(enabled ? 1 : 0.45).setY(pressed ? 2 : 0);
  };
  const press = (down: boolean): void => {
    if (!enabled && down) return;
    pressed = down;
    refresh();
    scene.tweens.killTweensOf(container);
    scene.tweens.add({ targets: container, scale: down ? 0.96 : 1, duration: 70 });
  };

  hit
    .on('pointerdown', () => press(true))
    .on('pointerout', () => pressed && press(false))
    .on('pointerup', (p: Phaser.Input.Pointer) => {
      const wasPressed = pressed;
      press(false);
      const tapped = p.getDistance() < TAP_SLOP;
      if (tapped && (wasPressed || !enabled))
        getSfx(scene).play({ id: enabled ? (opts.sfx ?? 'sfx_ui_tap') : 'sfx_ui_off' });
      if (enabled && wasPressed && tapped) onTap();
    });
  refresh();

  return {
    container,
    rect: new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h),
    setLabel: (t) => {
      text.setText(t);
      layout();
    },
    setEnabled(e) {
      enabled = e;
      refresh();
    },
    setActive(a) {
      active = a;
      refresh();
    },
  };
}
