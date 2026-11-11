/* eslint-disable */
// Hero parts: heads, bodies and weapons. Add a part as one more entry in its list.
// Part of the hero-parts skill (.claude/skills/hero-parts/SKILL.md). Plain browser script: files are
// concatenated in the order kit.js, parts.js, hero.js, then the page script.
// ---------- heads (origin = chin, 3/4 view turned toward the camera, facing right) ----------
// The face's centre line runs at x 3.4: both eyes show (the near one larger), the nose sits
// inside the face, the ear is on the left, the mouth below the nose.
const FACE_X = 3.4;
// one smooth outline for the whole head: cranium, cheek and the jaw turned toward the right
function skull(h) {
  paint(
    h.skin,
    C([
      [-7, -9],
      [-6.4, -13.6],
      [-2.6, -16.6],
      [2.6, -16.6],
      [6.6, -13.8],
      [7.8, -9.6],
      [7.6, -6.4],
      [6.4, -2.6],
      [4, -0.2],
      [1, -0.4],
      [-2.6, -2.4],
      [-5.6, -5],
    ]),
    [-7, -16.6, 14.8, 16.6],
    { grit: 11 },
  );
}
function ear(h, ring) {
  paint(h.skin, E(-5.2, -8.4, 1.5, 2.2), [-6.7, -10.6, 3, 4.4], { rim: false });
  stroke(dark(h.skin), 0.3, [
    [-5.5, -9.6],
    [-5, -8.3],
    [-5.5, -7.2],
  ]);
  if (ring) paint(COL.bronze, E(-5.3, -5.8, 0.7, 0.7), [-6, -6.5, 1.4, 1.4], { rim: false });
}
// eyes and brows: a man's brows are heavy with the inner ends low; a woman's are thin and arched,
// with lashes at the outer corners
function eyes(h, o = {}) {
  const fem = h.fem;
  flat(COL.ink, E(1.5, -9.4, 0.82, fem ? 0.72 : 0.6), false);
  flat(COL.ink, E(5, -9.3, 0.62, fem ? 0.68 : 0.56), false);
  if (fem) {
    flat('#fff8ec', E(1.75, -9.65, 0.22, 0.22), false);
    flat('#fff8ec', E(5.15, -9.55, 0.18, 0.18), false);
    stroke(COL.ink, 0.3, [
      [0.5, -9.9],
      [-0.1, -10.4],
    ]);
    stroke(COL.ink, 0.28, [
      [5.6, -9.8],
      [6.2, -10.2],
    ]);
  }
  if (o.patch) {
    stroke(COL.ink, 0.55, [
      [-6.6, -12.6],
      [7.4, -8.4],
    ]);
    flat('#2c211a', E(1.5, -9.4, 1.8, 1.5, 0.15));
  }
  const bc = o.brow || h.brow || h.hair;
  if (fem) {
    stroke(bc, 0.42, [
      [0.1, -10.8],
      [1.5, -11.4],
      [2.6, -11],
    ]);
    stroke(bc, 0.36, [
      [4.1, -10.9],
      [5, -11.2],
      [5.9, -10.8],
    ]);
  } else {
    flat(
      bc,
      P([
        [-0.4, -11.6],
        [2.8, -10.7],
        [2.7, -10],
        [-0.3, -10.8],
      ]),
    );
    flat(
      bc,
      P([
        [4, -10.6],
        [6.4, -11.4],
        [6.5, -10.7],
        [4.1, -10],
      ]),
    );
  }
}
function nose(h) {
  const k = h.fem ? 0.75 : 1;
  paint(
    h.skin,
    C([
      [FACE_X + 0.2, -9.8],
      [FACE_X + 2.4 * k, -7.4],
      [FACE_X + 2 * k, -6.5],
      [FACE_X + 0.2, -6.8],
    ]),
    [FACE_X, -9.8, 2.6, 3.4],
    { rim: false },
  );
}
function mouth(h) {
  if (h.fem)
    paint('#b8604f', E(FACE_X + 0.6, -4.7, 1.2, 0.5), [FACE_X - 0.6, -5.2, 2.4, 1], { rim: false });
  else
    stroke(dark(h.skin), 0.42, [
      [FACE_X - 0.6, -4.6],
      [FACE_X + 1.4, -4.9],
    ]);
}
// beard round the jaw, from below the ear to the chin; len makes it hang lower
function beard(h, len = 0, color = h.hair, stache = true) {
  paint(
    color,
    C([
      [-4.6, -8.6],
      [-4.8, -4.6],
      [-2.6, 0.6 + len * 0.5],
      [1.4, 3.4 + len],
      [5, 2 + len * 0.6],
      [7.2, -1.6],
      [7.4, -5.8],
      [5.6, -6.4],
      [3.4, -5.6],
      [1.4, -6.2],
      [-1.2, -7.2],
      [-3.4, -9],
    ]),
    [-4.8, -9, 12.2, 12.4 + len],
    { grit: 31 },
  );
  if (stache)
    paint(
      tone(color, -0.12),
      C([
        [1.4, -6.2],
        [3.6, -6.9],
        [6, -6.4],
        [4.8, -5.2],
        [2.6, -5.4],
      ]),
      [1.4, -6.9, 4.6, 1.7],
      { rim: false },
    );
}
const HEADS = [
  {
    id: 'head-1',
    rev: 4,
    name: 'Red beard',
    skin: '#d39c76',
    hair: '#a8471d',
    draw(h) {
      skull(h);
      paint(
        h.hair,
        C([
          [-7.6, -6.4],
          [-8, -11.8],
          [-5, -16.2],
          [0.6, -17.6],
          [5.6, -16.2],
          [7.8, -12.8],
          [6, -12.6],
          [3, -13.4],
          [0, -12.8],
          [-2.6, -11.6],
          [-4, -8.6],
          [-4.6, -6],
        ]),
        [-8, -17.6, 15.8, 11.6],
        { grit: 21 },
      );
      ear(h);
      eyes(h);
      nose(h);
      beard(h);
      stroke('#e7b3a0', 0.45, [
        [5.4, -12.4],
        [6.4, -10],
      ]);
    },
  },
  {
    id: 'head-2',
    rev: 4,
    name: 'Braided beard',
    skin: '#c88f69',
    hair: '#b25a23',
    draw(h) {
      skull(h);
      for (let i = 0; i < 6; i++)
        paint(
          h.hair,
          E(-5.2 + i * 2.3, -15.4 - Math.sin((i / 5) * Math.PI) * 1.6, 1.7, 1.35, 0.25),
          [-7, -18, 14, 4],
          { rim: false },
        );
      ear(h);
      eyes(h);
      nose(h);
      beard(h, -2);
      for (const bx of [1, 4.2]) {
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
    rev: 4,
    name: 'Braided crown',
    fem: true,
    skin: '#e0ae8a',
    hair: '#8f3a1c',
    draw(h) {
      // hair swept back to a knot behind, a braid laid over the crown from ear to ear
      paint(
        h.hair,
        C([
          [-7.8, -4.6],
          [-8.4, -11.6],
          [-5.4, -16.4],
          [0.6, -17.8],
          [6, -16.2],
          [7.8, -12.4],
          [5.4, -13],
          [2, -13.6],
          [-1.6, -12.8],
          [-3.8, -9.6],
          [-4.4, -5.6],
        ]),
        [-8.4, -17.8, 16.2, 13.2],
        { grit: 25 },
      );
      paint(h.hair, E(-7.8, -6.4, 2.2, 2), [-10, -8.4, 4.4, 4], { grit: 26 });
      skull(h);
      paint(
        h.hair,
        C([
          [-4.4, -12],
          [-1, -14.4],
          [3.6, -14.6],
          [7.2, -12.8],
          [5, -12.4],
          [1, -12.6],
        ]),
        [-4.4, -14.6, 11.6, 2.6],
        { rim: false },
      );
      for (let i = 0; i < 7; i++)
        paint(
          tone(h.hair, 0.1),
          E(-4.4 + i * 1.9, -14.6 - Math.sin((i / 6) * Math.PI) * 1.4, 1.3, 1, 0.4),
          [-6, -17, 13, 3.6],
          { rim: false },
        );
      ear(h, true);
      eyes(h);
      nose(h);
      mouth(h);
      flat(tone(h.skin, -0.12) + '77', E(5.4, -6.6, 1.2, 0.7), false);
    },
  },
  {
    id: 'head-4',
    rev: 4,
    name: 'Shieldmaiden',
    fem: true,
    skin: '#e4b28e',
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
      // long hair framing the face
      paint(
        h.hair,
        C([
          [-8.2, -2.4],
          [-8.8, -11.4],
          [-5.6, -16.6],
          [0.4, -18],
          [6, -16.4],
          [8.2, -12],
          [7.8, -9],
          [6.4, -12.6],
          [2, -13.4],
          [-2.4, -12],
          [-4, -6],
          [-5.4, -1.6],
        ]),
        [-8.8, -18, 17, 16.4],
        { grit: 22 },
      );
      skull(h);
      // a fringe swept over the brow
      paint(
        tone(h.hair, 0.06),
        C([
          [-1, -16.6],
          [4.6, -16],
          [7.6, -12.6],
          [4.6, -12.6],
          [1.6, -13.8],
        ]),
        [-1, -16.6, 8.6, 4],
        { rim: false },
      );
      ear(h, true);
      eyes(h);
      nose(h);
      mouth(h);
      flat(tone(h.skin, -0.12) + '77', E(5.4, -6.6, 1.2, 0.7), false);
    },
  },
  {
    id: 'head-5',
    rev: 4,
    name: 'Blond raider',
    skin: '#d6a07a',
    hair: '#c9a24a',
    draw(h) {
      // shoulder-length blond hair, a short beard and a braided goatee
      paint(
        h.hair,
        C([
          [-8, -2],
          [-8.4, -11.6],
          [-5.4, -16.4],
          [0.6, -17.8],
          [5.8, -16.4],
          [7.8, -12.8],
          [5.6, -13.2],
          [2.4, -14],
          [-0.8, -13.2],
          [-3.6, -10],
          [-4.4, -5.6],
          [-5.6, -1.4],
        ]),
        [-8.4, -17.8, 16.2, 16.4],
        { grit: 27 },
      );
      skull(h);
      ear(h);
      eyes(h, { brow: tone(h.hair, -0.25) });
      nose(h);
      beard(h, -3, h.hair, true);
      for (let i = 0; i < 3; i++)
        paint(h.hair, E(3, 0.4 + i * 1.5, 1, 0.85), [2, -0.4 + i * 1.5, 2, 1.7], { rim: false });
      paint(COL.bronze, R(2, 4.6, 2, 1, 0.4), [2, 4.6, 2, 1], { rim: false });
      stroke('#e7b3a0', 0.45, [
        [-0.6, -12],
        [1.2, -8.8],
      ]);
    },
  },
];

// ---------- bodies (origin = ground, 3/4 view turned toward the camera, facing right) ----------
// A round body seen at 3/4: the outline is the same egg, barrel or bell, and the front's centre
// line (buckle, plate ridge, robe opening, laces) runs right of the middle at x = centreX(b).
// Bands (belt, hems) curve down a little in the middle, which reads as round.
function bodyPoints(b) {
  const pts = [],
    cy = b.base - b.h / 2,
    flare = b.flare || 0;
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2,
      s = Math.sin(t);
    let px = (Math.cos(t) * b.w) / 2,
      py = (s * b.h) / 2;
    if (b.kind === 'egg') px *= 1 + 0.12 * s;
    if (b.kind === 'barrel') px *= 1.06 - 0.12 * s * s;
    if (b.kind === 'bell') px *= 0.72 + 0.4 * Math.pow((s + 1) / 2, 1.5);
    px *= 1 + (flare / b.w) * Math.max(0, s) * 2;
    if (b.flat && s > 0.55)
      py = (0.55 * b.h) / 2 + ((s - 0.55) / 0.45) * (b.h / 2 - (0.55 * b.h) / 2) * 0.35;
    pts.push([px, cy + py]);
  }
  if (b.flat) {
    // a straight hem
    const yb = Math.max(...pts.map((p) => p[1]));
    for (const p of pts) if (p[1] > yb - 1) p[1] = yb;
  }
  return pts;
}
const bodyPath = (b) => () => {
  bodyPoints(b).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
};
const bodyBox = (b) => [-b.w / 2 - 1, b.base - b.h, b.w + 2, b.h];
const bodyTop = (b) => b.base - b.h; // where the head sits
const centreX = (b) => b.w * 0.17;
// left and right edge of the body at height y
function extentAt(b, y) {
  const pts = bodyPoints(b);
  let lo = 0,
    hi = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i],
      [x2, y2] = pts[(i + 1) % pts.length];
    if ((y1 - y) * (y2 - y) <= 0 && y1 !== y2) {
      const x = x1 + ((y - y1) / (y2 - y1)) * (x2 - x1);
      hi = Math.max(hi, x);
      lo = Math.min(lo, x);
    }
  }
  return [lo, hi];
}
// the body's widest reach over its top rows, so the cloak always covers it
function bodyReach(b, rows) {
  let lo = 0,
    hi = 0;
  for (let y = bodyTop(b); y <= bodyTop(b) + rows; y += 0.5) {
    const [l, r] = extentAt(b, y);
    lo = Math.min(lo, l);
    hi = Math.max(hi, r);
  }
  return [lo, hi];
}
function within(b, fn) {
  ctx.save();
  ctx.beginPath();
  bodyPath(b)();
  ctx.clip();
  fn();
  ctx.restore();
}
// a curved band across the body (sags `sag` units in the middle), height hgt
const bandPath =
  (b, y, hgt, sag = 0.8, pad = 0) =>
  () => {
    const [l, r] = extentAt(b, y + hgt / 2),
      x0 = l - pad,
      x1 = r + pad,
      cx = centreX(b);
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(cx, y + sag * 2, x1, y);
    ctx.lineTo(x1, y + hgt);
    ctx.quadraticCurveTo(cx, y + hgt + sag * 2, x0, y + hgt);
    ctx.closePath();
  };
