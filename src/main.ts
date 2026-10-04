import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';
import { BootScene } from './scenes/BootScene';
import { HudScene } from './scenes/HudScene';
import { MapScene } from './scenes/MapScene';

// Auto-update: a new deploy is picked up and the page reloads with it.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update(), 60 * 60 * 1000);
  },
});

// Block pinch zoom, double-tap zoom and page scroll.
const prevent = (e: Event) => e.preventDefault();
document.addEventListener('gesturestart', prevent);
document.addEventListener('touchmove', (e) => e.touches.length > 1 && e.preventDefault(), {
  passive: false,
});
document.addEventListener('dblclick', prevent);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  input: { activePointers: 2 },
  scene: [BootScene, MapScene, HudScene],
});

// Test hook: with ?debug in the URL the game object is reachable from the console and from
// the headless test runner. Never used by game code.
if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
