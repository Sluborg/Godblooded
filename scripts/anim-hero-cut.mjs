// Dev: cuts the four hero style pictures (docs/reference/hero-style-*.png: big head, body ball,
// painted ball hands and feet, cape, weapon) into compact-rig kit parts for an animation mock:
// head, body ball (hands and feet painted out), cloak, weapon (hand painted out, haft continued),
// shield; hands and boots are drawn as code balls. Writes anim-test/hs_<id>/ with a kit.json for
// src/dev/animStage.ts registerAnimKit. Rough cuts, test only, nothing here ships.
//   node scripts/anim-hero-cut.mjs [id ...]            (default: thorson odin tyr loki)
//   --party #rrggbb   also writes hs_<id>_party/ with the cloak recoloured towards that colour
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

let O = 120; // the specs below are in the coordinates of a 120 px offset crop (see the grid sheets)
const P = (pts) => pts.map(([x, y]) => [x + O, y + O]);

// Per hero: source picture, the rig look it is registered under, and where things are (crop coords).
const HEROES = {
  thorson: {
    src: 'docs/reference/hero-style-anchor-thor-grim.png',
    look: 'thor_t1',
    hands: { front: { c: [718, 566], r: 67 }, back: { c: [354, 646], r: 71 } },
    feet: [
      { c: [365, 833], rx: 77, ry: 72 },
      { c: [622, 815], rx: 76, ry: 68 },
    ],
    ball: { c: [495, 640], rx: 215, ry: 170 },
    head: P([
      [330, 150],
      [420, 100],
      [520, 95],
      [640, 130],
      [690, 190],
      [700, 280],
      [735, 420],
      [720, 470],
      [660, 540],
      [610, 575],
      [540, 545],
      [470, 510],
      [440, 430],
      [395, 430],
      [380, 360],
      [330, 380],
      [285, 330],
      [262, 250],
      [290, 200],
    ]),
    neck: [600, 520],
    brow: [610, 330],
    cape: P([
      [440, 420],
      [330, 445],
      [240, 470],
      [150, 570],
      [65, 715],
      [100, 750],
      [180, 790],
      [260, 790],
      [330, 740],
      [300, 640],
      [345, 560],
      [420, 480],
    ]),
    clasp: [430, 445],
    weapon: {
      polys: [
        P([
          [718, 350],
          [770, 272],
          [830, 272],
          [915, 328],
          [966, 400],
          [966, 425],
          [915, 505],
          [870, 507],
          [815, 470],
          [772, 527],
          [728, 500],
          [745, 455],
          [718, 420],
        ]),
      ],
      axis: [
        [850, 390],
        [755, 505],
      ],
    },
  },
  odin: {
    src: 'docs/reference/hero-style-anchor-odin-grim.png',
    look: 'odin_t1',
    hands: { front: { c: [796, 566], r: 65 }, back: { c: [354, 646], r: 71 } },
    feet: [
      { c: [365, 833], rx: 77, ry: 72 },
      { c: [622, 818], rx: 76, ry: 64 },
    ],
    ball: { c: [507, 640], rx: 225, ry: 165 },
    head: P([
      [270, 200],
      [330, 135],
      [430, 85],
      [540, 90],
      [650, 140],
      [710, 230],
      [715, 300],
      [700, 370],
      [745, 430],
      [775, 480],
      [750, 520],
      [700, 520],
      [680, 470],
      [620, 455],
      [580, 520],
      [560, 570],
      [520, 600],
      [480, 520],
      [430, 480],
      [400, 420],
      [300, 410],
      [262, 340],
      [262, 260],
    ]),
    neck: [600, 480],
    brow: [610, 330],
    cape: P([
      [180, 520],
      [260, 450],
      [380, 420],
      [430, 470],
      [500, 520],
      [480, 610],
      [330, 640],
      [250, 740],
      [200, 800],
      [100, 790],
      [45, 715],
      [120, 650],
      [175, 600],
    ]),
    clasp: [400, 480],
    weapon: {
      polys: [
        P([
          [830, 50],
          [1050, 50],
          [1050, 260],
          [830, 260],
        ]),
        P([
          [900, 80],
          [985, 130],
          [895, 130],
          [855, 540],
          [838, 600],
          [770, 800],
          [722, 810],
          [690, 790],
          [750, 600],
          [795, 470],
        ]),
      ],
      axis: [
        [940, 100],
        [720, 795],
      ],
    },
  },
  tyr: {
    src: 'docs/reference/hero-style-tyr.png',
    look: 'thor-hammerborn_t2',
    hands: { front: { c: [762, 588], r: 69 }, back: null },
    feet: [
      { c: [385, 838], rx: 78, ry: 73 },
      { c: [640, 820], rx: 77, ry: 69 },
    ],
    ball: { c: [550, 655], rx: 185, ry: 160 },
    head: P([
      [320, 300],
      [330, 210],
      [380, 140],
      [450, 95],
      [540, 85],
      [640, 110],
      [690, 200],
      [700, 260],
      [715, 370],
      [725, 440],
      [690, 520],
      [630, 560],
      [590, 570],
      [540, 520],
      [490, 470],
      [460, 420],
      [420, 350],
      [330, 340],
    ]),
    neck: [580, 500],
    brow: [600, 330],
    shield: { c: [230, 580], rx: 182, ry: 234 },
    weapon: {
      polys: [
        P([
          [745, 430],
          [800, 415],
          [900, 300],
          [1000, 130],
          [1050, 85],
          [1050, 150],
          [1020, 250],
          [950, 360],
          [900, 470],
          [915, 540],
          [890, 550],
          [830, 565],
          [770, 520],
          [760, 470],
        ]),
      ],
      axis: [
        [1030, 110],
        [800, 540],
      ],
    },
  },
  loki: {
    src: 'docs/reference/hero-style-loki.png',
    look: 'loki_t1',
    keepGreen: true,
    floodTol: 26,
    hands: { front: { c: [783, 572], r: 72 }, back: { c: [310, 648], r: 78 } },
    feet: [
      { c: [362, 855], rx: 85, ry: 77 },
      { c: [638, 837], rx: 85, ry: 73 },
    ],
    ball: { c: [475, 660], rx: 255, ry: 165 },
    head: P([
      [250, 200],
      [300, 150],
      [400, 90],
      [500, 60],
      [600, 95],
      [690, 140],
      [745, 300],
      [750, 420],
      [740, 500],
      [700, 520],
      [640, 480],
      [560, 520],
      [470, 430],
      [380, 420],
      [300, 440],
      [220, 420],
      [210, 330],
    ]),
    neck: [560, 470],
    brow: [600, 320],
    cape: P([
      [190, 560],
      [210, 470],
      [300, 440],
      [360, 480],
      [380, 560],
      [330, 640],
      [250, 700],
      [200, 660],
    ]),
    clasp: [400, 500],
    weapon: {
      polys: [
        P([
          [740, 470],
          [780, 380],
          [830, 310],
          [880, 200],
          [940, 120],
          [990, 70],
          [1010, 150],
          [985, 260],
          [960, 350],
          [950, 430],
          [920, 520],
          [900, 580],
          [870, 650],
          [800, 705],
          [735, 705],
          [735, 640],
          [790, 590],
        ]),
      ],
      axis: [
        [995, 80],
        [765, 685],
      ],
      refBelow: true,
    },
  },
  // The second set (hero-style-*.png from the five-hero batch): coordinates are the picture's own (off 0).
  tyr2: {
    off: 0,
    src: 'docs/reference/hero-style-tyr.png',
    look: 'tyr2',
    hands: { front: { c: [1005, 733], r: 77 }, back: null },
    feet: [
      { c: [510, 1030], rx: 93, ry: 85 },
      { c: [822, 1025], rx: 93, ry: 80 },
    ],
    ball: { c: [715, 795], rx: 197, ry: 213 },
    head: [
      [490, 420],
      [500, 340],
      [560, 260],
      [640, 205],
      [730, 195],
      [810, 230],
      [855, 300],
      [860, 380],
      [850, 450],
      [835, 520],
      [800, 570],
      [740, 590],
      [690, 580],
      [650, 545],
      [620, 560],
      [570, 545],
      [520, 540],
      [470, 520],
      [435, 480],
    ],
    neck: [690, 585],
    brow: [740, 420],
    cape: [
      [300, 560],
      [420, 520],
      [520, 545],
      [560, 600],
      [520, 700],
      [480, 880],
      [420, 960],
      [330, 1000],
      [230, 985],
      [120, 930],
      [60, 880],
      [30, 820],
      [90, 740],
      [200, 640],
    ],
    clasp: [560, 585],
    shield: { c: [381, 780], rx: 149, ry: 195 },
    weapon: {
      polys: [
        [
          [1130, 100],
          [1250, 100],
          [1250, 300],
          [1160, 560],
          [1150, 700],
          [1060, 650],
          [1020, 720],
          [1010, 880],
          [930, 880],
          [930, 800],
          [960, 720],
          [960, 590],
          [1020, 500],
          [1100, 300],
        ],
      ],
      axis: [
        [1210, 150],
        [965, 845],
      ],
      refBelow: true,
    },
  },
  loki2: {
    off: 0,
    src: 'docs/reference/hero-style-loki.png',
    look: 'loki2',
    keepGreen: true,
    floodTol: 26,
    hands: { front: { c: [1000, 762], r: 77 }, back: { c: [410, 762], r: 82 } },
    feet: [
      { c: [510, 1052], rx: 90, ry: 85 },
      { c: [808, 1045], rx: 88, ry: 78 },
    ],
    ball: { c: [680, 839], rx: 235, ry: 180 },
    head: [
      [380, 540],
      [380, 470],
      [440, 370],
      [445, 330],
      [500, 280],
      [580, 240],
      [650, 230],
      [740, 250],
      [830, 300],
      [880, 370],
      [895, 450],
      [895, 540],
      [880, 590],
      [850, 610],
      [800, 625],
      [740, 640],
      [690, 620],
      [640, 590],
      [600, 600],
      [560, 590],
      [500, 560],
      [440, 570],
    ],
    neck: [770, 605],
    brow: [770, 480],
    cape: [
      [300, 600],
      [430, 580],
      [540, 600],
      [580, 660],
      [490, 720],
      [470, 820],
      [480, 900],
      [470, 970],
      [400, 1010],
      [300, 1000],
      [200, 960],
      [150, 940],
      [70, 860],
      [55, 810],
      [100, 740],
      [180, 680],
      [240, 630],
    ],
    clasp: [560, 640],
    weapon: {
      polys: [
        [
          [1090, 130],
          [1180, 140],
          [1210, 300],
          [1215, 450],
          [1200, 600],
          [1170, 700],
          [1100, 720],
          [1060, 760],
          [1020, 830],
          [1000, 900],
          [950, 925],
          [930, 880],
          [940, 830],
          [1000, 760],
          [1010, 700],
          [1000, 640],
          [1000, 560],
          [1040, 470],
          [1070, 300],
        ],
      ],
      axis: [
        [1150, 150],
        [965, 880],
      ],
      refBelow: true,
    },
  },
  freyja: {
    off: 0,
    src: 'docs/reference/hero-style-freyja.png',
    look: 'freyja',
    hands: { front: { c: [977, 700], r: 70 }, back: { c: [460, 788], r: 78 } },
    feet: [
      { c: [492, 1020], rx: 87, ry: 80 },
      { c: [788, 1005], rx: 83, ry: 75 },
    ],
    ball: { c: [680, 830], rx: 208, ry: 170 },
    head: [
      [390, 420],
      [440, 300],
      [520, 235],
      [620, 205],
      [730, 215],
      [820, 270],
      [845, 380],
      [830, 460],
      [840, 520],
      [800, 560],
      [770, 590],
      [740, 600],
      [700, 620],
      [650, 625],
      [620, 700],
      [630, 780],
      [650, 860],
      [620, 900],
      [580, 890],
      [560, 820],
      [540, 700],
      [550, 620],
      [520, 540],
      [450, 540],
      [400, 500],
    ],
    neck: [700, 600],
    brow: [720, 460],
    cape: [
      [310, 600],
      [420, 550],
      [520, 570],
      [560, 600],
      [530, 660],
      [480, 760],
      [480, 870],
      [460, 950],
      [380, 990],
      [300, 1000],
      [220, 970],
      [140, 935],
      [60, 860],
      [50, 820],
      [130, 760],
      [230, 670],
      [300, 610],
    ],
    clasp: [520, 600],
    weapon: {
      polys: [
        [
          [960, 100],
          [1190, 100],
          [1190, 330],
          [1140, 335],
          [1050, 320],
          [960, 330],
        ],
        [
          [1050, 320],
          [1140, 335],
          [960, 1010],
          [870, 990],
        ],
      ],
      axis: [
        [1090, 150],
        [905, 990],
      ],
    },
  },
  athena: {
    off: 0,
    src: 'docs/reference/hero-style-athena.png',
    look: 'athena',
    figTop: 215,
    hands: { front: { c: [972, 765], r: 72 }, back: null },
    feet: [
      { c: [518, 1050], rx: 85, ry: 80 },
      { c: [790, 1045], rx: 78, ry: 70 },
    ],
    ball: { c: [685, 835], rx: 208, ry: 190 },
    head: [
      [380, 420],
      [400, 300],
      [470, 200],
      [580, 110],
      [700, 70],
      [820, 100],
      [880, 150],
      [870, 215],
      [800, 260],
      [830, 330],
      [870, 420],
      [850, 520],
      [840, 570],
      [800, 620],
      [740, 640],
      [690, 630],
      [650, 600],
      [600, 640],
      [560, 650],
      [520, 640],
      [470, 620],
      [420, 590],
      [390, 500],
    ],
    neck: [730, 630],
    brow: [740, 520],
    cape: [
      [310, 610],
      [420, 590],
      [520, 640],
      [540, 700],
      [500, 860],
      [520, 960],
      [440, 1000],
      [330, 1005],
      [230, 980],
      [150, 930],
      [100, 850],
      [90, 820],
      [160, 760],
      [250, 690],
    ],
    clasp: [540, 650],
    shield: { c: [372, 805], rx: 118, ry: 182 },
    weapon: {
      polys: [
        [
          [1050, 70],
          [1190, 70],
          [1110, 420],
          [1010, 720],
          [945, 1000],
          [895, 1110],
          [860, 1085],
          [905, 900],
          [960, 700],
          [1040, 350],
        ],
      ],
      axis: [
        [1160, 90],
        [880, 1100],
      ],
    },
  },
  anubis: {
    off: 0,
    src: 'docs/reference/hero-style-anubis.png',
    look: 'anubis',
    hands: { front: { c: [922, 750], r: 68 }, back: { c: [468, 757], r: 78 } },
    feet: [
      { c: [490, 985], rx: 82, ry: 75 },
      { c: [757, 975], rx: 82, ry: 68 },
    ],
    ball: { c: [640, 800], rx: 215, ry: 160 },
    head: [
      [405, 520],
      [440, 400],
      [480, 330],
      [500, 230],
      [560, 150],
      [590, 230],
      [640, 310],
      [680, 290],
      [730, 200],
      [745, 180],
      [765, 250],
      [790, 350],
      [800, 440],
      [805, 520],
      [810, 590],
      [790, 620],
      [700, 645],
      [620, 640],
      [590, 600],
      [560, 590],
      [470, 560],
      [410, 540],
    ],
    neck: [700, 630],
    brow: [720, 450],
    cape: [
      [330, 580],
      [420, 545],
      [530, 545],
      [590, 600],
      [520, 660],
      [460, 730],
      [420, 830],
      [430, 930],
      [380, 945],
      [300, 925],
      [200, 900],
      [120, 860],
      [80, 830],
      [110, 780],
      [210, 690],
      [280, 620],
    ],
    clasp: [500, 600],
    weapon: {
      polys: [
        [
          [1080, 130],
          [1230, 150],
          [1235, 350],
          [1190, 500],
          [1120, 610],
          [1010, 680],
          [980, 720],
          [960, 780],
          [900, 900],
          [830, 925],
          [830, 880],
          [880, 800],
          [920, 700],
          [990, 640],
          [1060, 520],
          [1120, 300],
        ],
      ],
      axis: [
        [1130, 170],
        [870, 900],
      ],
      refBelow: true,
    },
  },
};

