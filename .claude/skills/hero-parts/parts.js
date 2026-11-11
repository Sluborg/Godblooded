/* eslint-disable */
// Hero parts: heads, bodies and weapons. Add a part as one more entry in its list.
// Part of the hero-parts skill (.claude/skills/hero-parts/SKILL.md). Plain browser script: files are
// concatenated in the order kit.js, parts.js, hero.js, then the page script.
// ---------- heads (origin = chin, side view facing right) ----------
// Near-profile: one eye near the front, the nose on the front edge, the ear in the middle of the head.
function eye(h, o = {}) {
  flat(COL.ink, E(5.1, -9.4, 0.8, 0.62), false);
  if (o.patch) {
    stroke(COL.ink, 0.55, [
      [-6.4, -13.4],
      [6.8, -9.4],
    ]);
    flat('#2c211a', E(5.1, -9.4, 1.8, 1.5, 0.15));
  }
  // one heavy brow, its front end low: a grim look
  flat(
    o.brow || h.brow || h.hair,
    P([
      [2.4, -11.7],
      [6.6, -10.9],
      [6.8, -9.9],
      [2.6, -10.6],
    ]),
  );
}
function nose(h) {
  paint(
    h.skin,
    C([
      [6.4, -10.2],
      [9.3, -7.6],
      [8.9, -6.4],
      [6.6, -6.8],
    ]),
    [6.4, -10.2, 2.9, 3.8],
    { rim: false },
  );
}
function ear(h) {
  paint(h.skin, E(-0.8, -8.4, 1.8, 2.4), [-2.6, -10.8, 3.6, 4.8], { rim: false });
  stroke(dark(h.skin), 0.32, [
    [-1.2, -9.6],
    [-0.4, -8.4],
    [-1.1, -7.2],
  ]);
}
// a rounded profile: the back of the head bulges, the jaw runs forward to the chin
function skull(h) {
  paint(
    h.skin,
    C([
      [-6.8, -9],
      [-6, -14],
      [-1.6, -16.9],
      [3.6, -16.4],
      [6.8, -13.2],
      [7.4, -9.6],
      [7.2, -6.2],
      [6, -2.4],
      [3.4, -0.4],
      [0, -0.8],
      [-3.8, -3.2],
      [-6.2, -5.8],
    ]),
    [-6.8, -16.9, 14.2, 16.5],
    { grit: 11 },
  );
}
// beard: sideburn in front of the ear, down the jaw, out under the nose; len makes it hang lower
function beard(h, len = 0, color = h.hair, stache = true) {
  paint(
    color,
    C([
      [1.2, -8.4],
      [0.6, -4.2],
      [1.6, 0.6 + len * 0.5],
      [4.4, 3.4 + len],
      [6.8, 2 + len * 0.6],
      [8.3, -1.6],
      [8.6, -5.6],
      [7.4, -6.6],
      [5.2, -6],
      [3.2, -5.6],
      [2.2, -7],
    ]),
    [0.6, -8.4, 8, 11.8 + len],
    { grit: 31 },
  );
  if (stache)
    paint(
      tone(color, -0.12),
      C([
        [5, -6.6],
        [7.6, -7.2],
        [9.2, -6],
        [7.8, -5],
        [6, -5.2],
      ]),
      [5, -7.2, 4.2, 2.2],
      { rim: false },
    );
}
const HEADS = [
  {
    id: 'head-1',
    name: 'Red beard',
    skin: '#d39c76',
    hair: '#a8471d',
    draw(h) {
      skull(h);
      paint(
        h.hair,
        C([
          [-7.4, -6.2],
          [-7.6, -11.6],
          [-4.6, -16.2],
          [0.6, -17.8],
          [5.4, -16.6],
          [7.6, -13.4],
          [6.2, -13],
          [3.2, -13.6],
          [0.6, -12.8],
          [-1.4, -11.2],
          [-2.6, -8.6],
          [-3.4, -5.4],
        ]),
        [-7.6, -17.8, 15.2, 12.4],
        { grit: 21 },
      );
      ear(h);
      eye(h);
      nose(h);
      beard(h);
      stroke('#e7b3a0', 0.45, [
        [4.2, -12.8],
        [5.6, -10.6],
      ]);
    },
  },
  {
    id: 'head-2',
    name: 'Braided beard',
    skin: '#c88f69',
    hair: '#b25a23',
    draw(h) {
      skull(h);
      // shaved head, one braided crest from nape to brow
      for (let i = 0; i < 6; i++)
        paint(
          h.hair,
          E(-5.4 + i * 2.3, -15 - Math.sin((i / 5) * Math.PI) * 1.8, 1.7, 1.35, 0.25),
          [-7, -18, 14, 4],
          { rim: false },
        );
      ear(h);
      eye(h);
      nose(h);
      beard(h, -2);
      for (const bx of [3.4, 6]) {
        for (let i = 0; i < 2; i++)
          paint(h.hair, E(bx, 0.6 + i * 1.6, 1.2, 1), [bx - 1.2, -0.4 + i * 1.6, 2.4, 2], {
            rim: false,
          });
        paint(COL.bronze, R(bx - 1.2, 3.4, 2.4, 1.1, 0.4), [bx - 1.2, 3.4, 2.4, 1.1], {
          rim: false,
        });
      }
    },
  },
  {
    id: 'head-3',
    rev: 2,
    name: 'Braided crown',
    skin: '#d8a27e',
    hair: '#8f3a1c',
    draw(h) {
      // hair swept back to a knot at the nape, a braid wound over the crown
      paint(
        h.hair,
        C([
          [-7.6, -6],
          [-8.2, -11.6],
          [-5.4, -16.2],
          [0.4, -17.6],
          [5.6, -16],
          [4.2, -13.4],
          [0, -12.6],
          [-2.6, -10.4],
          [-3.8, -6.8],
        ]),
        [-8.2, -17.6, 13.8, 11.6],
        { grit: 25 },
      );
      paint(h.hair, E(-7.4, -6.4, 2.4, 2.1), [-9.8, -8.5, 4.8, 4.2], { grit: 26 });
      skull(h);
      ear(h);
      for (let i = 0; i < 6; i++)
        paint(
          tone(h.hair, 0.08),
          E(-4.6 + i * 2, -15.8 - Math.sin((i / 5) * Math.PI) * 1.4, 1.5, 1.15, 0.3),
          [-6.2, -18, 12.4, 3.6],
          { rim: false },
        );
      eye(h);
      nose(h);
      stroke(dark(h.skin), 0.42, [
        [5.2, -4.6],
        [6.5, -4.9],
      ]);
      stroke('#e7b3a0', 0.4, [
        [3.4, -7.6],
        [4.6, -6.2],
      ]);
    },
  },
  {
    id: 'head-4',
    rev: 2,
    name: 'Shieldmaiden',
    skin: '#dcaa86',
    hair: '#b0512a',
    // behind the body: one braid down the back
    back(h) {
      for (let i = 0; i < 4; i++)
        paint(
          h.hair,
          E(-6.4 + i * 0.15, -2.4 + i * 2.1, 1.35, 1.1),
          [-7.8, -3.5 + i * 2.1, 2.7, 2.2],
          { rim: false },
        );
      paint(COL.bronze, R(-7.5, 5.8, 2.4, 1.1, 0.4), [-7.5, 5.8, 2.4, 1.1], { rim: false });
    },
    draw(h) {
      // hair mass behind the skull, ending at the nape
      paint(
        h.hair,
        C([
          [-8, -4.4],
          [-8.8, -11.4],
          [-5.6, -16.4],
          [0, -18],
          [5.2, -16.4],
          [3.6, -13.2],
          [-1.6, -11.6],
          [-3.6, -6],
          [-5.6, -3.4],
        ]),
        [-8.8, -18, 14, 14.6],
        { grit: 22 },
      );
      skull(h);
      ear(h);
      paint(
        h.hair,
        C([
          [-3, -12.4],
          [-1.6, -16.2],
          [2.6, -17.6],
          [6.4, -15.4],
          [7.4, -12.6],
          [5, -13.2],
          [1.6, -13.4],
          [-1, -12.4],
        ]),
        [-3, -17.6, 10.4, 5.2],
        { grit: 23 },
      );
      // a fringe swept over the brow and a braid hanging behind the ear
      paint(
        tone(h.hair, 0.06),
        C([
          [2, -16.6],
          [6.2, -15.6],
          [7.6, -12.8],
          [5.4, -12.4],
          [3, -13.4],
        ]),
        [2, -16.6, 5.6, 4.2],
        { rim: false },
      );
      for (let i = 0; i < 3; i++)
        paint(h.hair, E(-3.4, -5.6 + i * 1.7, 1.15, 0.95), [-4.6, -6.6 + i * 1.7, 2.3, 1.9], {
          rim: false,
        });
      paint(COL.bronze, R(-4.5, -0.8, 2.2, 1, 0.4), [-4.5, -0.8, 2.2, 1], { rim: false });
      eye(h);
      nose(h);
      stroke(dark(h.skin), 0.42, [
        [5.2, -4.6],
        [6.5, -4.9],
      ]);
      flat(tone(h.skin, -0.14) + '88', E(4.4, -6.4, 1.2, 0.7), false);
    },
  },
  {
    id: 'head-5',
    rev: 2,
    name: 'Grey elder',
    skin: '#c99a78',
    hair: '#a7a39b',
    draw(h) {
      skull(h);
      paint(
        h.hair,
        C([
          [-7, -6.2],
          [-7.6, -10.6],
          [-6, -12.6],
          [-3.4, -11.2],
          [-2.8, -8],
          [-4, -5.6],
        ]),
        [-7.6, -12.6, 4.8, 7],
        { grit: 24 },
      );
      ear(h);
      eye(h, { patch: true, brow: '#e4e0d8' });
      paint(
        '#e4e0d8',
        C([
          [2, -12.4],
          [5, -12.6],
          [7.4, -11.4],
          [6.6, -10.4],
          [3, -11],
        ]),
        [2, -12.6, 5.4, 2.2],
        {
          rim: false,
        },
      );
      nose(h);
      beard(h, 2.5, h.hair, false);
      paint(COL.bronze, R(3, 3.6, 2.6, 1.2, 0.4), [3, 3.6, 2.6, 1.2], { rim: false });
      for (const y of [-14.6, -13.6])
        stroke(dark(h.skin), 0.3, [
          [0.8, y],
          [4.4, y - 0.2],
        ]);
    },
  },
];

