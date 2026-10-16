// Dev: cuts an assembled compact-rig hero picture into rig parts by alpha connected components.
//   node scripts/anim-slice.mjs <input.png> <name> [--key]
// --key: the picture has a flat magenta (#FF00FF) background instead of alpha: key it out first.
// Writes anim-test/<name>/c<N>.png (one per component, largest first), components.json (bbox, area,
// centroid in the source picture) and debug.png (numbered boxes over the picture). A spec file
// (anim-test/<name>/spec.json) then says which component is which part: scripts/anim-build.mjs.
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [, , input, name, ...flags] = process.argv;
if (!input || !name) {
  console.error('usage: node scripts/anim-slice.mjs <input.png> <name> [--key]');
  process.exit(1);
}
const key = flags.includes('--key');
const dir = `anim-test/${name}`;
mkdirSync(dir, { recursive: true });

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const px = Buffer.from(data);

if (key) {
  // Key out magenta with a soft edge: pure magenta goes transparent, pink fringes lose their
  // magenta part (despill) so no halo is left around the figure.
  for (let i = 0; i < W * H; i++) {
    const r = px[i * 4];
    const g = px[i * 4 + 1];
    const b = px[i * 4 + 2];
    const mag = Math.min(r, b) - g; // how much it leans magenta
    if (mag > 90 && r > 150 && b > 150) px[i * 4 + 3] = 0;
    else if (mag > 40 && r > 120 && b > 120) {
      const k = Math.min(1, Math.max(0, (mag - 40) / 50));
      px[i * 4 + 3] = Math.round(px[i * 4 + 3] * (1 - k));
      px[i * 4] = Math.min(r, g + 20);
      px[i * 4 + 2] = Math.min(b, g + 20);
    }
  }
}

// Connected components of the visible pixels (8 neighbours).
const A = 40;
const label = new Int32Array(W * H).fill(-1);
const comps = [];
const stack = [];
for (let s = 0; s < W * H; s++) {
  if (label[s] !== -1 || px[s * 4 + 3] <= A) continue;
  const id = comps.length;
  const c = { id, area: 0, x0: W, y0: H, x1: 0, y1: 0, sx: 0, sy: 0 };
  stack.push(s);
  label[s] = id;
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = (p - x) / W;
    c.area++;
    c.sx += x;
    c.sy += y;
    if (x < c.x0) c.x0 = x;
    if (x > c.x1) c.x1 = x;
    if (y < c.y0) c.y0 = y;
    if (y > c.y1) c.y1 = y;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (label[q] === -1 && px[q * 4 + 3] > A) {
          label[q] = id;
          stack.push(q);
        }
      }
  }
  comps.push(c);
}
// Largest first; specks (under 0.15% of the biggest) are dropped.
comps.sort((a, b) => b.area - a.area);
const keep = comps.filter((c) => c.area >= comps[0].area * 0.0015);
const remap = new Map(keep.map((c, i) => [c.id, i]));
const out = keep.map((c, i) => ({
  idx: i,
  area: c.area,
  bbox: [c.x0, c.y0, c.x1 - c.x0 + 1, c.y1 - c.y0 + 1],
  centroid: [Math.round(c.sx / c.area), Math.round(c.sy / c.area)],
  src: c.id,
}));
// Crop each component with a 2 px margin: only its own pixels (other components' pixels in the box
// are erased, so a fist next to a body does not carry a piece of it).
for (const c of out) {
  const [bx, by, bw, bh] = c.bbox;
  const m = 2;
  const ow = bw + 2 * m;
  const oh = bh + 2 * m;
  const buf = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < bh; y++)
    for (let x = 0; x < bw; x++) {
      const q = (by + y) * W + (bx + x);
      if (remap.get(label[q]) !== c.idx) continue;
      const o = ((y + m) * ow + (x + m)) * 4;
      buf[o] = px[q * 4];
      buf[o + 1] = px[q * 4 + 1];
      buf[o + 2] = px[q * 4 + 2];
      buf[o + 3] = px[q * 4 + 3];
    }
  await sharp(buf, { raw: { width: ow, height: oh, channels: 4 } })
    .png()
    .toFile(`${dir}/c${c.idx}.png`);
  c.crop = { margin: m, w: ow, h: oh };
}
writeFileSync(
  `${dir}/components.json`,
  JSON.stringify({ width: W, height: H, comps: out }, null, 1),
);
// The keyed picture and a numbered overlay.
await sharp(px, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toFile(`${dir}/keyed.png`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${out
  .map(
    (c) =>
      `<rect x="${c.bbox[0]}" y="${c.bbox[1]}" width="${c.bbox[2]}" height="${c.bbox[3]}" fill="none" stroke="#00e5ff" stroke-width="2"/><text x="${c.bbox[0] + 3}" y="${c.bbox[1] + 18}" font-size="18" font-family="sans-serif" fill="#ffffff" stroke="#000000" stroke-width="3" paint-order="stroke">${c.idx}</text>`,
  )
  .join('')}</svg>`;
await sharp(px, { raw: { width: W, height: H, channels: 4 } })
  .flatten({ background: '#6b7a58' })
  .composite([{ input: Buffer.from(svg) }])
  .png()
  .toFile(`${dir}/debug.png`);
console.log(`${name}: ${W}x${H}, ${out.length} components`);
for (const c of out) console.log(c.idx, 'area', c.area, 'bbox', c.bbox.join(','));
