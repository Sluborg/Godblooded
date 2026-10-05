import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  blank,
  checkRaw,
  collectUploads,
  detectKey,
  keyOut,
  kindOf,
  parseId,
  processImage,
  processFrames,
  processPair,
  writePng,
} from './lib.mjs';
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
    expect(kindOf('mon_jackal-man_t1_front')?.kind).toBe('mon');
    expect(kindOf('bld_temple_aesir_t1')?.kind).toBe('bld');
    expect(kindOf('mon_jackal_man_t1_front')).toBeNull();
    expect(kindOf('hero_warrior_t4_front')).toBeNull();
    expect(kindOf('hero_warrior_t1_left')).toBeNull();
    expect(kindOf('foo_bar')).toBeNull();
    expect(parseId('hero_rogue_t3_back')).toEqual({ tier: 3, view: 'back', part: null });
    expect(parseId('bld_market_t2')).toEqual({ tier: 2, view: null, part: null });
    expect(parseId('ter_grass_a')).toEqual({ tier: null, view: null, part: null });
    expect(parseId('hero_warrior_t1_side_arm')).toEqual({ tier: 1, view: 'side', part: 'arm' });
    expect(kindOf('hero_warrior_t1_front_body')?.kind).toBe('hero');
    expect(kindOf('hero_warrior_t1_front_leg')).toBeNull();
    expect(parseId('hero_warrior_t1_front_walk3')).toEqual({
      tier: 1,
      view: 'front',
      part: 'walk3',
    });
    expect(kindOf('mon_draugr_t1_front_attack2')?.kind).toBe('mon');
    expect(kindOf('hero_warrior_t1_front_hurt')?.kind).toBe('hero');
    expect(kindOf('hero_warrior_t1_front_walk5')).toBeNull();
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

describe('processPair', () => {
  it('crops body and arm alike and finds the shoulder', () => {
    // Body: the unit rectangle. Arm: a strip hanging beside it from y 300 down, touching it.
    const body = canvas(1024, GREEN, unitRect);
    const arm = canvas(1024, GREEN, { x: 380, y: 300, w: 32, h: 350 });
    const r = processPair(body, arm, 'hero_warrior_t1_front');
    expect(r.arm.image.width).toBe(r.body.image.width);
    expect(r.arm.image.height).toBe(r.body.image.height);
    expect(r.arm.anchorY).toBe(r.body.anchorY);
    // Shoulder: top of the contact, at the arm's right edge next to the body.
    expect(r.pivot.y).toBeGreaterThanOrEqual(298);
    expect(r.pivot.y).toBeLessThan(345);
    expect(r.pivot.x).toBeGreaterThan(395);
    expect(r.arm.pivotX).toBeGreaterThan(0);
    expect(r.arm.pivotY).toBeLessThan(0.4);
  });

  it('has no pivot when the arm does not touch', () => {
    const body = canvas(1024, GREEN, unitRect);
    const arm = canvas(1024, GREEN, { x: 200, y: 300, w: 32, h: 350 });
    expect(processPair(body, arm, 'hero_warrior_t1_front').pivot).toBeNull();
  });
});

describe('processFrames', () => {
  it('crops all frames of a unit alike', () => {
    const f1 = canvas(1024, GREEN, unitRect);
    const f2 = canvas(1024, GREEN, { x: 380, y: 160, w: 300, h: 741 });
    const out = processFrames([
      { id: 'hero_warrior_t1_front_walk1', raw: f1 },
      { id: 'hero_warrior_t1_front_walk2', raw: f2 },
    ]);
    expect(out[0].image.width).toBe(out[1].image.width);
    expect(out[0].image.height).toBe(out[1].image.height);
    expect(out[0].anchorY).toBe(out[1].anchorY);
  });

  it('moves a frame whose feet drifted onto the feet of the first frame', () => {
    const f1 = canvas(1024, GREEN, unitRect);
    const f2 = canvas(1024, GREEN, { ...unitRect, x: unitRect.x + 40, y: unitRect.y - 20 });
    const out = processFrames([
      { id: 'hero_warrior_t1_front_walk1', raw: f1 },
      { id: 'hero_warrior_t1_front_walk2', raw: f2 },
    ]);
    expect(out[1].shifted).toEqual({ dx: -40, dy: 20 });
    // Same figure, same place: the two crops are identical.
    expect(out[1].image.data.equals(out[0].image.data)).toBe(true);
  });
});

describe('collectUploads', () => {
  it('reads batch, trial and plain names', () => {
    const dir = mkdtempSync(join(tmpdir(), 'art-'));
    for (const f of [
      'B1--hero_a_t1_front.png',
      'test--hero_a_t1_back.png',
      'mon_b_t1_front.png',
      'R1--hero_a_t1_side_arm.png',
    ])
      writeFileSync(join(dir, f), '');
    expect(collectUploads(dir).map(({ id, batch, test }) => [id, batch, test])).toEqual([
      ['hero_a_t1_front', 'B1', false],
      ['hero_a_t1_side_arm', 'R1', false],
      ['mon_b_t1_front', null, false],
      ['hero_a_t1_back', null, true],
    ]);
  });
});

describe('strike fields', () => {
  // A temp repo with one shipped unit and the given extra manifest fields.
  function errorsFor(extra) {
    const root = mkdtempSync(join(tmpdir(), 'art-'));
    mkdirSync(join(root, 'public/assets/units'), { recursive: true });
    const r = processImage(canvas(1024, GREEN, unitRect), 'hero_warrior_t1_front');
    writePng(join(root, 'public/assets/units/hero_warrior_t1_front.png'), r.image);
    const row = {
      id: 'hero_warrior_t1_front',
      kind: 'hero',
      tier: 1,
      view: 'front',
      file: 'units/hero_warrior_t1_front.png',
      anchorX: r.anchorX,
      anchorY: r.anchorY,
      license: 'own',
      source: 'T1',
      ...extra,
    };
    writeFileSync(join(root, 'public/assets/manifest.json'), JSON.stringify({ assets: [row] }));
    return validateAssets(root).errors;
  }

  it('accepts a strike with its weapon point', () => {
    expect(errorsFor({ strike: 'chop', weaponX: 0.1, weaponY: 0.2 })).toEqual([]);
    expect(
      errorsFor({ strike: 'double', weaponX: 0.1, weaponY: 0.2, weapon2X: 0.9, weapon2Y: 0.6 }),
    ).toEqual([]);
  });

  it('rejects bad strikes and half points', () => {
    expect(errorsFor({ strike: 'kick' }).join()).toMatch(/strike must be/);
    expect(errorsFor({ strike: 'chop', weaponX: 0.1 }).join()).toMatch(/go together/);
    expect(errorsFor({ strike: 'double', weaponX: 0.1, weaponY: 0.2 }).join()).toMatch(/needs/);
    expect(errorsFor({ weaponX: 1.5, weaponY: 0.2 }).join()).toMatch(/0\.\.1/);
  });
});

describe('shipped assets', () => {
  it('manifest and PNGs match docs/asset-spec.md', () => {
    const { errors } = validateAssets();
    expect(errors).toEqual([]);
  });
});
