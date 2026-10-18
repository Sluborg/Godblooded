// Dev: startup and in-play performance probe on the production build (npm run build first).
//   node scripts/perf-check.mjs [throttle=4]
// Loads dist/ with a Pixel-like landscape viewport and CPU throttling, with the service worker
// blocked (a cold start), and prints: time to the title, time to the map, transfer, textures, and
// frames per second and draw calls on the empty map.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const THROTTLE = Number(process.argv[2] ?? 4);
const PORT = 6500 + Math.floor(Math.random() * 300);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    // not up yet
  }
  await sleep(500);
}
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({
  viewport: { width: 915, height: 412 },
  deviceScaleFactor: 2.6,
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'block',
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
await page.addInitScript(() => {
  window.__long = [];
  window.__marks = {};
  setInterval(() => {
    const g = window.__game;
    if (!g) return;
    const m = window.__marks;
    if (!m.titleActive && g.scene.isActive('Title')) m.titleActive = Math.round(performance.now());
    if (!m.artDone && g.registry.get('artDone') === true) m.artDone = Math.round(performance.now());
  }, 25);
  new PerformanceObserver((l) =>
    l
      .getEntries()
      .forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)])),
  ).observe({ entryTypes: ['longtask'] });
  window.__draws = 0;
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
    for (const fn of ['drawElements', 'drawArrays']) {
      const orig = C.prototype[fn];
      C.prototype[fn] = function (...a) {
        window.__draws++;
        return orig.apply(this, a);
      };
    }
  }
});
const PROFILE = process.argv[3] === 'profile';
if (PROFILE) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
  await cdp.send('Profiler.start');
}
const t0 = Date.now();
await page.goto(`http://localhost:${PORT}/?debug`, { waitUntil: 'commit' });
const waitScene = (name) =>
  page.waitForFunction((n) => window.__game?.scene.isActive(n), name, {
    timeout: 120000,
    polling: 50,
  });
await waitScene('Boot');
const tBoot = Date.now() - t0;
// Loader progress over time: when it starts, when it passes each tenth, when textures are all in.
const prog = [];
const poll = setInterval(async () => {
  try {
    const v = await page.evaluate(() => {
      const b = window.__game?.scene.getScene('Boot');
      return b
        ? [Math.round(performance.now()), b.load.progress, b.load.totalComplete, b.load.totalToLoad]
        : null;
    });
    if (v) prog.push(v);
  } catch {
    // page busy
  }
}, 500);
await waitScene('Title');
clearInterval(poll);
const tTitle = Date.now() - t0;
const cost = async () => ({
  res: await page.evaluate(() => {
    const e = performance.getEntriesByType('resource');
    return {
      n: e.length,
      kb: Math.round(e.reduce((a, r) => a + (r.encodedBodySize || 0), 0) / 1024),
    };
  }),
  tex: await page.evaluate(() => {
    const g = window.__game;
    let n = 0;
    let px = 0;
    for (const k of g.textures.getTextureKeys()) {
      const im = g.textures.get(k).getSourceImage?.();
      n++;
      if (im && im.width) px += im.width * im.height;
    }
    const bld = g.textures.getTextureKeys().filter((k) => k.startsWith('bld_')).length;
    return { n, mb: Math.round((px * 4) / 1048576), bld };
  }),
});
const atTitle = await cost();
const top = async (label) => {
  if (!PROFILE) return;
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map();
  const dt = profile.timeDeltas;
  const idx = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => {
    const n = idx.get(id);
    const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`;
    self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0));
  });
  const tot = [...self.values()].reduce((a, b) => a + b, 0);
  console.log(`--- CPU self time ${label}: total ${Math.round(tot / 1000)} ms`);
  for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 14))
    console.log(`${Math.round(v / 1000)}`.padStart(6), k);
  await cdp.send('Profiler.start');
};
await top('startup to title');
await page.waitForFunction(
  () => window.__game.registry.get('artDone') === true || window.__marks.titleActive,
  null,
  {
    timeout: 120000,
  },
);
const atDone = await cost();
await page.evaluate(() => window.__game.scene.getScene('Title').scene.start('Map'));
const t1 = Date.now();
await waitScene('Map');
const tMap = Date.now() - t1;
await sleep(3000);
const sample = await page.evaluate(
  () =>
    new Promise((ok) => {
      const d0 = window.__draws;
      let f = 0;
      const t = performance.now();
      const worst = [];
      let last = t;
      const tick = (n) => {
        worst.push(n - last);
        last = n;
        f++;
        if (n - t < 5000) requestAnimationFrame(tick);
        else {
          worst.sort((a, b) => b - a);
          ok({
            fps: (f * 1000) / (n - t),
            draws: (window.__draws - d0) / f,
            p99: worst[Math.floor(worst.length * 0.01)],
            max: worst[0],
          });
        }
      };
      requestAnimationFrame(tick);
    }),
);
const long = await page.evaluate(() => window.__long);
const marks = await page.evaluate(() => window.__marks);
console.log(`marks (ms since navigation, page clock): ${JSON.stringify(marks)}`);
console.log(
  `long tasks: ${long.length} (>=100 ms: ${long.filter((l) => l[1] >= 100).length}), total ${long.reduce((a, l) => a + l[1], 0)} ms, worst ${Math.max(0, ...long.map((l) => l[1]))} ms`,
);
const per = {};
for (const [at, d] of long) per[Math.floor(at / 1000)] = (per[Math.floor(at / 1000)] ?? 0) + d;
console.log('main-thread long-task ms per second since navigation:', JSON.stringify(per));
console.log(
  JSON.stringify(
    {
      throttle: THROTTLE,
      tBootMs: tBoot,
      tTitleMs: tTitle,
      tMapMs: tMap,
      atTitle,
      atBootArtDone: atDone,
      map: sample,
    },
    null,
    1,
  ),
);
await browser.close();
try {
  process.kill(-server.pid);
} catch {
  // already gone
}
