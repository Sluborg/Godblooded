import { describe, expect, it } from 'vitest';
import {
  FRAME_COUNT,
  attackFrame,
  frameState,
  idleFrame,
  koFrame,
  lookBytes,
  pxPerUnit,
  walkFrame,
} from './frames';

describe('frame choice', () => {
  it('walks through every walk frame once per stride and wraps', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) seen.add(walkFrame(i / 60));
    expect(seen.size).toBe(FRAME_COUNT.walk);
    expect(walkFrame(2.5)).toBe(walkFrame(0.5));
    expect(walkFrame(-0.25)).toBe(walkFrame(0.75));
  });
  it('idle breathes through its frames', () => {
    const seen = new Set<number>();
    for (let t = 0; t < 9; t += 0.05) seen.add(idleFrame(t));
    expect(seen.size).toBe(FRAME_COUNT.idle);
  });
  it('attack runs from the first to the last frame and clamps', () => {
    expect(attackFrame(0)).toBe(0);
    expect(attackFrame(1)).toBe(FRAME_COUNT.attack - 1);
    expect(attackFrame(-1)).toBe(0);
    expect(attackFrame(9)).toBe(FRAME_COUNT.attack - 1);
  });
  it('ko goes from the first to the last frame', () => {
    expect(koFrame(0)).toBe(0);
    expect(koFrame(1)).toBe(FRAME_COUNT.ko - 1);
  });
  it('builds a drawing state for every frame', () => {
    expect(frameState('walk', 2).pose.moving).toBe(true);
    expect(frameState('attack', 0).pose.atkT).toBe(0);
    expect(frameState('attack', FRAME_COUNT.attack - 1).pose.atkT).toBe(1);
    expect(frameState('ko', FRAME_COUNT.ko - 1).pose.ko).toBe(true);
    expect(frameState('idle', 1).pose.atkT).toBe(-1);
  });
});

describe('bake memory', () => {
  it('a look stays near 2 MB on the GPU at the densest screen', () => {
    expect(pxPerUnit(1)).toBe(1.2);
    expect(pxPerUnit(3)).toBe(1.5);
    expect(lookBytes(pxPerUnit(3))).toBeLessThan(2.5 * 1024 * 1024);
    // 12 looks alive at once (idle ones are released) with their canvases stay under 64 MB.
    expect(12 * 2 * lookBytes(pxPerUnit(2))).toBeLessThan(64 * 1024 * 1024);
  });
});
