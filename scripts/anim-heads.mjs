// Dev: builds compact-rig test kits that wear a shipped painted head (kit_heads_a|b) on a G7 body, for
// the head scale test (anim-test/axeman_<id>/kit.json, run with scripts/anim-record.mjs).
//   node scripts/anim-heads.mjs [headWidthUnits=15] [body=axeman]
// Needs anim-test/<body>/ (scripts/anim-build.mjs). Nothing here ships.
import sharp from 'sharp';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const HEAD_U = Number(process.argv[2] ?? 15);
const body = process.argv[3] ?? 'axeman';
const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'));
const sheets = new Map();
for (const row of manifest.assets ?? manifest) if (row.cells) sheets.set(row.id, row);
const kit = JSON.parse(readFileSync(`anim-test/${body}/kit.json`, 'utf8'));

for (const [sheet, ids] of [
  ['kit_heads_a', ['head_a', 'head_b', 'head_c', 'head_d']],
  ['kit_heads_b', ['head_e', 'head_f', 'head_g', 'head_h']],
]) {
  const row = sheets.get(sheet);
  for (const id of ids) {
    const c = row.cells[id];
    const dir = `anim-test/${body}_${id.slice(5)}`;
    mkdirSync(dir, { recursive: true });
    cpSync(`anim-test/${body}`, dir, { recursive: true });
    // The head cut out of its sheet, sized to HEAD_U drawing units wide on the body's pixel grid.
    const w = Math.round(HEAD_U * kit.ppu);
    const h = Math.round((c.h / c.w) * w);
    await sharp(`public/assets/${row.file}`)
      .extract({ left: c.x, top: c.y, width: c.w, height: c.h })
      .resize(w, h, { kernel: 'lanczos3' })
      .png()
      .toFile(`${dir}/head.png`);
    const k = JSON.parse(JSON.stringify(kit));
    k.parts.head = { file: 'head.png', w, h, pivots: c.pivots };
    writeFileSync(`${dir}/kit.json`, JSON.stringify(k, null, 1));
    console.log(dir, w, h);
  }
}
