// Dev: in-play cost with many units. Starts the Map on the dev server, adds N heroes and N monsters
// through the real UnitViews (walking and fighting in place), and reports the CPU time per frame,
// draw calls per frame and frame pacing at CPU throttling.
//   node scripts/perf-units.mjs [n=20] [throttle=4]
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const N = Number(process.argv[2] ?? 20);
const THROTTLE = Number(process.argv[3] ?? 4);
const PORT = 6800 + Math.floor(Math.random() * 300);
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
await page.addInitScript(() => {
  window.__draws = 0;
  for (const C of [WebGLRenderingContext, WebGL2RenderingContext])
    for (const fn of ['drawElements', 'drawArrays']) {
      const orig = C.prototype[fn];
      C.prototype[fn] = function (...a) {
        window.__draws++;
        return orig.apply(this, a);
      };
    }
});
const rig = process.argv[4] ?? '';
const SKEL = process.argv[5] === 'skeleton';
await page.goto(`http://localhost:${PORT}/?debug${rig}`);
await page.waitForFunction(() => window.__game?.scene.isActive('Title'), null, { timeout: 120000 });
await page.waitForFunction(() => window.__game.registry.get('artDone') === true, null, {
  timeout: 120000,
});
await page.evaluate(() => window.__game.scene.getScene('Title').scene.start('Map'));
await page.waitForFunction(() => window.__game.scene.isActive('Map'));
await sleep(1500);
await page.evaluate(
  async ({ n, SKEL }) => {
    const { UnitViews } = await import('/src/ui/unitViews.ts');
    const map = window.__game.scene.getScene('Map');
    map.registry.set('speed', 0);
    const gods = ['odin', 'thor', 'loki', 'freyja'];
    const monsters = ['draugr', 'troll', 'minotaur', 'harpy'];
    const mk = (id, over) => ({
      id,
      kind: 'hero',
      type: 'warrior',
      tier: 1,
      god: null,
      path: null,
      pos: { x: 0, y: 0 },
      facing: { x: 1, y: 0 },
      hp: 60,
      maxHp: 60,
      target: null,
      ko: false,
      mode: 'wander',
      party: 0,
      trait: null,
      gold: 0,
      bounty: null,
      ...over,
    });
    const snap = map.snapshot;
    const base = snap.buildings[0]?.pos ?? { x: 600, y: 600 };
    window.__units = [];
    for (let i = 0; i < n; i++) {
      window.__units.push(
        mk(100 + i, {
          kind: 'hero',
          type: ['warrior', 'paladin', 'wizard', 'rogue'][i % 4],
          god: gods[i % 4],
          tier: 1 + (i % 3),
          pos: { x: base.x + (i % 5) * 40, y: base.y + 120 + Math.floor(i / 5) * 40 },
          target: 500 + i,
          party: i % 5,
        }),
        mk(500 + i, {
          kind: 'monster',
          type: monsters[i % 4],
          pos: { x: base.x + (i % 5) * 40 + 24, y: base.y + 120 + Math.floor(i / 5) * 40 },
          facing: { x: -1, y: 0 },
          target: 100 + i,
          hp: 400,
          maxHp: 400,
        }),
      );
    }
    if (SKEL) {
      const { SkeletonRig } = await import('/src/ui/skeleton/skeletonRig.ts');
      const spec = {
        torso: 'torso_mail',
        upperarm: 'upperarm_mail',
        forearm: 'forearm_bracer',
        thigh: 'thigh_wool',
        shin: 'shin_wrap',
        head: 'head_b',
        boot: 'boot_heavy_1',
        fistW: 'hand_fist_r',
        fistO: 'hand_fist_l',
        weapon: 'weapon_doubleaxe',
        gripW: ['hand_grip_r_back', 'hand_grip_r_front'],
      };
      window.__rigs = [];
      for (let i = 0; i < n; i++) {
        const r = new SkeletonRig(map, spec, 1.6);
        r.setPosition(base.x + (i % 5) * 40, base.y + 120 + Math.floor(i / 5) * 40);
        r.setDepth(1e6 + i);
        map.add.existing(r);
        window.__rigs.push(r);
      }
      window.__units = window.__units.filter((u) => u.kind === 'monster');
    }
    window.__views = new UnitViews(map);
    window.__n = 0;
    const events = () =>
      window.__n % 60 === 0
        ? window.__units
            .filter((u) => u.kind === 'hero')
            .map((u) => ({ kind: 'windup', attacker: u.id, target: u.target, inMs: 400 }))
        : [];
    // Drive the views from the scene's own update so they run in the real frame.
    map.events.on('postupdate', () => {
      window.__n++;
      const ms = Math.round(performance.now());
      window.__views.sync(window.__units, events(), ms, 16);
      if (window.__rigs) {
        const t = window.__n / 60;
        window.__rigs.forEach((r, i) =>
          r.update(
            {
              mode: i % 2 ? 'walk' : 'attack',
              t: (t + i * 0.1) % 1,
              walkPh: t * 5 + i,
              u: (t + i * 0.1) % 1,
            },
            1,
          ),
        );
      }
    });
  },
  { n: N, SKEL },
);
await sleep(2500);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
await cdp.send('Profiler.start');
const s = await page.evaluate(
  () =>
    new Promise((ok) => {
      const d0 = window.__draws;
      const n0 = window.__n;
      const t = performance.now();
      let f = 0;
      let last = t;
      const gaps = [];
      const tick = (n) => {
        gaps.push(n - last);
        last = n;
        f++;
        if (n - t < 6000) requestAnimationFrame(tick);
        else {
          gaps.sort((a, b) => b - a);
          ok({
            rafFps: (f * 1000) / (n - t),
            updates: window.__n - n0,
            drawsPerRaf: (window.__draws - d0) / f,
            p99ms: gaps[Math.floor(gaps.length * 0.01)],
            maxMs: gaps[0],
          });
        }
      };
      requestAnimationFrame(tick);
    }),
);
const { profile } = await cdp.send('Profiler.stop');
const self = new Map();
const idx = new Map(profile.nodes.map((n) => [n.id, n]));
profile.samples.forEach((id, i) => {
  const nd = idx.get(id);
  const k = `${nd.callFrame.functionName || '(anon)'} ${nd.callFrame.url.split('/').pop()}:${nd.callFrame.lineNumber}`;
  self.set(k, (self.get(k) ?? 0) + (profile.timeDeltas[i] ?? 0));
});
const tot = [...self.values()].reduce((a, b) => a + b, 0);
const objs = await page.evaluate(() => ({
  children: window.__game.scene.getScene('Map').children.length,
  textures: window.__game.textures.getTextureKeys().length,
}));
console.log(JSON.stringify({ n: N, throttle: THROTTLE, ...s, objs }));
console.log(`CPU self ms over 6 s: total ${Math.round(tot / 1000)} (program/idle included)`);
for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 16))
  console.log(`${Math.round(v / 1000)}`.padStart(6), k);
await browser.close();
try {
  process.kill(-server.pid);
} catch {
  // already gone
}
