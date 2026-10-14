import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { MapScene } from './MapScene';
import { addIcon } from '../ui/icons';
import { makeButton } from '../ui/button';
import { addSeedLabel } from '../ui/seedLabel';
import { makePanel } from '../ui/panel';
import { fitDesignCamera } from '../ui/designCamera';

// Pause menu over a frozen map: Resume, Restart, Settings, Quit to title.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    fitDesignCamera(this);
    // A report left by an abandoned Quit that never reached the End screen is stale.
    this.registry.remove('abandonReport');
    const cx = GAME_WIDTH / 2;
    this.add
      .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive();
    makePanel(this, cx, GAME_HEIGHT / 2, 520, 640);
    this.add
      .text(cx, 110, 'Paused', { fontFamily: 'Georgia, serif', fontSize: '64px', color: '#f2c14e' })
      .setOrigin(0.5);
    addSeedLabel(this, (this.scene.get('Map') as MapScene).seed, 16, GAME_HEIGHT - 12);
    const items: [string, () => void][] = [
      ['Resume', () => this.resume()],
      ['Restart', () => this.restart()],
      ['Settings', () => this.scene.launch('Settings')],
      ['Quit to title', () => this.quit()],
    ];
    const icons: Record<string, string> = { Settings: 'ui_icon_settings' };
    items.forEach(([label, fn], i) =>
      makeButton(this, cx, 230 + i * 110, 360, 90, label, fn, { icon: icons[label] }),
    );
    // The pause icon beside the title when the kit has it.
    addIcon(this, 'ui_icon_pause', cx - 140, 110, 44);
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

  // Quit shows the end screen for the run as it stands ("Run abandoned"), then the title; the run
  // is still kept for Continue (EndScene does that when the player leaves).
  private quit(): void {
    this.registry.set('abandonReport', (this.scene.get('Map') as MapScene).abandonReport());
    this.scene.stop();
    this.scene.launch('End');
  }
}
