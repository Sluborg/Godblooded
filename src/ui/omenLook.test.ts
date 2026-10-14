import { describe, expect, it } from 'vitest';
import { omenLabel, omenSky, skyAlpha } from './omenLook';
import type { OmenView } from '../sim/api';

const view = (phase: 'announced' | 'active', msLeft: number): OmenView => ({
  id: 'x',
  name: 'Red Sky',
  text: '',
  phase,
  msLeft,
});

describe('omenLook', () => {
  it('knows ids and falls back to what the mods do', () => {
    expect(omenSky(undefined, 'red_sky').color).toBe(0xc4281e);
    expect(omenSky({ id: 'n', mods: { moveSpeed: 0.8 } }, 'n').color).toBe(0x9cc8ff);
    expect(omenSky({ id: 'n', mods: { undeadDamage: 1.3 } }, 'n').alpha).toBeGreaterThan(0.3);
    expect(omenSky(undefined, 'unknown').color).toBe(0xb8a4ff);
  });
  it('fades in while announced, holds, fades out at the end', () => {
    const sky = omenSky(undefined, 'red_sky');
    expect(skyAlpha(sky, null, 30000)).toBe(0);
    expect(skyAlpha(sky, view('announced', 30000), 30000)).toBe(0);
    expect(skyAlpha(sky, view('announced', 0), 30000)).toBeCloseTo(sky.alpha / 2);
    expect(skyAlpha(sky, view('active', 50000), 30000)).toBe(sky.alpha);
    expect(skyAlpha(sky, view('active', 500), 30000)).toBeCloseTo(sky.alpha / 2);
  });
  it('labels the countdown', () => {
    expect(omenLabel(view('announced', 45000))).toBe('Red Sky in 0:45');
    expect(omenLabel(view('active', 80000))).toBe('Red Sky 1:20');
  });
});
