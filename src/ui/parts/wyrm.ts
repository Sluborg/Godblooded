// Fafnir the wyrm, drawn in code in the style of the taste test (docs/decisions.md 2026-10-14):
// a big readable silhouette, thin outlines in a darker shade of each fill, painterly two-tone
// shading, grim. Hand-drawn parts (no art order). Pure canvas 2D: no Phaser, no DOM globals, no
// Math.random, so it can be baked (bake.ts) and tested. It faces right, feet on y = 0.

export interface WyrmLook {
  body: string;
  belly: string;
  ridge: string;
  horn: string;
  // The tier colour: eyes and the glow in the throat.
  eye: string;
}

// What the drawing needs to know about the moment.
export interface WyrmPose {
  // Seconds into the idle loop (breath, tail sway).
  t: number;
  // Radians through a stride (walking), 0 when standing.
  walk: number;
  // Head rearing back and up, 0..1.
  lift: number;
  // Head lunging forward and down, 0..1.
  lunge: number;
  // Jaw opening, 0..1.
  jaw: number;
  // Fire from the mouth: its size 0..1 and a flicker clock.
  fire: number;
  fireT: number;
  // Falling over, 0..1 (1: down).
  ko: number;
}

export const IDLE_POSE: WyrmPose = {
  t: 0,
  walk: 0,
  lift: 0,
  lunge: 0,
  jaw: 0,
  fire: 0,
  fireT: 0,
  ko: 0,
};

