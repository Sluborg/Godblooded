// Checks public/assets/manifest.json and every shipped PNG against docs/asset-spec.md.
// Run: npm run validate:art (also runs inside npm test, so CI gates it). Exits 1 on any error.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  alphaReport,
  footprintOrigin,
  isOpaque,
  kindOf,
  parseId,
  readPng,
  transparentPixels,
} from './lib.mjs';

const FIELDS = ['id', 'kind', 'file', 'license', 'source'];
// Strike types (docs/asset-spec.md, pose standard).
export const STRIKES = [
  'chop',
  'double',
  'sweep',
  'upward',
  'thrust',
  'smash',
  'bolt',
  'shot',
  'stomp',
];
// Upper bounds on shipped size (px), a little above nominal so tier-3 silhouettes fit.
const MAX = {
  units: [400, 420],
  buildings: [640, 720],
  terrain: [512, 512],
  ui: [512, 512],
  art: [1280, 1280],
};

// Total bytes of shipped PNGs (offline cache budget, Lead 2026-10-13: 12 MB; lazy-load if M3 passes it).
export const ART_BUDGET = 12e6;

// A music row: id `mus_<name>`, kind "mus", both formats on disk, loop points in ms.
export function musicErrors(row, assets) {
  const id = row.id;
  const out = [];
  if (!/^mus_[a-z0-9]+(_[a-z0-9]+)*$/.test(id)) out.push(`${id}: music id must be mus_<name>`);
  if (row.kind !== 'mus') out.push(`${id}: kind must be "mus"`);
  if (row.file !== `audio/${id}`) out.push(`${id}: file must be audio/${id} (no extension)`);
  else
    for (const ext of ['ogg', 'm4a'])
      if (!existsSync(join(assets, `${row.file}.${ext}`)))
        out.push(`${id}: ${row.file}.${ext} missing`);
  const { loopStartMs: a, loopEndMs: b } = row;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b <= a)
    out.push(`${id}: loopStartMs and loopEndMs must be whole ms, start < end`);
  return out;
}

function pngsUnder(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return pngsUnder(p);
    return f.endsWith('.png') ? [p] : [];
  });
}

export function validateAssets(root = '.', budget = ART_BUDGET) {
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
    // Music (docs/systems/audio.md section 6): `file` has no extension, .ogg and .m4a ship.
    if (/^mus_/.test(id)) {
      errors.push(...musicErrors(row, assets));
      continue;
    }
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
    // Heroes (decision 2026-10-13): tier 1 is the god alone, tier 2 and 3 carry -<path>.
    if (k.kind === 'hero') {
      const hasPath = id.slice('hero_'.length).split('_')[0].includes('-');
      if (tier === 1 && hasPath) err(id, 'a tier-1 hero has no path: hero_<god>_t1_...');
      if (tier > 1 && !hasPath)
        err(id, 'a tier 2-3 hero needs a path: hero_<god>-<path>_t<2|3>_...');
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
    // Shipped art is palette-compressed (lib compressPng); plain RGBA is allowed but warned.
    if (img.colorType === 6) warnings.push(`${id}: not compressed, run npm run art:compress`);
    else if (img.colorType !== 3) err(id, 'PNG must be palette (indexed) or RGBA');
    const [maxW, maxH] = MAX[k.dir];
    if (img.width > maxW || img.height > maxH)
      err(id, `${img.width}x${img.height} is larger than ${maxW}x${maxH}`);
    // Buildings and lairs stand on their iso footprint centre (asset-spec Anchor, Scene's
    // footOrigin): the manifest must carry the same point.
    if (k.anchor === 'footprint') {
      const o = footprintOrigin(img.width, img.height);
      if (Math.abs(row.anchorX - o.x) > 0.002 || Math.abs(row.anchorY - o.y) > 0.002)
        err(id, `anchor must be the footprint origin ${o.x},${o.y}`);
    }
    if (isOpaque(id)) {
      // Key art and ground tiles: whole picture, no transparency anywhere.
      const clear = transparentPixels(img);
      if (clear > 0) err(id, `${clear} transparent pixels in an opaque picture`);
      // Shipped sizes (docs/asset-spec.md): tiles 256 x 256, key art 1280 wide.
      if (k.kind === 'ter' && (img.width !== 256 || img.height !== 256))
        err(id, `${img.width}x${img.height}, a ground tile ships 256x256`);
      if (k.kind === 'art' && img.width !== 1280)
        err(id, `${img.width} px wide, key art ships 1280 wide`);
      continue;
    }
    const r = alphaReport(img);
    if (r.visible < 100) err(id, 'image is (almost) empty');
    if (r.border > 0) err(id, `${r.border} visible pixels on the image border (cut off?)`);
    if (r.keyLeft > r.visible * 0.005) err(id, `${r.keyLeft} pixels still in the key colour`);
    if (r.components > 3) warnings.push(`${id}: ${r.components} separate parts`);
    // 9-slice insets (pixels of the shipped PNG): all four or none, leaving a middle.
    const SLICE = ['sliceLeft', 'sliceRight', 'sliceTop', 'sliceBottom'];
    const sliced = SLICE.filter((f) => row[f] !== undefined);
    if (sliced.length > 0) {
      if (sliced.length < 4) err(id, `${SLICE.join(', ')} go together`);
      else if (SLICE.some((f) => !Number.isInteger(row[f]) || row[f] < 1))
        err(id, 'slice insets must be whole pixels >= 1');
      else if (
        row.sliceLeft + row.sliceRight >= img.width ||
        row.sliceTop + row.sliceBottom >= img.height
      )
        err(id, 'slice insets leave no middle');
    }
  }

  // Every shipped PNG belongs to a manifest row.
  const files = new Set(manifest.assets.map((a) => a.file));
  const pngs = pngsUnder(assets);
  // The PWA precaches every shipped PNG, so phones download them all on each deploy.
  const bytes = pngs.reduce((sum, p) => sum + statSync(p).size, 0);
  if (bytes > budget)
    err(
      'public/assets',
      `${(bytes / 1e6).toFixed(1)} MB of PNGs, the budget is ${budget / 1e6} MB`,
    );
  for (const p of pngs) {
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
