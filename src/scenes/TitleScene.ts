import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ASSETS_KEY, type ManifestAsset } from '../ui/assets';
import { pickLogoId } from '../ui/assetPriority';
import { drawBackdrop } from '../ui/backdrop';
import { clearSave, hasSave } from '../ui/saveStore';
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
    drawBackdrop(this);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    // The logo picture when Art has picked one, else the wordmark.
    const rows = this.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
    const logoId = pickLogoId(rows?.keys() ?? []);
    if (logoId && this.textures.exists(logoId)) {
      const logo = this.add.image(cx, 170, logoId);
      logo.setScale(Math.min(1, 200 / logo.height));
    } else {
      this.add
        .text(cx, 170, 'GODBLOODED', { fontFamily: FONT, fontSize: '104px', color: '#f2c14e' })
        .setOrigin(0.5)
        .setShadow(0, 6, '#000000', 10, false, true);
    }
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

  // A run to continue: the one Quit put to sleep in this page, or the one in storage (autosave
  // and Quit write it; a finished run clears it).
  private sleepingRun(): boolean {
    return (
      this.scene.isSleeping('Map') &&
      this.registry.get('status') !== 'won' &&
      this.registry.get('status') !== 'lost'
    );
  }

  private canContinue(): boolean {
    return this.sleepingRun() || hasSave();
  }

  // A new run starts with a fresh seed (MapScene) and drops the old save.
  private play(): void {
    clearSave();
    this.registry.set('startMode', 'new');
    this.scene.stop('Hud');
    this.scene.start('Map');
  }

  private continueRun(): void {
    if (this.sleepingRun()) {
      this.scene.wake('Map');
      this.scene.wake('Hud');
      this.scene.stop();
      return;
    }
    // After a reload: rebuild the run from the save.
    this.registry.set('startMode', 'continue');
    this.scene.stop('Hud');
    this.scene.start('Map');
  }
}
