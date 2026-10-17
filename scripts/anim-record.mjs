// Dev: records the animation test clips (idle, walk, attack, hurt at 1x) on the real map, at game
// zoom (1x) and 2x zoom. Nothing here ships.
//   node scripts/anim-record.mjs [unit ...]        units from anim-test/units.json, or the file in $UNITS (default: all)
// Output: anim-test/out/<unit>-z<zoom>.{webp,gif} and docs/screenshots/anim-test-* (see the end).
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { chromium } from 'playwright-core';

const units = JSON.parse(readFileSync(process.env.UNITS ?? 'anim-test/units.json', 'utf8'));
const wanted = process.argv.slice(2);
const list = wanted.length ? units.filter((u) => wanted.includes(u.name)) : units;
const OUT = 'anim-test/out';
mkdirSync(OUT, { recursive: true });

const PORT = 6100 + Math.floor(Math.random() * 300);
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    // the dev server is not up yet
  }
  await sleep(500);
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function record(u, zoom) {
  const page = await (
    await browser.newContext({ viewport: { width: 1280, height: 720 } })
  ).newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  // The foe is the compact-rig draugr (hero scale), and a monster subject is on the rig too.
  const rig = `&monsterrig=draugr${u.kind === 'monster' ? `,${u.type}` : ''}`;
  await page.goto(`http://localhost:${PORT}/?debug&record&scale=2${rig}`);
  await page.waitForFunction(() => window.__game?.scene.isActive('Title'), null, {
    timeout: 40000,
  });
  await page.evaluate(() => window.__game.scene.getScene('Title').scene.start('Map'));
  await page.waitForFunction(() => window.__game.scene.isActive('Map'));
  await sleep(600);
  const total = await page.evaluate(
    async ({ u, zoom }) => {
      const { AnimStage, registerAnimKit } = await import('/src/dev/animStage.ts');
      if (u.kit) await registerAnimKit(u.kit);
      const game = window.__game;
      const map = game.scene.getScene('Map');
      map.registry.set('speed', 0);
      // The emptiest patch of ground near the town: far from every plot, building and lair.
      const snap = map.snapshot;
      const pts = [...snap.plots, ...snap.buildings, ...snap.lairs].map((p) => p.pos ?? p);
      let best = { x: 400, y: 400, d: 0 };
      for (let x = 200; x < 2400; x += 60)
        for (let y = 200; y < 1600; y += 60) {
          const d = Math.min(...pts.map((p) => Math.hypot(p.x - x, p.y - y)));
          if (d > best.d) best = { x, y, d };
        }
      const stage = new AnimStage(map, game, {
        kind: u.kind,
        god: u.god,
        path: u.path,
        tier: u.tier,
        type: u.type,
        zoom,
      });
      stage.start(best);
      window.__stage = stage;
      return stage.total;
    },
    { u, zoom },
  );
  const dir = `${OUT}/frames-${u.name}-z${zoom}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const box = u.box ?? { w: 400, h: 300 };
  for (let i = 0; i < total; i++) {
    const url = await page.evaluate((box) => {
      window.__stage.step();
      return window.__stage.grab(box);
    }, box);
    writeFileSync(
      `${dir}/${String(i).padStart(3, '0')}.png`,
      Buffer.from(url.split(',')[1], 'base64'),
    );
  }
  await page.close();
  return dir;
}

function encode(dir, base) {
  // 15 fps frames: the animated WebP and a GIF from the same frames.
  const run = (args) =>
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
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
    '70',
    `${base}.webp`,
  ]);
  run([
    '-framerate',
    '15',
    '-i',
    `${dir}/%03d.png`,
    '-vf',
    'scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    `${base}.gif`,
  ]);
}

for (const u of list) {
  for (const zoom of [1, 2]) {
    const dir = await record(u, zoom);
    const base = `${OUT}/${u.name}-z${zoom}`;
    encode(dir, base);
    for (const ext of ['webp', 'gif']) {
      const f = `${base}.${ext}`;
      if (existsSync(f)) console.log(f, Math.round(statSync(f).size / 1024), 'KB');
    }
  }
}
await browser.close();
process.kill(-server.pid);
