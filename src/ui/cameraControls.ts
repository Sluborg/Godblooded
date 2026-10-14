import Phaser from 'phaser';
import { TAP_SLOP } from '../config';

const MAX_ZOOM = 2;

// One-finger drag pans, two-finger pinch zooms, wheel zooms. A press that never travels
// TAP_SLOP is a tap: `onTap` gets the world position.
export interface CameraControlOptions {
  // Smallest zoom allowed (callers pass the zoom at which the map fills the screen), in design
  // units: the camera's own zoom is this times `scale`.
  minZoom: number;
  // The canvas's render scale (config RENDER_SCALE): pointer positions arrive in canvas pixels.
  scale?: number;
  onTap?: (world: Phaser.Math.Vector2) => void;
  // True when a press at this screen position belongs to the UI, not the map.
  blocked?: (screenX: number, screenY: number) => boolean;
  // Fires when a drag, pinch or wheel zoom takes the camera by hand (cancels watch and follow).
  onManual?: () => void;
}

export function attachCameraControls(scene: Phaser.Scene, opts: CameraControlOptions): void {
  const { minZoom, onTap, blocked, onManual } = opts;
  const scale = opts.scale ?? 1;
  const cam = scene.cameras.main;
  const input = scene.input;
  input.addPointer(1);
  let pinchDist = 0;
  let dragging = false;
  let ignored = false;

  const clampZoom = (z: number) => Phaser.Math.Clamp(z, minZoom * scale, MAX_ZOOM * scale);

  input.on('pointerdown', (p: Phaser.Input.Pointer) => {
    dragging = false;
    pinchDist = 0;
    ignored = blocked?.(p.x / scale, p.y / scale) ?? false;
  });

  input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (ignored) return;
    const [a, b] = [input.pointer1, input.pointer2];
    if (a.isDown && b.isDown) {
      const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (pinchDist > 0) cam.setZoom(clampZoom(cam.zoom * (d / pinchDist)));
      pinchDist = d;
      dragging = true;
      onManual?.();
      return;
    }
    if (!p.isDown) return;
    if (!dragging && p.getDistance() < TAP_SLOP) return;
    dragging = true;
    onManual?.();
    cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
    cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
  });

  input.on('pointerup', (p: Phaser.Input.Pointer) => {
    pinchDist = 0;
    if (ignored) {
      ignored = false;
      return;
    }
    if (!dragging && p.getDistance() < TAP_SLOP && onTap) {
      onTap(cam.getWorldPoint(p.x, p.y));
    }
    if (!input.pointer1.isDown && !input.pointer2.isDown) dragging = false;
  });

  input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
    onManual?.();
    cam.setZoom(clampZoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)));
  });
}
