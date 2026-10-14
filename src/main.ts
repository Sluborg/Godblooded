import Phaser from 'phaser';
import { initInstall } from './ui/install';
import { keepFitted, viewForParent } from './ui/refit';
import { setViewWidth } from './ui/view';
import { registerSW } from 'virtual:pwa-register';
import { COLORS, GAME_HEIGHT, RENDER_SCALE } from './config';
import { BootScene } from './scenes/BootScene';
import { HudScene } from './scenes/HudScene';
import { EndScene } from './scenes/EndScene';
import { PauseScene } from './scenes/PauseScene';
import { SettingsScene } from './scenes/SettingsScene';
import { TitleScene } from './scenes/TitleScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { AltarScene } from './scenes/AltarScene';
import { SetupScene } from './scenes/SetupScene';
import { MapScene } from './scenes/MapScene';
import { SkillGalleryScene } from './scenes/SkillGalleryScene';
import { PartsGalleryScene } from './scenes/PartsGalleryScene';

// Auto-update: a new deploy is picked up and the page reloads with it.
// An installed app can sit in memory for days and never navigate, so the browser's own update
// check (on navigation) never runs: also check every hour, whenever the app comes back to the
// foreground and when the network returns. autoUpdate then swaps the worker and reloads the page.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => void registration.update().catch(() => undefined);
    setInterval(check, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.addEventListener('online', check);
  },
});

initInstall();

// Block pinch zoom, double-tap zoom and page scroll.
const prevent = (e: Event) => e.preventDefault();
document.addEventListener('gesturestart', prevent);
document.addEventListener('touchmove', (e) => e.touches.length > 1 && e.preventDefault(), {
  passive: false,
});
document.addEventListener('dblclick', prevent);

// Text is drawn into its own canvas: render it at the canvas's pixel density too, or it is a
// blurry 1x picture on a sharper screen. A style that sets its own resolution keeps it.
type TextFactory = (
  x: number,
  y: number,
  text: string | string[],
  style?: Phaser.Types.GameObjects.Text.TextStyle,
) => Phaser.GameObjects.Text;
const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as { text: TextFactory };
const makeText = factory.text;
factory.text = function (this: unknown, x, y, text, style) {
  return makeText.call(this, x, y, text, { resolution: RENDER_SCALE, ...style });
};

// The view is as wide as the screen's aspect allows (16:9 up to 21:9) before any scene is built.
const startView = viewForParent(document.getElementById('game'));
setViewWidth(startView);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: Math.round(startView * RENDER_SCALE),
    height: Math.round(GAME_HEIGHT * RENDER_SCALE),
  },
  input: { activePointers: 2 },
  scene: [
    BootScene,
    TitleScene,
    MapScene,
    HudScene,
    LevelUpScene,
    AltarScene,
    SetupScene,
    EndScene,
    PauseScene,
    SettingsScene,
    PartsGalleryScene,
    SkillGalleryScene,
  ],
});

keepFitted(game);

// Test hook: with ?debug in the URL the game object is reachable from the console and from
// the headless test runner. Never used by game code.
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

// Review page for the part-based heroes: ?gallery=thor (see PartsGalleryScene).
if (new URLSearchParams(location.search).has('gallery')) {
  game.events.once(Phaser.Core.Events.READY, () => {
    game.scene.stop('Boot');
    game.scene.start(
      new URLSearchParams(location.search).get('gallery') === 'skills'
        ? 'SkillGallery'
        : 'PartsGallery',
    );
  });
}
