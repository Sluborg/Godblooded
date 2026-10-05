// Checks public/assets/manifest.json and every shipped PNG against docs/asset-spec.md.
// Run: npm run validate:art (also runs inside npm test, so CI gates it). Exits 1 on any error.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { alphaReport, kindOf, parseId, readPng } from './lib.mjs';

const FIELDS = ['id', 'kind', 'file', 'license', 'source'];
// Strike types (docs/asset-spec.md, pose standard).
export const STRIKES = ['chop', 'double', 'sweep', 'upward', 'thrust', 'smash', 'bolt', 'shot'];
// Upper bounds on shipped size (px), a little above nominal so tier-3 silhouettes fit.
const MAX = { units: [400, 420], buildings: [640, 720], terrain: [512, 512], ui: [512, 512] };

function pngsUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return pngsUnder(p);
    return f.endsWith('.png') ? [p] : [];
  });
}

export function validateAssets(root = '.') {
  const errors = [];
  const warnings = [];
  const err = (id, msg) => errors.push(`${id}: ${msg}`);
  const assets = join(root, 'public/assets');
  const manifestPath = join(assets, 'manifest.json');
  if (!existsSync(manifestPath)) return { errors: ['manifest.json missing'], warnings, count: 0 };
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  if (!Array.isArray(manifest.assets))
    return { errors: ['manifest.json: "assets" must be an array'], warnings, count: 0 };

  const seen = new Set();
  for (const row of manifest.assets) {
    const id = row.id ?? '(missing id)';
    for (const f of FIELDS)
      if (typeof row[f] !== 'string' || !row[f]) err(id, `missing string "${f}"`);
    if (seen.has(id)) err(id, 'duplicate id');
    seen.add(id);
    const k = kindOf(id);
    if (!k) {
      err(id, 'id does not match docs/asset-spec.md');
      continue;
    }
    if (row.kind !== k.kind) err(id, `kind must be "${k.kind}"`);
    const { tier, view, part } = parseId(id);
    if ((row.tier ?? null) !== tier) err(id, `tier must be ${tier}`);
    if ((row.view ?? null) !== view) err(id, `view must be ${view}`);
    if ((row.part ?? null) !== part) err(id, `part must be ${part}`);
    for (const a of ['anchorX', 'anchorY'])
      if (typeof row[a] !== 'number' || row[a] < 0 || row[a] > 1) err(id, `${a} must be 0..1`);
    for (const a of ['pivotX', 'pivotY', 'weaponX', 'weaponY', 'weapon2X', 'weapon2Y'])
      if (row[a] !== undefined && (typeof row[a] !== 'number' || row[a] < 0 || row[a] > 1))
        err(id, `${a} must be 0..1`);
    for (const p of ['pivot', 'weapon', 'weapon2'])
      if ((row[`${p}X`] === undefined) !== (row[`${p}Y`] === undefined))
        err(id, `${p}X and ${p}Y go together`);
    // A unit still (hero or monster, no rig or frame part) must carry its strike and weapon.
    if (k.dir === 'units' && part === null) {
      if (row.strike === undefined) err(id, 'unit needs "strike"');
      if (row.weaponX === undefined) err(id, 'unit needs weaponX/weaponY');
    }
    if (row.strike !== undefined && !STRIKES.includes(row.strike))
      err(id, `strike must be one of ${STRIKES.join(', ')}`);
    if (row.strike === 'double' && row.weapon2X === undefined)
      err(id, 'strike "double" needs weapon2X/weapon2Y');
    if (row.weapon2X !== undefined && row.strike !== 'double')
      err(id, 'weapon2X/weapon2Y only go with strike "double"');
    const expected = `${k.dir}/${id}.png`;
    if (row.file !== expected) err(id, `file must be ${expected}`);
    const path = join(assets, row.file ?? '');
    if (!row.file || !existsSync(path)) {
      err(id, `file not found: ${row.file}`);
      continue;
    }
    if (row.source && !existsSync(join(root, 'assets/source', row.source, `${id}.png`)))
      warnings.push(`${id}: raw source assets/source/${row.source}/${id}.png missing`);

    const img = readPng(path);
    if (img.colorType !== 6) err(id, 'PNG must be RGBA');
    const [maxW, maxH] = MAX[k.dir];
    if (img.width > maxW || img.height > maxH)
      err(id, `${img.width}x${img.height} is larger than ${maxW}x${maxH}`);
    const r = alphaReport(img);
    if (r.visible < 100) err(id, 'image is (almost) empty');
    if (r.border > 0) err(id, `${r.border} visible pixels on the image border (cut off?)`);
    if (r.keyLeft > r.visible * 0.005) err(id, `${r.keyLeft} pixels still in the key colour`);
    if (r.components > 3) warnings.push(`${id}: ${r.components} separate parts`);
  }

  // Every shipped PNG belongs to a manifest row.
  const files = new Set(manifest.assets.map((a) => a.file));
  for (const p of pngsUnder(assets)) {
    const rel = relative(assets, p).split('\\').join('/');
    if (!files.has(rel)) err(rel, 'PNG in public/assets has no manifest row');
  }
  return { errors, warnings, count: manifest.assets.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { errors, warnings, count } = validateAssets();
  for (const w of warnings) console.warn(`WARN  ${w}`);
  for (const e of errors) console.error(`ERROR ${e}`);
  console.log(`validate:art ${count} assets, ${errors.length} errors, ${warnings.length} warnings`);
  process.exit(errors.length ? 1 : 0);
}
