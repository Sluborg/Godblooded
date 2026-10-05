// Ships reviewed uploads into the game: raw file to assets/source/<batch>/<id>.png, keyed and
// scaled sprite to public/assets/<dir>/<id>.png, manifest row added or replaced. Run
// `npm run validate:art` afterwards.
//
// Usage: node scripts/art/ship.mjs <folder> <batch> [id ...]   (ids limit which files ship)
// Only files of that batch ship: `<batch>--<id>.png`, or unprefixed `<id>.png` (a folder holding
// one batch). Trial images (`test--`) and other batches' files are skipped.
// Unit stills need an entry in `<folder>/points.json` (Art writes it at review, raw canvas px):
//   { "<id>": { "strike": "chop", "weapon": [x, y], "weapon2": [x, y], "fit": true } }
// weapon2: double only. fit: re-frame an upload ChatGPT framed too big or off-centre to the spec
// framing before keying (lib fitFrame); the points stay in pixels of the original upload.
// It is kept as assets/source/<batch>/points.json, so a re-ship finds the points again.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  collectUploads,
  fitFrame,
  kindOf,
  parseId,
  processFrames,
  processImage,
  processPair,
  readPng,
  writePng,
} from './lib.mjs';

const [dir, batch, ...only] = process.argv.slice(2);
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
const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) : {});
const keptPointsPath = `assets/source/${batch}/points.json`;
const points = { ...readJson(keptPointsPath), ...readJson(join(dir, 'points.json')) };
const ship = (id, path, r, strike) => {
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
    ...(strike ? { strike } : {}),
    ...(r.weaponX === undefined ? {} : { weaponX: r.weaponX, weaponY: r.weaponY }),
    ...(r.weapon2X === undefined ? {} : { weapon2X: r.weapon2X, weapon2Y: r.weapon2Y }),
    license: LICENSE,
    source: batch,
  });
  const extra = r.pivotX === undefined ? '' : `, shoulder pivot ${r.pivotX},${r.pivotY}`;
  console.log(
    `shipped ${file} ${r.image.width}x${r.image.height} (${r.key} key, anchor ${r.anchorX},${r.anchorY}${extra}, ${r.specks} speck px dropped)`,
  );
};
// Animation frames ship per unit with one shared crop, so they stack.
const isFrame = (part) => /^(walk|attack|hurt)/.test(part ?? '');
const frameGroups = new Map();
for (const u of uploads) {
  const { part } = parseId(u.id);
  if (!isFrame(part)) continue;
  const base = u.id.slice(0, -part.length - 1);
  if (!frameGroups.has(base)) frameGroups.set(base, []);
  frameGroups.get(base).push(u);
}
// A unit's frames share one crop, so they ship together: refuse a partial re-ship.
for (const [base, group] of frameGroups) {
  const have = new Set(group.map((u) => u.id));
  const missing = manifest.assets
    .map((a) => a.id)
    .filter((id) => id.startsWith(`${base}_`) && isFrame(parseId(id).part) && !have.has(id));
  if (missing.length)
    throw new Error(`${base}: re-ship all its frames together, missing ${missing.join(', ')}`);
}
for (const group of frameGroups.values()) {
  // The anchor comes from the first frame: put the neutral walk1 first when there is one.
  group.sort((a, b) => b.id.endsWith('_walk1') - a.id.endsWith('_walk1'));
  const out = processFrames(group.map((u) => ({ id: u.id, raw: readPng(u.path) })));
  out.forEach((r, i) => {
    if (r.shifted.dx || r.shifted.dy)
      console.log(`aligned ${r.id} feet: moved ${r.shifted.dx},${r.shifted.dy} px`);
    ship(group[i].id, group[i].path, r);
  });
}
for (const { id, path } of uploads) {
  const { part } = parseId(id);
  if (part === 'arm' || isFrame(part)) continue; // shipped with its body / frame group
  if (part === 'body') {
    const base = id.replace(/_body$/, '');
    const arm = byId.get(`${base}_arm`);
    if (!arm) throw new Error(`${id}: its arm (${base}_arm) is not in this batch`);
    const pair = processPair(readPng(path), readPng(arm.path), base);
    if (!pair.pivot) console.log(`WARN ${base}: arm does not touch the body, no pivot`);
    ship(id, path, pair.body);
    ship(arm.id, arm.path, pair.arm);
    continue;
  }
  if (kindOf(id)?.dir !== 'units' || part) {
    ship(id, path, processImage(readPng(path), id));
    continue;
  }
  const p = points[id];
  if (!p?.strike || !p.weapon)
    throw new Error(`${id}: needs strike and weapon in ${dir}/points.json (see ship.mjs header)`);
  let raw = readPng(path);
  let move = ([x, y]) => [x, y];
  if (p.fit) {
    const f = fitFrame(raw, id);
    raw = f.image;
    move = ([x, y]) => [x + f.dx, y + f.dy];
    console.log(`fitted ${id}: canvas ${raw.width} px, moved ${f.dx},${f.dy}`);
  }
  const at = { weapon: move(p.weapon), ...(p.weapon2 ? { weapon2: move(p.weapon2) } : {}) };
  ship(id, path, processImage(raw, id, at), p.strike);
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
if (Object.keys(points).length) {
  mkdirSync(`assets/source/${batch}`, { recursive: true });
  // [x, y] on one line, as Prettier writes it.
  const json = JSON.stringify(points, null, 2).replace(
    /\[\s+([\d.]+),\s+([\d.]+)\s+\]/g,
    '[$1, $2]',
  );
  writeFileSync(keptPointsPath, json + '\n');
}
console.log(`manifest: ${rows.length} rows added or replaced, ${manifest.assets.length} total`);
