// Dev: puts the recorded animation-test clips side by side (one animated strip per zoom) and a
// still strip of key poses, and copies the results to docs/screenshots/anim-test-*.
//   node scripts/anim-strip.mjs
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';

const UNITS = ['grim', 'axeman', 'thorson', 'oldwarrior', 'minotaur'];
const OUT = 'anim-test/out';
const DOCS = 'docs/screenshots';
mkdirSync(DOCS, { recursive: true });
const ff = (args) =>
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const kb = (f) => `${f} ${Math.round(statSync(f).size / 1024)} KB`;

for (const z of [1, 2]) {
  const inputs = UNITS.flatMap((u) => [
    '-framerate',
    '15',
    '-i',
    `${OUT}/frames-${u}-z${z}/%03d.png`,
  ]);
  // Units may be framed differently (a taller box for the minotaur): bring all to one height first.
  const fit = UNITS.map((_, i) => `[${i}:v]scale=-2:300[s${i}]`).join(';');
  const stack =
    `${fit};` + UNITS.map((_, i) => `[s${i}]`).join('') + `hstack=${UNITS.length},scale=1600:-2`;
  ff([
    ...inputs,
    '-filter_complex',
    stack,
    '-c:v',
    'libwebp_anim',
    '-loop',
    '0',
    '-quality',
    '65',
    `${DOCS}/anim-test-strip-z${z}.webp`,
  ]);
  ff([
    ...inputs,
    '-filter_complex',
    `${stack},split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
    `${DOCS}/anim-test-strip-z${z}.gif`,
  ]);
  for (const u of UNITS) {
    const f = `${OUT}/${u}-z${z}.webp`;
    if (existsSync(f)) copyFileSync(f, `${DOCS}/anim-test-${u}-z${z}.webp`);
  }
}
// A still strip: idle, walk, wind-up, contact, follow-through, hurt for each unit (zoom 2).
const KEYS = ['004', '030', '050', '057', '064', '078'];
const rows = UNITS.map((u) => {
  const inputs = KEYS.flatMap((k) => ['-i', `${OUT}/frames-${u}-z2/${k}.png`]);
  const f = `${OUT}/row-${u}.png`;
  ff([
    ...inputs,
    '-filter_complex',
    `${KEYS.map((_, i) => `[${i}:v]scale=-2:300[s${i}]`).join(';')};${KEYS.map((_, i) => `[s${i}]`).join('')}hstack=${KEYS.length}`,
    f,
  ]);
  return f;
});
ff([
  ...rows.flatMap((r) => ['-i', r]),
  '-filter_complex',
  `${rows.map((_, i) => `[${i}:v]scale=2400:-2[r${i}]`).join(';')};${rows.map((_, i) => `[r${i}]`).join('')}vstack=${rows.length}`,
  `${DOCS}/anim-test-poses.png`,
]);
for (const f of [
  'anim-test-strip-z1.webp',
  'anim-test-strip-z2.webp',
  'anim-test-strip-z1.gif',
  'anim-test-strip-z2.gif',
  'anim-test-poses.png',
])
  console.log(kb(`${DOCS}/${f}`));
