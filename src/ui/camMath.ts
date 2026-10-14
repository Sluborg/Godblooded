import type Phaser from 'phaser';
import type { Vec2 } from '../sim/api';
import { RENDER_SCALE } from '../config';

// A world point in the HUD's design coordinates, for the map camera's current view (the map camera
// zooms by RENDER_SCALE on top of its design zoom; the HUD lays out in design units).
export function worldToHud(cam: Phaser.Cameras.Scene2D.Camera, p: Vec2): Vec2 {
  const v = cam.worldView;
  return { x: ((p.x - v.x) * cam.zoom) / RENDER_SCALE, y: ((p.y - v.y) * cam.zoom) / RENDER_SCALE };
}
