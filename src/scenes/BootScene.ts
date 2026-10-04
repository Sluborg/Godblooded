import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { loadManifest } from '../ui/assets';

// Placeholder title screen until the graybox lands (Scene owns this file).
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    loadManifest(this, () => this.showTitle());
  }

  private showTitle(): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT - 120, GAME_WIDTH, 240, COLORS.ground);
    this.add
      .text(cx, 250, 'GODBLOODED', {
        fontFamily: 'Georgia, serif',
        fontSize: '96px',
        color: '#f2c14e',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 345, 'Build the town. Hire the children of gods. Watch them fight.', {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 420, 'Tap to start', {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
    this.input.once('pointerdown', () => this.scene.start('Map'));
    this.add
      .text(GAME_WIDTH - 16, GAME_HEIGHT - 16, `${__APP_NAME__} · ${__APP_VERSION__}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: COLORS.text,
      })
      .setOrigin(1, 1);
  }
}
