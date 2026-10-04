// Ships reviewed uploads into the game: raw file to assets/source/<batch>/<id>.png, keyed and
// scaled sprite to public/assets/<dir>/<id>.png, manifest row added or replaced. Run
// `npm run validate:art` afterwards.
//
// Usage: node scripts/art/ship.mjs <folder> <batch> [id ...]   (ids limit which files ship)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { collectUploads, parseId, processImage, readPng, writePng } from './lib.mjs';

const [dir, batch, ...only] = process.argv.slice(2);
if (!dir || !/^B\d+$/.test(batch ?? '')) throw new Error('usage: ship.mjs <folder> <B#> [id ...]');

const LICENSE = "own (ChatGPT, Stefan's account)";
const manifestPath = 'public/assets/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const rows = [];
for (const { id, path } of collectUploads(dir)) {
  if (only.length && !only.includes(id)) continue;
  const raw = readPng(path);
  const r = processImage(raw, id);
  mkdirSync(`assets/source/${batch}`, { recursive: true });
  copyFileSync(path, `assets/source/${batch}/${id}.png`);
  const file = `${r.dir}/${id}.png`;
  writePng(`public/assets/${file}`, r.image);
  const { tier, view } = parseId(id);
  rows.push({
    id,
    kind: r.kind,
    tier,
    view,
    file,
    anchorX: r.anchorX,
    anchorY: r.anchorY,
    license: LICENSE,
    source: batch,
  });
  console.log(
    `shipped ${file} ${r.image.width}x${r.image.height} (${r.key} key, anchor ${r.anchorX},${r.anchorY}, ${r.specks} speck px dropped)`,
  );
}
const ids = new Set(rows.map((r) => r.id));
manifest.assets = manifest.assets
  .filter((a) => !ids.has(a.id))
  .concat(rows)
  .sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest: ${rows.length} rows added or replaced, ${manifest.assets.length} total`);
