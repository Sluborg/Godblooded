// Ships a parts kit sheet (docs/asset-spec.md "Parts kit"): cuts the parts out of a keyed upload,
// scales them by one factor, packs them in a row and writes the `kit_<name>` manifest row with
// pxPerUnit and a rectangle plus pivots per part id. Run
//   node scripts/art/kit.mjs <spec.json>
// The spec (kept next to the raw upload, assets/source/<batch>/<id>.kit.json):
//   { "id": "kit_minotaur", "batch": "G10", "upload": "<path to the raw upload>",
//     "pxPerUnit": 8, "scale": 0.5,
//     "parts": [ { "cell": "head_minotaur", "box": [x0, y0, x1, y1],
//                  "pivots": { "neck": [0.5, 0.95] } } ] }
// box: the part's region in raw pixels (inclusive); the part is trimmed to its visible pixels
// inside it, so a loose box is fine. Pivots are fractions of the trimmed part. A part may set
// "width" or "height" in drawing units (Scene's sizes) instead of using the sheet's scale.
// A grip fist drawn around a flat green haft sets "split": "grip": it ships as `<cell>_back` (behind
// the weapon) and `<cell>_front` (over it), same rectangle size, plus "closed": "<cell id>" for an
// empty-hand fist from the same picture; a "grip" pivot at the haft centre is added to each.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  blank,
  bbox,
  compressPng,
  detectKey,
  keyOut,
  readPng,
  resample,
  splitGrip,
  visibleMask,
  writePng,
} from './lib.mjs';

const specPath = process.argv[2];
if (!specPath) throw new Error('usage: kit.mjs <spec.json>');
const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
if (!/^kit_[a-z0-9]+(_[a-z0-9]+)*$/.test(spec.id)) throw new Error(`${spec.id}: not a kit_ id`);

const raw = readPng(spec.upload);
const { key } = detectKey(raw);
if (!key) throw new Error(`${spec.upload}: border is not a flat green or magenta key`);
const keyed = keyOut(raw, key);
// At least 8 px between parts so mipmapped downscales (Scene) never bleed one part into the next.
const GAP = 8;
const cut = spec.parts.flatMap((p) => {
  const [x0, y0, x1, y1] = p.box;
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const region = resample(keyed, { x: x0, y: y0, w, h }, w, h);
  const layers = p.split === 'grip' ? splitGrip(region) : null;
  // A grip is trimmed to the fist without the green haft, so all its layers share one rectangle.
  const b = bbox(visibleMask(layers ? layers.closed : region, 16), w, h);
  if (!b) throw new Error(`${p.cell}: nothing visible in box ${p.box}`);
  const f = p.width
    ? (p.width * spec.pxPerUnit) / b.w
    : p.height
      ? (p.height * spec.pxPerUnit) / b.h
      : spec.scale;
  const ow = Math.max(1, Math.round(b.w * f));
  const oh = Math.max(1, Math.round(b.h * f));
  if (!layers) return [{ ...p, image: resample(region, b, ow, oh) }];
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const grip = [r3(((layers.haft.x0 + layers.haft.x1) / 2 + 0.5 - b.x) / b.w), 0.5];
  const pivots = { ...p.pivots, grip };
  const out = [
    { cell: `${p.cell}_back`, pivots, image: resample(layers.back, b, ow, oh) },
    { cell: `${p.cell}_front`, pivots, image: resample(layers.front, b, ow, oh) },
  ];
  if (p.closed) out.push({ cell: p.closed, pivots, image: resample(layers.closed, b, ow, oh) });
  return out;
});
const width = cut.reduce((s, c) => s + c.image.width + GAP, GAP);
const height = Math.max(...cut.map((c) => c.image.height)) + 2 * GAP;
const sheet = blank(width, height);
const cells = {};
let x = GAP;
for (const c of cut) {
  const { width: w, height: h, data } = c.image;
  for (let yy = 0; yy < h; yy++)
    data.copy(sheet.data, ((GAP + yy) * width + x) * 4, yy * w * 4, (yy + 1) * w * 4);
  cells[c.cell] = { x, y: GAP, w, h, pivots: c.pivots };
  x += w + GAP;
}
const file = `kits/${spec.id}.png`;
mkdirSync('public/assets/kits', { recursive: true });
writePng(`public/assets/${file}`, sheet);
await compressPng(`public/assets/${file}`);
mkdirSync(`assets/source/${spec.batch}`, { recursive: true });
copyFileSync(spec.upload, `assets/source/${spec.batch}/${spec.id}.png`);
if (dirname(specPath) !== `assets/source/${spec.batch}`)
  writeFileSync(
    `assets/source/${spec.batch}/${spec.id}.kit.json`,
    JSON.stringify(spec, null, 2) + '\n',
  );

const manifestPath = 'public/assets/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const row = {
  id: spec.id,
  kind: 'kit',
  tier: null,
  view: null,
  file,
  anchorX: 0.5,
  anchorY: 0.5,
  pxPerUnit: spec.pxPerUnit,
  cells,
  license: "own (ChatGPT, Stefan's account)",
  source: spec.batch,
};
manifest.assets = manifest.assets
  .filter((a) => a.id !== spec.id)
  .concat(row)
  .sort((a, b) => a.id.localeCompare(b.id));
// [fx, fy] on one line, as Prettier writes it.
const json = JSON.stringify(manifest, null, 2).replace(
  /\[\s+([\d.]+),\s+([\d.]+)\s+\]/g,
  '[$1, $2]',
);
writeFileSync(manifestPath, json + '\n');
console.log(
  `shipped ${file} ${width}x${height}, ${cut.length} parts: ${Object.keys(cells).join(', ')}`,
);
