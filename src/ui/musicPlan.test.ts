import { describe, expect, it } from 'vitest';
import { MUSIC_STEP, musicLevel, nextVoiceAtMs, stepVolume, voiceGain } from './musicPlan';

const LOOP = { startMs: 0, endMs: 121888, fadeMs: 2000 };

describe('volume', () => {
  it('steps by 5% and stays in 0..1', () => {
    expect(MUSIC_STEP).toBe(0.05);
    expect(stepVolume(0.6, 1)).toBe(0.65);
    expect(stepVolume(0.6, -1)).toBe(0.55);
    expect(stepVolume(1, 1)).toBe(1);
    expect(stepVolume(0, -1)).toBe(0);
  });
  it('mute is silence', () => {
    expect(musicLevel(0.6, true)).toBe(0);
    expect(musicLevel(0.6, false)).toBe(0.6);
  });
});

describe('loop crossfade', () => {
  it('starts the next copy one fade before the loop end', () => {
    expect(nextVoiceAtMs(LOOP)).toBe(119888);
  });
  it('first voice plays at full gain then fades out; the next fades in', () => {
    expect(voiceGain(1000, LOOP, false)).toBe(1);
    expect(voiceGain(121888, LOOP, false)).toBeCloseTo(0, 5);
    expect(voiceGain(0, LOOP, true)).toBe(0);
    expect(voiceGain(2000, LOOP, true)).toBeCloseTo(1, 5);
  });
  it('keeps the summed power level across the overlap', () => {
    for (const t of [0, 500, 1000, 1500, 2000]) {
      const out = voiceGain(119888 + t, LOOP, false);
      const into = voiceGain(t, LOOP, true);
      expect(out * out + into * into).toBeCloseTo(1, 5);
    }
  });
});
