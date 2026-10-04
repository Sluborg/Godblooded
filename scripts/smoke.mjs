// Smoke run: builds a temple and a market through the real UI on the real data, runs at 4x
// speed for about 3 game minutes in a phone-size browser (landscape 915x412), saves
// screenshots to smoke-out/ (gitignored) and fails on console errors or page errors.
//   npm run smoke            (needs Chromium: PLAYWRIGHT_BROWSERS_PATH or SMOKE_CHROMIUM)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 5198;
const URL = `http://localhost:${PORT}/?debug`;
const OUT = 'smoke-out';
const GAME_MS = 180_000;
const REAL_TIMEOUT_MS = 10 * 60_000;
const SHOT_EVERY_MS = 60_000;
const BUILD = ['temple_aesir', 'market'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg) => {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exitCode = 1;
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const cleanup = async (browser) => {
  await browser?.close().catch(() => {});
  server.kill();
};

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(URL)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error('dev server did not start');
}

const chromiumPath =
  process.env.SMOKE_CHROMIUM ??
  (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: chromiumPath });
  const page = await (
    await browser.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true })
  ).newPage();

  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console error: ${m.text()}`);
  });

  // Screen position of a point in design (1280x720) coordinates.
  const designToScreen = ([x, y]) =>
    page.evaluate(
      ([x, y]) => {
        const r = window.__game.canvas.getBoundingClientRect();
        return [r.left + (x * r.width) / 1280, r.top + (y * r.height) / 720];
      },
      [x, y],
    );
  const worldToScreen = ([wx, wy]) =>
    page.evaluate(
      ([wx, wy]) => {
        const g = window.__game;
        const c = g.scene.getScene('Map').cameras.main;
        const r = g.canvas.getBoundingClientRect();
        return [
          r.left + ((wx - c.worldView.x) * c.zoom * r.width) / 1280,
          r.top + ((wy - c.worldView.y) * c.zoom * r.height) / 720,
        ];
      },
      [wx, wy],
    );
  const tap = async ([x, y]) => {
    await page.mouse.click(x, y);
    await sleep(400);
  };
  const state = () =>
    page.evaluate(() => {
      const g = window.__game;
      const s = g.scene.getScene('Map').snap;
      return {
        timeMs: s.timeMs,
        status: s.status,
        gold: s.gold,
        buildings: s.buildings.length,
        heroes: s.units.filter((u) => u.kind === 'hero').length,
        monsters: s.units.filter((u) => u.kind === 'monster').length,
        parties: s.parties.length,
        levelUp: g.scene.isActive('LevelUp'),
      };
    });

  await page.goto(URL);
  await page.waitForFunction(() => window.__game?.scene.isActive('Boot'), null, {
    timeout: 15_000,
  });
  await sleep(1500);
  await tap(await designToScreen([640, 360]));
  await page.waitForFunction(
    () => window.__game.scene.isActive('Map') && window.__game.scene.isActive('Hud'),
  );
  await sleep(800);
  await page.screenshot({ path: `${OUT}/00-start.png` });

  // Build: tap a free plot, then the menu button at the building's index in the data file.
  const ids = [
    ...readFileSync('src/data/graybox.ts', 'utf8').matchAll(/\{ id: '([a-z_]+)', cost: \d+ \}/g),
  ].map((m) => m[1]);
  for (const [n, type] of BUILD.entries()) {
    const index = ids.indexOf(type);
    if (index < 0) throw new Error(`building ${type} not in src/data/graybox.ts`);
    const plot = await page.evaluate(
      (k) => window.__game.scene.getScene('Map').snap.plots.filter((p) => !p.occupied)[k]?.pos,
      0,
    );
    if (!plot) throw new Error('no free plot');
    await tap(await worldToScreen([plot.x, plot.y]));
    const center = await page.evaluate((i) => {
      const b = window.__game.scene.getScene('Hud').menuButtons[i]?.button.rect;
      return b ? [b.centerX, b.centerY] : null;
    }, index);
    if (!center) throw new Error(`no menu button for ${type}`);
    const before = (await state()).buildings;
    await tap(await designToScreen(center));
    await sleep(400);
    if ((await state()).buildings !== before + 1)
      throw new Error(`building ${type} was not built (step ${n})`);
  }

  // 4x speed.
  const fast = await page.evaluate(() => {
    const b = window.__game.scene.getScene('Hud').speedButtons[2].rect;
    return [b.centerX, b.centerY];
  });
  await tap(await designToScreen(fast));

  // Run: pick the first card whenever a level-up opens, shot every game minute.
  const started = Date.now();
  let nextShot = SHOT_EVERY_MS;
  let s = await state();
  while (s.timeMs < GAME_MS && s.status === 'running') {
    if (Date.now() - started > REAL_TIMEOUT_MS) {
      fail(
        `only reached ${Math.round(s.timeMs / 1000)} game seconds in ${REAL_TIMEOUT_MS / 60000} real minutes`,
      );
      break;
    }
    if (s.levelUp) await tap(await designToScreen([260, 400]));
    if (s.timeMs >= nextShot) {
      await page.screenshot({ path: `${OUT}/${String(nextShot / 1000).padStart(3, '0')}s.png` });
      nextShot += SHOT_EVERY_MS;
    }
    await sleep(500);
    s = await state();
  }
  await page.screenshot({ path: `${OUT}/99-end.png` });
  console.log(
    `smoke: ${Math.round(s.timeMs / 1000)} game s in ${Math.round((Date.now() - started) / 1000)} real s, status ${s.status}, gold ${s.gold}, ` +
      `${s.buildings} buildings, ${s.heroes} heroes, ${s.monsters} monsters, ${s.parties} parties`,
  );
  console.log(`screenshots in ${OUT}/`);
  if (problems.length) {
    for (const p of [...new Set(problems)]) console.error(p);
    fail(`${problems.length} console/page errors`);
  }
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await cleanup(browser);
}
if (!process.exitCode) console.log('SMOKE OK');
