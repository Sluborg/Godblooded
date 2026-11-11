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
function beard(h, len = 0, color = h.hair) {
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
    name: 'Iron helm',
    skin: '#d9a882',
    hair: '#9c4320',
    draw(h) {
      skull(h);
      ear(h);
      eye(h);
      nose(h);
      beard(h, 1);
      paint(
        COL.iron,
        C([
          [-7.6, -9.4],
          [-7.4, -13.6],
          [-4.4, -17.4],
          [0.8, -18.6],
          [5.6, -17],
          [8, -13.4],
          [8, -11.8],
          [-7.6, -11.8],
        ]),
        [-7.6, -18.6, 15.6, 9.2],
        { grit: 41 },
      );
      paint(COL.bronze, R(-7.9, -13.2, 16.2, 1.8, 0.5), [-7.9, -13.2, 16.2, 1.8], { rim: false });
      paint(
        COL.iron,
        P([
          [7, -11.6],
          [8.2, -11.6],
          [8.4, -8],
          [7.6, -7.4],
          [7, -8],
        ]),
        [7, -11.6, 1.4, 4.2],
        { rim: false },
      );
    },
  },
  {
    id: 'head-4',
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
      eye(h);
      nose(h);
      stroke(dark(h.skin), 0.42, [
        [6.2, -4.4],
        [7.6, -4.8],
      ]);
      flat(tone(h.skin, -0.14) + '88', E(4.2, -6, 1.4, 0.8), false);
    },
  },
  {
    id: 'head-5',
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
      eye(h, { patch: true, brow: '#d8d4cc' });
      nose(h);
      beard(h, 2.5);
      stroke(dark(h.skin), 0.3, [
        [1, -14.4],
        [4.6, -14.6],
      ]);
    },
  },
];

