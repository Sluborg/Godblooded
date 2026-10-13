import type { Vec2 } from '../sim/api';

// Pure rules of the effect synth (docs/systems/audio.md section 3): the preset format, the wobble,
// how loud a map sound is by where it happens, and the pile-up limits. No Web Audio here, so it
// is unit-tested; the sound is made in sfxPlayer.ts.

export type Wave = 'sine' | 'square' | 'saw' | 'tri' | 'noise';

// One sound layer: a wave (or noise) that sweeps from `f` to `f2` Hz over `d` seconds with a
// fast attack and an exponential fade. `at` delays its start; `lp` and `hp` filter it.
export interface SfxVoice {
  w: Wave;
  f: number;
  f2?: number;
  d: number;
  g: number;
  a?: number;
  at?: number;
  lp?: number;
  hp?: number;
}

export interface SfxPreset {
  id: string;
  voices: readonly SfxVoice[];
}

// How long a preset sounds, in seconds (its latest voice end).
export function presetLength(p: SfxPreset): number {
  return p.voices.reduce((m, v) => Math.max(m, (v.at ?? 0) + v.d), 0);
}

// Seeded pitch (+-6%) and volume (+-10%) wobble so repeats do not grate. `n` is a running count.
export function wobble(n: number): { pitch: number; vol: number } {
  const h = (k: number): number => {
    const s = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  return { pitch: 0.94 + h(1) * 0.12, vol: 0.9 + h(2) * 0.2 };
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Loudness of a map sound at `pos` for the camera view: 0 outside the view plus 20%, then 1.0 at
// the centre falling to 0.4 at the edge of that enlarged view.
export function positionGain(pos: Vec2, view: ViewBox): number {
  const hw = (view.w * 1.2) / 2;
  const hh = (view.h * 1.2) / 2;
  const dx = Math.abs(pos.x - (view.x + view.w / 2)) / hw;
  const dy = Math.abs(pos.y - (view.y + view.h / 2)) / hh;
  const d = Math.max(dx, dy);
  if (d > 1) return 0;
  return 1 - 0.6 * d;
}

export const MAX_COPIES = 4;
export const MIN_GAP_MS = 60;
export const MAX_LIVE = 12;

interface Live {
  id: string;
  until: number;
  gain: number;
}

// Pile-up limits: at most 4 copies of one preset at once, 60 ms between starts of one preset, and
// at most 12 sounds at once (the quietest request is dropped unless it is high priority).
export class SfxLimiter {
  private live: Live[] = [];
  private lastStart = new Map<string, number>();

  admit(
    id: string,
    nowMs: number,
    lenMs: number,
    gain: number,
    high = false,
    minGapMs = MIN_GAP_MS,
  ): boolean {
    this.live = this.live.filter((l) => l.until > nowMs);
    const last = this.lastStart.get(id);
    if (!high && last !== undefined && nowMs - last < minGapMs) return false;
    if (!high && this.live.filter((l) => l.id === id).length >= MAX_COPIES) return false;
    if (this.live.length >= MAX_LIVE) {
      const quietest = this.live.reduce((m, l) => (l.gain < m.gain ? l : m), this.live[0]);
      if (!high && gain <= quietest.gain) return false;
      this.live.splice(this.live.indexOf(quietest), 1);
    }
    this.lastStart.set(id, nowMs);
    this.live.push({ id, until: nowMs + lenMs, gain });
    return true;
  }
}

// At 4x speed hit sounds play at half the rate: every second one is dropped.
export function hitRateOk(speed: number, count: number): boolean {
  return speed < 4 || count % 2 === 0;
}