const FIG_H_UNITS = 46; // the figure (hair top to boot bottom) is this many rig units tall

const inPoly = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inEll = (x, y, c, rx, ry) => ((x - c[0]) / rx) ** 2 + ((y - c[1]) / ry) ** 2 <= 1;

async function cut(id, spec, partyHex) {
  O = spec.off ?? 120;
  const { data, info } = await sharp(spec.src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const px = (x, y) => (y * W + x) * 4;
  // Background: bilinear blend of the four corner colours (the green has a slight vignette).
  const corner = (x0, y0) => {
    const s = [0, 0, 0];
    for (let y = y0; y < y0 + 30; y++)
      for (let x = x0; x < x0 + 30; x++) for (let k = 0; k < 3; k++) s[k] += data[px(x, y) + k];
    return s.map((v) => v / 900);
  };
  const cs = [corner(5, 5), corner(W - 35, 5), corner(5, H - 35), corner(W - 35, H - 35)];
  const bgAt = (x, y, k) => {
    const u = x / W;
    const v = y / H;
    return (cs[0][k] * (1 - u) + cs[1][k] * u) * (1 - v) + (cs[2][k] * (1 - u) + cs[3][k] * u) * v;
  };
  // Alpha 0..255 of the figure: the background is what the border can reach through green-ish
  // pixels (so grey metal inside the figure stays solid); the rim fades by its distance from green.
  const dist = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let d = 0;
      for (let k = 0; k < 3; k++) d += (data[px(x, y) + k] - bgAt(x, y, k)) ** 2;
      dist[y * W + x] = Math.sqrt(d);
    }
  const floodTol = spec.floodTol ?? 46;
  const isBg = new Uint8Array(W * H);
  const queue = [];
  const seedBg = (x, y) => {
    const i = y * W + x;
    if (!isBg[i] && dist[i] < floodTol) {
      isBg[i] = 1;
      queue.push(i);
    }
  };
  for (let x = 0; x < W; x++) {
    seedBg(x, 0);
    seedBg(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    seedBg(0, y);
    seedBg(W - 1, y);
  }
  while (queue.length) {
    const i = queue.pop();
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0) seedBg(x - 1, y);
    if (x < W - 1) seedBg(x + 1, y);
    if (y > 0) seedBg(x, y - 1);
    if (y < H - 1) seedBg(x, y + 1);
  }
  const alpha0 = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (isBg[i] || (!spec.keepGreen && dist[i] < 36)) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H && isBg[yy * W + xx]) {
            near = true;
            break;
          }
        }
      alpha0[i] = near ? Math.max(0, Math.min(255, Math.round(((dist[i] - 20) / 46) * 255))) : 255;
    }
  // A painted ball (hand or foot) given as an ellipse in crop coordinates: its mask (with a rim),
  // and its colour sampled a little off its centre, on the lit side.
  const ballMask = (e) => {
    const cx = e.c[0] + O;
    const cy = e.c[1] + O;
    const rx = e.rx ?? e.r;
    const ry = e.ry ?? e.r;
    const out = new Uint8Array(W * H);
    for (let y = Math.max(0, Math.floor(cy - ry - 8)); y < Math.min(H, cy + ry + 9); y++)
      for (let x = Math.max(0, Math.floor(cx - rx - 8)); x < Math.min(W, cx + rx + 9); x++)
        if (inEll(x, y, [cx, cy], rx + 6, ry + 6)) out[y * W + x] = 1;
    const sx = Math.round(cx - rx * 0.1);
    const sy = Math.round(cy - ry * 0.1);
    return {
      m: out,
      cx,
      cy,
      r: (rx + ry) / 2,
      rx,
      ry,
      color: [0, 1, 2].map((k) => data[px(sx, sy) + k]),
    };
  };
  const hF = ballMask(spec.hands.front);
  const hB = spec.hands.back ? ballMask(spec.hands.back) : null;
  const feet = spec.feet.map((f) => ballMask(f));
  const holes = new Uint8Array(W * H);
  for (const b of [hF, hB, ...feet])
    if (b) for (let i = 0; i < W * H; i++) if (b.m[i]) holes[i] = 1;

  // A piece: RGBA over the whole picture, alpha from `keep(x, y)` (0..1) times the figure alpha.
  const piece = (keep) => {
    const out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = keep(x, y);
        if (k <= 0) continue;
        const i = px(x, y);
        out[i] = data[i];
        out[i + 1] = data[i + 1];
        out[i + 2] = data[i + 2];
        out[i + 3] = Math.round(alpha0[y * W + x] * Math.min(1, k));
      }
    return out;
  };
  // Fills the pixels of `fillMask` by pulling colour in from the known pixels round them (onion peeling).
  const inpaint = (buf, fillMask, region) => {
    const known = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) known[i] = buf[i * 4 + 3] > 200 && !fillMask[i] ? 1 : 0;
    let todo = [];
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) if (fillMask[y * W + x] && region(x, y)) todo.push(y * W + x);
    let guard = 0;
    while (todo.length && guard++ < 400) {
      const next = [];
      const set = [];
      for (const i of todo) {
        const x = i % W;
        const y = (i / W) | 0;
        let r = 0,
          g = 0,
          b = 0,
          n = 0;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const j = (y + dy) * W + x + dx;
            if (j < 0 || j >= W * H || !known[j]) continue;
            r += buf[j * 4];
            g += buf[j * 4 + 1];
            b += buf[j * 4 + 2];
            n++;
          }
        if (n) set.push([i, r / n, g / n, b / n]);
        else next.push(i);
      }
      if (!set.length) break;
      for (const [i, r, g, b] of set) {
        buf[i * 4] = r;
        buf[i * 4 + 1] = g;
        buf[i * 4 + 2] = b;
        buf[i * 4 + 3] = 255;
        known[i] = 1;
      }
      todo = next;
    }
  };
  const trim = (buf) => {
    let x0 = W,
      y0 = H,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (buf[px(x, y) + 3] > 8) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
    x0 = Math.max(0, x0 - 2);
    y0 = Math.max(0, y0 - 2);
    x1 = Math.min(W - 1, x1 + 2);
    y1 = Math.min(H - 1, y1 + 2);
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let k = 0; k < 4; k++) out[(y * w + x) * 4 + k] = buf[px(x + x0, y + y0) + k];
    return { buf: out, w, h, ox: x0, oy: y0 };
  };

  const top = spec.figTop ?? Math.min(...spec.head.map((p) => p[1]));
  const feetBottom = Math.max(...feet.map((f) => f.cy + f.ry));
  const ppu = (feetBottom - top) / FIG_H_UNITS;
  const dir = `anim-test/hs_${id}${partyHex ? '_party' : ''}`;
  mkdirSync(dir, { recursive: true });
  const parts = {};
  const save = async (name, t, pivots) => {
    await sharp(t.buf, { raw: { width: t.w, height: t.h, channels: 4 } })
      .png()
      .toFile(`${dir}/${name}.png`);
    const fr = ([sx, sy]) => [(sx - t.ox) / t.w, (sy - t.oy) / t.h];
    parts[name] = {
      file: `${name}.png`,
      w: t.w,
      h: t.h,
      pivots: Object.fromEntries(Object.entries(pivots).map(([k, v]) => [k, fr(v)])),
    };
  };
  const S = ([x, y]) => [x + O, y + O];

  // Body ball: the ellipse, with the painted hands and feet pulled out of it.
  const bc = S(spec.ball.c);
  const ballRegion = (x, y) => inEll(x, y, bc, spec.ball.rx + 8, spec.ball.ry + 8);
  const body = piece((x, y) => (ballRegion(x, y) ? 1 : 0));
  // The painted balls cover bits of the ball: those pixels need new colour, the others are kept.
  const holeMask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) holeMask[i] = holes[i] && ballRegion(i % W, (i / W) | 0) ? 1 : 0;
  for (let i = 0; i < W * H; i++) if (holeMask[i]) body[i * 4 + 3] = 0;
  inpaint(body, holeMask, (x, y) => inEll(x, y, bc, spec.ball.rx * 0.98, spec.ball.ry * 0.93));
  await save('torso', trim(body), {
    hip: bc,
    neck: S(spec.neck),
    ...(spec.clasp ? { clasp: S(spec.clasp) } : {}),
  });

  // Head: the polygon, hands cut out of it.
  const head = piece((x, y) => (inPoly(x, y, spec.head) && !holes[y * W + x] ? 1 : 0));
  await save('head', trim(head), { neck: S(spec.neck), brow: S(spec.brow) });

  // Cloak behind the body.
  if (spec.cape) {
    let cape = piece((x, y) =>
      inPoly(x, y, spec.cape) &&
      !inPoly(x, y, spec.head) &&
      !inEll(x, y, bc, spec.ball.rx * 0.96, spec.ball.ry * 0.96)
        ? 1
        : 0,
    );
    const capeHole = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++)
      if (holes[i] && inPoly(i % W, (i / W) | 0, spec.cape)) {
        capeHole[i] = 1;
        cape[i * 4 + 3] = 0;
      }
    inpaint(cape, capeHole, (x, y) => inPoly(x, y, spec.cape));
    if (partyHex) {
      // Pull the colour towards the party colour but keep the cloth's light and shade.
      const pr = parseInt(partyHex.slice(1, 3), 16);
      const pg = parseInt(partyHex.slice(3, 5), 16);
      const pb = parseInt(partyHex.slice(5, 7), 16);
      for (let i = 0; i < W * H; i++) {
        if (!cape[i * 4 + 3]) continue;
        const l = (cape[i * 4] * 0.3 + cape[i * 4 + 1] * 0.59 + cape[i * 4 + 2] * 0.11) / 128;
        cape[i * 4] = Math.min(255, pr * l);
        cape[i * 4 + 1] = Math.min(255, pg * l);
        cape[i * 4 + 2] = Math.min(255, pb * l);
      }
    }
    await save('cloak', trim(cape), { clasp: S(spec.clasp) });
  }

  // Shield: strapped where the off hand would be.
  if (spec.shield) {
    const sc = S(spec.shield.c);
    const sh = piece((x, y) => (inEll(x, y, sc, spec.shield.rx, spec.shield.ry) ? 1 : 0));
    await save('offhand', trim(sh), { strap: sc });
  }

  // Weapon: cut, hand removed, turned so the haft stands up, the haft carried on through the hand.
  const wsel = piece((x, y) =>
    spec.weapon.polys.some((p) => inPoly(x, y, p)) && !holes[y * W + x] ? 1 : 0,
  );
  const wt = trim(wsel);
  const [a, b] = spec.weapon.axis.map(S);
  const ang = Math.atan2(a[0] - b[0], b[1] - a[1]); // clockwise angle of the haft from straight up
  const cosA = Math.cos(-ang);
  const sinA = Math.sin(-ang); // turning back by -ang makes the axis vertical
  const corners = [
    [0, 0],
    [wt.w, 0],
    [0, wt.h],
    [wt.w, wt.h],
  ].map(([x, y]) => {
    const dx = x - wt.w / 2,
      dy = y - wt.h / 2;
    return [dx * cosA - dy * sinA, dx * sinA + dy * cosA];
  });
  const rw =
    Math.ceil(Math.max(...corners.map((c) => c[0])) - Math.min(...corners.map((c) => c[0]))) + 8;
  const rh =
    Math.ceil(Math.max(...corners.map((c) => c[1])) - Math.min(...corners.map((c) => c[1]))) + 80;
  const rot = Buffer.alloc(rw * rh * 4);
  // Source point -> rotated frame, and back for sampling.
  const fwd = (sx, sy) => {
    const dx = sx - wt.ox - wt.w / 2,
      dy = sy - wt.oy - wt.h / 2;
    return [dx * cosA - dy * sinA + rw / 2, dx * sinA + dy * cosA + rh / 2 - 20];
  };
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++) {
      const dx = x - rw / 2,
        dy = y - rh / 2 + 20;
      const sx = dx * cosA + dy * sinA + wt.w / 2;
      const sy = -dx * sinA + dy * cosA + wt.h / 2;
      const x0 = Math.floor(sx),
        y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 + 1 >= wt.w || y0 + 1 >= wt.h) continue;
      const fx = sx - x0,
        fy = sy - y0;
      for (let k = 0; k < 4; k++) {
        const v = (xx, yy) => wt.buf[(yy * wt.w + xx) * 4 + k];
        rot[(y * rw + x) * 4 + k] = Math.round(
          v(x0, y0) * (1 - fx) * (1 - fy) +
            v(x0 + 1, y0) * fx * (1 - fy) +
            v(x0, y0 + 1) * (1 - fx) * fy +
            v(x0 + 1, y0 + 1) * fx * fy,
        );
      }
    }
  // The hand's centre in the rotated frame, and the haft column.
  const hc = fwd(hF.cx, hF.cy);
  const axisX = Math.round(fwd(b[0], b[1])[0]);
  const rpx = (x, y) => (y * rw + x) * 4;
  // Haft width at a reference row just above the hand.
  let refY = spec.weapon.refBelow
    ? Math.min(rh - 3, Math.round(hc[1] + hF.r + 8))
    : Math.max(2, Math.round(hc[1] - hF.r - 6));
  // Move the reference row out of the hole to where the haft is really there.
  const hasHaft = (y) => {
    let n = 0;
    for (let x = axisX - 120; x <= axisX + 120; x++)
      if (x >= 0 && x < rw && rot[rpx(x, y) + 3] > 100) n++;
    return n >= 24;
  };
  for (let n = 0; n < 200 && !hasHaft(refY); n++) refY += spec.weapon.refBelow ? 1 : -1;
  refY += spec.weapon.refBelow ? 12 : -12;
  // Start on the haft itself: the axis may be a little off it.
  let sx = axisX;
  for (let d = 0; d < 140 && rot[rpx(sx, refY) + 3] <= 100; d++) {
    if (rot[rpx(axisX + d, refY) + 3] > 100) sx = axisX + d;
    else if (rot[rpx(axisX - d, refY) + 3] > 100) sx = axisX - d;
  }
  let hx0 = sx,
    hx1 = sx;
  while (rot[rpx(hx0 - 1, refY) + 3] > 100 && sx - hx0 < 70) hx0--;
  while (rot[rpx(hx1 + 1, refY) + 3] > 100 && hx1 - sx < 70) hx1++;
  if (process.env.DBG) console.log(id, { refY, axisX, sx, hx0, hx1, hc, r: hF.r, rh, rw });
  const yFrom = spec.weapon.refBelow ? Math.round(hc[1] - hF.r - 6) : refY + 1;
  const yTo = spec.weapon.refBelow ? refY - 1 : Math.min(rh - 1, Math.round(hc[1] + hF.r + 36));
  for (let y = yFrom; y <= yTo; y++)
    for (let x = hx0; x <= hx1; x++) {
      if (rot[rpx(x, y) + 3] > 100) continue;
      for (let k = 0; k < 4; k++) rot[rpx(x, y) + k] = rot[rpx(x, refY) + k];
    }
  // Trim the rotated weapon again.
  let tx0 = rw,
    ty0 = rh,
    tx1 = -1,
    ty1 = -1;
  for (let y = 0; y < rh; y++)
    for (let x = 0; x < rw; x++)
      if (rot[rpx(x, y) + 3] > 8) {
        tx0 = Math.min(tx0, x);
        tx1 = Math.max(tx1, x);
        ty0 = Math.min(ty0, y);
        ty1 = Math.max(ty1, y);
      }
  const tw = tx1 - tx0 + 1,
    th = ty1 - ty0 + 1;
  const wout = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++)
      for (let k = 0; k < 4; k++) wout[(y * tw + x) * 4 + k] = rot[rpx(x + tx0, y + ty0) + k];
  await sharp(wout, { raw: { width: tw, height: th, channels: 4 } })
    .png()
    .toFile(`${dir}/weapon.png`);
  parts.weapon = {
    file: 'weapon.png',
    w: tw,
    h: th,
    pivots: { grip: [(axisX - tx0) / tw, (hc[1] - ty0) / th] },
  };

  // Code balls: a hand in the skin tone and a boot in the leather, shaded like a ball.
  const ball = async (name, col, rx, ry, pivots) => {
    const w = Math.round(rx * 2 + 6),
      h = Math.round(ry * 2 + 6);
    const lite = col.map((v) => Math.min(255, v * 1.22 + 10)).map(Math.round);
    const dark = col.map((v) => Math.round(v * 0.62));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="rgb(${lite})"/><stop offset="0.55" stop-color="rgb(${col.map(Math.round)})"/><stop offset="1" stop-color="rgb(${dark})"/></radialGradient></defs><ellipse cx="${w / 2}" cy="${h / 2}" rx="${rx}" ry="${ry}" fill="url(#g)" stroke="#2a201b" stroke-width="3"/></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(`${dir}/${name}.png`);
    parts[name] = { file: `${name}.png`, w, h, pivots };
  };
  await ball('hand', hF.color, hF.r * 0.9, hF.r * 0.9, { wrist: [0.5, 0.5], grip: [0.5, 0.5] });
  await ball('boot', feet[0].color, feet[0].rx * 0.95, feet[0].ry * 0.9, {
    ground: [0.5, 0.96],
    ankle: [0.5, 0.5],
  });

  const kit = { look: spec.look, ppu, mode: 'floating', parts };
  writeFileSync(`${dir}/kit.json`, JSON.stringify(kit, null, 1));
  console.log(dir, 'ppu', ppu.toFixed(2), 'parts', Object.keys(parts).join(' '));
}

const args = process.argv.slice(2);
const pi = args.indexOf('--party');
const party = pi >= 0 ? args.splice(pi, 2)[1] : null;
const ids = args.length
  ? args
  : ['thorson', 'odin', 'tyr', 'loki', 'tyr2', 'loki2', 'freyja', 'athena', 'anubis'];
for (const id of ids) {
  await cut(id, HEROES[id], null);
  if (party) await cut(id, HEROES[id], party);
}
