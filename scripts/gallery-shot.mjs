// Screenshots of the part-based hero gallery (?gallery=<god>) into smoke-out/.
//   node scripts/gallery-shot.mjs thor odin loki freyja   (needs Chromium at /opt/pw-browsers)
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const PORT = 5197;
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
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('console', m.text());
});
for (const god of process.argv.slice(2)) {
  await page.goto(`http://localhost:${PORT}/?debug&gallery=${god}`);
  await sleep(2500);
  await page.screenshot({ path: `smoke-out/gallery-${god}.png` });
}
await browser.close();
server.kill();