// ---------- bodies (origin = ground, side view facing right) ----------
// Every body is a true side view: chest forward, back flatter, seat behind. Details sit on the
// front or back edge, never in the middle as if the hero faced the viewer.
function sidePoints(b) {
  const T = b.base - b.h,
    B = b.base,
    hw = b.w / 2,
    h = b.h,
    flare = b.flare || 0, // robes widen toward the hem
    flat = b.flat || false; // a straight hem instead of a rounded bottom
  const pts = [
    [0.6, T],
    [hw * 0.55, T + 0.6],
    [hw + (b.chest ?? 0.5), T + h * 0.3],
    [hw + (b.belly ?? 0.2) + flare * 0.5, T + h * 0.62],
  ];
  if (flat)
    pts.push(
      [hw + flare, B - 0.6],
      [hw * 0.6 + flare, B],
      [-hw * 0.6 - flare, B],
      [-hw - flare * 0.8, B - 0.6],
    );
  else
    pts.push(
      [hw * 0.8 + flare, B - h * 0.1],
      [hw * 0.3, B],
      [-hw * 0.4, B],
      [-hw * 0.9 - flare, B - h * 0.14],
    );
  pts.push(
    [-hw - (b.back ?? 0) - flare * 0.4, T + h * 0.55],
    [-hw * 0.86, T + h * 0.2],
    [-hw * 0.4, T + 0.5],
  );
  return pts;
}
const sidePath = (b) => C(sidePoints(b));
const bodyBox = (b) => [-b.w / 2 - 1, b.base - b.h, b.w + 2, b.h];
const bodyTop = (b) => b.base - b.h; // where the head sits
// front and back edge of the body at height y (from the outline points, a little generous)
function extentAt(b, y) {
  const pts = sidePoints(b);
  let back = 0,
    front = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i],
      [x2, y2] = pts[(i + 1) % pts.length];
    if ((y1 - y) * (y2 - y) <= 0 && y1 !== y2) {
      const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
      front = Math.max(front, x);
      back = Math.min(back, x);
    }
  }
  return [back - 0.3, front + 0.3];
}
// the body's widest reach over its top rows, so the mantle always covers it
function bodyReach(b, rows) {
  let back = 0,
    front = 0;
  for (let y = bodyTop(b); y <= bodyTop(b) + rows; y += 0.5) {
    const [bk, fr] = extentAt(b, y);
    back = Math.min(back, bk);
    front = Math.max(front, fr);
  }
  return [back, front];
}
// inside the body outline only
function within(b, fn) {
  ctx.save();
  ctx.beginPath();
  sidePath(b)();
  ctx.clip();
  fn();
  ctx.restore();
}
// a belt that wraps the body: a little wider than the body on both edges, round ends, buckle on
// the front edge
function belt(b, y, buckle = true) {
  const [bk, fr] = extentAt(b, y + 1.2);
  paint(COL.leather, R(bk - 0.3, y, fr - bk + 0.6, 2.4, 1.1), [bk, y, fr - bk, 2.4], {
    rim: false,
  });
  if (buckle) {
    paint(COL.bronze, R(fr - 1.6, y - 0.3, 2, 3, 0.5), [fr - 1.6, y - 0.3, 2, 3], { rim: false });
    stroke(dark(COL.bronze), 0.4, [
      [fr - 0.6, y + 0.3],
      [fr - 0.6, y + 2.1],
    ]);
  }
}
const BODIES = [
  {
    id: 'body-1',
    rev: 2,
    name: 'Mail shirt',
    w: 14.5,
    h: 18,
    base: -2.5,
    draw(b) {
      paint('#77808a', sidePath(b), bodyBox(b), { grit: 51 });
      within(b, () => {
        for (let y = bodyTop(b) + 1; y < b.base; y += 1.5)
          for (let x = -b.w / 2 - 1 + ((y * 2) % 1.5); x < b.w / 2 + 1; x += 1.5) {
            ctx.beginPath();
            ctx.arc(x, y, 0.5, Math.PI, 0);
            ctx.strokeStyle = '#4f575f99';
            ctx.lineWidth = 0.18;
            ctx.stroke();
          }
        paint(COL.red, R(-b.w, b.base - 3.4, b.w * 2, 4, 0), [-b.w / 2, b.base - 3.4, b.w, 4], {
          rim: false,
        });
      });
      belt(b, b.base - 8.6);
    },
  },
  {
    id: 'body-2',
    rev: 2,
    name: 'Long robe',
    w: 14,
    h: 19,
    base: -1.8,
    flat: true,
    flare: 1.2,
    draw(b) {
      paint(COL.cloth, sidePath(b), bodyBox(b), { grit: 52 });
      within(b, () => {
        paint(COL.red, R(-b.w, b.base - 2.4, b.w * 2, 3, 0), [-b.w / 2, b.base - 2.4, b.w, 3], {
          rim: false,
        });
        // the robe opens down the front edge
        stroke(tone(COL.cloth, -0.32), 0.45, [
          [b.w / 2 - 1.2, bodyTop(b) + 6],
          [b.w / 2 - 0.4, b.base - 2.4],
        ]);
        stroke(tone(COL.cloth, -0.25), 0.35, [
          [-b.w / 2 + 2, b.base - 9],
          [-b.w / 2 + 1.2, b.base - 2.4],
        ]);
      });
      belt(b, b.base - 10, false);
      stroke(COL.leather, 1, [
        [b.w / 2 - 0.6, b.base - 8],
        [b.w / 2 + 0.2, b.base - 4.6],
      ]);
    },
  },
  {
    id: 'body-3',
    rev: 2,
    name: 'Iron cuirass',
    w: 14.5,
    h: 18,
    base: -2.5,
    chest: 1,
    draw(b) {
      paint('#77808a', sidePath(b), bodyBox(b), { grit: 54 });
      within(b, () => {
        // mail below, a shaped iron breastplate over the chest down to the belt
        for (let y = b.base - 7; y < b.base; y += 1.5)
          for (let x = -b.w / 2 - 1 + ((y * 2) % 1.5); x < b.w / 2 + 1; x += 1.5) {
            ctx.beginPath();
            ctx.arc(x, y, 0.5, Math.PI, 0);
            ctx.strokeStyle = '#4f575f99';
            ctx.lineWidth = 0.18;
            ctx.stroke();
          }
        paint(
          '#9aa1a8',
          C([
            [-b.w / 2 - 1, bodyTop(b) - 1],
            [b.w / 2 + 2, bodyTop(b) - 1],
            [b.w / 2 + 2, b.base - 7.6],
            [-b.w / 2 - 1, b.base - 7.6],
          ]),
          [-b.w / 2, bodyTop(b), b.w, b.h - 7.6],
          { grit: 57, hi: 0.35 },
        );
        stroke(tone('#9aa1a8', 0.4), 0.5, [
          [b.w / 2 - 0.8, bodyTop(b) + 3],
          [b.w / 2 + 0.2, b.base - 9],
        ]);
      });
      belt(b, b.base - 8.4);
    },
  },
  {
    id: 'body-4',
    rev: 2,
    name: 'Rune robe',
    w: 13.5,
    h: 19,
    base: -1.8,
    flare: 1.2,
    flat: true,
    draw(b) {
      paint('#46505e', sidePath(b), bodyBox(b), { grit: 55 });
      within(b, () => {
        paint('#2f3640', R(-b.w, b.base - 3, b.w * 2, 3.6, 0), [-b.w / 2, b.base - 3, b.w, 3.6], {
          rim: false,
        });
        for (let i = 0; i < 7; i++) {
          const x = -b.w / 2 - 0.6 + i * 2.4;
          stroke('#d9b45a', 0.35, [
            [x, b.base - 2.2],
            [x + 0.6, b.base - 0.8],
            [x + 1.2, b.base - 2.2],
          ]);
        }
        stroke(tone('#46505e', -0.3), 0.45, [
          [b.w / 2 - 1, bodyTop(b) + 6],
          [b.w / 2 + 0.6, b.base - 3],
        ]);
      });
      // a sash tied at the front, its ends hanging down the front edge
      const [bk, fr] = extentAt(b, b.base - 10);
      paint(
        COL.red,
        R(bk - 0.3, b.base - 10.6, fr - bk + 0.6, 1.8, 0.8),
        [bk, b.base - 10.6, fr - bk, 1.8],
        {
          rim: false,
        },
      );
      stroke(COL.red, 0.9, [
        [fr - 0.4, b.base - 9.4],
        [fr + 0.4, b.base - 5.6],
      ]);
    },
  },
  {
    id: 'body-5',
    rev: 2,
    name: 'Leather jerkin',
    w: 15,
    h: 17.5,
    base: -2.6,
    belly: 0.3,
    draw(b) {
      paint(COL.leather, sidePath(b), bodyBox(b), { grit: 56 });
      within(b, () => {
        stroke(COL.leatherD, 1.6, [
          [-b.w / 2, bodyTop(b) + 3],
          [b.w / 2 + 1, b.base - 5],
        ]);
        // a pale fur hem
        paint(COL.fur, R(-b.w, b.base - 3, b.w * 2, 3.4, 0), [-b.w / 2, b.base - 3, b.w, 3.4], {
          grit: 58,
          rim: false,
        });
      });
      // laces cross down the front edge
      for (let i = 0; i < 4; i++) {
        const y = bodyTop(b) + 4.6 + i * 2,
          fr = extentAt(b, y)[1];
        stroke(COL.rope, 0.35, [
          [fr - 1.8, y],
          [fr - 0.4, y + 1.2],
        ]);
        stroke(COL.rope, 0.35, [
          [fr - 0.4, y],
          [fr - 1.8, y + 1.2],
        ]);
      }
      belt(b, b.base - 7.8);
    },
  },
];

