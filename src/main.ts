import Phaser from 'phaser';
import { initInstall } from './ui/install';
import { changeRenderScale, keepFitted, viewForParent } from './ui/refit';
import { setViewWidth } from './ui/view';
import { registerSW } from 'virtual:pwa-register';
import { updateFirst } from './ui/updateFirst';
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

// Update: a new deploy is picked up when the app opens (see updateFirst below: it installs and
// reloads before the heavy load) and never in the middle of a run (registerType 'prompt').
// An installed app can sit in memory for days and never navigate, so the browser's own update
// check (on navigation) never runs: also check every hour, whenever the app comes back to the
// foreground and when the network returns. The new worker takes over at once; the page in memory
// keeps running and the new build starts at the next launch.
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

// The game starts once the update check is done (see the end of this file): a new version, if there
// is one, installs and reloads before any art loads.
function startGame(): void {
  // The view is as wide as the screen's aspect allows (16:9 up to 21:9) before any scene is built.
  const startView = viewForParent(document.getElementById('game'));
  setViewWidth(startView);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: COLORS.background,
    // ?record: keep the canvas buffer so the dev clip recorder can read frames (src/dev/animStage.ts).
    render: { preserveDrawingBuffer: new URLSearchParams(location.search).has('record') },
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
    // Lets a test step the render scale by hand, as the governor does.
    (window as unknown as { __scale: (s: number) => void }).__scale = (s) =>
      changeRenderScale(game, s);
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
}

// A new version is installed and the page reloaded BEFORE the heavy load (ui/updateFirst.ts); a slow
// check or install lets this build start and the new one applies at the next launch.
function showUpdating(text: string): void {
  const el = document.getElementById('game');
  if (!el) return;
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;color:#f2c14e;font:22px Georgia,serif';
  el.textContent = text;
}

void (async () => {
  const reg =
    'serviceWorker' in navigator
      ? await navigator.serviceWorker.getRegistration().catch(() => undefined)
      : undefined;
  const result = await updateFirst(reg, {
    // `?updatewait=ms` stretches the detection window for a test on a slow machine.
    detectMs: Number(new URLSearchParams(location.search).get('updatewait')) || 1500,
    installMs: 20_000,
    reload: () => location.reload(),
    note: showUpdating,
  });
  console.info('[godblooded] update check:', result);
  if (result === 'reload') return;
  const el = document.getElementById('game');
  if (el) {
    el.style.cssText = '';
    el.textContent = '';
  }
  startGame();
})();
