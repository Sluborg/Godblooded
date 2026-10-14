// A safety net for sharp rendering (Lead, 2026-10-14): when the map runs under MIN_FPS for a whole
// WINDOW_MS in the first WATCH_MS of a run, the next start renders at scale 1. Pure: it is fed the
// real time of every frame.
export const MIN_FPS = 30;
export const WINDOW_MS = 5000;
export const WATCH_MS = 60_000;
// Frames in the first moments are slow while shaders compile and textures upload.
export const WARMUP_MS = 3000;
export const MAX_GAP_MS = 2000;

export class FpsGuard {
  private startMs: number | null = null;
  private windowStart = 0;
  private frames = 0;
  private lastMs = 0;
  private done = false;

  // Call once per frame with the real time in ms; true once, when the window ran too slow.
  frame(nowMs: number, visible = true): boolean {
    if (this.done) return false;
    if (this.startMs === null) this.startMs = nowMs;
    // A long gap between frames is a pause or a hidden tab, not slowness: restart the window.
    if (nowMs - this.lastMs > MAX_GAP_MS && this.lastMs > 0) {
      this.windowStart = nowMs;
      this.frames = 0;
    }
    this.lastMs = nowMs;
    const t = nowMs - this.startMs;
    if (t > WATCH_MS) {
      this.done = true;
      return false;
    }
    // A hidden tab or a pause in the loop is not slowness: restart the window.
    if (!visible || t < WARMUP_MS) {
      this.windowStart = nowMs;
      this.frames = 0;
      return false;
    }
    this.frames++;
    const span = nowMs - this.windowStart;
    if (span < WINDOW_MS) return false;
    const fps = (this.frames * 1000) / span;
    this.windowStart = nowMs;
    this.frames = 0;
    if (fps < MIN_FPS) {
      this.done = true;
      return true;
    }
    return false;
  }
}
