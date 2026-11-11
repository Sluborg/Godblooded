// Imports a painted head from the heads track (art-tasks/heads/): keys the magenta, measures the
// head against the template (art-tasks/heads/head-template.png: 1024 square, 40 px per unit, head
// origin at (512, 860)) and writes it at 16 px per unit with its size and pivot. Run
//   node scripts/art/head.mjs <upload.png> <out dir> [id] [--long-beard]
// Writes <out dir>/<id>.png and <id>.json ({ id, pxPerUnit, w, h, pivot, ox, oy, scale, measured }).
// w and h are in units; pivot is the head origin as fractions of the image; ox and oy are the
// image's top-left corner in units from the origin, so the forge can draw it at the origin.
// The upper skull width is compared with the template's example head: a head within FIT of it is
// scaled to match (about the origin), anything further off, or outside the hair and beard limits,
// is rejected with the reason, never stretched.
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  bbox,
  compressPng,
  detectKey,
  dropSpecks,
  keyOut,
  readPng,
  resample,
  visibleMask,
  writePng,
} from './lib.mjs';

export const TEMPLATE = { size: 1024, unit: 40, ox: 512, oy: 860 };
// Median width of the example head (head 1 in the template) over the upper-skull rows, in units.
export const REF_WIDTH = 15.53;
export const FIT = 0.1;
// Where paint may go, in units from the origin (hair box, nose, beard box).
export const LIMITS = { left: -9.5, right: 9.8, top: -20, bottom: 4.5, longBottom: 10.5 };
const UPPER = [-14, -11]; // rows measured for the skull width, in units

// Measures a keyed head image (any square size, framed like the template). Returns
// { ok, reason, scale, measured } where measured is in template units.
export function measureHead(img, { longBeard = false } = {}) {
  const k = img.width / TEMPLATE.size;
  const mask = visibleMask(img, 128);
  const box = bbox(mask, img.width, img.height);
  if (!box) return { ok: false, reason: 'empty image', scale: 1, measured: {} };
  const ux = (x) => (x / k - TEMPLATE.ox) / TEMPLATE.unit;
  const uy = (y) => (y / k - TEMPLATE.oy) / TEMPLATE.unit;
  const widths = [];
  for (let v = UPPER[0]; v <= UPPER[1]; v += 0.25) {
    const y = Math.round((TEMPLATE.oy + v * TEMPLATE.unit) * k);
    let x0 = -1;
    let x1 = -1;
    for (let x = 0; x < img.width; x++)
      if (mask[y * img.width + x]) {
        if (x0 < 0) x0 = x;
        x1 = x;
      }
    if (x0 >= 0) widths.push((x1 - x0 + 1) / k / TEMPLATE.unit);
  }
  widths.sort((a, b) => a - b);
  const width = widths.length ? widths[widths.length >> 1] : 0;
  const measured = {
    width: +width.toFixed(2),
    left: +ux(box.x).toFixed(2),
    right: +ux(box.x + box.w).toFixed(2),
    top: +uy(box.y).toFixed(2),
    bottom: +uy(box.y + box.h).toFixed(2),
  };
  const fail = (reason) => ({ ok: false, reason, scale: 1, measured });
  if (!width) return fail('nothing at the upper skull rows: not framed like the template');
  const scale = REF_WIDTH / width;
  if (Math.abs(1 - scale) > FIT)
    return fail(
      `skull width ${measured.width} u, template ${REF_WIDTH} u (off by more than ${FIT * 100}%)`,
    );
  const at = (u) => u * scale;
  const bottom = longBeard ? LIMITS.longBottom : LIMITS.bottom;
  if (at(measured.left) < LIMITS.left)
    return fail(`reaches x ${measured.left}, limit ${LIMITS.left}`);
  if (at(measured.right) > LIMITS.right)
    return fail(`reaches x ${measured.right}, limit ${LIMITS.right}`);
  if (at(measured.top) < LIMITS.top) return fail(`top at y ${measured.top}, limit ${LIMITS.top}`);
  if (at(measured.bottom) > bottom) return fail(`bottom at y ${measured.bottom}, limit ${bottom}`);
  return { ok: true, reason: '', scale, measured };
}

// Keys, measures and scales a head to pxPerUnit. Returns { ok, reason, img, meta }.
export function importHead(raw, id, { pxPerUnit = 16, longBeard = false } = {}) {
  const { key } = detectKey(raw);
  if (key !== 'magenta') return { ok: false, reason: `background is ${key}, not magenta` };
  const img = keyOut(raw, 'magenta');
  dropSpecks(img);
  const m = measureHead(img, { longBeard });
  if (!m.ok) return { ok: false, reason: m.reason, meta: { id, measured: m.measured } };
  const k = img.width / TEMPLATE.size;
  const box = bbox(visibleMask(img), img.width, img.height);
  // source px per output px: the template's px per unit over pxPerUnit, corrected by the scale
  const step = (TEMPLATE.unit * k) / (pxPerUnit * m.scale);
  const ow = Math.ceil(box.w / step);
  const oh = Math.ceil(box.h / step);
  const out = resample(img, { x: box.x, y: box.y, w: ow * step, h: oh * step }, ow, oh);
  const ox = ((box.x / k - TEMPLATE.ox) / TEMPLATE.unit) * m.scale;
  const oy = ((box.y / k - TEMPLATE.oy) / TEMPLATE.unit) * m.scale;
  const r = (v) => +v.toFixed(3);
  const meta = {
    id,
    pxPerUnit,
    w: r(ow / pxPerUnit),
    h: r(oh / pxPerUnit),
    pivot: [r(-ox / (ow / pxPerUnit)), r(-oy / (oh / pxPerUnit))],
    ox: r(ox),
    oy: r(oy),
    scale: r(m.scale),
    measured: m.measured,
  };
  return { ok: true, reason: '', img: out, meta };
}

if (process.argv[1] && basename(process.argv[1]) === 'head.mjs') {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const longBeard = process.argv.includes('--long-beard');
  const [src, dir, idArg] = args;
  if (!src || !dir) throw new Error('usage: head.mjs <upload.png> <out dir> [id] [--long-beard]');
  const id = idArg ?? basename(src, '.png').replace(/^.*--/, '');
  const res = importHead(readPng(src), id, { longBeard });
  if (!res.ok) {
    console.error(`REJECT ${id}: ${res.reason}`, res.meta ? JSON.stringify(res.meta.measured) : '');
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  const png = join(dir, `${id}.png`);
  writePng(png, res.img);
  await compressPng(png);
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(res.meta, null, 2) + '\n');
  console.log(`ok ${id}: ${res.img.width}x${res.img.height} px, ${JSON.stringify(res.meta)}`);
}
