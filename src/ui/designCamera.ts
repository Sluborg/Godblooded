import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '../config';

// The canvas has RENDER_SCALE times the design pixels; a scene that lays out in design units zooms
// its camera by that, anchored so design (0, 0) is the top left corner. Call at the top of create().
export function fitDesignCamera(scene: Phaser.Scene): void {
  const cam = scene.cameras.main;
  cam.setZoom(RENDER_SCALE);
  // The zoom pivots on the camera centre: scroll so the centre looks at the design centre.
  cam.setScroll((GAME_WIDTH * (1 - RENDER_SCALE)) / 2, (GAME_HEIGHT * (1 - RENDER_SCALE)) / 2);
}
