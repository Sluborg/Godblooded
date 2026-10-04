// Generates placeholder PNG app icons (crimson square, gold figure) with no dependencies.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const PINK = [0x8a, 0x1c, 0x2b];
const WHITE = [0xf2, 0xc1, 0x4e];

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// A simple figure, in a 512 unit space, shrunk to 80% for the maskable safe zone.
const LIMBS = [
  [256, 210, 256, 340],
  [256, 250, 150, 170],
  [256, 250, 362, 170],
  [256, 340, 180, 440],
  [256, 340, 332, 440],
];

function pixel(u, v) {
  const x = (u - 256) / 0.8 + 256;
  const y = (v - 256) / 0.8 + 256;
  if (Math.hypot(x - 256, y - 150) <= 56) return WHITE;
  for (const [ax, ay, bx, by] of LIMBS) if (distToSegment(x, y, ax, ay, bx, by) <= 18) return WHITE;
  return PINK;
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(((x + 0.5) * 512) / size, ((y + 0.5) * 512) / size);
      raw.set([r, g, b], row + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) writeFileSync(`public/icon-${size}.png`, png(size));
writeFileSync('public/apple-touch-icon.png', png(180));
console.log('icons written');