// a hem: everything below a curved line, inside the body
function hem(b, y, color, o = {}) {
  within(b, () =>
    paint(
      color,
      () => {
        ctx.moveTo(-b.w, y);
        ctx.quadraticCurveTo(centreX(b), y + 1.6, b.w, y);
        ctx.lineTo(b.w, b.base + 2);
        ctx.lineTo(-b.w, b.base + 2);
        ctx.closePath();
      },
      [-b.w / 2, y, b.w, b.base - y],
      { rim: false, ...o },
    ),
  );
}
// a belt that wraps the body past both edges, the buckle on the front's centre line
function belt(b, y, buckle = true) {
  paint(COL.leather, bandPath(b, y, 2.4, 0.6, 0.35), [-b.w / 2, y, b.w, 3.6], { rim: false });
  if (buckle) {
    const x = centreX(b);
    paint(COL.bronze, R(x - 1.2, y + 0.1, 2.4, 2.8, 0.5), [x - 1.2, y + 0.1, 2.4, 2.8], {
      rim: false,
    });
    stroke(dark(COL.bronze), 0.4, [
      [x, y + 0.6],
      [x, y + 2.4],
    ]);
  }
}
function mail(b, y0) {
  within(b, () => {
    for (let y = y0; y < b.base; y += 1.5)
      for (let x = -b.w / 2 - 1 + ((y * 2) % 1.5); x < b.w / 2 + 1; x += 1.5) {
        ctx.beginPath();
        ctx.arc(x, y, 0.5, Math.PI, 0);
        ctx.strokeStyle = '#4f575f99';
        ctx.lineWidth = 0.18;
        ctx.stroke();
      }
  });
}
const BODIES = [
  {
    id: 'body-1',
    rev: 3,
    name: 'Mail shirt',
    w: 15,
    h: 18,
    base: -2.5,
    kind: 'egg',
    draw(b) {
      paint('#77808a', bodyPath(b), bodyBox(b), { grit: 51 });
      mail(b, bodyTop(b) + 1);
      hem(b, b.base - 3.6, COL.red);
      belt(b, b.base - 9);
    },
  },
  {
    id: 'body-2',
    rev: 3,
    name: 'Long robe',
    w: 14.5,
    h: 19,
    base: -1.8,
    kind: 'egg',
    flat: true,
    flare: 1.4,
    draw(b) {
      paint('#5a6372', bodyPath(b), bodyBox(b), { grit: 52 });
      hem(b, b.base - 2.8, COL.red);
      within(b, () => {
        // the robe opens down the front's centre line; a side seam on the near side
        stroke(tone('#5a6372', -0.32), 0.45, [
          [centreX(b), bodyTop(b) + 5],
          [centreX(b) + 0.6, b.base],
        ]);
        stroke(tone('#5a6372', -0.25), 0.35, [
          [-b.w * 0.34, bodyTop(b) + 6],
          [-b.w * 0.4, b.base],
        ]);
      });
      belt(b, b.base - 10.4, false);
      stroke(COL.leather, 0.9, [
        [centreX(b) + 0.4, b.base - 9.2],
        [centreX(b) + 0.9, b.base - 5.4],
      ]);
    },
  },
  {
    id: 'body-3',
    rev: 3,
    name: 'Iron cuirass',
    w: 15,
    h: 18,
    base: -2.5,
    kind: 'egg',
    draw(b) {
      paint('#77808a', bodyPath(b), bodyBox(b), { grit: 54 });
      mail(b, b.base - 7);
      within(b, () => {
        // a breastplate over the chest down to the belt, its ridge on the centre line
        paint(
          '#9aa1a8',
          () => {
            ctx.moveTo(-b.w, bodyTop(b) - 1);
            ctx.lineTo(b.w, bodyTop(b) - 1);
            ctx.lineTo(b.w, b.base - 8);
            ctx.quadraticCurveTo(centreX(b), b.base - 6.4, -b.w, b.base - 8);
            ctx.closePath();
          },
          [-b.w / 2, bodyTop(b), b.w, b.h - 7],
          { grit: 57, hi: 0.35 },
        );
        stroke(tone('#9aa1a8', 0.4), 0.5, [
          [centreX(b), bodyTop(b) + 2],
          [centreX(b), b.base - 8.2],
        ]);
      });
      belt(b, b.base - 8.4);
    },
  },
  {
    id: 'body-4',
    rev: 3,
    name: 'Rune robe',
    w: 13.5,
    h: 19,
    base: -1.8,
    kind: 'egg',
    flat: true,
    flare: 1.2,
    draw(b) {
      paint('#46505e', bodyPath(b), bodyBox(b), { grit: 55 });
      hem(b, b.base - 3.2, '#2f3640');
      within(b, () => {
        for (let i = 0; i < 7; i++) {
          const x = -b.w / 2 - 0.4 + i * 2.4;
          stroke('#d9b45a', 0.35, [
            [x, b.base - 1.8],
            [x + 0.6, b.base - 0.6],
            [x + 1.2, b.base - 1.8],
          ]);
        }
        stroke(tone('#46505e', -0.3), 0.45, [
          [centreX(b), bodyTop(b) + 6],
          [centreX(b) + 0.6, b.base - 3],
        ]);
      });
      paint(COL.red, bandPath(b, b.base - 10.6, 1.8, 0.6, 0.3), [-b.w / 2, b.base - 10.6, b.w, 3], {
        rim: false,
      });
      stroke(COL.red, 0.9, [
        [centreX(b) + 0.6, b.base - 9.2],
        [centreX(b) + 1.2, b.base - 5.6],
      ]);
    },
  },
  {
    id: 'body-5',
    name: 'Leather jerkin',
    rev: 3,
    w: 15,
    h: 17.5,
    base: -2.6,
    kind: 'barrel',
    draw(b) {
      paint(COL.leather, bodyPath(b), bodyBox(b), { grit: 56 });
      within(b, () => {
        stroke(COL.leatherD, 1.6, [
          [-b.w / 2, bodyTop(b) + 2],
          [b.w / 2, b.base - 5],
        ]);
      });
      hem(b, b.base - 3.2, COL.fur, { grit: 58 });
      // laces cross down the front's centre line
      for (let i = 0; i < 4; i++) {
        const y = bodyTop(b) + 4.2 + i * 2,
          x = centreX(b);
        stroke(COL.rope, 0.35, [
          [x - 0.7, y],
          [x + 0.7, y + 1.2],
        ]);
        stroke(COL.rope, 0.35, [
          [x + 0.7, y],
          [x - 0.7, y + 1.2],
        ]);
      }
      belt(b, b.base - 7.8);
    },
  },
];

