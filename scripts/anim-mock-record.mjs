// Dev: records the hero style mock (anim-test/heroMock.ts: stance-driven poses on the compact rig)
// as frames and animated webp + gif at game size (z1) and 2x (z2):
//   node scripts/anim-mock-record.mjs [clip ...]     clips: thorson odin tyr loki lineup lineup_party
// Output: anim-test/out/hsm_<clip>-z<zoom>.{webp,gif}, frames in anim-test/out/frames-hsm_<clip>-z<zoom>.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const HERO = {
  thorson: { kit: 'hs_thorson', stance: 'hammer', x: 0, phase: 0 },
  odin: { kit: 'hs_odin', stance: 'staff', x: 0, phase: 0 },
  tyr: { kit: 'hs_tyr', stance: 'sword', x: 0, phase: 0 },
  loki: { kit: 'hs_loki', stance: 'dagger', x: 0, phase: 0 },
};
const H2 = {
  tyr2: { kit: 'hs_tyr2', stance: 'sword', x: 0, phase: 0 },
  loki2: { kit: 'hs_loki2', stance: 'dagger', x: 0, phase: 0 },
  freyja: { kit: 'hs_freyja', stance: 'staff', x: 0, phase: 0, glow: [255, 170, 50] },
  athena: { kit: 'hs_athena', stance: 'spear', x: 0, phase: 0 },
  anubis: { kit: 'hs_anubis', stance: 'sword', x: 0, phase: 0 },
};
const five = ['tyr2', 'loki2', 'freyja', 'athena', 'anubis'].map((n, i) => ({
  ...H2[n],
  x: (i - 2) * 44 || 0.01,
  y: 6,
  phase: i * 0.9,
}));
const second = [
  { ...HERO.thorson, x: -22, y: -26, phase: 0.4 },
  { ...HERO.odin, x: 22, y: -26, phase: 1.3 },
];
const line = (suf) =>
  ['thorson', 'odin', 'tyr', 'loki'].map((n, i) => ({
    ...HERO[n],
    kit: HERO[n].kit + suf,
    phase: i * 0.9,
  }));
