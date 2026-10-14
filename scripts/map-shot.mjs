// Map screenshots for review: node scripts/map-shot.mjs <name> [seconds]
// Starts the game with ?debug, builds a few buildings, runs a little, then shots the map at
// 1280x720 (and a zoomed crop around the first lair) into smoke-out/<name>-*.png.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5198;
const name = process.argv[2] ?? 'map';
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    /* not up yet */
  }
  await sleep(500);
}
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`http://localhost:${PORT}/?debug`);
await page.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 20000 });
await sleep(500);
await page.screenshot({ path: `smoke-out/${name}-title.png` });
await page.evaluate(() => window.__game.scene.getScene('Title').scene.start('Map'));
await page.waitForFunction(() => window.__game.scene.isActive('Map'), null, { timeout: 10000 });
await sleep(800);
await page.evaluate(() => {
  const m = window.__game.scene.getScene('Map');
  const free = m.snapshot.plots.filter((p) => !p.occupied);
  for (const [i, t] of ['temple_aesir', 'tower', 'market', 'smithy'].entries())
    if (free[i]) m.tryBuild(t, free[i].id);
});
await sleep(4000);
await page.screenshot({ path: `smoke-out/${name}-town.png` });
// Pan to the first lair.
const lair = await page.evaluate(() => window.__game.scene.getScene('Map').snapshot.lairs[0]?.pos);
if (lair) {
  await page.evaluate(({ x, y }) => {
    const m = window.__game.scene.getScene('Map');
    m.setWatch?.(false);
    m.cameras.main.centerOn(x, y);
  }, lair);
  await sleep(600);
  await page.screenshot({ path: `smoke-out/${name}-lair.png` });
}
await browser.close();
server.kill();
