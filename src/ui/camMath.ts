import type Phaser from 'phaser';
import type { Vec2 } from '../sim/api';

// A world point in the HUD's design coordinates, for the map camera's current view.
export function worldToHud(cam: Phaser.Cameras.Scene2D.Camera, p: Vec2): Vec2 {
  const v = cam.worldView;
  return { x: (p.x - v.x) * cam.zoom, y: (p.y - v.y) * cam.zoom };
}
