import Phaser from 'phaser';

const MAX_ZOOM = 2;
// Pointer travel (screen px) before a press counts as a drag instead of a tap.
const DRAG_THRESHOLD = 10;

// One-finger drag pans, two-finger pinch zooms, wheel zooms. A press that never travels
// DRAG_THRESHOLD is a tap: `onTap` gets the world position.
export interface CameraControlOptions {
  // Smallest zoom allowed (callers pass the zoom at which the map fills the screen).
  minZoom: number;
  onTap?: (world: Phaser.Math.Vector2) => void;
  // True when a press at this screen position belongs to the UI, not the map.
  blocked?: (screenX: number, screenY: number) => boolean;
}

export function attachCameraControls(scene: Phaser.Scene, opts: CameraControlOptions): void {
  const { minZoom, onTap, blocked } = opts;
  const cam = scene.cameras.main;
  const input = scene.input;
  input.addPointer(1);
  let pinchDist = 0;
  let dragging = false;
  let ignored = false;

  const clampZoom = (z: number) => Phaser.Math.Clamp(z, minZoom, MAX_ZOOM);

  input.on('pointerdown', (p: Phaser.Input.Pointer) => {
    dragging = false;
    pinchDist = 0;
    ignored = blocked?.(p.x, p.y) ?? false;
  });

  input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (ignored) return;
    const [a, b] = [input.pointer1, input.pointer2];
    if (a.isDown && b.isDown) {
      const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (pinchDist > 0) cam.setZoom(clampZoom(cam.zoom * (d / pinchDist)));
      pinchDist = d;
      dragging = true;
      return;
    }
    if (!p.isDown) return;
    if (!dragging && p.getDistance() < DRAG_THRESHOLD) return;
    dragging = true;
    cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
    cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
  });

  input.on('pointerup', (p: Phaser.Input.Pointer) => {
    pinchDist = 0;
    if (ignored) {
      ignored = false;
      return;
    }
    if (!dragging && p.getDistance() < DRAG_THRESHOLD && onTap) {
      onTap(cam.getWorldPoint(p.x, p.y));
    }
    if (!input.pointer1.isDown && !input.pointer2.isDown) dragging = false;
  });

  input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
    cam.setZoom(clampZoom(cam.zoom * (dy > 0 ? 0.9 : 1.1)));
  });
}