// Mix two #rrggbb colours (0: a, 1: b).
export function mix(a: string, b: string, t: number): string {
  const p = (h: string, i: number): number => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = (i: number): string =>
    Math.round(p(a, i) + (p(b, i) - p(a, i)) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${c(0)}${c(1)}${c(2)}`;
}

const INK = '#1a1410';
// The outline of a fill: the fill mixed toward ink (thin and colour-matched).
export const outlineOf = (fill: string): string => mix(fill, INK, 0.6);

type Ctx = CanvasRenderingContext2D;

function stroked(ctx: Ctx, fill: string | CanvasGradient, line: string, lw: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = line;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

// A thick limb as a stroke with an outline under it.
function limb(ctx: Ctx, pts: [number, number][], w0: number, w1: number, fill: string): void {
  const draw = (extra: number, colour: string): void => {
    ctx.strokeStyle = colour;
    ctx.lineCap = 'round';
    for (let i = 0; i < pts.length - 1; i++) {
      const t = i / (pts.length - 1);
      ctx.lineWidth = w0 + (w1 - w0) * t + extra;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();
    }
  };
  draw(1.8, outlineOf(fill));
  draw(0, fill);
}

function bez(p0: number[], p1: number[], p2: number[], n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]);
  }
  return out;
}

function leg(ctx: Ctx, x: number, ph: number, look: WyrmLook, near: boolean): void {
  const fill = near ? look.body : mix(look.body, INK, 0.3);
  const swing = Math.sin(ph) * 13;
  const lift = Math.max(0, Math.cos(ph)) * 7;
  const hipY = -34;
  const knee: [number, number] = [x + swing * 0.4 + 7, hipY + 16];
  const foot: [number, number] = [x + swing + 3, -lift];
  limb(ctx, [[x, hipY], knee, foot], 17, 11, fill);
  // Claws.
  ctx.fillStyle = look.horn;
  ctx.strokeStyle = outlineOf(look.horn);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(foot[0] + 3 + i * 4, foot[1] - 1);
    ctx.lineTo(foot[0] + 8 + i * 4, foot[1] + 1);
    ctx.lineTo(foot[0] + 4 + i * 4, foot[1] + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function tail(ctx: Ctx, sway: number, look: WyrmLook): void {
  const pts = bez([-52, -46], [-98, -50 + sway * 0.3], [-140 + sway * 0.4, -22 + sway], 16);
  const draw = (extra: number, colour: string): void => {
    ctx.strokeStyle = colour;
    ctx.lineCap = 'round';
    for (let i = 0; i < pts.length - 1; i++) {
      ctx.lineWidth = 26 * (1 - i / pts.length) + 3 + extra;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();
    }
  };
  draw(1.8, outlineOf(look.body));
  draw(0, look.body);
  // A paler underside and the spines along the top.
  ctx.strokeStyle = mix(look.body, look.belly, 0.45);
  ctx.lineWidth = 3;
  ctx.beginPath();
  pts.slice(0, 11).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + 5) : ctx.moveTo(p[0], p[1] + 5)));
  ctx.stroke();
  ctx.fillStyle = look.ridge;
  ctx.strokeStyle = outlineOf(look.ridge);
  ctx.lineWidth = 0.9;
  for (let i = 1; i < 12; i += 2) {
    const [x, y] = pts[i];
    const h = 13 * (1 - i / 14) + 3;
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 12 * (1 - i / 16));
    ctx.lineTo(x + 2, y - 12 * (1 - i / 16) - h);
    ctx.lineTo(x + 6, y - 11 * (1 - i / 16));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function torso(ctx: Ctx, look: WyrmLook): void {
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(-62, -40);
    ctx.bezierCurveTo(-60, -80, -10, -96, 34, -86);
    ctx.bezierCurveTo(62, -80, 74, -56, 62, -38);
    ctx.bezierCurveTo(52, -22, 10, -17, -20, -19);
    ctx.bezierCurveTo(-48, -21, -66, -26, -62, -40);
    ctx.closePath();
  };
  const g = ctx.createLinearGradient(0, -96, 0, -18);
  g.addColorStop(0, mix(look.body, '#ffffff', 0.18));
  g.addColorStop(0.45, look.body);
  g.addColorStop(1, mix(look.body, INK, 0.28));
  path();
  stroked(ctx, g, outlineOf(look.body), 1.2);
  ctx.save();
  path();
  ctx.clip();
  // Belly plates: a paler band under the chest.
  ctx.fillStyle = look.belly;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(-60, -28);
  ctx.bezierCurveTo(-30, -38, 20, -36, 66, -42);
  ctx.lineTo(66, -10);
  ctx.lineTo(-66, -10);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = mix(look.belly, INK, 0.45);
  ctx.lineWidth = 0.9;
  for (let x = -52; x < 62; x += 9) {
    ctx.beginPath();
    ctx.moveTo(x, -34 + Math.sin(x * 0.06) * 2);
    ctx.lineTo(x + 3, -18);
    ctx.stroke();
  }
  // Scales: short dark arcs over the back.
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = mix(look.body, INK, 0.6);
  for (let i = 0; i < 26; i++) {
    const x = -52 + (i % 9) * 13 + (Math.floor(i / 9) % 2) * 6;
    const y = -80 + Math.floor(i / 9) * 14;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // Old scars across the flank: three pale slashes.
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = mix(look.belly, '#ffffff', 0.35);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-8 + i * 7, -74 + i * 2);
    ctx.lineTo(2 + i * 7, -48 + i * 2);
    ctx.stroke();
  }
  // Rim light along the top.
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = mix(look.body, '#ffffff', 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-56, -62);
  ctx.bezierCurveTo(-46, -86, -8, -94, 30, -86);
  ctx.stroke();
  ctx.restore();
  // The spines along the back.
  ctx.fillStyle = look.ridge;
  ctx.strokeStyle = outlineOf(look.ridge);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 7; i++) {
    const x = -46 + i * 12;
    const y = -78 - Math.sin(((i + 0.5) / 7) * Math.PI) * 14 + 4;
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 3);
    ctx.lineTo(x + 1, y - 13 - Math.sin((i / 6) * Math.PI) * 6);
    ctx.lineTo(x + 6, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function head(ctx: Ctx, p: WyrmPose, look: WyrmLook): void {
  // The neck: from the shoulder up to the head, which rears back (lift) or lunges (lunge).
  const hx = 94 - p.lift * 14 + p.lunge * 22;
  const hy = -104 - p.lift * 26 + p.lunge * 24;
  const neck = bez([44, -66], [66 - p.lift * 6, -96 - p.lift * 10], [hx - 6, hy + 8], 10);
  limb(ctx, neck, 30, 21, look.body);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-0.12 - p.lift * 0.5 + p.lunge * 0.42);
  // Horns sweeping back.
  ctx.fillStyle = look.horn;
  ctx.strokeStyle = outlineOf(look.horn);
  ctx.lineWidth = 1;
  for (const k of [0, 1]) {
    ctx.beginPath();
    ctx.moveTo(-6 - k * 4, -13);
    ctx.quadraticCurveTo(-26 - k * 6, -28 + k * 5, -36 - k * 8, -14 + k * 6);
    ctx.quadraticCurveTo(-24 - k * 6, -20 + k * 5, -2 - k * 4, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Lower jaw (behind the upper), opened around the hinge.
  ctx.save();
  ctx.translate(2, 8);
  ctx.rotate(p.jaw * 0.72);
  ctx.beginPath();
  ctx.moveTo(0, -3);
  ctx.lineTo(40, 3);
  ctx.quadraticCurveTo(44, 8, 36, 11);
  ctx.lineTo(2, 8);
  ctx.closePath();
  stroked(ctx, mix(look.body, INK, 0.15), outlineOf(look.body), 1.1);
  ctx.fillStyle = '#e9e2c8';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(12 + i * 8, 2);
    ctx.lineTo(15 + i * 8, -4);
    ctx.lineTo(18 + i * 8, 2);
    ctx.fill();
  }
  ctx.restore();
  // The mouth inside, glowing with the tier colour when it breathes.
  if (p.jaw > 0.1) {
    ctx.fillStyle = mix('#3a0d0d', '#ff7a1a', Math.min(1, p.fire * 1.2));
    ctx.beginPath();
    ctx.moveTo(4, 4);
    ctx.lineTo(38, 2);
    ctx.lineTo(34 + p.jaw * 6, 9 + p.jaw * 22);
    ctx.lineTo(4, 10);
    ctx.closePath();
    ctx.fill();
  }
  // Skull and snout.
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.quadraticCurveTo(-10, -18, 8, -17);
  ctx.quadraticCurveTo(28, -14, 46, -5);
  ctx.quadraticCurveTo(50, 0, 42, 4);
  ctx.lineTo(4, 7);
  ctx.quadraticCurveTo(-14, 8, -14, -2);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -18, 0, 8);
  g.addColorStop(0, mix(look.body, '#ffffff', 0.2));
  g.addColorStop(1, mix(look.body, INK, 0.2));
  stroked(ctx, g, outlineOf(look.body), 1.2);
  // Brow ridge, nostril and fangs.
  ctx.strokeStyle = mix(look.body, INK, 0.55);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(2, -10);
  ctx.quadraticCurveTo(14, -15, 24, -8);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(41, -3, 2, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e9e2c8';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(20 + i * 9, 4);
    ctx.lineTo(23 + i * 9, 10 + (i === 2 ? 2 : 0));
    ctx.lineTo(26 + i * 9, 4);
    ctx.fill();
  }
  // The eye: a glowing slit in the tier colour (shut when knocked out).
  if (p.ko > 0.6) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.lineTo(16, -5);
    ctx.stroke();
  } else {
    const glow = ctx.createRadialGradient(13, -6, 0, 13, -6, 12);
    glow.addColorStop(0, `${look.eye}cc`);
    glow.addColorStop(1, `${look.eye}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(13, -6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = look.eye;
    ctx.beginPath();
    ctx.ellipse(13, -6, 4.2, 2.6, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(13.5, -6, 1, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fire out of the mouth: layered tongues, flickering.
  if (p.fire > 0.02) {
    const L = 24 + p.fire * 72;
    const W = 7 + p.fire * 22;
    const layers: [string, number][] = [
      ['#d4400f', 1],
      ['#ff8a1c', 0.8],
      ['#ffd45a', 0.55],
      ['#fff6c8', 0.3],
    ];
    for (const [c, k] of layers) {
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(40, 3);
      for (let i = 0; i <= 8; i++) {
        const x = 40 + (L * k * i) / 8;
        const flick = Math.sin(p.fireT * 9 + i * 1.7) * 3 * k;
        const w = W * k * Math.sin((i / 8) * Math.PI * 0.9 + 0.15);
        ctx.lineTo(x, 3 - w + flick);
      }
      for (let i = 8; i >= 0; i--) {
        const x = 40 + (L * k * i) / 8;
        const flick = Math.sin(p.fireT * 9 + i * 1.3 + 2) * 3 * k;
        const w = W * k * Math.sin((i / 8) * Math.PI * 0.9 + 0.15);
        ctx.lineTo(x, 3 + w * 0.8 + flick);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// Draws Fafnir with its feet at the origin, facing right.
export function drawWyrm(ctx: Ctx, p: WyrmPose, look: WyrmLook): void {
  ctx.save();
  const breath = Math.sin(p.t * 2);
  const sway = Math.sin(p.t * 1) * 6 + Math.sin(p.walk) * 9;
  const bob = p.walk ? -Math.abs(Math.sin(p.walk)) * 2.5 : -breath * 0.8;
  // Falling: it tips forward onto its chest and sinks.
  ctx.translate(0, p.ko * 26);
  ctx.rotate(p.ko * 0.42);
  ctx.scale(1, 1 - p.ko * 0.12);
  ctx.translate(0, bob);
  ctx.scale(1, 1 + breath * 0.012);
  // Far legs, tail, body, near legs, then the head over everything.
  leg(ctx, -38, p.walk + Math.PI, look, false);
  leg(ctx, 38, p.walk, look, false);
  tail(ctx, sway, look);
  torso(ctx, look);
  leg(ctx, -30, p.walk, look, true);
  leg(ctx, 46, p.walk + Math.PI, look, true);
  head(ctx, p, look);
  ctx.restore();
}