// ---------- bodies (origin = ground, centred) ----------
// outline points of a body shape (egg, barrel or bell), shared by the path and the mantle fit
function eggPoints(cx, cy, w, h, kind) {
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2,
      s = Math.sin(t),
      py = (s * h) / 2;
    let px = (Math.cos(t) * w) / 2;
    if (kind === 'egg') px *= 1 + 0.12 * s;
    // side view: the chest pushes forward, the back is flatter
    px *= px > 0 ? 1.06 - 0.08 * s : 0.92;
    if (kind === 'barrel') px *= 1.06 - 0.12 * s * s;
    if (kind === 'bell') px *= 0.72 + 0.4 * Math.pow((s + 1) / 2, 1.5);
    pts.push([cx + px, cy + py]);
  }
  return pts;
}
function eggPath(cx, cy, w, h, kind) {
  return () => {
    eggPoints(cx, cy, w, h, kind).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };
}
function belt(y, w, cy, h, kind, buckle = true) {
  ctx.save();
  ctx.beginPath();
  eggPath(0, cy, w, h, kind)();
  ctx.clip();
  paint(COL.leather, R(-w, y, w * 2, 2.4, 0), [-w, y, w * 2, 2.4], { rim: false });
  ctx.restore();
  if (buckle) {
    // the buckle sits on the front edge: the hero is seen from the side
    const bx = w / 2 - 2.6;
    paint(COL.bronze, E(bx, y + 1.2, 1.7, 1.7), [bx - 1.7, y - 0.5, 3.4, 3.4], { rim: false });
    stroke(dark(COL.bronze), 0.45, [
      [bx, y + 0.3],
      [bx, y + 2.1],
    ]);
    stroke(dark(COL.bronze), 0.45, [
      [bx - 0.8, y + 0.4],
      [bx + 0.8, y + 0.4],
    ]);
  }
}
const BODIES = [
  {
    id: 'body-1',
    name: 'Mail egg',
    w: 15,
    h: 18,
    kind: 'egg',
    base: -2.5,
    draw(b) {
      const cy = b.base - b.h / 2;
      paint('#77808a', eggPath(0, cy, b.w, b.h, b.kind), [-b.w / 2, cy - b.h / 2, b.w, b.h], {
        grit: 51,
      });
      ctx.save();
      ctx.beginPath();
      eggPath(0, cy, b.w, b.h, b.kind)();
      ctx.clip();
      for (let y = cy - b.h / 2 + 1; y < cy + b.h / 2; y += 1.5)
        for (let x = -b.w / 2 + ((y * 2) % 1.5); x < b.w / 2; x += 1.5) {
          ctx.beginPath();
          ctx.arc(x, y, 0.5, Math.PI, 0);
          ctx.strokeStyle = '#4f575f99';
          ctx.lineWidth = 0.18;
          ctx.stroke();
        }
      paint(
        COL.red,
        R(-b.w, cy + b.h / 2 - 3.2, b.w * 2, 4, 0),
        [-b.w / 2, cy + b.h / 2 - 3.2, b.w, 4],
        { rim: false },
      );
      ctx.restore();
      belt(cy + 1.4, b.w, cy, b.h, b.kind);
    },
  },
  {
    id: 'body-2',
    name: 'Fur mantle',
    w: 15,
    h: 18,
    kind: 'egg',
    base: -2.5,
    draw(b) {
      const cy = b.base - b.h / 2;
      paint(COL.red, eggPath(0, cy, b.w, b.h, b.kind), [-b.w / 2, cy - b.h / 2, b.w, b.h], {
        grit: 52,
      });
      belt(cy + 1.8, b.w, cy, b.h, b.kind);
      const top = cy - b.h / 2;
      paint(
        COL.fur,
        C([
          [-7.2, top + 2.6],
          [-5, top + 0.2],
          [-1, top + 0.4],
          [3.6, top + 2],
          [7.4, top + 4.6],
          [6.4, top + 6.4],
          [2.6, top + 5.6],
          [-1.6, top + 5],
          [-6.2, top + 5.2],
        ]),
        [-7.2, top + 0.2, 14.6, 6.2],
        { grit: 53 },
      );
      for (let i = 0; i < 6; i++)
        stroke(tone(COL.fur, -0.25), 0.3, [
          [-5.4 + i * 2.2, top + 4.8 + i * 0.2],
          [-5 + i * 2.2, top + 3 + i * 0.3],
        ]);
    },
  },
  {
    id: 'body-3',
    name: 'Iron plate',
    w: 15.5,
    h: 18,
    kind: 'egg',
    base: -2.5,
    draw(b) {
      const cy = b.base - b.h / 2;
      ctx.save();
      ctx.beginPath();
      eggPath(0, cy, b.w, b.h, b.kind)();
      ctx.clip();
      ctx.restore();
      paint('#8b9299', eggPath(0, cy, b.w, b.h, b.kind), [-b.w / 2, cy - b.h / 2, b.w, b.h], {
        grit: 54,
        hi: 0.3,
      });
      // the plate's ridge and rivets follow the front edge (side view)
      stroke(tone('#8b9299', 0.35), 0.5, [
        [4.2, cy - b.h / 2 + 2],
        [5.6, cy + 3],
      ]);
      for (const [x, y] of [
        [-1.6, cy - 4.6],
        [2, cy - 4.4],
        [-1.8, cy + 0.8],
        [2.6, cy + 1.2],
      ])
        flat(tone('#8b9299', -0.25), E(x, y, 0.55, 0.55));
      ctx.save();
      ctx.beginPath();
      eggPath(0, cy, b.w, b.h, b.kind)();
      ctx.clip();
      for (let i = 0; i < 4; i++)
        paint(
          COL.leather,
          R(-7 + i * 3.8, cy + 4.4, 3.4, 6, 0.8),
          [-7 + i * 3.8, cy + 4.4, 3.4, 6],
          { rim: false },
        );
      ctx.restore();
      belt(cy + 2.6, b.w, cy, b.h, b.kind);
    },
  },
  {
    id: 'body-4',
    name: 'Bell robe',
    w: 16,
    h: 19,
    kind: 'bell',
    base: -2,
    draw(b) {
      const cy = b.base - b.h / 2;
      paint(COL.cloth, eggPath(0, cy, b.w, b.h, b.kind), [-b.w / 2, cy - b.h / 2, b.w, b.h], {
        grit: 55,
      });
      ctx.save();
      ctx.beginPath();
      eggPath(0, cy, b.w, b.h, b.kind)();
      ctx.clip();
      paint(
        COL.red,
        R(-b.w, cy + b.h / 2 - 2.6, b.w * 2, 3, 0),
        [-b.w / 2, cy + b.h / 2 - 2.6, b.w, 3],
        { rim: false },
      );
      for (let i = 0; i < 6; i++)
        stroke('#d9b45a', 0.35, [
          [-6 + i * 2.4, cy + b.h / 2 - 2],
          [-5.2 + i * 2.4, cy + b.h / 2 - 0.9],
          [-4.4 + i * 2.4, cy + b.h / 2 - 2],
        ]);
      stroke(tone(COL.cloth, -0.3), 0.4, [
        [4.6, cy - 6],
        [6.6, cy + b.h / 2],
      ]);
      stroke(tone(COL.cloth, -0.3), 0.35, [
        [-4.6, cy - 1],
        [-6.4, cy + b.h / 2],
      ]);
      ctx.restore();
      stroke(COL.rope, 1.1, [
        [-5, cy + 0.2],
        [5.4, cy + 0.6],
      ]);
      stroke(COL.rope, 0.8, [
        [5, cy + 0.6],
        [5.6, cy + 4.4],
      ]);
    },
  },
  {
    id: 'body-5',
    name: 'Leather barrel',
    w: 16,
    h: 17,
    kind: 'barrel',
    base: -3,
    draw(b) {
      const cy = b.base - b.h / 2;
      paint(COL.leather, eggPath(0, cy, b.w, b.h, b.kind), [-b.w / 2, cy - b.h / 2, b.w, b.h], {
        grit: 56,
      });
      ctx.save();
      ctx.beginPath();
      eggPath(0, cy, b.w, b.h, b.kind)();
      ctx.clip();
      // one strap over the shoulder, seen from the side
      stroke(COL.leatherD, 1.8, [
        [-5.6, cy - 7],
        [6.4, cy + 4],
      ]);
      paint(
        '#6f767e',
        R(-b.w, cy + b.h / 2 - 3, b.w * 2, 3.4, 0),
        [-b.w / 2, cy + b.h / 2 - 3, b.w, 3.4],
        { rim: false },
      );
      ctx.restore();
      paint(COL.bronze, E(4.6, cy - 1.4, 1.8, 1.8), [2.8, cy - 3.2, 3.6, 3.6], { rim: false });
      stroke(dark(COL.bronze), 0.45, [
        [4.6, cy - 2.4],
        [4.6, cy - 0.4],
      ]);
    },
  },
];
const bodyTop = (b) => b.base - b.h; // where the head sits
// the body's widest reach (front and back) over its top rows, so the mantle always covers it
function bodyReach(b, rows) {
  const top = bodyTop(b);
  let front = 0,
    back = 0;
  for (const [x, y] of eggPoints(0, b.base - b.h / 2, b.w, b.h, b.kind))
    if (y <= top + rows) {
      front = Math.max(front, x);
      back = Math.min(back, x);
    }
  return [back, front];
}

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
    name: 'Maul',
    tip: [0, -18],
    draw(t, ti) {
      haft(5, -15, 1.8);
      head(-5.6, -20, 11.2, 7, t, ti > 0);
      paint(t.trim, R(-1.4, -13.6, 2.8, 1.4, 0.4), [-1.4, -13.6, 2.8, 1.4], { rim: false });
    },
  },
  {
    id: 'weapon-3',
    name: 'Hammerstaff',
    tip: [0, -22],
    draw(t, ti) {
      haft(10, -19, 1.4);
      head(-3.8, -23.6, 7.6, 4.8, t, ti > 0);
      if (ti)
        for (let i = 0; i < 3; i++)
          stroke(ti === 2 ? '#7cc8ff' : t.trim, 0.35, [
            [-0.5, -16 + i * 2.6],
            [0.5, -15 + i * 2.6],
          ]);
    },
  },
  {
    id: 'weapon-4',
    name: 'Axe',
    tip: [5, -13],
    draw(t, ti) {
      haft(4, -15);
      // a bearded axe: thin forged head, straight top, curved edge, the beard hooks down
      paint(
        t.metal,
        P([
          [0.6, -16],
          [4.8, -16.6],
          [6.6, -15.2],
          [7.2, -12.6],
          [6.6, -9.6],
          [5.2, -9],
          [4.4, -11],
          [2.6, -12.8],
          [0.6, -13.2],
        ]),
        [0.6, -16.6, 6.6, 7.6],
        { grit: 63, hi: 0.32 },
      );
      stroke(tone(t.metal, 0.45), 0.5, [
        [6.6, -15],
        [7.1, -12.6],
        [6.5, -9.8],
      ]);
      paint(t.trim, R(-1.1, -16.4, 2.2, 3.6, 0.4), [-1.1, -16.4, 2.2, 3.6], { rim: false });
      if (ti === 2) paint(t.gem, E(3, -14.4, 0.8, 0.8), [2.2, -15.2, 1.6, 1.6], { rim: false });
      else if (ti === 1)
        stroke(t.trim, 0.4, [
          [2, -14.6],
          [4.6, -14.2],
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
