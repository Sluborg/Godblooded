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
// attack keys [x, y, weapon angle in degrees] for the hand that holds the weapon.
// near = the hand on the viewer's side (drawn over the body); far = the other hand (behind it).
const KEYS = {
  near: { rest: [3.4, -9.8, 62], raise: [-1.6, -22.5, -118], strike: [10, -9, 96] },
  far: { rest: [5.8, -12.4, -6], raise: [-2.4, -23.5, -128], strike: [9.2, -11, 90] },
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
  const K = S.back ? KEYS.far : KEYS.near;
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
  } else if (S.back) hand[0] += p.swing * 0.8;
  else hand[0] -= p.swing * 1.2;
  p.hand = hand;
  return p;
}
// Layers, back to front (side view, facing right):
//   cape, head.back (hair or braids behind the body), feet, far hand (and its weapon),
//   body, cape drape over the shoulder, head (face, hair, beard), weapon, near hand, strike trail.
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
    headAt = [0.6, top + 1.8];
  ctx.save();
  ctx.translate(x0, y0);
  // side view: everything is drawn facing right; face -1 mirrors the whole hero to face left
  ctx.scale(o.face ?? S.face ?? 1, 1);
  ctx.scale(scale, scale);
  ctx.fillStyle = '#00000040';
  ctx.beginPath();
  ctx.ellipse(0.5, -0.6, 9, 2, 0, 0, 7);
  ctx.fill();
  const upper = (fn) => {
    ctx.save();
    ctx.translate(0, p.bob);
    ctx.rotate(p.lean);
    fn();
    ctx.restore();
  };
  // 1. cape down the back
  upper(() => {
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
    ctx.restore();
    // 2. hair or braids that hang behind the body
    if (h.back) {
      ctx.save();
      ctx.translate(headAt[0], headAt[1]);
      h.back(h);
      ctx.restore();
    }
  });
  // 3. feet, toes forward (the body overlaps their tops)
  for (const f of [p.fB, p.fF])
    paint(COL.leatherD, E(f[0] + 0.7, f[1], 3.6, 2), [f[0] - 2.9, f[1] - 2, 7.2, 4], {
      grit: 81,
    });
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
  // the empty hand: the far hand peeks out at the chest; in far-hand mode the near hand is empty
  const empty = S.back ? [3.4 - p.swing * 1.2, -9.8] : [5.8 + p.swing * 0.8, -12.4];
  upper(() => {
    // 4. far hand, behind the body
    if (S.back) {
      weapon();
      ball(hand[0], hand[1]);
    } else ball(empty[0], empty[1]);
    // 5. body
    b.draw(b);
    // 6. the mantle: the cape's shoulder piece, over the whole top of the body and always wider
    //    than it, so no body ever shows above or beside it; it hangs lower at the back
    const [bk, fr] = bodyReach(b, 7),
      mb = bk - 1,
      mf = fr + 1;
    paint(
      S.cape,
      C([
        [mb - 0.4, top + 7.8],
        [mb, top + 3],
        [mb + 2.8, top - 0.6],
        [0, top - 1.8],
        [mf - 2.6, top - 0.8],
        [mf, top + 2.4],
        [mf + 0.2, top + 5.4],
        [mf - 3, top + 6.4],
        [0, top + 6.6],
        [mb + 3, top + 7.6],
      ]),
      [mb - 0.4, top - 1.8, mf - mb + 0.6, 9.6],
      { grit: 72 },
    );
    stroke(tone(S.cape, -0.3), 0.35, [
      [mb + 2.4, top + 2],
      [mb + 1.6, top + 6.8],
    ]);
    paint(COL.bronze, E(mf - 2.2, top + 1.6, 1.1, 1.1), [mf - 3.3, top + 0.5, 2.2, 2.2], {
      rim: false,
    });
    // 7. head; a weapon raised behind the head goes under it
    const raised = !S.back && hand[2] < -70;
    if (raised) weapon();
    ctx.save();
    ctx.translate(headAt[0], headAt[1]);
    h.draw(h);
    ctx.restore();
    // 8. weapon in the near hand, the hand ball over its grip
    if (!S.back) {
      if (!raised) weapon();
      ball(hand[0], hand[1]);
    } else ball(empty[0], empty[1]);
    // 9. strike trail
    if (p.trail != null && p.trail > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,240,210,${0.35 * p.trail})`;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(7, -15, 13, -1.7, 0.7);
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
  });
  ctx.restore();
}
