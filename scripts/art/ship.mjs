// Ships reviewed uploads into the game: raw file to assets/source/<batch>/<id>.png, keyed and
// scaled sprite to public/assets/<dir>/<id>.png, manifest row added or replaced. Run
// `npm run validate:art` afterwards.
//
// Usage: node scripts/art/ship.mjs <folder> <batch> [id ...] [--pivot <base>=<x>,<y>]
// (ids limit which files ship)
// Only files of that batch ship: `<batch>--<id>.png`, or unprefixed `<id>.png` (a folder holding
// one batch). Trial images (`test--`) and other batches' files are skipped.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { collectUploads, parseId, processImage, processPair, readPng, writePng } from './lib.mjs';

// `--pivot <base>=<x>,<y>` sets a rig pair's shoulder in source pixels (overrides the automatic
// one; check it on the stacked preview).
const argv = process.argv.slice(2);
const pivots = {};
for (let i = argv.indexOf('--pivot'); i >= 0; i = argv.indexOf('--pivot')) {
  const m = /^(.+)=(\d+),(\d+)$/.exec(argv[i + 1] ?? '');
  if (!m) throw new Error('--pivot expects <base>=<x>,<y>');
  pivots[m[1]] = { x: Number(m[2]), y: Number(m[3]) };
  argv.splice(i, 2);
}
const [dir, batch, ...only] = argv;
if (!dir || !/^[A-Z]\d+$/.test(batch ?? ''))
  throw new Error('usage: ship.mjs <folder> <batch, e.g. B2 or R1> [id ...]');

const LICENSE = "own (ChatGPT, Stefan's account)";
const manifestPath = 'public/assets/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const rows = [];
const uploads = collectUploads(dir).filter(
  (u) =>
    !u.test && (u.batch === null || u.batch === batch) && (!only.length || only.includes(u.id)),
);
const dupes = uploads.map((u) => u.id).filter((id, i, all) => all.indexOf(id) !== i);
if (dupes.length) throw new Error(`more than one upload for ${[...new Set(dupes)].join(', ')}`);
// Rig pieces ship as pairs (`<base>_body` + `<base>_arm`) with one shared crop.
const byId = new Map(uploads.map((u) => [u.id, u]));
const ship = (id, path, r) => {
  mkdirSync(`assets/source/${batch}`, { recursive: true });
  copyFileSync(path, `assets/source/${batch}/${id}.png`);
  const file = `${r.dir}/${id}.png`;
  writePng(`public/assets/${file}`, r.image);
  const { tier, view, part } = parseId(id);
  const pivot = r.pivotX === undefined ? {} : { pivotX: r.pivotX, pivotY: r.pivotY };
  rows.push({
    id,
    kind: r.kind,
    tier,
    view,
    ...(part ? { part } : {}),
    file,
    anchorX: r.anchorX,
    anchorY: r.anchorY,
    ...pivot,
    license: LICENSE,
    source: batch,
  });
  const extra = r.pivotX === undefined ? '' : `, shoulder pivot ${r.pivotX},${r.pivotY}`;
  console.log(
    `shipped ${file} ${r.image.width}x${r.image.height} (${r.key} key, anchor ${r.anchorX},${r.anchorY}${extra}, ${r.specks} speck px dropped)`,
  );
};
for (const { id, path } of uploads) {
  const { part } = parseId(id);
  if (part === 'arm') continue; // shipped with its body
  if (part === 'body') {
    const base = id.replace(/_body$/, '');
    const arm = byId.get(`${base}_arm`);
    if (!arm) throw new Error(`${id}: its arm (${base}_arm) is not in this batch`);
    const pair = processPair(readPng(path), readPng(arm.path), base, pivots[base]);
    if (!pair.pivot) console.log(`WARN ${base}: arm does not touch the body, no pivot`);
    ship(id, path, pair.body);
    ship(arm.id, arm.path, pair.arm);
    continue;
  }
  ship(id, path, processImage(readPng(path), id));
}
for (const u of uploads)
  if (parseId(u.id).part === 'arm' && !byId.has(u.id.replace(/_arm$/, '_body')))
    throw new Error(`${u.id}: its body is not in this batch`);
const ids = new Set(rows.map((r) => r.id));
manifest.assets = manifest.assets
  .filter((a) => !ids.has(a.id))
  .concat(rows)
  .sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest: ${rows.length} rows added or replaced, ${manifest.assets.length} total`);
