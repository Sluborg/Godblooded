import Phaser from 'phaser';
import { COLORS, MIN_TOUCH } from '../config';

export interface Button {
  container: Phaser.GameObjects.Container;
  rect: Phaser.Geom.Rectangle;
  setLabel(text: string): void;
  setEnabled(enabled: boolean): void;
  setActive(active: boolean): void;
}

const FILL = 0x3a2a1c;
const FILL_ACTIVE = COLORS.blood;
const FILL_DISABLED = 0x24201c;

// A touch button centered on (x, y). Height and width are raised to MIN_TOUCH if smaller.
// `rect` is its screen-space hit area, so scenes can keep taps from reaching the map below.
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
  const bg = scene.add.rectangle(0, 0, w, h, FILL).setStrokeStyle(3, COLORS.gold, 0.8);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: COLORS.text,
      align: 'center',
    })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);
  let enabled = true;
  bg.setInteractive({ useHandCursor: true }).on('pointerup', (p: Phaser.Input.Pointer) => {
    if (enabled && p.getDistance() < 10) onTap();
  });
  return {
    container,
    rect: new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h),
    setLabel: (t) => text.setText(t),
    setEnabled(e) {
      enabled = e;
      bg.setFillStyle(e ? FILL : FILL_DISABLED);
      text.setAlpha(e ? 1 : 0.45);
    },
    setActive: (a) => bg.setFillStyle(a ? FILL_ACTIVE : FILL),
  };
}
