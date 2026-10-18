// Dev: builds compact-rig test kits for the prototype-shape heroes (round body ball with a painted
// head and ball, code-style ball hands and boots) at finish levels, for scripts/anim-record.mjs:
//   node scripts/anim-proto-kit.mjs [--standin]        -> anim-test/proto_axe_<level>/kit.json
// Needs the sheet kit_proto_axe (head_axe_<level>, ball_axe_<level>) in the manifest, or --standin
// (a flat ball and a shipped head, to check the layout before the art lands). The G7 axe comes from
// anim-test/axeman (scripts/anim-build.mjs). Pieces are drawn at 16 px per prototype unit (pu);
// the kit's ppu is 16 / PROTO_K so the figure comes out the prototype's size on screen.
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const PROTO_K = 44 / 32;
const PPU = 16 / PROTO_K;
const standin = process.argv.includes('--standin');
const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'));
const rows = manifest.assets ?? manifest;
const sheet = (id) => rows.find((r) => r.id === id);
const axe = JSON.parse(readFileSync('anim-test/axeman/kit.json', 'utf8'));

const cut = async (row, id, out) => {
  const c = row.cells[id];
  await sharp(`public/assets/${row.file}`)
    .extract({ left: c.x, top: c.y, width: c.w, height: c.h })
    .png()
    .toFile(out);
  return c;
};
const svg = (w, h, body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

for (const level of [25, 50, 75]) {
  const dir = `anim-test/proto_axe_${level}`;
  mkdirSync(dir, { recursive: true });
  let head;
  let ball;
  if (standin) {
    const hs = sheet('kit_heads_a');
    // A shipped head squeezed into the 448 px head cell, and a flat brown ball (14 x 16 pu).
    const c = hs.cells.head_b;
    await sharp(`public/assets/${hs.file}`)
      .extract({ left: c.x, top: c.y, width: c.w, height: c.h })
      .resize(448, Math.round((448 * c.h) / c.w))
      .png()
      .toFile(`${dir}/head.png`);
    const hh = Math.round((448 * c.h) / c.w);
    head = { file: 'head.png', w: 448, h: hh, pivots: { neck: [0.5, 0.95], brow: [0.5, 0.4] } };
    await sharp(
      svg(
        384,
        416,
        '<ellipse cx="192" cy="208" rx="112" ry="128" fill="#8a5434" stroke="#2a201b" stroke-width="6"/><rect x="82" y="238" width="220" height="24" fill="#4a3222"/>',
      ),
    )
      .png()
      .toFile(`${dir}/torso.png`);
    ball = { file: 'torso.png', w: 384, h: 416, pivots: { hip: [0.5, 0.5], neck: [0.54, 0.23] } };
  } else {
    const row = sheet('kit_proto_axe');
    const hc = await cut(row, `head_axe_${level}`, `${dir}/head.png`);
    const bc = await cut(row, `ball_axe_${level}`, `${dir}/torso.png`);
    head = { file: 'head.png', w: hc.w, h: hc.h, pivots: hc.pivots };
    ball = { file: 'torso.png', w: bc.w, h: bc.h, pivots: bc.pivots };
  }
  // Ball hand (skin circle r 2.4 pu) and ball boot (6.4 x 4.4 pu ellipse), like the prototype's.
  await sharp(
    svg(
      80,
      80,
      '<circle cx="40" cy="40" r="36" fill="#eab48c" stroke="#2a201b" stroke-width="4"/>',
    ),
  )
    .png()
    .toFile(`${dir}/hand.png`);
  await sharp(
    svg(
      112,
      76,
      '<ellipse cx="56" cy="38" rx="52" ry="34" fill="#4a3222" stroke="#2a201b" stroke-width="4"/>',
    ),
  )
    .png()
    .toFile(`${dir}/boot.png`);
  // The G7 axe at this kit's scale.
  const wk = axe.parts.weapon;
  const k = PPU / axe.ppu;
  const ww = Math.round(wk.w * k);
  const wh = Math.round(wk.h * k);
  await sharp(`anim-test/axeman/${wk.file}`)
    .resize(ww, wh, { kernel: 'lanczos3' })
    .png()
    .toFile(`${dir}/weapon.png`);
  const kit = {
    look: 'thor-hammerborn_t2',
    ppu: PPU,
    mode: 'floating',
    parts: {
      torso: ball,
      head,
      hand: { file: 'hand.png', w: 80, h: 80, pivots: { wrist: [0.5, 0.5], grip: [0.5, 0.5] } },
      boot: { file: 'boot.png', w: 112, h: 76, pivots: { ground: [0.5, 1], ankle: [0.5, 0.5] } },
      weapon: { file: 'weapon.png', w: ww, h: wh, pivots: wk.pivots },
    },
  };
  writeFileSync(`${dir}/kit.json`, JSON.stringify(kit, null, 1));
  console.log(dir, standin ? '(stand-in)' : '');
}
