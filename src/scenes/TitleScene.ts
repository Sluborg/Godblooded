import Phaser from 'phaser';
import { DIAG_KEY, formatArtDiag, type ArtDiag } from '../ui/artDiag';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ASSETS_KEY, type ManifestAsset } from '../ui/assets';
import { pickLogoId } from '../ui/assetPriority';
import { drawBackdrop } from '../ui/backdrop';
import { canInstall, onInstallChange, promptInstall } from '../ui/install';
import { clearSave, hasSave } from '../ui/saveStore';
import { readMeta } from '../ui/metaStore';
import { makeButton } from '../ui/button';
import { getMusic } from '../ui/musicPlayer';
import { fitDesignCamera } from '../ui/designCamera';

const FONT = 'Georgia, serif';

// Title screen: Play starts a fresh run; Continue wakes the run that Quit put to sleep (there is
// no save file yet, so a run lives as long as the page).
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    fitDesignCamera(this);
    const cx = GAME_WIDTH / 2;
    getMusic(this).play(this, 'mus_title');
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
        .text(cx, 170, 'GODBLOODED', {
          fontFamily: FONT,
          fontSize: '104px',
          fontStyle: 'bold',
          color: '#ffd35e',
          stroke: '#2a1208',
          strokeThickness: 10,
        })
        .setOrigin(0.5)
        .setShadow(0, 5, '#000000', 6, true, true);
    }
    // The tagline sits on a dark plate sized to its text and shrinks to fit the box.
    const tag = this.add
      .text(cx, 285, 'Build the town. Hire the children of gods. Watch them fight.', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#fff3d6',
      })
      .setOrigin(0.5);
    const boxW = GAME_WIDTH - 160;
    if (tag.width > boxW - 48) tag.setScale((boxW - 48) / tag.width);
    this.add
      .rectangle(cx, tag.y, tag.displayWidth + 48, tag.displayHeight + 22, 0x120b08, 0.72)
      .setStrokeStyle(2, 0xc9a45c, 0.7)
      .setDepth(0.5);
    tag.setDepth(1);

    const canContinue = this.canContinue();
    const labels: [string, () => void][] = [['Play', () => this.play()]];
    if (canContinue) labels.push(['Continue', () => this.continueRun()]);
    labels.push(['Settings', () => this.scene.launch('Settings')]);
    // The browser may decide the app is installable after the title is up (or the player may
    // install): rebuild the title then so the button appears or goes away.
    const off = onInstallChange(() => this.scene.restart());
    this.events.once('shutdown', off);
    // Offer the PWA install only when the browser says the app can be installed.
    if (canInstall()) labels.push(['Install app', () => void promptInstall()]);
    // Four buttons need a tighter stack to stay clear of the bottom edge.
    const tight = labels.length > 3;
    const gap = tight ? 92 : 110;
    const y0 = tight ? 360 : canContinue ? 385 : 420;
    const icons: Record<string, string> = { Settings: 'ui_icon_settings' };
    labels.forEach(([label, fn], i) =>
      makeButton(this, cx, y0 + i * gap, 320, 84, label, fn, { icon: icons[label], flat: true }),
    );

    this.add
      .text(GAME_WIDTH - 16, GAME_HEIGHT - 16, `${__APP_NAME__} · ${__APP_VERSION__}`, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: COLORS.text,
      })
      .setOrigin(1, 1);
    // Art report (loaded count, first error, renderer) for screenshots from devices without art.
    const diag = this.registry.get(DIAG_KEY) as ArtDiag | undefined;
    if (diag)
      this.add
        .text(GAME_WIDTH - 16, GAME_HEIGHT - 40, formatArtDiag(diag), {
          fontFamily: 'monospace',
          fontSize: '16px',
          color: diag.loaded < diag.expected || diag.failed > 0 ? '#ff9a8a' : COLORS.textMuted,
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
    // The very first run goes straight in; every later one passes the run setup (portent, Trials).
    if (readMeta().runs === 0) {
      clearSave();
      this.registry.set('startMode', 'new');
      this.registry.set('runTrials', []);
      this.scene.stop('Hud');
      this.scene.start('Map');
      return;
    }
    this.scene.start('Setup');
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
