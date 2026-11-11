/* eslint-disable */
// Assembly and motion: capes, attack keys, walk pose and drawHero.
// Part of the hero-parts skill (.claude/skills/hero-parts/SKILL.md). Plain browser script: files are
// concatenated in the order kit.js, parts.js, hero.js, then the page script.
// ---------- the hero ----------
const CAPES = {
  Red: '#8e3328',
  Blue: '#2f5b96',
  Green: '#2f6f42',
  Gold: '#a8822c',
  Purple: '#5f3c86',
};
const S = {
  face: 1,
  head: 0,
  body: 0,
  weapon: 0,
  tier: 0,
  walk: true,
  atk: false,
  back: false,
  cape: CAPES.Red,
  atkStart: 0,
};
const KEYS = {
  front: { rest: [7.2, -10.4, 38], raise: [1.5, -23.5, -128], strike: [11.6, -8.6, 98] },
  back: { rest: [-6.2, -11.6, -22], raise: [-6, -24.5, -140], strike: [9.4, -10, 92] },
};
const ease = (q) => q * q * (3 - 2 * q);
const lerp3 = (a, b, q) => [
  a[0] + (b[0] - a[0]) * q,
  a[1] + (b[1] - a[1]) * q,
  a[2] + (b[2] - a[2]) * q,
];
function pose(t, phase = 0) {
  const w = (t * 1.5 + phase) * Math.PI * 2,
    walk = S.walk ? 1 : 0;
  const p = {
    fF: [3 + Math.sin(w) * 2.1 * walk, -1.3 - Math.max(0, Math.cos(w)) * 1.3 * walk],
    fB: [-2.4 - Math.sin(w) * 2.1 * walk, -1.3 - Math.max(0, -Math.cos(w)) * 1.3 * walk],
    bob: walk ? -Math.abs(Math.sin(w)) * 0.8 : Math.sin(t * 2.2) * 0.3,
    swing: Math.sin(w) * 1.4 * walk,
    lean: 0,
    cape: Math.sin(w) * 0.04 * walk + Math.sin(t * 1.3) * 0.02,
    trail: null,
  };
  const K = S.back ? KEYS.back : KEYS.front;
  let hand = K.rest.slice();
  if (S.atk) {
    const u = ((t - S.atkStart) % 1.3) / 1.3;
    if (u < 0.4) ((hand = lerp3(K.rest, K.raise, ease(u / 0.4))), (p.lean = -0.07 * ease(u / 0.4)));
    else if (u < 0.52) {
      const q = ease((u - 0.4) / 0.12);
      hand = lerp3(K.raise, K.strike, q);
      p.lean = -0.07 + 0.2 * q;
      p.trail = q;
    } else if (u < 0.62) {
      hand = K.strike.slice();
      p.lean = 0.13;
      p.trail = 1 - (u - 0.52) / 0.1;
    } else {
      const q = ease((u - 0.62) / 0.38);
      hand = lerp3(K.strike, K.rest, q);
      p.lean = 0.13 * (1 - q);
    }
  } else if (S.back) hand[0] += p.swing * 0.6;
  else hand[0] -= p.swing;
  p.hand = hand;
  return p;
}
function drawHero(c, scale, x0, y0, t, o = {}) {
  ctx = c;
  SC = scale;
  const h = HEADS[o.head ?? S.head],
    b = BODIES[S.body],
    wpn = WEAPONS[S.weapon],
    ti = o.tier ?? S.tier,
    tier = TIER[ti];
  const p = pose(t, o.phase || 0);
  ctx.save();
  ctx.translate(x0, y0);
  // side view: everything is drawn facing right; face -1 mirrors the whole hero to face left
  ctx.scale(o.face ?? S.face ?? 1, 1);
  ctx.scale(scale, scale);
  // ground shadow
  ctx.fillStyle = '#00000040';
  ctx.beginPath();
  ctx.ellipse(0.5, -0.6, 9, 2, 0, 0, 7);
  ctx.fill();
  ctx.save();
  ctx.translate(0, p.bob);
  ctx.rotate(p.lean);
  const top = bodyTop(b);
  // cape behind everything
  ctx.save();
  ctx.translate(-1.5, top + 2);
  ctx.rotate(p.cape);
  paint(
    S.cape,
    C([
      [0.5, -0.6],
      [-4.6, 1],
      [-9.6, 9.6],
      [-11.6, 17.6],
      [-6.4, 18.8],
      [-1.8, 16.4],
      [0.4, 8],
    ]),
    [-11.6, -0.6, 12.2, 19.4],
    { grit: 71 },
  );
  stroke(tone(S.cape, -0.3), 0.4, [
    [-3, 3],
    [-6.4, 15],
  ]);
  stroke(tone(S.cape, -0.3), 0.4, [
    [-1, 4],
    [-2.6, 15.6],
  ]);
  ctx.restore();
  ctx.restore();
  // feet (the body overlaps their tops)
  for (const f of [p.fB, p.fF])
    paint(COL.leatherD, E(f[0] + 0.7, f[1], 3.6, 2), [f[0] - 2.9, f[1] - 2, 7.2, 4], {
      rim: true,
      grit: 81,
    });
  ctx.save();
  ctx.translate(0, p.bob);
  ctx.rotate(p.lean);
  const skin = h.skin;
  const hand = p.hand,
    held = (behind) => {
      ctx.save();
      ctx.translate(hand[0], hand[1]);
      ctx.rotate((hand[2] * Math.PI) / 180);
      if (ti === 2) {
        const g = ctx.createRadialGradient(wpn.tip[0], wpn.tip[1], 0, wpn.tip[0], wpn.tip[1], 9);
        g.addColorStop(0, '#9fd8ff66');
        g.addColorStop(1, '#9fd8ff00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(wpn.tip[0], wpn.tip[1], 9, 0, 7);
        ctx.fill();
      }
      wpn.draw(tier, ti);
      ctx.restore();
      paint(skin, E(hand[0], hand[1], 2.5, 2.5), [hand[0] - 2.5, hand[1] - 2.5, 5, 5], {
        rim: true,
      });
    };
  const freeHand = S.back ? [6.8 - p.swing, -10.8] : [-6.2 + p.swing * 0.6, -11.6];
  if (S.back) held(true);
  else
    paint(skin, E(freeHand[0], freeHand[1], 2.5, 2.5), [
      freeHand[0] - 2.5,
      freeHand[1] - 2.5,
      5,
      5,
    ]);
  b.draw(b);
  const raised = !S.back && hand[2] < -70;
  if (raised) held(false);
  ctx.save();
  ctx.translate(0.6, top + 1.8);
  h.draw(h);
  ctx.restore();
  if (S.back)
    paint(skin, E(freeHand[0], freeHand[1], 2.5, 2.5), [
      freeHand[0] - 2.5,
      freeHand[1] - 2.5,
      5,
      5,
    ]);
  else if (!raised) held(false);
  // strike trail
  if (p.trail != null && p.trail > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,240,210,${0.35 * p.trail})`;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(9, -15, 13, -1.7, 0.7);
    ctx.stroke();
    if (ti === 2) {
      ctx.strokeStyle = `rgba(120,200,255,${0.6 * p.trail})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(18, -14);
      ctx.lineTo(15, -10);
      ctx.lineTo(19, -8);
      ctx.lineTo(16, -3);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}
