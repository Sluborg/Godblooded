// Builds the grading page (the "parts forge") from the skill's scripts.
//   node .claude/skills/hero-parts/build.mjs [out.html]
// Inlines kit.js, parts.js and hero.js into forge.template.html. Publish the result as an
// Artifact with capabilities { db: {}, user: {} } so Stefan's grades and combos are saved.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(here, f), 'utf8');

// Painted heads: PNG + JSON pairs from the heads import (scripts/art/head.mjs), embedded as data
// URIs and appended to HEADS. Pass the folder with --heads <dir>; without it the forge has code
// heads only. Each head is drawn at its measured box (ox, oy, w, h in units, chin at 0,0).
const PAINTED_HEIGHT = 19.2;
function painted(dir) {
  const rows = [];
  if (dir && existsSync(dir))
    for (const f of readdirSync(dir)
      .filter((n) => n.endsWith('.json'))
      .sort()) {
      const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const png = join(dir, f.replace(/\.json$/, '.png'));
      if (!existsSync(png)) continue;
      const bytes = readFileSync(png);
      const uri = 'data:image/png;base64,' + bytes.toString('base64');
      // rev follows the picture: a new painting under the same id invalidates old grades
      // Size: a painted head taller than PAINTED_HEIGHT (top of hair to bottom of beard, in units;
      // head_thorblood_01 and the code heads are about 19) is scaled down around the chin, so a
      // long beard or a tall braid does not make the whole head bigger. Shorter heads keep size.
      const m = j.measured || { top: j.oy, bottom: j.oy + j.h };
      const tall = m.bottom - m.top,
        k = tall > PAINTED_HEIGHT * 1.02 ? +(PAINTED_HEIGHT / tall).toFixed(3) : 1;
      // rev follows the picture and its size: a new painting or a resize invalidates old grades
      const rev =
        'p' + createHash('sha1').update(bytes).digest('hex').slice(0, 8) + (k < 1 ? '-k' + k : '');
      rows.push({
        id: j.id,
        rev,
        k,
        name: j.name || 'Painted ' + j.id.split('_').pop(),
        skin: j.skin || '#d9a27c',
        ox: j.ox,
        oy: j.oy,
        w: j.w,
        h: j.h,
        uri,
      });
    }
  // Painted heads go first in HEADS.
  return `const PAINTED = ${JSON.stringify(rows).replace(/</g, '\\u003c')}.map((r) => {
  const img = new Image();
  img.src = r.uri;
  return { ...r, painted: true, img, draw(h) { if (h.img.complete) ctx.drawImage(h.img, h.ox * h.k, h.oy * h.k, h.w * h.k, h.h * h.k); } };
});
HEADS.unshift(...PAINTED);
const PAINTED_READY = Promise.all(PAINTED.map((h) => h.img.decode().catch(() => {})));`;
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
