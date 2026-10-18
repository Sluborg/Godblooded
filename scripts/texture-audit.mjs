// Dev: for every picture drawn in the map and its HUD, the pixels it is drawn at (at the maximum
// camera zoom and render scale) against the pixels the file has. A file much bigger than it is ever
// drawn is wasted GPU memory and download. Needs `npm run build` and Chromium.
//   node scripts/texture-audit.mjs
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 7010;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true,
});
await new Promise((r) => setTimeout(r, 4000));
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 915, height: 412 } });
await p.goto(`http://localhost:${PORT}/?debug&scale=1`);
await p.waitForFunction(() => window.__game?.registry.get('artDone') === true, null, {
  timeout: 120000,
});
await new Promise((r) => setTimeout(r, 1500));
const collect = () =>
  p.evaluate(() => {
    const g = window.__game;
    const MAX_ZOOM = 2; // cameraControls MAX_ZOOM (design units)
    const SCALE = 2; // RENDER_SCALE_MAX
    const seen = [];
    const walk = (o, scene, mul) => {
      if (o.list) o.list.forEach((c) => walk(c, scene, mul * Math.abs(o.scaleX || 1)));
      if (o.type === 'Image' || o.type === 'Sprite' || o.type === 'NineSlice') {
        const key = o.texture?.key;
        if (!key || key.startsWith('__') || key.startsWith('bake:')) return;
        const world = scene.sys.settings.key === 'Map';
        const dev = Math.abs(o.displayWidth) * mul * (world ? MAX_ZOOM : 1) * SCALE;
        seen.push({
          key,
          texW: o.frame.realWidth,
          texH: o.frame.realHeight,
          dev,
          scene: scene.sys.settings.key,
        });
      }
    };
    for (const s of g.scene.getScenes(true)) s.children.list.forEach((c) => walk(c, s, 1));
    return seen;
  });
const all = new Map();
const add = (rows) => {
  for (const r of rows) {
    const e = all.get(r.key);
    if (!e || r.dev > e.dev) all.set(r.key, r);
  }
};
add(await collect());
await p.evaluate(() => window.__game.scene.getScene('Title').scene.start('Map'));
await p.waitForFunction(
  () => window.__game.scene.isActive('Map') && window.__game.scene.isActive('Hud'),
);
await new Promise((r) => setTimeout(r, 4000));
add(await collect());
for (const name of ['Settings', 'Altar', 'Pause', 'Setup']) {
  try {
    await p.evaluate((n) => {
      const g = window.__game;
      g.scene.getScene('Map').scene.launch(n);
    }, name);
    await new Promise((r) => setTimeout(r, 1500));
    add(await collect());
    await p.evaluate((n) => window.__game.scene.getScene('Map').scene.stop(n), name);
  } catch (e) {
    console.log('skipped', name, String(e).slice(0, 80));
  }
}
const rows = [...all.values()];
let waste = 0;
const out = [];
for (const r of rows) {
  const ratio = r.texW / r.dev;
  // Needed: the drawn size, with 1.0x as the target; a file bigger than 2x of that is oversize.
  const keepW = Math.ceil(r.dev * 2);
  if (r.texW > keepW) {
    const saved = ((r.texW * r.texH - keepW * Math.round((r.texH * keepW) / r.texW)) * 4) / 1048576;
    waste += saved;
    out.push([
      r.key,
      r.scene,
      `${r.texW}x${r.texH}`,
      `drawn ${Math.round(r.dev)}px`,
      `ratio ${ratio.toFixed(1)}`,
      `keep ${keepW}px`,
      `saves ${saved.toFixed(2)} MB`,
    ]);
  }
}
out.sort((a, c) => parseFloat(c[6].split(' ')[1]) - parseFloat(a[6].split(' ')[1]));
console.log(
  `pictures seen: ${rows.length}; oversize (file > 2x its largest drawn size): ${out.length}; GPU MB saved if cut to 2x: ${waste.toFixed(1)}`,
);
out.slice(0, 25).forEach((o) => console.log(o.join('  ')));
await b.close();
try {
  process.kill(-server.pid);
} catch {
  /* gone */
}
