// Dev: checks the update path of the installed app with two real builds. Needs Chromium; builds into
// dist/ (run `npm run build` first for build A). It opens A, lets its service worker take over,
// deploys B (one asset changed), launches again and reports how many page loads and game starts the
// launch cost: the new version must install and reload BEFORE the game starts (1 game start, 2 page
// loads), and the page must serve B.
//   node scripts/pwa-check.mjs
import { spawn, execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const PORT = 6998;
let server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist'], {
  stdio: 'ignore',
  detached: true,
});
await new Promise((r) => setTimeout(r, 4000));
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await b.newContext({ viewport: { width: 915, height: 412 } });
const p = await ctx.newPage();
const nav = [];
let phaser = 0;
p.on('framenavigated', (f) => f === p.mainFrame() && nav.push(Date.now()));
p.on('console', (m) => {
  if (m.text().includes('Phaser v3')) phaser++;
  if (m.text().includes('update check')) console.log('  page says:', m.text());
});
await p.goto(`http://localhost:${PORT}/?debug&scale=1`);
await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
// Wait until the service worker controls the page (first install).
await p.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
  timeout: 60000,
});
const ver = () =>
  p.evaluate(
    async () => (await (await fetch('assets/manifest.json', { cache: 'no-store' })).text()).length,
  );
console.log(
  'A: manifest length via SW',
  await ver(),
  'navigations',
  nav.length,
  'phaser banners',
  phaser,
);
// Deploy B: change an asset so the precache revision differs, rebuild into dist.
const mp = 'public/assets/manifest.json';
const orig = readFileSync(mp, 'utf8');
writeFileSync(mp, orig + '\n');
execSync('npm run build', { stdio: 'ignore' });
writeFileSync(mp, orig);
try {
  process.kill(-server.pid);
} catch {
  // already gone
}
server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', 'dist'], {
  stdio: 'ignore',
  detached: true,
});
await new Promise((r) => setTimeout(r, 1500));
await p.evaluate(() => {
  window.__game.destroy(true);
});
nav.length = 0;
phaser = 0;
const t0 = Date.now();
await p.goto(`http://localhost:${PORT}/?debug&scale=1&updatewait=15000`);
await p.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
console.log(
  `B launch: Title after ${Date.now() - t0} ms; navigations ${nav.length}; phaser banners (game starts) ${phaser}`,
);
console.log('B: manifest length via SW', await ver());
await b.close();
try {
  process.kill(-server.pid);
} catch {
  // already gone
}
