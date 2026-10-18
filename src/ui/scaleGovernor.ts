// Live dynamic resolution (Lead, 2026-10-18): the map is fill-bound on a phone, so the render scale
// steps down while the frame rate is poor and back up when there is room. Pure: fed the real time
// of every frame, it says when to change the scale.
export const SCALE_STEPS = [2, 1.75, 1.5, 1.25] as const;
// A window of this long is averaged; below LOW_FPS the scale steps down, UP_WINDOWS windows in a
// row at or above HIGH_FPS step it up.
export const WINDOW_MS = 2000;
export const LOW_FPS = 50;
export const HIGH_FPS = 58;
export const UP_WINDOWS = 5;
// Frames in the first moments are slow while shaders compile and textures upload.
export const WARMUP_MS = 3000;
// A gap longer than this between frames is a pause or a hidden tab, not slowness.
export const MAX_GAP_MS = 1000;
// A scale we stepped down from is not tried again for this long (no flapping).
export const BAN_MS = 60_000;

export class ScaleGovernor {
  private startMs: number | null = null;
  private windowStart = 0;
  private frames = 0;
  private lastMs = 0;
  private good = 0;
  private readonly banned = new Map<number, number>();

  // `scale`: the scale the canvas has now; `ceiling`: the most this device may use.
  constructor(
    private scale: number,
    private readonly ceiling: number,
  ) {}

  get current(): number {
    return this.scale;
  }

  private steps(): number[] {
    return SCALE_STEPS.filter((s) => s <= this.ceiling + 1e-9);
  }

  // Call once per frame with the real time in ms; the new scale when it should change, else null.
  frame(nowMs: number, visible = true): number | null {
    if (this.startMs === null) this.startMs = nowMs;
    if (this.lastMs > 0 && nowMs - this.lastMs > MAX_GAP_MS) this.restart(nowMs);
    this.lastMs = nowMs;
    if (!visible || nowMs - this.startMs < WARMUP_MS) {
      this.restart(nowMs);
      return null;
    }
    this.frames++;
    const span = nowMs - this.windowStart;
    if (span < WINDOW_MS) return null;
    const fps = (this.frames * 1000) / span;
    this.windowStart = nowMs;
    this.frames = 0;
    const steps = this.steps();
    const at = steps.indexOf(this.scale);
    if (fps < LOW_FPS) {
      this.good = 0;
      if (at >= 0 && at < steps.length - 1) return this.change(nowMs, steps[at + 1], true);
      return null;
    }
    if (fps >= HIGH_FPS) {
      this.good++;
      if (this.good >= UP_WINDOWS && at > 0) {
        const up = steps[at - 1];
        if ((this.banned.get(up) ?? 0) <= nowMs) return this.change(nowMs, up, false);
      }
    } else this.good = 0;
    return null;
  }

  private change(nowMs: number, to: number, down: boolean): number {
    if (down) this.banned.set(this.scale, nowMs + BAN_MS);
    this.scale = to;
    this.good = 0;
    // The first frames after a resize are slow: measure from scratch.
    this.restart(nowMs);
    return to;
  }

  private restart(nowMs: number): void {
    this.windowStart = nowMs;
    this.frames = 0;
  }
}
