import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ASSETS_KEY, loadManifest, type ManifestAsset } from '../ui/assets';
import { pickLogoId } from '../ui/assetPriority';
import { drawBackdrop } from '../ui/backdrop';
import { getSettings } from '../ui/settings';
import { fitDesignCamera } from '../ui/designCamera';

const FONT = 'Georgia, serif';
const BAR = { w: 520, h: 14, y: GAME_HEIGHT - 70 };
// The splash stays at least this long, so the logo reveal is seen even on a fast connection.
const MIN_SPLASH_MS = 1600;

// Splash: key art (or a dusk gradient), the logo revealing, and a loading bar tied to the asset
// loading. When everything has loaded and the reveal has played it hands over to the title.
export class BootScene extends Phaser.Scene {
  private fill!: Phaser.GameObjects.Rectangle;
  private started = 0;
  private readonly done = { loaded: false, opened: false };

  constructor() {
    super('Boot');
  }

  create(): void {
    fitDesignCamera(this, 'centre');
    this.started = this.time.now;
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.drawBar();
    // Until the art arrives the splash is the dusk gradient and the wordmark.
    // The title opens once the interface kit is in; this scene stays alive (hidden) so the loader
    // keeps streaming the rest of the art, and stops itself when it is all in.
    loadManifest(this, () => this.stopWhenDone('loaded'), {
      onSplashReady: () => this.showSplash(),
      onTitleReady: () => this.finish(),
      onProgress: (p) => this.fill.setScale(Math.max(0.02, p), 1),
    });
  }

  private drawBar(): void {
    const cx = GAME_WIDTH / 2;
    this.add
      .rectangle(cx, BAR.y, BAR.w + 8, BAR.h + 8, 0x000000, 0.6)
      .setStrokeStyle(2, COLORS.gold, 0.6);
    this.fill = this.add
      .rectangle(cx - BAR.w / 2, BAR.y, BAR.w, BAR.h, COLORS.gold)
      .setOrigin(0, 0.5)
      .setScale(0.02, 1);
    this.add
      .text(cx, BAR.y - 26, 'Loading', {
        fontFamily: FONT,
        fontSize: '20px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
  }

  // Backdrop and logo, once the splash assets are in (or at once when there are none).
  private showSplash(): void {
    const back = drawBackdrop(this);
    back.forEach((o) =>
      (o as Phaser.GameObjects.Components.Depth & Phaser.GameObjects.GameObject).setDepth(-10),
    );
    const rows = this.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
    const logoId = pickLogoId(rows?.keys() ?? []);
    const cx = GAME_WIDTH / 2;
    const logo: Phaser.GameObjects.GameObject =
      logoId && this.textures.exists(logoId)
        ? this.add.image(cx, 250, logoId)
        : this.add
            .text(cx, 250, 'GODBLOODED', { fontFamily: FONT, fontSize: '104px', color: '#f2c14e' })
            .setOrigin(0.5)
            .setShadow(0, 6, '#000000', 10, false, true);
    const target = logo as Phaser.GameObjects.Image;
    if (getSettings().reducedMotion) return;
    // Reveal: fade and grow in from slightly small, then one gold shine sweep across.
    target.setAlpha(0).setScale(0.85);
    this.tweens.add({ targets: target, alpha: 1, scale: 1, duration: 900, ease: 'Cubic.easeOut' });
    const shine = this.add
      .rectangle(cx - 300, 250, 50, 160, 0xffffff, 0.22)
      .setAngle(18)
      .setDepth(5);
    this.tweens.add({
      targets: shine,
      x: cx + 300,
      alpha: 0,
      delay: 700,
      duration: 900,
      ease: 'Sine.easeInOut',
    });
  }

  private openTitle(): void {
    this.scene.launch('Title');
    this.scene.setVisible(false);
    this.stopWhenDone('opened');
  }

  // Stops once the art is all in AND the title is open (either can come first).
  private stopWhenDone(what: 'loaded' | 'opened'): void {
    this.done[what] = true;
    if (this.done.loaded && this.done.opened) this.scene.stop();
  }

  private finish(): void {
    const wait = Math.max(0, MIN_SPLASH_MS - (this.time.now - this.started));
    this.time.delayedCall(wait, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () =>
        this.openTitle(),
      );
    });
  }
}
