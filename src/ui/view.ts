import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../config';

// The view: its height is always the 720 design height, its width grows with the screen's aspect
// (16:9 up to about 21:9) so a long phone screen is filled, not letterboxed. Scenes lay out in
// design units: edge-anchored ones (HUD, the map) use viewWidth(); modal screens laid out for
// 1280 are centred in the view (fitDesignCamera 'centre') and cover the rest with a wide fill.
export const VIEW_MAX = 1680;

// A fill that covers any view (modal dims, backdrops): centred on the 1280 design centre.
export const FILL_W = VIEW_MAX + 200;

const STEP = 8;

// The design width for a screen aspect (width / height), clamped to 1280 .. 1680 and rounded to
// 8 so a browser bar sliding a few pixels does not rebuild the layout.
export function viewFor(aspect: number): number {
  if (!(aspect > 0)) return GAME_WIDTH;
  const w = Math.round((GAME_HEIGHT * aspect) / STEP) * STEP;
  return Math.min(VIEW_MAX, Math.max(GAME_WIDTH, w));
}

let width = GAME_WIDTH;
const listeners = new Set<() => void>();

export function viewWidth(): number {
  return width;
}

// How far the view reaches past the 1280 design area on each side.
export function viewMargin(): number {
  return (width - GAME_WIDTH) / 2;
}

// Sets the view width and tells the scenes (false when it did not change).
export function setViewWidth(w: number): boolean {
  if (w === width) return false;
  width = w;
  [...listeners].forEach((f) => f());
  return true;
}

export function onViewChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

// Runs `fn` whenever the view width changes while this scene lives: the main camera is resized to
// the new canvas first. `fn` is dropped when the scene shuts down.
export function onViewResize(scene: Phaser.Scene, fn: () => void): void {
  const off = onViewChange(() => {
    scene.cameras.main.setSize(
      Math.round(width * RENDER_SCALE),
      Math.round(GAME_HEIGHT * RENDER_SCALE),
    );
    fn();
  });
  scene.events.once('shutdown', off);
  scene.events.once('destroy', off);
}