const CLIPS = {
  tyr2: { heroes: [H2.tyr2], mode: 'solo', frames: 84, w: 440, h: 340 },
  loki2: { heroes: [H2.loki2], mode: 'solo', frames: 84, w: 440, h: 340 },
  freyja: { heroes: [H2.freyja], mode: 'solo', frames: 84, w: 440, h: 340 },
  athena: { heroes: [H2.athena], mode: 'solo', frames: 84, w: 440, h: 340 },
  anubis: { heroes: [H2.anubis], mode: 'solo', frames: 84, w: 440, h: 340 },
  party5: { heroes: five, mode: 'line', frames: 60, w: 760, h: 340 },
  party5_two: { heroes: [...five, ...second], mode: 'line', frames: 60, w: 760, h: 340 },
  thorson: { heroes: [HERO.thorson], mode: 'solo', frames: 84, w: 440, h: 340 },
  odin: { heroes: [HERO.odin], mode: 'solo', frames: 84, w: 440, h: 340 },
  tyr: { heroes: [HERO.tyr], mode: 'solo', frames: 84, w: 440, h: 340 },
  loki: { heroes: [HERO.loki], mode: 'solo', frames: 84, w: 440, h: 340 },
  lineup: { heroes: line(''), mode: 'line', frames: 60, w: 600, h: 340 },
  lineup_party: { heroes: line('_party'), mode: 'line', frames: 60, w: 600, h: 340 },
};
const pair = (h) => [
  { ...h, x: -62, label: 'front hand', side: 'front' },
  { ...h, x: 38, label: 'back hand', side: 'back' },
];
CLIPS.pair_thorson = { heroes: pair(HERO.thorson), mode: 'solo', frames: 84, w: 700, h: 340 };
CLIPS.pair_tyr2 = { heroes: pair(H2.tyr2), mode: 'solo', frames: 84, w: 700, h: 340 };
CLIPS.pair_anubis = { heroes: pair(H2.anubis), mode: 'solo', frames: 84, w: 700, h: 340 };
CLIPS.pair_thorson_sh = {
  heroes: pair({ ...HERO.thorson, kit: 'hs_thorson_sh' }),
  mode: 'solo',
  frames: 84,
  w: 700,
  h: 340,
};
CLIPS.pair_anubis_sh = {
  heroes: pair({ ...H2.anubis, kit: 'hs_anubis_sh' }),
  mode: 'solo',
  frames: 84,
  w: 700,
  h: 340,
};
// The hand rule (Stefan 2026-10-19, final): the weapon is in the BACK hand (cape side) for everyone;
// a shield would be on the front hand, angled; no shields in the mock until Art paints one.
CLIPS.thorson = {
  heroes: [{ ...HERO.thorson, side: 'back' }],
  mode: 'solo',
  frames: 84,
  w: 440,
  h: 340,
};
CLIPS.anubis = {
  heroes: [{ ...H2.anubis, side: 'back' }],
  mode: 'solo',
  frames: 84,
  w: 440,
  h: 340,
};
CLIPS.thorson_sh = {
  heroes: [{ ...HERO.thorson, kit: 'hs_thorson_sh', side: 'front' }],
  mode: 'solo',
  frames: 84,
  w: 440,
  h: 340,
};
CLIPS.anubis_sh_unused = {
  heroes: [{ ...H2.anubis, kit: 'hs_anubis_sh', side: 'front' }],
  mode: 'solo',
  frames: 84,
  w: 440,
  h: 340,
};
CLIPS.loki2 = { heroes: [{ ...H2.loki2, side: 'back' }], mode: 'solo', frames: 84, w: 440, h: 340 };
// Thorbloods from the real kit sheets (art/ship-thorbloods): weapon on the back hand for everyone.
const tb = (head, weapon, extra = {}) => ({
  kit: `tb:${head}:${weapon}`,
  stance: weapon.startsWith('thunderstaff') ? 'staff' : 'hammer',
  side: weapon.startsWith('thunderstaff') ? 'front' : 'back',
  x: 0,
  phase: 0,
  glow: [130, 190, 255],
  ...extra,
});
CLIPS.tb_solo = { heroes: [tb('m1', 'hammer_t1')], mode: 'solo', frames: 84, w: 440, h: 340 };
CLIPS.tb_staff = {
  heroes: [tb('f2', 'thunderstaff_t1')],
  mode: 'solo',
  frames: 84,
  w: 440,
  h: 340,
};
CLIPS.tb_tiers = {
  heroes: [
    tb('m1', 'hammer_t1', { x: -105 }),
    tb('f1', 'hammer_t2', { x: -35 }),
    tb('m2', 'hammer_t3', { x: 35 }),
  ],
  mode: 'solo',
  frames: 84,
  w: 800,
  h: 340,
};
CLIPS.tb_party = {
  heroes: [
    tb('m1', 'hammer_t1', { x: -66, y: 4, phase: 0 }),
    tb('f1', 'hammer_t2', { x: -22, y: -4, phase: 0.9 }),
    tb('m2', 'thunderstaff_t1', { x: 22, y: 4, phase: 1.8 }),
    tb('f2', 'thunderstaff_t2', { x: 66, y: -4, phase: 2.7 }),
  ],
  mode: 'line',
  frames: 60,
  w: 640,
  h: 340,
};
const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(CLIPS);
const OUT = 'anim-test/out';
mkdirSync(OUT, { recursive: true });
const PORT = 6500 + Math.floor(Math.random() * 300);
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    // not up yet
  }
  await sleep(500);
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const run = (args) =>
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
for (const name of names) {
  const c = CLIPS[name];
  const page = await (
    await browser.newContext({ viewport: { width: c.w, height: c.h } })
  ).newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
  await page.goto(`http://localhost:${PORT}/anim-test/heroMock.html`);
  await page.waitForFunction(() => window.MockClass);
  await page.evaluate(async (heroes) => {
    window.mock = new window.MockClass(document.getElementById('c'), heroes);
    await window.mock.load();
  }, c.heroes);
  for (const zoom of [1, 2]) {
    await page.evaluate((on) => {
      window.mock.measure = on;
      window.mock.vis = [];
    }, zoom === 1);
    const dir = `${OUT}/frames-hsm_${name}-z${zoom}`;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (let i = 0; i < c.frames; i++) {
      const url = await page.evaluate(
        ([mode, i, scale, w, h]) => window.mock.frame(mode, i, scale, w, h),
        [c.mode, i, zoom === 1 ? 1.2 : 2.4, c.w, c.h],
      );
      writeFileSync(
        `${dir}/${String(i).padStart(3, '0')}.png`,
        Buffer.from(url.split(',')[1], 'base64'),
      );
    }
    if (zoom === 1)
      console.log(
        name,
        'ball visible',
        JSON.stringify(
          await page.evaluate(() =>
            window.mock
              .visStats()
              .map((s) => ({ min: +s.min.toFixed(2), mean: +s.mean.toFixed(2) })),
          ),
        ),
      );
    const base = `${OUT}/hsm_${name}-z${zoom}`;
    run([
      '-framerate',
      '15',
      '-i',
      `${dir}/%03d.png`,
      '-vf',
      'scale=480:-1:flags=lanczos',
      '-c:v',
      'libwebp_anim',
      '-loop',
      '0',
      '-quality',
      '75',
      `${base}.webp`,
    ]);
    run([
      '-framerate',
      '15',
      '-i',
      `${dir}/%03d.png`,
      '-vf',
      'scale=420:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
      `${base}.gif`,
    ]);
    console.log(base);
  }
  await page.close();
}
await browser.close();
process.kill(-server.pid);
