import type Phaser from 'phaser';
import { GAME_HEIGHT, RENDER_SCALE } from '../config';
import { setViewWidth, viewFor } from './view';

// The view width (design units) that fills `parent`: its height is the 720 design height, so the
// width follows the parent's aspect, within 16:9 .. 21:9.
export function viewForParent(parent: HTMLElement | null): number {
  const r = parent?.getBoundingClientRect();
  return viewFor(r && r.height > 0 ? r.width / r.height : 16 / 9);
}

// Keeps the canvas filling its parent (Stefan's Pixel, 2026-10-14: the canvas stayed about 985x555
// inside a 1920x750 area). Phaser measures the parent when the window fires `resize`; an installed
// fullscreen app or a browser bar that moves can change the area without a window `resize` the game
// hears in time. So the scale manager is told to measure again on every signal that the area may
// have changed, and a few times just after load.
export function keepFitted(
  game: Phaser.Game,
  parent: HTMLElement | null = document.getElementById('game'),
): void {
  const refit = () => {
    const w = viewForParent(parent);
    // The canvas gets the new shape first, then the scenes lay out for it.
    if (w !== viewForGame(game)) {
      game.scale.setGameSize(Math.round(w * RENDER_SCALE), Math.round(GAME_HEIGHT * RENDER_SCALE));
      setViewWidth(w);
    }
    game.scale.refresh();
  };
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);
  window.addEventListener('pageshow', refit);
  document.addEventListener('fullscreenchange', refit);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refit();
  });
  const vv = window.visualViewport;
  vv?.addEventListener('resize', refit);
  // Anything that changes the parent's own size (a bar sliding, safe-area insets arriving).
  if (parent && typeof ResizeObserver !== 'undefined') new ResizeObserver(refit).observe(parent);
  // The first frames of an installed app: the system bars settle after the page starts.
  for (const ms of [100, 400, 1000, 2500]) setTimeout(refit, ms);
}

function viewForGame(game: Phaser.Game): number {
  return Math.round(game.scale.gameSize.width / RENDER_SCALE);
}
