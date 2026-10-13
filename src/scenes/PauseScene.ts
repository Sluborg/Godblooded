import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeButton } from '../ui/button';
import { makePanel } from '../ui/panel';

// Pause menu over a frozen map: Resume, Restart, Settings, Quit to title.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive();
    makePanel(this, cx, GAME_HEIGHT / 2, 520, 640);
    this.add
      .text(cx, 110, 'Paused', { fontFamily: 'Georgia, serif', fontSize: '64px', color: '#f2c14e' })
      .setOrigin(0.5);
    const items: [string, () => void][] = [
      ['Resume', () => this.resume()],
      ['Restart', () => this.restart()],
      ['Settings', () => this.scene.launch('Settings')],
      ['Quit to title', () => this.quit()],
    ];
    items.forEach(([label, fn], i) => makeButton(this, cx, 230 + i * 110, 360, 90, label, fn));
    this.add
      .text(cx, GAME_HEIGHT - 30, 'Quitting keeps this run until you start a new one.', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
  }

  private resume(): void {
    this.scene.resume('Map');
    this.scene.stop();
  }

  private restart(): void {
    this.scene.stop('Hud');
    this.scene.stop();
    this.scene.start('Map');
  }

  private quit(): void {
    this.scene.resume('Map');
    this.scene.sleep('Map');
    this.scene.sleep('Hud');
    this.scene.stop();
    this.scene.launch('Title');
  }
}
