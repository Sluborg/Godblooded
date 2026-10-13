import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { makeButton } from '../ui/button';

const FONT = 'Georgia, serif';

// Title screen: Play starts a fresh run; Continue wakes the run that Quit put to sleep (there is
// no save file yet, so a run lives as long as the page).
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.background);
    this.add.rectangle(cx, GAME_HEIGHT - 90, GAME_WIDTH, 180, COLORS.ground);
    // Logo placeholder: a framed wordmark until the real logo (U1) lands.
    this.add.rectangle(cx, 170, 760, 170, 0x000000, 0.35).setStrokeStyle(4, COLORS.gold, 0.8);
    this.add
      .text(cx, 170, 'GODBLOODED', { fontFamily: FONT, fontSize: '96px', color: '#f2c14e' })
      .setOrigin(0.5);
    this.add
      .text(cx, 285, 'Build the town. Hire the children of gods. Watch them fight.', {
        fontFamily: FONT,
        fontSize: '26px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const canContinue = this.canContinue();
    const labels: [string, () => void][] = [['Play', () => this.play()]];
    if (canContinue) labels.push(['Continue', () => this.continueRun()]);
    labels.push(['Settings', () => this.scene.launch('Settings')]);
    const y0 = canContinue ? 385 : 420;
    labels.forEach(([label, fn], i) => makeButton(this, cx, y0 + i * 110, 320, 90, label, fn));

    this.add
      .text(GAME_WIDTH - 16, GAME_HEIGHT - 16, `${__APP_NAME__} · ${__APP_VERSION__}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: COLORS.text,
      })
      .setOrigin(1, 1);
  }

  // A run exists when the map was put to sleep by Quit and has not ended.
  private canContinue(): boolean {
    return (
      this.scene.isSleeping('Map') &&
      this.registry.get('status') !== 'won' &&
      this.registry.get('status') !== 'lost'
    );
  }

  private play(): void {
    this.scene.stop('Hud');
    this.scene.start('Map');
  }

  private continueRun(): void {
    this.scene.wake('Map');
    this.scene.wake('Hud');
    this.scene.stop();
  }
}
