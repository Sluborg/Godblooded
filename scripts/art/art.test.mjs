import { describe, expect, it } from 'vitest';
import { blank, checkRaw, detectKey, keyOut, kindOf, parseId, processImage } from './lib.mjs';
import { validateAssets } from './validate.mjs';

const GREEN = [0, 255, 0];
const MAGENTA = [255, 0, 255];

// Square canvas in a key colour with a filled rectangle (the "figure") and a 1 px soft edge.
function canvas(size, key, rect, colour = [150, 60, 40]) {
  const img = blank(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p = (y * size + x) * 4;
      const inside = x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
      const edge =
        x >= rect.x - 1 && x <= rect.x + rect.w && y >= rect.y - 1 && y <= rect.y + rect.h;
      const c = inside ? colour : edge ? key.map((k, i) => Math.round((k + colour[i]) / 2)) : key;
      img.data[p] = c[0];
      img.data[p + 1] = c[1];
      img.data[p + 2] = c[2];
      img.data[p + 3] = 255;
    }
  return img;
}

// A unit framed per spec on a 1024 canvas: 75% tall, feet at 88%, centred.
const unitRect = { x: 412, y: 133, w: 200, h: 768 };

describe('ids', () => {
  it('accepts spec ids and rejects others', () => {
    expect(kindOf('hero_warrior_t2_front')?.kind).toBe('hero');
    expect(kindOf('mon_draugr_t1_back')?.dir).toBe('units');
    expect(kindOf('bld_temple_aesir_t3')?.kind).toBe('bld');
    expect(kindOf('bld_townhall_t1')?.kind).toBe('bld');
    expect(kindOf('hero_warrior_t4_front')).toBeNull();
    expect(kindOf('hero_warrior_t1_left')).toBeNull();
    expect(kindOf('foo_bar')).toBeNull();
    expect(parseId('hero_rogue_t3_back')).toEqual({ tier: 3, view: 'back' });
    expect(parseId('bld_market_t2')).toEqual({ tier: 2, view: null });
    expect(parseId('ter_grass_a')).toEqual({ tier: null, view: null });
  });
});

describe('key-out', () => {
  it('detects green and magenta keys', () => {
    expect(detectKey(canvas(64, GREEN, { x: 20, y: 20, w: 10, h: 10 })).key).toBe('green');
    expect(detectKey(canvas(64, MAGENTA, { x: 20, y: 20, w: 10, h: 10 })).key).toBe('magenta');
    expect(detectKey(canvas(64, [90, 90, 90], { x: 20, y: 20, w: 10, h: 10 })).key).toBeNull();
  });

  for (const [name, key] of [
    ['green', GREEN],
    ['magenta', MAGENTA],
  ]) {
    it(`removes ${name} and keeps the object colour`, () => {
      const out = keyOut(canvas(64, key, { x: 20, y: 20, w: 10, h: 10 }), name);
      const at = (x, y) => [...out.data.subarray((y * 64 + x) * 4, (y * 64 + x) * 4 + 4)];
      expect(at(0, 0)[3]).toBe(0);
      expect(at(25, 25)).toEqual([150, 60, 40, 255]);
      // Soft edge pixel: partly transparent, no key colour left on it.
      const [r, g, b, a] = at(19, 25);
      expect(a).toBeGreaterThan(0);
      expect(a).toBeLessThan(255);
      if (name === 'green') expect(g).toBeLessThanOrEqual(Math.max(r, b));
      else expect(Math.min(r, b)).toBeLessThanOrEqual(g);
    });
  }
});

describe('processImage', () => {
  it('scales a unit by the canvas and anchors at the feet', () => {
    const r = processImage(canvas(1024, GREEN, unitRect), 'hero_warrior_t1_front');
    expect(r.dir).toBe('units');
    // 768 px figure (+ soft edge) at nominal 75% of 1024 -> ~256 px, plus 2 px margin each side.
    expect(r.image.height).toBeGreaterThanOrEqual(259);
    expect(r.image.height).toBeLessThanOrEqual(262);
    expect(r.anchorX).toBeCloseTo(0.5, 2);
    expect(r.anchorY).toBeCloseTo(1 - 2 / r.image.height, 2);
  });

  it('keeps a bigger tier-3 silhouette bigger', () => {
    const big = { x: 362, y: 80, w: 300, h: 821 };
    const r = processImage(canvas(1024, MAGENTA, big), 'mon_troll_t3_front');
    expect(r.key).toBe('magenta');
    expect(r.image.height).toBeGreaterThan(270);
  });

  it('drops stray specks', () => {
    const img = canvas(1024, GREEN, unitRect);
    for (const p of [5 * 1024 + 900, 6 * 1024 + 900]) img.data.set([200, 30, 30], p * 4);
    expect(processImage(img, 'hero_warrior_t1_front').specks).toBeGreaterThan(0);
  });

  it('refuses a non-key background', () => {
    expect(() => processImage(canvas(256, [80, 80, 80], unitRect), 'hero_x_t1_front')).toThrow();
  });
});

describe('checkRaw', () => {
  it('passes a well framed unit and flags a badly framed one', () => {
    expect(checkRaw(canvas(1024, GREEN, unitRect), 'hero_warrior_t1_front')).toEqual([]);
    const small = { x: 462, y: 600, w: 100, h: 300 };
    const problems = checkRaw(canvas(1024, GREEN, small), 'hero_warrior_t1_front');
    expect(problems.join(' ')).toMatch(/canvas height/);
  });
});

describe('shipped assets', () => {
  it('manifest and PNGs match docs/asset-spec.md', () => {
    const { errors } = validateAssets();
    expect(errors).toEqual([]);
  });
});
