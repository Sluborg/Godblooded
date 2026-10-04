// Gate for ChatGPT uploads (Drive download or the art-inbox branch): canvas, flat key, framing.
// Writes a contact sheet of the keyed result for the visual review (anchor shown as a red cross).
//
// Usage: node scripts/art/check.mjs <folder> [--sheet out.png]   (exits 1 if any image fails)
import { checkRaw, collectUploads, processImage, readPng, writePng, blank } from './lib.mjs';

const dir = process.argv[2];
const sheetAt = process.argv.indexOf('--sheet');
const sheetPath = sheetAt > 0 ? process.argv[sheetAt + 1] : null;
if (!dir) throw new Error('usage: check.mjs <folder> [--sheet out.png]');

const shown = [];
let failed = 0;
for (const { id, path } of collectUploads(dir)) {
  const raw = readPng(path);
  const problems = checkRaw(raw, id);
  if (problems.length) failed++;
  console.log(
    `${problems.length ? 'FAIL' : 'ok  '} ${id}${problems.length ? ': ' + problems.join('; ') : ''}`,
  );
  try {
    shown.push({ id, ...processImage(raw, id) });
  } catch (e) {
    console.log(`     ${e.message}`);
  }
}

if (sheetPath && shown.length) {
  // Tiles of 320x420 on a checkerboard, sprite drawn at its anchor (tile centre, 380 px down).
  const TW = 320;
  const TH = 420;
  const cols = Math.min(4, shown.length);
  const rows = Math.ceil(shown.length / cols);
  const sheet = blank(TW * cols, TH * rows);
  const W = sheet.width;
  for (let y = 0; y < sheet.height; y++)
    for (let x = 0; x < W; x++) {
      const v = ((x >> 4) + (y >> 4)) % 2 ? 200 : 230;
      sheet.data.fill(v, (y * W + x) * 4, (y * W + x) * 4 + 3);
      sheet.data[(y * W + x) * 4 + 3] = 255;
    }
  shown.forEach(({ image, anchorX, anchorY }, k) => {
    const s = Math.min(1, (TW - 20) / image.width, (TH - 60) / image.height);
    const ax = (k % cols) * TW + TW / 2;
    const ay = Math.floor(k / cols) * TH + TH - 40;
    const ox = ax - anchorX * image.width * s;
    const oy = ay - anchorY * image.height * s;
    for (let y = 0; y < Math.floor(image.height * s); y++)
      for (let x = 0; x < Math.floor(image.width * s); x++) {
        const p = (Math.floor(y / s) * image.width + Math.floor(x / s)) * 4;
        const a = image.data[p + 3] / 255;
        const q = ((Math.round(oy) + y) * W + Math.round(ox) + x) * 4;
        if (q < 0 || q >= sheet.data.length) continue;
        for (let c = 0; c < 3; c++)
          sheet.data[q + c] = Math.round(image.data[p + c] * a + sheet.data[q + c] * (1 - a));
      }
    for (let d = -8; d <= 8; d++)
      for (const [x, y] of [
        [ax + d, ay],
        [ax, ay + d],
      ]) {
        const q = (Math.round(y) * W + Math.round(x)) * 4;
        sheet.data[q] = 220;
        sheet.data[q + 1] = 0;
        sheet.data[q + 2] = 0;
      }
  });
  writePng(sheetPath, sheet);
  console.log(`sheet: ${sheetPath}`);
}
process.exit(failed ? 1 : 0);
