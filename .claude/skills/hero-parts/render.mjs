// Renders a contact sheet PNG of every part, so a session can check new parts without a browser.
//   node .claude/skills/hero-parts/render.mjs [sheet.png]
// Rows: heads, bodies, weapons (iron, silver, gold), every head assembled on body 1 with weapon 1,
// then the same heroes at real game size (about 36 px tall). Needs playwright-core and a Chromium:
// set CHROMIUM_PATH if Playwright cannot find one by itself.
import { chromium } from 'playwright-core';
import { bundle } from './build.mjs';

const out = process.argv[2] || 'hero-parts-sheet.png';
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#1b1915">
<canvas id="c" width="1600" height="1180"></canvas><script>
${bundle()}
const c = document.getElementById('c'), x = c.getContext('2d');
x.fillStyle = '#24211c'; x.fillRect(0, 0, c.width, c.height);
x.font = '600 18px sans-serif'; x.fillStyle = '#d9a441';
const label = (t, y) => { x.fillStyle = '#d9a441'; x.fillText(t, 12, y); };
const cell = (i, n) => 40 + i * (1520 / n) + 1520 / n / 2;
label('Heads', 24);
HEADS.forEach((h, i) => { ctx = x; SC = 8; x.save(); x.translate(cell(i, HEADS.length), 220); x.scale(SC, SC); h.draw(h); x.restore(); x.fillStyle = '#ece4d4'; x.fillText(h.id + ' ' + h.name, cell(i, HEADS.length) - 90, 282); });
label('Bodies', 300);
BODIES.forEach((b, i) => { ctx = x; SC = 8; x.save(); x.translate(cell(i, BODIES.length), 470); x.scale(SC, SC); for (const f of [[-2.4, -1.3], [3, -1.3]]) paint(COL.leatherD, E(f[0], f[1], 3.4, 2), [f[0] - 3.4, f[1] - 2, 6.8, 4]); b.draw(b); x.restore(); x.fillStyle = '#ece4d4'; x.fillText(b.id + ' ' + b.name, cell(i, BODIES.length) - 90, 500); });
label('Weapons: iron, silver, gold', 534);
WEAPONS.forEach((w, i) => { ctx = x; SC = 5; x.save(); x.translate(cell(i, WEAPONS.length), 700); x.scale(SC, SC); for (let t = 0; t < 3; t++) { x.save(); x.translate(-11 + t * 11, 0); w.draw(TIER[t], t); x.restore(); } x.restore(); x.fillStyle = '#ece4d4'; x.fillText(w.id + ' ' + w.name, cell(i, WEAPONS.length) - 90, 750); });
label('Assembled: head n on body n with weapon n', 784);
S.walk = false;
HEADS.forEach((h, i) => { S.head = i; S.body = i % BODIES.length; S.weapon = i % WEAPONS.length; drawHero(x, 6, cell(i, HEADS.length), 1060, 0, { tier: 0 }); });
S.body = 0; S.weapon = 0;
label('Game size: each head at tier 1, 2, 3', 1100);
let gx = 40;
HEADS.forEach((h, i) => { for (let t = 0; t < 3; t++) { S.head = i; drawHero(x, 36 / 44, gx, 1170, 0, { tier: t }); gx += 34; } gx += 30; });
</script>`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1600, height: 1180 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.setContent(html);
await page.waitForTimeout(300);
await page.screenshot({ path: out });
await browser.close();
if (errors.length) {
  console.error('page errors:', errors.join(' | '));
  process.exit(1);
}
console.log('wrote', out);
