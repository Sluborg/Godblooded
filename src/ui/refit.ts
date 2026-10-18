import type Phaser from 'phaser';
import { GAME_HEIGHT, RENDER_SCALE, saveRenderScale, setRenderScale } from '../config';
import { notifyScaleChange, setViewWidth, viewFor, viewWidth } from './view';

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

// Changes the render scale in a run: the canvas gets the new pixel size, the scenes' cameras the new
// zoom. Textures and texts already made keep the resolution they were made at (they are sized in
// design units, so they stay the right size); new ones follow the new scale. Remembers the scale
// for the next start.
export function changeRenderScale(game: Phaser.Game, to: number): void {
  const from = RENDER_SCALE;
  if (to === from) return;
  setRenderScale(to);
  game.scale.setGameSize(Math.round(viewWidth() * to), Math.round(GAME_HEIGHT * to));
  notifyScaleChange(from, to);
  game.scale.refresh();
  saveRenderScale(to);
}

function viewForGame(game: Phaser.Game): number {
  return Math.round(game.scale.gameSize.width / RENDER_SCALE);
}