// ---------- cloaks (one garment: clasped at the front, over the shoulders, down the back) ----------
// back(b, c, sw) is drawn behind the body, front(b, c, sw) over it. c = party colour, sw = sway
// of the hem while walking (the part at the shoulders never moves).
const CLOAKS = [
  {
    id: 'cloak-1',
    rev: 2,
    name: 'Cloak worn',
    front(b, c, sw) {
      const top = bodyTop(b),
        [bk, fr] = bodyReach(b, 7),
        base = b.base;
      // like a short travelling cape: it wraps the shoulders and upper arms, then its front edge
      // runs back to the hem behind, so the chest, belt and most of the body stay in view
      const pts = [
        [fr - 1.4, top + 2.6],
        [fr - 2.6, top + 0.2],
        [1, top - 1.2],
        [bk + 1.4, top - 0.4],
        [bk - 1.2, top + 3.4],
        [bk - 2.6 + sw * 0.3, top + 10],
        [bk - 4 + sw, base - 2.2],
        [bk + 1.6 + sw * 0.8, base - 1.6],
        [bk + 3.2 + sw * 0.4, top + 11],
        [0.6, top + 6.6],
        [fr - 2.6, top + 4.6],
      ];
      paint(c, C(pts), [bk - 4, top - 1.2, fr - bk + 4, base - top], { grit: 71 });
      // the lining shows along the front edge; a fold runs from the shoulder down the back
      stroke(tone(c, 0.3), 0.4, [
        [fr - 2.4, top + 4.2],
        [0.6, top + 6.8],
        [bk + 3.2 + sw * 0.4, top + 11.2],
        [bk + 1.8 + sw * 0.8, base - 1.8],
      ]);
      stroke(tone(c, -0.3), 0.4, [
        [bk + 0.6, top + 3],
        [bk - 2.4 + sw, base - 2.8],
      ]);
      paint(COL.bronze, E(fr - 1.4, top + 2.6, 1.2, 1.2), [fr - 2.6, top + 1.4, 2.4, 2.4], {
        rim: false,
      });
    },
  },
  {
    id: 'cloak-2',
    name: 'Cloak thrown back',
    // gathered on top of the shoulders: the body's sides show, the cloak hangs behind
    back(b, c, sw) {
      const top = bodyTop(b),
        [bk] = bodyReach(b, 7),
        base = b.base;
      paint(
        c,
        C([
          [1, top + 0.6],
          [-3, top],
          [bk - 0.8, top + 2.4],
          [bk - 3 + sw * 0.4, top + 10],
          [bk - 4.2 + sw, base - 2],
          [bk + 1.8 + sw * 0.8, base - 1],
          [-1.6, top + 8],
        ]),
        [bk - 4.2, top, 5.2 - bk, base - top],
        { grit: 73 },
      );
      stroke(tone(c, -0.3), 0.4, [
        [bk + 0.4, top + 4],
        [bk - 2.6 + sw, base - 2.6],
      ]);
    },
    front(b, c) {
      const top = bodyTop(b),
        [bk, fr] = bodyReach(b, 7);
      paint(
        c,
        C([
          [fr - 2.2, top + 1.6],
          [fr - 3.4, top - 0.4],
          [0, top - 1.2],
          [bk + 1, top + 0.2],
          [bk - 0.6, top + 3.4],
          [bk + 1.8, top + 4.4],
          [0, top + 2.4],
          [fr - 3.2, top + 3.2],
        ]),
        [bk - 0.6, top - 1.2, fr - bk, 5.6],
        { grit: 74 },
      );
      for (const x of [-3.6, -0.6, 2.2])
        stroke(tone(c, -0.3), 0.35, [
          [x, top - 0.4],
          [x - 0.8, top + 2.6],
        ]);
      paint(COL.bronze, E(fr - 2.2, top + 1.8, 1.1, 1.1), [fr - 3.3, top + 0.7, 2.2, 2.2], {
        rim: false,
      });
    },
  },
];

