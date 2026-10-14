import Phaser from 'phaser';
import { COLORS } from '../config';

// The text of the seed label: createWorld(seed, GRAYBOX) replays the run's map.
export function seedText(seed: number): string {
  return `Seed ${seed}`;
}

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
    .setInteractive({ useHandCursor: true });
  label.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (p.getDistance() >= 10) return;
    void navigator.clipboard?.writeText(String(seed)).then(
      () => label.setText(`${seedText(seed)} (copied)`),
      () => undefined,
    );
  });
}
