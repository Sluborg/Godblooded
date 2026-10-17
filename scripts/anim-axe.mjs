// Dev: makes anim-test/axeman/axe_bare.png, the single-bladed G7 axe without the fist on it, for the
// skeleton test (src/dev/animStage.ts). Needs anim-test/axeman/weapon.png (scripts/anim-build.mjs).
// The fist and its cuff are painted out by continuing the haft over them with a clean stretch of it.
import sharp from 'sharp';

const SRC = 'anim-test/axeman/weapon.png';
const OUT = 'anim-test/axeman/axe_bare.png';
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const px = (x, y) => (y * W + x) * 4;
// Left edge of the haft on a row (the first opaque run that is not the blade).
const haftLeft = (y) => {
  for (let x = 0; x < W; x++) if (data[px(x, y) + 3] > 40) return x;
  return -1;
};
const HAFT_W = 54;
const CLEAN = [330, 420]; // a stretch of haft with no hand on it
const FIST = [428, 553]; // rows covered by the fist and its cuff
const above = haftLeft(CLEAN[1] - 1);
const below = haftLeft(FIST[1] + 2);
const out = Buffer.from(data);
for (let y = FIST[0]; y <= FIST[1]; y++) for (let x = 0; x < W; x++) out[px(x, y) + 3] = 0;
const span = CLEAN[1] - CLEAN[0];
for (let y = FIST[0]; y <= FIST[1]; y++) {
  const s = CLEAN[0] + ((y - FIST[0]) % span);
  const sl = haftLeft(s);
  const dl = Math.round(above + ((below - above) * (y - CLEAN[1])) / (FIST[1] + 2 - CLEAN[1]));
  for (let i = 0; i < HAFT_W; i++) {
    const a = px(sl + i, s);
    const b = px(dl + i, y);
    for (let c = 0; c < 4; c++) out[b + c] = data[a + c];
  }
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile(OUT);
console.log(`${OUT} ${W}x${H}; haft left ${above} -> ${below}`);
