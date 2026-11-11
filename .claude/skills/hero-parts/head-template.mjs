// Renders the head template for painting heads in ChatGPT:
//   node .claude/skills/hero-parts/head-template.mjs out.png
// Left: the guide (skull shape, eye line, face centre line, ear, chin, hair and beard limits) on
// flat magenta at 40 px per unit with the chin at (512, 860). Right: example head 1 in the same framing.
import { chromium } from 'playwright-core';
import { bundle } from './build.mjs';
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0">
<canvas id="c" width="2048" height="1024"></canvas><script>
${bundle()}
const c = document.getElementById('c'), x = c.getContext('2d');
const U = 40, OX = 512, OY = 860; // 40 px per unit, chin at (512, 860)
for (const [i, bg] of [[0, '#FF00FF'], [1, '#FF00FF']]) { x.fillStyle = bg; x.fillRect(i * 1024, 0, 1024, 1024); }
// left: the template
x.save(); x.translate(OX, OY); x.scale(U, U); ctx = x; SC = U;
// zones: hair may reach the dashed box above, a beard may hang into the dashed box below
x.setLineDash([0.4, 0.3]); x.lineWidth = 0.08; x.strokeStyle = '#ffffff';
x.strokeRect(-9, -18.4, 17.8, 9.4); // hair zone
x.strokeRect(-5, -2, 13, 6); // beard zone (to +4)
x.setLineDash([]);
// the skull: paint inside this shape
x.beginPath(); C([[-7, -9], [-6.4, -13.6], [-2.6, -16.6], [2.6, -16.6], [6.6, -13.8], [7.8, -9.6], [7.6, -6.4], [6.4, -2.6], [4, -0.2], [1, -0.4], [-2.6, -2.4], [-5.6, -5]])();
x.fillStyle = '#d8d8d8'; x.fill(); x.lineWidth = 0.12; x.strokeStyle = '#555'; x.stroke();
// guides
x.lineWidth = 0.1;
x.strokeStyle = '#e02020'; x.beginPath(); x.moveTo(-7.5, -9.4); x.lineTo(8.5, -9.4); x.stroke(); // eye line
x.strokeStyle = '#2050e0'; x.beginPath(); x.moveTo(3.4, -17); x.lineTo(3.4, 0.5); x.stroke(); // face centre line
x.fillStyle = '#e07a10'; x.beginPath(); x.arc(-5.2, -8.4, 0.9, 0, 7); x.fill(); // ear
x.fillStyle = '#18a040'; x.beginPath(); x.arc(2.4, -0.2, 0.6, 0, 7); x.fill(); // chin
x.restore();
x.font = 'bold 26px sans-serif'; x.fillStyle = '#fff';
x.fillText('TEMPLATE: head fills the grey shape', 24, 40);
x.fillText('red = eye line, blue = face centre line', 24, 76);
x.fillText('orange = ear, green = chin, dashed = hair / beard limits', 24, 112);
// right: example in the same framing
x.save(); x.translate(1024 + OX, OY); x.scale(U, U); ctx = x; SC = U; HEADS[0].draw(HEADS[0]); x.restore();
x.fillStyle = '#fff'; x.fillText('EXAMPLE: same angle, same size, same place', 1048, 40);
</script>`;
const b = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const p = await b.newPage({ viewport: { width: 2048, height: 1024 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.setContent(html);
await p.waitForTimeout(300);
await p.screenshot({ path: process.argv[2] });
await b.close();
console.log(errs.length ? 'errors: ' + errs.join(' | ') : 'ok');
