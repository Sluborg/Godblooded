// Dev: builds the rig kit of an animation-test unit from its spec (anim-test/specs/<name>.json)
// and the components cut by scripts/anim-slice.mjs: torso (the body without the head), head (cut
// along a polygon, overlapping the neck so no seam shows), weapon with its fist, off-hand (a fist
// or a shield), one boot with its toe pointing forward. Writes anim-test/<name>/kit.json + pieces.
//   node scripts/anim-build.mjs <name>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const name = process.argv[2];
const spec = JSON.parse(readFileSync(`anim-test/specs/${name}.json`, 'utf8'));
const dir = `anim-test/${name}`;
mkdirSync(dir, { recursive: true });
const sdir = `anim-test/${spec.src}`;
const meta = JSON.parse(readFileSync(`${sdir}/components.json`, 'utf8'));
const M = 2; // the slicer's crop margin

// A component as an RGBA raster in source coordinates (ox, oy = source position of its top left).
async function load(idx) {
  const c = meta.comps[idx];
  const { data, info } = await sharp(`${sdir}/c${idx}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    buf: Buffer.from(data),
    w: info.width,
    h: info.height,
    ox: c.bbox[0] - M,
    oy: c.bbox[1] - M,
  };
}
const inPoly = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
// Keeps the pixels where keep(sx, sy) is true.
const mask = (r, keep) => {
  const out = Buffer.from(r.buf);
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++) if (!keep(x + r.ox, y + r.oy)) out[(y * r.w + x) * 4 + 3] = 0;
  return { ...r, buf: out };
};
// Trims to the visible pixels (+ margin), keeping the source offset.
function trim(r) {
  let x0 = r.w,
    y0 = r.h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < r.h; y++)
    for (let x = 0; x < r.w; x++)
      if (r.buf[(y * r.w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  const m = 2;
  x0 = Math.max(0, x0 - m);
  y0 = Math.max(0, y0 - m);
  x1 = Math.min(r.w - 1, x1 + m);
  y1 = Math.min(r.h - 1, y1 + m);
  const w = x1 - x0 + 1,
    h = y1 - y0 + 1;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    r.buf.copy(buf, y * w * 4, ((y + y0) * r.w + x0) * 4, ((y + y0) * r.w + x0 + w) * 4);
  return { buf, w, h, ox: r.ox + x0, oy: r.oy + y0 };
}
const save = (r, file) =>
  sharp(r.buf, { raw: { width: r.w, height: r.h, channels: 4 } })
    .png()
    .toFile(`${dir}/${file}`);
const frac = (r, [sx, sy]) => [(sx - r.ox) / r.w, (sy - r.oy) / r.h];

// Rotates a raster clockwise by `deg` (transparent corners); returns it and a point mapper.
async function rotate(r, deg, pts) {
  if (!deg) return { r, pts };
  const out = await sharp(r.buf, { raw: { width: r.w, height: r.h, channels: 4 } })
    .rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const nr = { buf: Buffer.from(out.data), w: out.info.width, h: out.info.height, ox: 0, oy: 0 };
  const th = (deg * Math.PI) / 180;
  const c = Math.cos(th),
    s = Math.sin(th);
  // Source point (relative to the old raster) -> new raster pixel.
  const map = ([px, py]) => {
    const dx = px - r.ox - r.w / 2,
      dy = py - r.oy - r.h / 2;
    return [nr.w / 2 + dx * c - dy * s, nr.h / 2 + dx * s + dy * c];
  };
  return { r: nr, pts: Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, map(v)])) };
}

// ---- the pieces ----
let body = await load(spec.body);
let offhandR;
if (spec.offhand.cut) {
  const [bx, by, bw, bh] = spec.offhand.cut.box;
  const inBox = (x, y) => x >= bx && x < bx + bw && y >= by && y < by + bh;
  offhandR = trim(mask(await load(spec.offhand.cut.from), inBox));
  body = mask(body, (x, y) => !inBox(x, y));
} else offhandR = trim(await load(spec.offhand.comp));

// Head: along the polygon; the body keeps a band under the head so a lagging head shows no gap.
const head = trim(mask(body, (x, y) => inPoly(x, y, spec.headPoly)));
const band = 14;
const torso = trim(mask(body, (x, y) => !(inPoly(x, y, spec.headPoly) && y < spec.neck[1] - band)));

// Scale: the figure (head top to boot bottom) is 44 drawing units tall.
const topY = Math.min(...meta.comps.map((c) => c.bbox[1]));
const ppu = (spec.ground - topY) / 44;

// Weapon with its fist, turned upright; grip = the fist.
let weapon = trim(await load(spec.weapon.comp));
const wrot = await rotate(weapon, spec.weapon.rotate ?? 0, { fist: spec.weapon.fist });
weapon = trim(wrot.r.ox === 0 && spec.weapon.rotate ? wrot.r : weapon);
const wfist = spec.weapon.rotate ? wrot.pts.fist : spec.weapon.fist;
// After rotating, trim() works in the new raster's own coordinates (ox 0).
const weaponGrip = spec.weapon.rotate
  ? [(wfist[0] - weapon.ox) / weapon.w, (wfist[1] - weapon.oy) / weapon.h]
  : frac(weapon, wfist);

// One boot, toe forward (right).
let boot = trim(await load(spec.boot.comp));
if (spec.boot.flip) {
  const f = await sharp(boot.buf, { raw: { width: boot.w, height: boot.h, channels: 4 } })
    .flop()
    .raw()
    .toBuffer();
  boot = { ...boot, buf: Buffer.from(f) };
}

await save(torso, 'torso.png');
await save(head, 'head.png');
await save(weapon, 'weapon.png');
await save(offhandR, 'offhand.png');
await save(boot, 'boot.png');
// The hand slot is empty (the fists are part of the weapon and the off-hand pieces).
const empty = Buffer.alloc(4 * 4);
await sharp(empty, { raw: { width: 2, height: 2, channels: 4 } })
  .png()
  .toFile(`${dir}/hand.png`);

// The rig puts the torso's hip pivot at 15 units above the ground: that is the source point
// (neck x, ground - 15 ppu).
const hipSrc = [spec.neck[0], spec.ground - 15 * ppu];
const kit = {
  look: spec.look,
  ppu,
  mode: 'floating',
  parts: {
    torso: {
      file: 'torso.png',
      w: torso.w,
      h: torso.h,
      pivots: {
        hip: frac(torso, hipSrc),
        neck: frac(torso, spec.neck),
        clasp: frac(torso, [spec.neck[0] - 40, spec.neck[1]]),
      },
    },
    head: {
      file: 'head.png',
      w: head.w,
      h: head.h,
      pivots: { neck: frac(head, spec.neck), brow: [0.5, 0.45] },
    },
    hand: { file: 'hand.png', w: 2, h: 2, pivots: { wrist: [0.5, 0.5], grip: [0.5, 0.5] } },
    boot: {
      file: 'boot.png',
      w: boot.w,
      h: boot.h,
      pivots: { ground: [0.5, 0.92], ankle: [0.5, 0.25] },
    },
    weapon: { file: 'weapon.png', w: weapon.w, h: weapon.h, pivots: { grip: weaponGrip } },
    offhand:
      spec.offhand.kind === 'shield'
        ? {
            file: 'offhand.png',
            w: offhandR.w,
            h: offhandR.h,
            pivots: { strap: frac(offhandR, spec.offhand.centre) },
          }
        : {
            file: 'offhand.png',
            w: offhandR.w,
            h: offhandR.h,
            pivots: { grip: frac(offhandR, spec.offhand.centre) },
          },
  },
};
writeFileSync(`${dir}/kit.json`, JSON.stringify(kit, null, 1));
console.log(
  name,
  'ppu',
  ppu.toFixed(1),
  'torso',
  torso.w,
  torso.h,
  'head',
  head.w,
  head.h,
  'weapon',
  weapon.w,
  weapon.h,
);
