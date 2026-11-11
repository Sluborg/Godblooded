/* eslint-disable */
// Hero parts: heads, bodies and weapons. Add a part as one more entry in its list.
// Part of the hero-parts skill (.claude/skills/hero-parts/SKILL.md). Plain browser script: files are
// concatenated in the order kit.js, parts.js, hero.js, then the page script.
// ---------- heads (origin = chin, facing right) ----------
function eyesAndBrows(h, o = {}) {
  const brow = h.brow || h.hair;
  // eyes: small, dark, set under heavy brows
  flat(COL.ink, E(5.3, -9.5, 0.78, 0.58), false);
  flat(COL.ink, E(1.7, -9.7, 0.62, 0.55), false);
  if (o.patch) {
    stroke(COL.ink, 0.55, [
      [-6.8, -12.6],
      [7.8, -8.4],
    ]);
    flat('#2c211a', E(5.3, -9.6, 1.9, 1.5, 0.2));
  }
  // grim brows: inner ends low
  flat(
    brow,
    P([
      [3.7, -10.5],
      [7.2, -11.9],
      [7.4, -10.9],
      [3.9, -9.8],
    ]),
  );
  flat(
    brow,
    P([
      [0, -11.6],
      [3.1, -10.6],
      [3.0, -9.9],
      [0.1, -10.8],
    ]),
  );
}
function nose(h) {
  paint(
    h.skin,
    C([
      [6.6, -9.6],
      [8.7, -7.7],
      [8.4, -6.5],
      [6.7, -6.8],
    ]),
    [6.5, -9.6, 2.3, 3.2],
    { rim: false },
  );
}
function ear(h) {
  paint(h.skin, E(-4.6, -8.4, 1.6, 2.2), [-6.2, -10.6, 3.2, 4.4], { rim: false });
  stroke(dark(h.skin), 0.3, [
    [-4.9, -9.6],
    [-4.4, -8.2],
    [-4.9, -7.2],
  ]);
}
function skull(h, ry = 7.9) {
  paint(h.skin, E(0.6, -8.8, 7.4, ry), [-6.8, -16.7, 14.8, 15.8], { grit: 11 });
}
const HEADS = [
  {
    id: 'head-1',
    name: 'Red beard',
    skin: '#d39c76',
    hair: '#a8471d',
    draw(h) {
      ear(h);
      skull(h);
      paint(
        h.hair,
        C([
          [-8.1, -6.5],
          [-8.6, -11.4],
          [-6, -15.9],
          [-1, -17.5],
          [4.6, -16.6],
          [7.9, -13.4],
          [6.4, -12.6],
          [3, -13.3],
          [-0.5, -12.8],
          [-3.4, -11.2],
          [-5.2, -8.6],
          [-5.8, -6.2],
        ]),
        [-8.6, -17.5, 16.5, 11.3],
        { grit: 21 },
      );
      eyesAndBrows(h);
      nose(h);
      paint(
        h.hair,
        C([
          [-4.6, -9.2],
          [-4.8, -4.4],
          [-2.6, 1.4],
          [1.6, 4.3],
          [5.6, 2.6],
          [8.2, -1.6],
          [8.4, -5.6],
          [6.4, -7.2],
          [3.8, -6.4],
          [1, -6.8],
          [-1.6, -8.1],
          [-3.7, -9.8],
        ]),
        [-4.8, -9.8, 13.2, 14.1],
        { grit: 31 },
      );
      paint(
        tone(h.hair, -0.12),
        C([
          [3.4, -6.8],
          [6.4, -7.4],
          [8.8, -6.2],
          [7.2, -5.2],
          [5, -5.5],
        ]),
        [3.4, -7.4, 5.4, 2.2],
        { rim: false },
      );
      stroke('#e7b3a0', 0.45, [
        [4.2, -12.9],
        [5.6, -10.4],
      ]);
    },
  },
  {
    id: 'head-2',
    name: 'Braided beard',
    skin: '#c88f69',
    hair: '#b25a23',
    draw(h) {
      ear(h);
      skull(h);
      // shaved sides, one braided crest
      paint(
        tone(h.skin, -0.08),
        C([
          [-7.4, -9],
          [-7.6, -12.8],
          [-4, -16],
          [2, -16.6],
          [6.8, -14],
          [5.6, -13.2],
          [0, -14],
          [-5, -12],
        ]),
        [-7.6, -16.6, 14.4, 7.6],
        { rim: false, line: false },
      );
      for (let i = 0; i < 5; i++)
        paint(
          h.hair,
          E(-5 + i * 2.8, -15.7 - Math.sin(i * 0.8) * 0.9, 1.8, 1.4, -0.3),
          [-7, -17.6, 14, 3.6],
          { rim: false },
        );
      eyesAndBrows(h);
      nose(h);
      paint(
        h.hair,
        C([
          [-4.3, -9],
          [-4, -4.6],
          [-1.4, -1.6],
          [2.5, -0.4],
          [6.6, -1.8],
          [8.3, -5.4],
          [6.3, -7],
          [3.6, -6.2],
          [0.8, -6.8],
          [-1.6, -8],
          [-3.5, -9.6],
        ]),
        [-4.3, -9.6, 12.6, 9.2],
        { grit: 32 },
      );
      for (const bx of [0.6, 4.4]) {
        for (let i = 0; i < 3; i++)
          paint(
            h.hair,
            E(bx + i * 0.25, -0.2 + i * 1.7, 1.3, 1.05),
            [bx - 1.3, -1.3 + i * 1.7, 2.6, 2.1],
            { rim: false },
          );
        paint(COL.bronze, R(bx - 1.1, 4.4, 2.6, 1.2, 0.4), [bx - 1.1, 4.4, 2.6, 1.2], {
          rim: false,
        });
      }
      paint(
        tone(h.hair, -0.12),
        C([
          [3.4, -6.8],
          [6.4, -7.4],
          [8.8, -6.2],
          [7.2, -5.2],
          [5, -5.5],
        ]),
        [3.4, -7.4, 5.4, 2.2],
        { rim: false },
      );
    },
  },
  {
    id: 'head-3',
    name: 'Iron helm',
    skin: '#d9a882',
    hair: '#9c4320',
    draw(h) {
      ear(h);
      skull(h);
      eyesAndBrows(h);
      nose(h);
      paint(
        COL.iron,
        C([
          [-8.4, -9.4],
          [-8.2, -13.4],
          [-5, -17.2],
          [0.6, -18.3],
          [5.8, -16.6],
          [8.4, -12.6],
          [8.4, -11.2],
          [-8.3, -11.2],
        ]),
        [-8.4, -18.3, 16.8, 9],
        { grit: 41 },
      );
      paint(COL.bronze, R(-8.6, -12.6, 17.2, 1.9, 0.5), [-8.6, -12.6, 17.2, 1.9], { rim: false });
      paint(
        COL.iron,
        P([
          [5.4, -11.4],
          [6.6, -11.4],
          [6.9, -7.8],
          [6, -7.2],
          [5.3, -7.8],
        ]),
        [5.3, -11.4, 1.6, 4.2],
        { rim: false },
      );
      paint(
        h.hair,
        C([
          [-4.4, -9],
          [-4.6, -4.8],
          [-2.6, -0.2],
          [1.6, 1.8],
          [5.6, 0.6],
          [8.1, -2.4],
          [8.3, -5.6],
          [6.4, -7.1],
          [3.8, -6.4],
          [1, -6.8],
          [-1.6, -8],
          [-3.6, -9.6],
        ]),
        [-4.6, -9.6, 12.9, 11.4],
        { grit: 33 },
      );
      paint(
        tone(h.hair, -0.12),
        C([
          [3.4, -6.8],
          [6.4, -7.4],
          [8.8, -6.2],
          [7.2, -5.2],
          [5, -5.5],
        ]),
        [3.4, -7.4, 5.4, 2.2],
        { rim: false },
      );
    },
  },
  {
    id: 'head-4',
    name: 'Shieldmaiden',
    skin: '#dcaa86',
    hair: '#b0512a',
    draw(h) {
      // hair mass behind, a braid down the back
      paint(
        h.hair,
        C([
          [-8.4, -5],
          [-9, -11.6],
          [-6.4, -16.4],
          [-1, -17.8],
          [4.8, -16.2],
          [3, -12],
          [-3, -9],
          [-5.2, -3.6],
          [-6.8, -1],
        ]),
        [-9, -17.8, 13.8, 16.8],
        { grit: 22 },
      );
      for (let i = 0; i < 4; i++)
        paint(
          h.hair,
          E(-6.8 + i * 0.2, -2 + i * 2.1, 1.35, 1.1),
          [-8.2, -3.1 + i * 2.1, 2.7, 2.2],
          { rim: false },
        );
      paint(COL.bronze, R(-7.9, 6.2, 2.4, 1.1, 0.4), [-7.9, 6.2, 2.4, 1.1], { rim: false });
      ear(h);
      skull(h, 7.6);
      paint(
        h.hair,
        C([
          [-6.4, -9.5],
          [-6.8, -13],
          [-4, -16.6],
          [1, -17.4],
          [5.6, -15.6],
          [8, -12.2],
          [5.2, -12.8],
          [1.6, -13.4],
          [-2, -12.2],
          [-4.4, -10.8],
        ]),
        [-6.8, -17.4, 14.8, 8],
        { grit: 23 },
      );
      eyesAndBrows(h);
      nose(h);
      stroke(dark(h.skin), 0.42, [
        [5.2, -4.6],
        [7.2, -5],
      ]);
      flat(tone(h.skin, -0.14) + '88', E(4.4, -6.6, 1.4, 0.8), false);
    },
  },
  {
    id: 'head-5',
    name: 'Grey elder',
    skin: '#c99a78',
    hair: '#a7a39b',
    draw(h) {
      ear(h);
      skull(h);
      paint(
        h.hair,
        C([
          [-7.8, -7],
          [-8.4, -11.2],
          [-6.6, -13.2],
          [-4.6, -11.6],
          [-4.2, -8.6],
          [-5.4, -6.4],
        ]),
        [-8.4, -13.2, 4.2, 6.8],
        { grit: 24 },
      );
      eyesAndBrows({ ...h, brow: '#d8d4cc' }, { patch: true });
      nose(h);
      paint(
        h.hair,
        C([
          [-4.4, -9.2],
          [-4.4, -3.4],
          [-2.6, 3.4],
          [0.8, 8.8],
          [3.2, 9.6],
          [5, 5.4],
          [7.6, -0.6],
          [8.4, -5.6],
          [6.4, -7.2],
          [3.8, -6.4],
          [1, -6.8],
          [-1.6, -8.1],
          [-3.6, -9.8],
        ]),
        [-4.4, -9.8, 12.8, 19.4],
        { grit: 34 },
      );
      paint(
        tone(h.hair, -0.1),
        C([
          [3.4, -6.8],
          [6.4, -7.4],
          [8.8, -6.2],
          [7.2, -5.2],
          [5, -5.5],
        ]),
        [3.4, -7.4, 5.4, 2.2],
        { rim: false },
      );
      stroke(dark(h.skin), 0.3, [
        [-1.6, -13.8],
        [2.6, -14.4],
      ]);
    },
  },
];