// ---------- cloak (gathered on top of the shoulders, hanging down the back) ----------
// back(b, c, sw) is drawn behind the body, front(b, c) over it. c = party colour, sw = sway of the
// hem while walking (the shoulders never move). CLOAK_LENGTH: share of the full drape.
const CLOAK_LENGTH = 1;
function lift(top) {
  return ([x, y]) => [x, y > top + 3 ? top + 3 + (y - top - 3) * CLOAK_LENGTH : y];
}
const CLOAKS = [
  {
    id: 'cloak-2',
    rev: 4,
    name: 'Cloak thrown back',
    back(b, c, sw) {
      const top = bodyTop(b),
        L = lift(top),
        [lo] = bodyReach(b, 7),
        base = b.base;
      paint(
        c,
        C(
          [
            [2, top + 0.6],
            [-3, top],
            [lo - 0.8, top + 2.4],
            [lo - 2.6 + sw * 0.4, top + 10],
            [lo - 3.4 + sw, base - 2],
            [lo + 3 + sw * 0.8, base - 1.2],
            [-1, top + 8],
          ].map(L),
        ),
        [lo - 3.4, top, 5.4 - lo, base - top],
        { grit: 73 },
      );
      stroke(
        tone(c, -0.3),
        0.4,
        [
          [lo + 0.6, top + 4],
          [lo - 1.8 + sw, base - 2.6],
        ].map(L),
      );
    },
    front(b, c) {
      const top = bodyTop(b),
        [lo, hi] = bodyReach(b, 7),
        cx = centreX(b);
      // the gathered roll over both shoulders, pinned at the throat on the centre line
      paint(
        c,
        C([
          [hi - 0.4, top + 3.2],
          [hi - 1.6, top + 0.6],
          [cx, top - 1.2],
          [lo + 1.6, top - 0.2],
          [lo - 0.4, top + 3.4],
          [lo + 1.6, top + 4.4],
          [cx - 1, top + 2.6],
          [hi - 1.8, top + 4.6],
        ]),
        [lo - 0.4, top - 1.2, hi - lo + 0.8, 5.8],
        { grit: 74 },
      );
      for (const x of [lo + 3, -0.6, cx + 2.4])
        stroke(tone(c, -0.3), 0.35, [
          [x, top - 0.2],
          [x - 0.6, top + 2.8],
        ]);
      paint(COL.bronze, E(cx, top + 2.6, 1.1, 1.1), [cx - 1.1, top + 1.5, 2.2, 2.2], {
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
    rev: 2,
    name: 'Hammer',
    tip: [0, -12],
    draw(t, ti) {
      haft(4, -10.4);
      head(-3.3, -13.4, 6.6, 4.2, t, ti > 0);
      if (ti) paint(t.trim, E(0, 4.4, 1.1, 0.9), [-1.1, 3.5, 2.2, 1.8], { rim: false });
    },
  },
  {
    id: 'weapon-2',
    rev: 3,
    name: 'Maul',
    tip: [0, -20],
    draw(t, ti) {
      // a longer handle than the hammer: a two-handed sledge, its head a size down
      haft(7, -17.6, 1.7);
      head(-4.4, -22, 8.8, 5.6, t, ti > 0);
      paint(t.trim, R(-1.3, -16.6, 2.6, 1.3, 0.4), [-1.3, -16.6, 2.6, 1.3], { rim: false });
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
    rev: 3,
    name: 'Dane axe',
    tip: [4.6, -17],
    draw(t, ti) {
      haft(6, -18.4, 1.3);
      // a Dane axe at hand size: a slim neck, then a thin crescent with a long curved edge
      paint(
        t.metal,
        P([
          [0.6, -19],
          [2, -18.8],
          [3.6, -20.2],
          [5, -20.6],
          [5.8, -18.8],
          [6, -16.8],
          [5.4, -14.8],
          [4.2, -13.8],
          [3.6, -15.2],
          [2.4, -16.6],
          [0.6, -17],
        ]),
        [0.6, -20.6, 5.4, 6.8],
        { grit: 63, hi: 0.32 },
      );
      stroke(tone(t.metal, 0.45), 0.45, [
        [5, -20.3],
        [5.75, -18.8],
        [5.9, -16.8],
        [5.3, -15],
      ]);
      paint(t.trim, R(-0.9, -19.6, 1.8, 3.2, 0.4), [-0.9, -19.6, 1.8, 3.2], { rim: false });
      if (ti === 2) paint(t.gem, E(2.8, -17.8, 0.65, 0.65), [2.1, -18.5, 1.3, 1.3], { rim: false });
      else if (ti === 1)
        stroke(t.trim, 0.35, [
          [2, -17.8],
          [4.2, -18.4],
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

// ---------- shields (origin = the hand that holds it; 3/4 view, its face turned to the camera) ----------
const SHIELDS = [
  {
    id: 'shield-1',
    name: 'Round shield',
    // draw(t, ti, c): t = tier metals, c = party colour for the painted face
    draw(t, ti, c) {
      const face = E(1.2, 0, 4.4, 6, -0.12);
      paint(COL.wood, face, [-3.2, -6, 8.8, 12], { grit: 91 });
      // painted halves in the party colour, planks showing through
      ctx.save();
      ctx.beginPath();
      face();
      ctx.clip();
      paint(c, R(-4, -7, 5.2, 7, 0), [-4, -7, 5.2, 7], { rim: false, line: false });
      paint(c, R(1.2, 0, 5.2, 7, 0), [1.2, 0, 5.2, 7], { rim: false, line: false });
      for (const x of [-1.4, 1.2, 3.8])
        stroke(tone(COL.wood, -0.35) + '88', 0.25, [
          [x, -7],
          [x + 0.7, 7],
        ]);
      ctx.restore();
      ctx.beginPath();
      face();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = t.trim;
      ctx.stroke();
      paint(t.metal, E(1.3, 0, 1.6, 1.9), [-0.3, -1.9, 3.2, 3.8], { hi: 0.4 });
      if (ti === 2) paint(t.gem, E(1.3, 0, 0.6, 0.7), [0.7, -0.7, 1.2, 1.4], { rim: false });
    },
  },
];
