import { describe, expect, it } from 'vitest';
import { textureScale } from './bake';

describe('textureScale', () => {
  it('reads the scale a baked texture was made at from its id', () => {
    expect(textureScale('bake:rings:12x6:[{"w":4}]:1.75')).toBe(1.75);
    expect(textureScale('bake:ember:2')).toBe(2);
    expect(textureScale('bake:hudbtn:100x50:pressed:1.25')).toBe(1.25);
  });

  it('counts any other texture as the live scale', () => {
    expect(textureScale('ui_button')).toBeGreaterThanOrEqual(1);
    expect(textureScale('bake:broken:abc')).toBeGreaterThanOrEqual(1);
  });
});
