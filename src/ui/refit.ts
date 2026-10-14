import type Phaser from 'phaser';

// Keeps the canvas filling its parent (Stefan's Pixel, 2026-10-14: the canvas stayed about 985x555
// inside a 1920x750 area). Phaser measures the parent when the window fires `resize`; an installed
// fullscreen app or a browser bar that moves can change the area without a window `resize` the game
// hears in time. So the scale manager is told to measure again on every signal that the area may
// have changed, and a few times just after load.
export function keepFitted(
  game: Phaser.Game,
  parent: HTMLElement | null = document.getElementById('game'),
): void {
  const refit = () => game.scale.refresh();
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
