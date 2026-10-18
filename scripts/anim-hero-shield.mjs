// Dev: copies a cut hero kit (anim-test/hs_<name>) to hs_<name>_sh and gives it Tyr's shield
// (anim-test/hs_tyr2/offhand.png), scaled to the hero's pixel density, for the back-hand test where
// the shield has to change hands with the weapon. Needs scripts/anim-hero-cut.mjs run first.
//   node scripts/anim-hero-shield.mjs thorson anubis
import sharp from 'sharp';
import { cpSync, readFileSync, writeFileSync } from 'node:fs';

const shield = JSON.parse(readFileSync('anim-test/hs_tyr2/kit.json', 'utf8'));
const sp = shield.parts.offhand;
for (const name of process.argv.slice(2)) {
  const src = `anim-test/hs_${name}`;
  const dst = `${src}_sh`;
  cpSync(src, dst, { recursive: true });
  const kit = JSON.parse(readFileSync(`${src}/kit.json`, 'utf8'));
  const k = kit.ppu / shield.ppu;
  const w = Math.round(sp.w * k);
  const h = Math.round(sp.h * k);
  await sharp(`anim-test/hs_tyr2/${sp.file}`)
    .resize(w, h, { kernel: 'lanczos3' })
    .png()
    .toFile(`${dst}/offhand.png`);
  kit.parts.offhand = { file: 'offhand.png', w, h, pivots: sp.pivots };
  writeFileSync(`${dst}/kit.json`, JSON.stringify(kit, null, 1));
  console.log(dst, w, h);
}
