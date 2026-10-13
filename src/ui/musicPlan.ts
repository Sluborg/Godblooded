// Pure rules for the music player (docs/systems/audio.md section 1): volume steps and the
// crossfade between the end of a loop and its start. No Phaser here, so it is unit-tested.

export const MUSIC_STEP = 0.05;

export function stepVolume(volume: number, dir: 1 | -1): number {
  const next = Math.round((volume + dir * MUSIC_STEP) * 20) / 20;
  return Math.min(1, Math.max(0, next));
}

// What the player multiplies the music by: the setting, or silence when muted.
export function musicLevel(volume: number, muted: boolean): number {
  return muted ? 0 : Math.min(1, Math.max(0, volume));
}

export interface LoopPoints {
  startMs: number;
  endMs: number;
  fadeMs: number;
}

// When the next copy of a looping track must start: one crossfade before the loop end.
export function nextVoiceAtMs(loop: LoopPoints): number {
  return Math.max(loop.startMs, loop.endMs - loop.fadeMs);
}

// Equal-power gain of one voice at `posMs` into the file. A voice that is not the first fades in
// over its first `fadeMs` after the loop start and fades out over the last `fadeMs` before the
// loop end; the two copies overlap there, so the sum stays level.
export function voiceGain(posMs: number, loop: LoopPoints, fadesIn: boolean): number {
  const fade = Math.max(1, loop.fadeMs);
  let g = 1;
  if (fadesIn) {
    const t = Math.min(1, Math.max(0, (posMs - loop.startMs) / fade));
    g *= Math.sin((t * Math.PI) / 2);
  }
  const out = Math.min(1, Math.max(0, (posMs - (loop.endMs - fade)) / fade));
  g *= Math.cos((out * Math.PI) / 2);
  return g;
}
