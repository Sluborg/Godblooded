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
  cloak: 0,
  head: 0,
  body: 0,
  weapon: 0,
  shield: false,
  tier: 0,
  walk: true,
  atk: false,
  cape: CAPES.Red,
  atkStart: 0,
};
// 3/4 view facing right: the weapon hand is the near hand on the left (the cloak side), the
// shield hand is on the right, held forward with the shield's face turned to the camera.
// Attack keys: [x, y, weapon angle in degrees] for the weapon hand.
const KEYS = { rest: [-6.2, -10.4, -18], raise: [-4.6, -23.6, -150], strike: [7.6, -11.6, 100] };
const SHIELD_HAND = [6.6, -11.2];
const STEP = 2.2; // distance between two foot spots, in units
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
    // a full stride along the facing direction: four foot spots A B C D, STEP apart. The near
    // foot travels A B C B A, the far foot B C D C B, in opposite phase.
    fNear: [-STEP / 2 - Math.sin(w) * STEP * walk, -0.9 - Math.max(0, -Math.cos(w)) * 1.2 * walk],
    fFar: [STEP / 2 + 0.8 + Math.sin(w) * STEP * walk, -2 - Math.max(0, Math.cos(w)) * 1.2 * walk],
    bob: walk ? -Math.abs(Math.sin(w)) * 0.8 : Math.sin(t * 2.2) * 0.3,
    swing: Math.sin(w) * 1.2 * walk,
    lean: 0,
    cape: Math.sin(w) * 0.04 * walk + Math.sin(t * 1.3) * 0.02,
    trail: null,
  };
  const K = KEYS;
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
  } else hand[0] -= p.swing;
  p.hand = hand;
  p.off = [SHIELD_HAND[0] + p.swing * 0.6, SHIELD_HAND[1]];
  return p;
}
// Layers, back to front (3/4 view, facing right):
//   cloak.back, head.back (hair or braids behind the body), far foot, near foot, body,
//   cloak.front, shield (or the free hand), weapon raised behind the head, head, weapon,
//   weapon hand, strike trail.
function drawHero(c, scale, x0, y0, t, o = {}) {
  ctx = c;
  SC = scale;
  const h = HEADS[o.head ?? S.head],
    b = BODIES[S.body],
    wpn = WEAPONS[S.weapon],
    ti = o.tier ?? S.tier,
    tier = TIER[ti];
  const p = pose(t, o.phase || 0);
  const top = bodyTop(b),
    headAt = [0.2, top + 1.8];
  ctx.save();
  ctx.translate(x0, y0);
  // everything is drawn facing right; face -1 mirrors the whole hero to face left
  ctx.scale(o.face ?? S.face ?? 1, 1);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#00000040';
  ctx.beginPath();
  ctx.ellipse(0.5, -0.8, 9, 2.2, 0, 0, 7);
  ctx.fill();
  const upper = (fn) => {
    ctx.save();
    ctx.translate(0, p.bob);
    ctx.rotate(p.lean);
    fn();
    ctx.restore();
  };
  const cloak = CLOAKS[S.cloak ?? 0],
    sw = p.cape * 40;
  upper(() => {
    // 1. the cloak's drape behind the body, then hair that hangs down the back
    if (cloak.back) cloak.back(b, S.cape, sw);
    if (h.back) {
      ctx.save();
      ctx.translate(headAt[0], headAt[1]);
      h.back(h);
      ctx.restore();
    }
  });
  // 2. feet, the far one first (it stands a little further back)
  for (const f of [p.fFar, p.fNear])
    paint(COL.leatherD, E(f[0] + 0.5, f[1], 3.4, 2), [f[0] - 2.9, f[1] - 2, 6.8, 4], { grit: 81 });
  const skin = h.skin,
    hand = p.hand;
  const ball = (x, y) => paint(skin, E(x, y, 2.5, 2.5), [x - 2.5, y - 2.5, 5, 5]);
  const weapon = () => {
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
  };
  upper(() => {
    // 3. body and the cloak's roll over the shoulders
    b.draw(b);
    if (cloak.front) cloak.front(b, S.cape, sw);
    // 4. the shield hand, held forward on the right; the shield's face turned to the camera
    if (S.shield) {
      ball(p.off[0], p.off[1]);
      ctx.save();
      ctx.translate(p.off[0] + 1.4, p.off[1] + 0.4);
      SHIELDS[0].draw(tier, ti, S.cape);
      ctx.restore();
    } else ball(p.off[0], p.off[1]);
    // 5. head; a weapon raised behind the head goes under it
    const raised = hand[2] < -70;
    if (raised) weapon();
    ctx.save();
    ctx.translate(headAt[0], headAt[1]);
    h.draw(h);
    ctx.restore();
    // 6. the weapon in the near hand, the hand ball over its grip
    if (!raised) weapon();
    ball(hand[0], hand[1]);
    // 7. strike trail
    if (p.trail != null && p.trail > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,240,210,${0.35 * p.trail})`;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(1, -14, 14, -2.2, 0.5);
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();
}
