// Imports a painted head from the heads track (art-tasks/heads/): keys the magenta, measures the
// head against the template (art-tasks/heads/head-template.png: 1024 square, 40 px per unit, head
// origin at (512, 860)) and writes it at 16 px per unit with its size and pivot. Run
//   node scripts/art/head.mjs <upload.png> <out dir> [id] [--long-beard] [--name=<name>]
// Writes <out dir>/<id>.png (32 px per unit) and <id>.json ({ id, name, skin, pxPerUnit, w, h, pivot,
// ox, oy, scale, measured, warnings }); skin is the cheek colour as hex.
// w and h are in units; pivot is the head origin as fractions of the image; ox and oy are the
// image's top-left corner in units from the origin, so the forge can draw it at the origin.
// The upper skull width is compared with the template's example head and the head is scaled to
// match (about the origin). A miss (skull width off by more than FIT, paint outside the hair and
// beard limits) only prints a warning and goes into the JSON: Stefan judges heads by eye.
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

// Measures a keyed head image (any square size, framed like the template). Never rejects a fit:
// misses come back as warnings and the head is still scaled to the template. Only an empty image
// is not ok. Returns { ok, reason, warnings, scale, measured }; measured is in template units.
export function measureHead(img, { longBeard = false } = {}) {
  const k = img.width / TEMPLATE.size;
  const mask = visibleMask(img, 128);
  const box = bbox(mask, img.width, img.height);
  if (!box) return { ok: false, reason: 'empty image', warnings: [], scale: 1, measured: {} };
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
  const warnings = [];
  let scale = 1;
  if (!width) warnings.push('nothing at the upper skull rows: not framed like the template');
  else {
    scale = REF_WIDTH / width;
    if (Math.abs(1 - scale) > FIT)
      warnings.push(
        `skull width ${measured.width} u, template ${REF_WIDTH} u (off by more than ${FIT * 100}%)`,
      );
  }
  const at = (u) => u * scale;
  const bottom = longBeard ? LIMITS.longBottom : LIMITS.bottom;
  if (at(measured.left) < LIMITS.left)
    warnings.push(`reaches x ${measured.left}, limit ${LIMITS.left}`);
  if (at(measured.right) > LIMITS.right)
    warnings.push(`reaches x ${measured.right}, limit ${LIMITS.right}`);
  if (at(measured.top) < LIMITS.top) warnings.push(`top at y ${measured.top}, limit ${LIMITS.top}`);
  if (at(measured.bottom) > bottom)
    warnings.push(`bottom at y ${measured.bottom}, limit ${bottom}`);
  return { ok: true, reason: '', warnings, scale, measured };
}

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const skinLike = (r, g, b) => r > 110 && r > g && g > b && r - b >= 25 && r - b <= 150;

// Median skin colour of a head, in template units: first a patch on the cheek (below the eye line,
// between the ear and the nose), else anywhere on the face area. Returns "#rrggbb" or null.
export function sampleSkin(img) {
  const k = img.width / TEMPLATE.size;
  const patch = (x0, x1, y0, y1) => {
    const ch = [[], [], []];
    for (
      let y = Math.round((TEMPLATE.oy + y0 * TEMPLATE.unit) * k);
      y < (TEMPLATE.oy + y1 * TEMPLATE.unit) * k;
      y++
    )
      for (
        let x = Math.round((TEMPLATE.ox + x0 * TEMPLATE.unit) * k);
        x < (TEMPLATE.ox + x1 * TEMPLATE.unit) * k;
        x++
      ) {
        const i = (y * img.width + x) * 4;
        if (img.data[i + 3] < 250 || !skinLike(img.data[i], img.data[i + 1], img.data[i + 2]))
          continue;
        for (let c = 0; c < 3; c++) ch[c].push(img.data[i + c]);
      }
    if (ch[0].length < 200) return null;
    return ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
  };
  const c = patch(0.5, 3, -8.4, -6.8) ?? patch(-1, 6, -12, -4);
  return c ? hex(c) : null;
}

// Keys, measures and scales a head to pxPerUnit. Returns { ok, reason, warnings, img, meta }.
export function importHead(raw, id, { pxPerUnit = 32, longBeard = false, name = id } = {}) {
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
    name,
    skin: sampleSkin(img),
    pxPerUnit,
    w: r(ow / pxPerUnit),
    h: r(oh / pxPerUnit),
    pivot: [r(-ox / (ow / pxPerUnit)), r(-oy / (oh / pxPerUnit))],
    ox: r(ox),
    oy: r(oy),
    scale: r(m.scale),
    measured: m.measured,
    warnings: m.warnings,
  };
  return { ok: true, reason: '', warnings: m.warnings, img: out, meta };
}

if (process.argv[1] && basename(process.argv[1]) === 'head.mjs') {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const longBeard = process.argv.includes('--long-beard');
  const nameArg = process.argv.find((a) => a.startsWith('--name='))?.slice(7);
  const [src, dir, idArg] = args;
  if (!src || !dir)
    throw new Error('usage: head.mjs <upload.png> <out dir> [id] [--long-beard] [--name=<name>]');
  const id = idArg ?? basename(src, '.png').replace(/^.*--/, '');
  const res = importHead(readPng(src), id, { longBeard, name: nameArg ?? id });
  if (!res.ok) {
    console.error(`FAIL ${id}: ${res.reason}`);
    process.exit(1);
  }
  for (const w of res.warnings) console.warn(`WARN ${id}: ${w}`);
  mkdirSync(dir, { recursive: true });
  const png = join(dir, `${id}.png`);
  writePng(png, res.img);
  await compressPng(png);
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(res.meta, null, 2) + '\n');
  console.log(`ok ${id}: ${res.img.width}x${res.img.height} px, ${JSON.stringify(res.meta)}`);
}