// ---------- bodies (origin = ground, centred) ----------
function eggPath(cx, cy, w, h, kind) {
  return () => {
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2,
        s = Math.sin(t),
        py = (s * h) / 2;
      let px = (Math.cos(t) * w) / 2;
      if (kind === 'egg') px *= 1 + 0.12 * s;
      if (kind === 'barrel') px *= 1.06 - 0.12 * s * s;
      if (kind === 'bell') px *= 0.72 + 0.4 * Math.pow((s + 1) / 2, 1.5);
      i ? ctx.lineTo(cx + px, cy + py) : ctx.moveTo(cx + px, cy + py);
    }
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
    paint(COL.bronze, E(1.6, y + 1.2, 1.9, 1.7), [-0.3, y - 0.5, 3.8, 3.4], { rim: false });
    stroke(dark(COL.bronze), 0.45, [
      [1.6, y + 0.3],
      [1.6, y + 2.1],
    ]);
    stroke(dark(COL.bronze), 0.45, [
      [0.8, y + 0.4],
      [2.4, y + 0.4],
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
    draw(b) {
      const cy = -2.5 - b.h / 2;
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
    draw(b) {
      const cy = -2.5 - b.h / 2;
      paint(COL.red, eggPath(0, cy, b.w, b.h, b.kind), [-b.w / 2, cy - b.h / 2, b.w, b.h], {
        grit: 52,
      });
      belt(cy + 1.8, b.w, cy, b.h, b.kind);
      const top = cy - b.h / 2;
      paint(
        COL.fur,
        C([
          [-7.8, top + 4.6],
          [-6.4, top + 1],
          [-2, top - 0.6],
          [3, top - 0.4],
          [7.2, top + 1.8],
          [7.6, top + 4.8],
          [4, top + 5.8],
          [0, top + 6.2],
          [-4.4, top + 6],
        ]),
        [-7.8, top - 0.6, 15.4, 6.8],
        { grit: 53 },
      );
      for (let i = 0; i < 6; i++)
        stroke(tone(COL.fur, -0.25), 0.3, [
          [-5.6 + i * 2.2, top + 5.6],
          [-5.2 + i * 2.2, top + 3.8],
        ]);
    },
  },
  {
    id: 'body-3',
    name: 'Iron plate',
    w: 15.5,
    h: 18,
    kind: 'egg',
    draw(b) {
      const cy = -2.5 - b.h / 2;
      ctx.save();
      ctx.beginPath();
      eggPath(0, cy, b.w, b.h, b.kind)();
      ctx.clip();
      ctx.restore();
      paint('#8b9299', eggPath(0, cy, b.w, b.h, b.kind), [-b.w / 2, cy - b.h / 2, b.w, b.h], {
        grit: 54,
        hi: 0.3,
      });
      stroke(tone('#8b9299', 0.35), 0.5, [
        [1.2, cy - b.h / 2 + 1.5],
        [1.6, cy + 3],
      ]);
      for (const [x, y] of [
        [-4.6, cy - 4],
        [5.4, cy - 3.6],
        [-5, cy + 1],
        [6, cy + 1.4],
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
    draw(b) {
      const cy = -2 - b.h / 2;
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
      stroke(tone(COL.cloth, -0.3), 0.35, [
        [-2.4, cy - 2],
        [-3.4, cy + b.h / 2],
      ]);
      stroke(tone(COL.cloth, -0.3), 0.35, [
        [3, cy - 1],
        [4, cy + b.h / 2],
      ]);
      ctx.restore();
      stroke(COL.rope, 1.1, [
        [-5, cy + 0.2],
        [5.4, cy + 0.6],
      ]);
      stroke(COL.rope, 0.8, [
        [3.6, cy + 0.6],
        [3, cy + 4.4],
      ]);
    },
  },
  {
    id: 'body-5',
    name: 'Leather barrel',
    w: 16,
    h: 17,
    kind: 'barrel',
    draw(b) {
      const cy = -3 - b.h / 2;
      paint(COL.leather, eggPath(0, cy, b.w, b.h, b.kind), [-b.w / 2, cy - b.h / 2, b.w, b.h], {
        grit: 56,
      });
      ctx.save();
      ctx.beginPath();
      eggPath(0, cy, b.w, b.h, b.kind)();
      ctx.clip();
      stroke(COL.leatherD, 1.6, [
        [-7, cy - 7],
        [7, cy + 5],
      ]);
      stroke(COL.leatherD, 1.6, [
        [7, cy - 7],
        [-7, cy + 5],
      ]);
      paint(
        '#6f767e',
        R(-b.w, cy + b.h / 2 - 3, b.w * 2, 3.4, 0),
        [-b.w / 2, cy + b.h / 2 - 3, b.w, 3.4],
        { rim: false },
      );
      ctx.restore();
      paint(COL.bronze, E(0, cy - 1, 1.9, 1.9), [-1.9, cy - 2.9, 3.8, 3.8], { rim: false });
      stroke(dark(COL.bronze), 0.45, [
        [0, cy - 2],
        [0, cy],
      ]);
    },
  },
];
const bodyTop = (b) => -2.5 - b.h; // where the head sits

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
    tip: [3, -12],
    draw(t, ti) {
      haft(4, -13);
      paint(
        t.metal,
        C([
          [0.4, -15.2],
          [4.6, -16.6],
          [6.8, -13],
          [6.4, -9.4],
          [4.4, -8.6],
          [0.4, -10],
        ]),
        [0.4, -16.6, 6.4, 8],
        { grit: 63, hi: 0.32 },
      );
      paint(
        t.trim,
        P([
          [-0.4, -14.2],
          [-2.8, -13],
          [-0.4, -11.4],
        ]),
        [-2.8, -14.2, 2.4, 2.8],
        { rim: false },
      );
      if (ti === 2) paint(t.gem, E(3.4, -12.6, 0.9, 0.9), [2.5, -13.5, 1.8, 1.8], { rim: false });
      else if (ti === 1)
        stroke(t.trim, 0.4, [
          [2, -14],
          [5, -12],
          [2.4, -10],
        ]);
    },
  },
  {
    id: 'weapon-5',
    name: 'Sword',
    tip: [0, -16],
    draw(t, ti) {
      paint(COL.leather, R(-0.8, -1.4, 1.6, 4.6, 0.4), [-0.8, -1.4, 1.6, 4.6], { rim: false });
      paint(t.trim, E(0, 3.8, 1.2, 1), [-1.2, 2.8, 2.4, 2], { rim: false });
      paint(t.trim, R(-3.2, -2.4, 6.4, 1.3, 0.5), [-3.2, -2.4, 6.4, 1.3], { rim: false });
      paint(
        t.metal,
        P([
          [-1.2, -2.4],
          [1.2, -2.4],
          [1, -15],
          [0, -17],
          [-1, -15],
        ]),
        [-1.2, -17, 2.4, 14.6],
        { hi: 0.35, grit: 64 },
      );
      stroke(tone(t.metal, -0.3), 0.3, [
        [0, -3],
        [0, -15],
      ]);
      if (ti === 2) paint(t.gem, E(0, -1.75, 0.7, 0.55), [-0.7, -2.3, 1.4, 1.1], { rim: false });
    },
  },
];
