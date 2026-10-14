import Phaser from 'phaser';
import { COLORS, TAP_SLOP } from '../config';
import { seedText } from './seedText';

// A small muted "Seed 123456" in the bottom left. A tap copies the number (where the browser allows
// it) and says so, so a tester can paste it to the team instead of reading it off the screen.
export function addSeedLabel(scene: Phaser.Scene, seed: number, x: number, y: number): void {
  const label = scene.add
    .text(x, y, seedText(seed), {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: COLORS.textMuted,
    })
    .setOrigin(0, 1)
    .setInteractive(
      // A touch-sized area (MIN_TOUCH 80) around the small text, up from its bottom edge.
      new Phaser.Geom.Rectangle(-10, 18 - 80, 260, 80),
      Phaser.Geom.Rectangle.Contains,
    );
  if (label.input) label.input.cursor = 'pointer';
  label.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (p.getDistance() >= TAP_SLOP) return;
    void navigator.clipboard?.writeText(String(seed)).then(
      () => label.setText(`${seedText(seed)} (copied)`),
      () => undefined,
    );
  });
}
