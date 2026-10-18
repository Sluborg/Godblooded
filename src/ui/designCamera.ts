import type Phaser from 'phaser';
import { GAME_HEIGHT, RENDER_SCALE } from '../config';
import { onScaleChange, onViewResize, viewMargin, viewWidth } from './view';

// The canvas has RENDER_SCALE times the design pixels; a scene that lays out in design units zooms
// its camera by that, anchored so design (0, 0) is the top left corner of the view. Call at the
// top of create(). 'centre': the scene is laid out for the 1280 design area, which is centred in
// a wider view (its dims and backdrops use FILL_W to cover the rest). The scene's 'relayout' event
// fires after the view width changed.
export function fitDesignCamera(scene: Phaser.Scene, mode: 'edge' | 'centre' = 'edge'): void {
  const cam = scene.cameras.main;
  const apply = () => {
    cam.setZoom(RENDER_SCALE);
    // The zoom pivots on the camera centre: scroll so the left edge of the view looks at design x
    // 0 (or, centred, at the 1280 area's margin) and the top at design y 0.
    const left = mode === 'centre' ? -viewMargin() : 0;
    cam.setScroll(
      (viewWidth() * (1 - RENDER_SCALE)) / 2 + left,
      (GAME_HEIGHT * (1 - RENDER_SCALE)) / 2,
    );
  };
  cam.setSize(Math.round(viewWidth() * RENDER_SCALE), Math.round(GAME_HEIGHT * RENDER_SCALE));
  apply();
  onViewResize(scene, () => {
    apply();
    scene.events.emit('relayout');
  });
  // A scale change only needs the zoom again, not a new layout (the design units are the same).
  onScaleChange(scene, apply);
}
