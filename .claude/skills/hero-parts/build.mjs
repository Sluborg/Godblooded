// Builds the grading page (the "parts forge") from the skill's scripts.
//   node .claude/skills/hero-parts/build.mjs [out.html]
// Inlines kit.js, parts.js and hero.js into forge.template.html. Publish the result as an
// Artifact with capabilities { db: {}, user: {} } so Stefan's grades and combos are saved.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');

// Painted heads: PNG + JSON pairs from the heads import (scripts/art/head.mjs), embedded as data
// URIs and appended to HEADS. Pass the folder with --heads <dir>; without it the forge has code
// heads only. Each head is drawn at its measured box (ox, oy, w, h in units, chin at 0,0).
function painted(dir) {
  const rows = [];
  if (dir && existsSync(dir))
    for (const f of readdirSync(dir)
      .filter((n) => n.endsWith('.json'))
      .sort()) {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const png = join(dir, f.replace(/\.json$/, '.png'));
      if (!existsSync(png)) continue;
      const uri = 'data:image/png;base64,' + readFileSync(png).toString('base64');
      rows.push({
        id: j.id,
        rev: j.rev || 1,
        name: j.name || 'Painted ' + j.id.split('_').pop(),
        skin: j.skin || '#d9a27c',
        ox: j.ox,
        oy: j.oy,
        w: j.w,
        h: j.h,
        uri,
      });
    }
  return `const PAINTED_READY = Promise.all(${JSON.stringify(rows)}.map((r) => {
  const img = new Image();
  img.src = r.uri;
  HEADS.push({ ...r, painted: true, img, draw(h) { if (h.img.complete) ctx.drawImage(h.img, h.ox, h.oy, h.w, h.h); } });
  return img.decode().catch(() => {});
}));`;
}

export function bundle(headsDir) {
  return [...['kit.js', 'parts.js', 'hero.js'].map(read), painted(headsDir)].join('\n');
}

export function buildForge(headsDir) {
  return read('forge.template.html').replace('/*PARTS*/', () => bundle(headsDir));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2),
    hi = args.indexOf('--heads'),
    headsDir = hi >= 0 ? args.splice(hi, 2)[1] : null;
  const out = args[0] || 'forge.html';
  writeFileSync(out, buildForge(headsDir));
  console.log('wrote', out);
}