// ---------- weapons (origin = grip, haft points up) ----------
function head(x, y, w, h, t, gemOn) {
  paint(t.metal, R(x, y, w, h, 0.9), [x, y, w, h], { grit: 61, hi: 0.32 });
  stroke(t.trim, 0.45, [
    [x + 1.2, y + 0.6],
    [x + 1.2, y + h - 0.6],
  ]);
  stroke(t.trim, 0.45, [
    [x + w - 1.2, y + 0.6],
    [x + w - 1.2, y + h - 0.6],
  ]);
  if (gemOn && t.gem)
    paint(
      t.gem,
      P([
        [x + w / 2, y + h / 2 - 1.3],
        [x + w / 2 + 1.1, y + h / 2],
        [x + w / 2, y + h / 2 + 1.3],
        [x + w / 2 - 1.1, y + h / 2],
      ]),
      [x + w / 2 - 1.1, y + h / 2 - 1.3, 2.2, 2.6],
      { rim: false },
    );
}
function haft(y0, y1, w = 1.5) {
  paint(COL.wood, R(-w / 2, y1, w, y0 - y1, 0.5), [-w / 2, y1, w, y0 - y1], {
    grit: 62,
    rim: false,
  });
  for (let y = y0 - 3.2; y < y0 - 0.4; y += 0.8)
    stroke(COL.leatherD, 0.35, [
      [-w / 2, y],
      [w / 2, y + 0.5],
    ]);
}
const WEAPONS = [
  {
    id: 'weapon-1',
    name: 'Hammer',
    tip: [0, -13],
    draw(t, ti) {
      haft(4, -11);
      head(-4.3, -14.6, 8.6, 5.4, t, ti > 0);
      if (ti) paint(t.trim, E(0, 4.4, 1.1, 0.9), [-1.1, 3.5, 2.2, 1.8], { rim: false });
    },
  },
  {
    id: 'weapon-2',
    rev: 2,
    name: 'Maul',
    tip: [0, -21],
    draw(t, ti) {
      // a longer handle than the hammer: a two-handed sledge
      haft(7, -18, 1.8);
      head(-5.6, -23, 11.2, 7, t, ti > 0);
      paint(t.trim, R(-1.4, -16.6, 2.8, 1.4, 0.4), [-1.4, -16.6, 2.8, 1.4], { rim: false });
    },
  },
  {
    id: 'weapon-3',
    rev: 2,
    name: 'Hammerstaff',
    tip: [0, -24],
    draw(t, ti) {
      haft(10, -20, 1.8);
      paint(
        t.trim,
        P([
          [-1, -26.6],
          [1, -26.6],
          [0, -29],
        ]),
        [-1, -29, 2, 2.4],
        { rim: false },
      );
      head(-4.6, -26.6, 9.2, 6, t, ti > 0);
      for (const y of [-17.6, -9])
        paint(t.trim, R(-1.3, y, 2.6, 1.2, 0.4), [-1.3, y, 2.6, 1.2], { rim: false });
      if (ti)
        for (let i = 0; i < 3; i++)
          stroke(ti === 2 ? '#7cc8ff' : tone(t.trim, 0.3), 0.4, [
            [-0.6, -15.6 + i * 2.2],
            [0.6, -14.6 + i * 2.2],
          ]);
    },
  },
  {
    id: 'weapon-4',
    rev: 2,
    name: 'Dane axe',
    tip: [6, -19],
    draw(t, ti) {
      haft(7, -21, 1.4);
      // a Dane axe: thin neck, then a tall crescent edge with a horn at the top and the bottom
      paint(
        t.metal,
        P([
          [0.6, -21.6],
          [2.4, -21.4],
          [4.4, -23.6],
          [6.4, -24.4],
          [7.4, -21.6],
          [7.6, -18.6],
          [7, -15.6],
          [5.6, -13.6],
          [4.6, -15.4],
          [3, -17.8],
          [0.6, -18.4],
        ]),
        [0.6, -24.4, 7, 10.8],
        { grit: 63, hi: 0.32 },
      );
      stroke(tone(t.metal, 0.45), 0.5, [
        [6.4, -24],
        [7.3, -21.6],
        [7.4, -18.6],
        [6.8, -15.8],
      ]);
      paint(t.trim, R(-1, -22.2, 2, 4.4, 0.4), [-1, -22.2, 2, 4.4], { rim: false });
      if (ti === 2) paint(t.gem, E(3.4, -20, 0.8, 0.8), [2.6, -20.8, 1.6, 1.6], { rim: false });
      else if (ti === 1)
        stroke(t.trim, 0.4, [
          [2.4, -20.4],
          [5.4, -21.2],
        ]);
    },
  },
  {
    id: 'weapon-5',
    name: 'Sword',
    tip: [0, -19],
    draw(t, ti) {
      // a long grip, wider than a hand, so the hand ball sits on it
      paint(COL.leather, R(-0.9, -2.2, 1.8, 7.4, 0.5), [-0.9, -2.2, 1.8, 7.4], { rim: false });
      for (let y = -1.4; y < 4.8; y += 1.1)
        stroke(COL.leatherD, 0.3, [
          [-0.9, y],
          [0.9, y + 0.5],
        ]);
      paint(t.trim, E(0, 5.8, 1.5, 1.2), [-1.5, 4.6, 3, 2.4], { rim: false });
      paint(t.trim, R(-4.4, -3.6, 8.8, 1.6, 0.6), [-4.4, -3.6, 8.8, 1.6], { rim: false });
      paint(
        t.metal,
        P([
          [-1.6, -3.6],
          [1.6, -3.6],
          [1.3, -18],
          [0, -20.4],
          [-1.3, -18],
        ]),
        [-1.6, -20.4, 3.2, 16.8],
        { hi: 0.35, grit: 64 },
      );
      stroke(tone(t.metal, -0.3), 0.32, [
        [0, -4.2],
        [0, -18],
      ]);
      if (ti === 2) paint(t.gem, E(0, -2.8, 0.8, 0.6), [-0.8, -3.4, 1.6, 1.2], { rim: false });
      else if (ti === 1)
        stroke(t.trim, 0.35, [
          [-0.6, -6],
          [0.6, -7],
          [-0.6, -8],
        ]);
    },
  },
];
