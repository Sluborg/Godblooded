// Palette-compresses every shipped PNG still in plain RGBA (lib compressPng). ship.mjs already
// compresses what it writes; this is for art shipped before that, and is safe to run again.
// Run: npm run art:compress
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { compressPng, readPng } from './lib.mjs';

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : f.endsWith('.png') ? [p] : [];
  });
let before = 0;
let after = 0;
for (const p of walk('public/assets')) {
  const size = statSync(p).size;
  before += size;
  after += readPng(p).colorType === 6 ? await compressPng(p) : size;
}
console.log(`art:compress ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB`);
