// Smoke run: builds a temple and a market through the real UI on the real data, runs at 4x
// speed for about 3 game minutes in a phone-size browser (landscape 915x412), saves
// screenshots to smoke-out/ (gitignored) and fails on console errors or page errors.
//   npm run smoke            (needs Chromium: PLAYWRIGHT_BROWSERS_PATH or SMOKE_CHROMIUM)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright-core';

const PORT = 5198;
const URL = `http://localhost:${PORT}/?debug${process.env.SMOKE_SCALE ? `&scale=${process.env.SMOKE_SCALE}` : ''}`;
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
          r.left + ((wx - c.worldView.x) * c.zoom * r.width) / g.canvas.width,
          r.top + ((wy - c.worldView.y) * c.zoom * r.height) / g.canvas.height,
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
        pathCards: Boolean(g.registry.get('offer')?.paths),
      };
    });

  await page.goto(URL);
  await page.waitForFunction(() => window.__game?.scene.isActive('Boot'), null, {
    timeout: 15_000,
  });
  await page.waitForFunction(() => window.__game?.scene.isActive('Title'), null, {
    // Software GL is slow at a high render scale (SMOKE_SCALE): the boot takes several times longer.
    timeout: process.env.SMOKE_SCALE ? 60_000 : 15_000,
  });
  await sleep(500);
  // Title: Play is the first button (design y 420 when there is no run to continue).
  await tap(await designToScreen([640, 420]));
  await page.waitForFunction(
    () => window.__game.scene.isActive('Map') && window.__game.scene.isActive('Hud'),
  );
  await sleep(800);
  await page.screenshot({ path: `${OUT}/00-start.png` });

  // Build: tap a free plot, then the menu button at the building's index in the data file.
  // The build menu lists the data rows in order: ask the running game for them.
  const ids = await page.evaluate(async () =>
    (await import('/src/data/graybox.ts')).GRAYBOX.buildings.map((d) => d.id),
  );
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
    // Tap for info, then tap again to build (the menu is rebuilt between the two taps).
    await tap(await designToScreen(center));
    await sleep(300);
    if ((await state()).buildings !== before)
      throw new Error(`building ${type} was built on a single tap (step ${n})`);
    const again = await page.evaluate((i) => {
      const b = window.__game.scene.getScene('Hud').menuButtons[i]?.button.rect;
      return b ? [b.centerX, b.centerY] : null;
    }, index);
    if (!again) throw new Error(`no menu button for ${type} after the first tap`);
    await tap(await designToScreen(again));
    await sleep(400);
    if ((await state()).buildings !== before + 1)
      throw new Error(`building ${type} was not built (step ${n})`);
  }

  // Touch target audit: every interactive object in the UI scenes (not the map) is at least
  // MIN_TOUCH minus 2 px of rounding slack, in design pixels.
  const audit = () =>
    page.evaluate(() => {
      const out = [];
      const walk = (scene, o) => {
        if (o.input?.enabled && o.visible && o.alpha > 0) {
          const b = o.getBounds();
          if (Math.min(b.width, b.height) < 78 && b.width < 1200)
            out.push(
              `${scene.sys.settings.key}: ${o.type} ${Math.round(b.width)}x${Math.round(b.height)} at ${Math.round(b.x)},${Math.round(b.y)}`,
            );
        }
        if (o.list) for (const c of o.list) walk(scene, c);
      };
      for (const scene of window.__game.scene.getScenes(true)) {
        if (scene.sys.settings.key === 'Map') continue;
        for (const o of scene.sys.displayList.list) walk(scene, o);
      }
      return out;
    });
  const small = await audit();
  if (small.length) throw new Error(`touch targets below 78 px:\n  ${small.join('\n  ')}`);

  // A bounty menu can be dismissed: tap bare ground (opens it), tap Close (the last button).
  const menuOpen = () =>
    page.evaluate(() => window.__game.scene.getScene('Hud').menuButtons.length > 0);
  // A spot in view that is clear of plots, buildings, lairs and units (a tap there is bare ground).
  const ground = await page.evaluate(() => {
    const m = window.__game.scene.getScene('Map');
    const c = m.cameras.main.midPoint;
    const near = [...m.snap.plots, ...m.snap.buildings, ...m.snap.lairs, ...m.snap.units];
    const clear = (x, y) => near.every((e) => Math.hypot(e.pos.x - x, e.pos.y - y) > 160);
    for (let r = 0; r < 600; r += 40)
      for (const [dx, dy] of [
        [1, -0.4],
        [-1, -0.4],
        [0.6, -1],
        [-0.6, -1],
        [1, 0.2],
        [-1, 0.2],
      ])
        if (clear(c.x + dx * r, c.y + dy * r)) return [c.x + dx * r, c.y + dy * r];
    return [c.x + 300, c.y - 100];
  });
  await tap(await worldToScreen(ground));
  if (!(await menuOpen())) throw new Error('bounty menu did not open on bare ground');
  const close = await page.evaluate(() => {
    const list = window.__game.scene.getScene('Hud').menuButtons;
    const b = list[list.length - 1].button.rect;
    return [b.centerX, b.centerY];
  });
  await tap(await designToScreen(close));
  await sleep(300);
  if (await menuOpen()) throw new Error('bounty menu did not close on Close');
  await tap(await worldToScreen(ground));
  await tap(await worldToScreen(ground));
  await sleep(300);
  if (await menuOpen()) throw new Error('bounty menu did not close on a bare-ground tap');

  // 4x speed: the one speed button cycles 1x, 2x, 4x, so two taps.
  const fast = await page.evaluate(() => {
    const b = window.__game.scene.getScene('Hud').speedBtn.rect;
    return [b.centerX, b.centerY];
  });
  await tap(await designToScreen(fast));
  await tap(await designToScreen(fast));
  const speed = await page.evaluate(() => window.__game.registry.get('speed'));
  if (speed !== 4) throw new Error(`speed button did not reach 4x (got ${speed})`);

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
    // Upgrade cards are three wide (first at x 260); path cards are two (first at x 450).
    if (s.levelUp) await tap(await designToScreen([s.pathCards ? 450 : 260, 400]));
    if (s.timeMs >= nextShot) {
      await page.screenshot({ path: `${OUT}/${String(nextShot / 1000).padStart(3, '0')}s.png` });
      nextShot += SHOT_EVERY_MS;
    }
    await sleep(500);
    s = await state();
  }
  // A run that ended (won or lost) before the target time did not cover what smoke promises.
  if (s.timeMs < GAME_MS && !process.exitCode) {
    fail(`run ended early at ${Math.round(s.timeMs / 1000)} game s with status ${s.status}`);
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
  fail(e instanceof Error ? (process.env.SMOKE_STACK ? e.stack : e.message) : String(e));
} finally {
  await cleanup(browser);
}
if (!process.exitCode) console.log('SMOKE OK');
