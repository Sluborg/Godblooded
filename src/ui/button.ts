import Phaser from 'phaser';
import { COLORS, MIN_TOUCH } from '../config';
import { ASSETS_KEY, type ManifestAsset } from './assets';
import { BUTTON_COLORS, buttonState, type ButtonState } from './buttonStyle';
import { nineSliceArgs } from './nineSlice';

export interface Button {
  container: Phaser.GameObjects.Container;
  rect: Phaser.Geom.Rectangle;
  setLabel(text: string): void;
  setEnabled(enabled: boolean): void;
  setActive(active: boolean): void;
}

// Draws the code-drawn button: iron fill, bronze rim, light bevel on top and dark below, shine.
function drawButton(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  state: ButtonState,
): void {
  const c = BUTTON_COLORS[state];
  const r = 10;
  g.clear();
  g.fillStyle(c.rim, 1).fillRoundedRect(-w / 2, -h / 2, w, h, r);
  g.fillStyle(c.fill, 1).fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, r - 3);
  // A soft 2 px inner highlight that follows the rounded corners (light on a raised button, dark
  // when pressed): no flat band under the rim.
  g.lineStyle(2, c.bevelLight, c.inner).strokeRoundedRect(
    -w / 2 + 6,
    -h / 2 + 6,
    w - 12,
    h - 12,
    r - 4,
  );
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
  const useKit = kit.every((k) => k !== null);
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
  const hit = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [
    (art ?? g) as Phaser.GameObjects.GameObject,
    text,
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
      if (enabled && wasPressed && p.getDistance() < 10) onTap();
    });
  refresh();

  return {
    container,
    rect: new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h),
    setLabel: (t) => text.setText(t),
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
