// The tax collector's props, drawn into each baked frame of his rig (bake.ts) so they move with
// the figure and layer right: the sack goes BEHIND the body (it hangs on his back), the ledger is
// drawn at the front hand's position of that very frame and the hand is drawn again over its edge,
// so it is held. Units are the rig's drawing units (feet at the origin, facing +x); the frame's
// transform is already set by the caller.
export interface PropCtx {
  save(): void;
  restore(): void;
  beginPath(): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  rect(x: number, y: number, w: number, h: number): void;
  fill(): void;
  stroke(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  translate(x: number, y: number): void;
  rotate(a: number): void;
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
}

const INK = '#1a0f08';
const SACK = '#8a6a3c';
const SACK_TIE = '#3e2c18';
const COIN = '#f2c14e';

// Sack radius in drawing units by size (0 empty, 1 some, 2 heavy).
const RADIUS = [4.4, 5.8, 7.2] as const;

export interface PropPose {
  bob: number;
  rot: number;
  hf: { x: number; y: number };
}

// The sack, behind the body: centred on the back (left), low enough that the shoulder stays clear.
export function drawSackBack(c: PropCtx, size: 0 | 1 | 2, p: PropPose): void {
  const r = RADIUS[size];
  c.save();
  if (p.rot) c.rotate(p.rot);
  c.translate(-5.6 - r * 0.35, -13.5 - r * 0.2 + p.bob);
  c.beginPath();
  c.ellipse(0, 0, r * 0.82, r, 0, 0, Math.PI * 2);
  c.fillStyle = SACK;
  c.fill();
  c.lineWidth = 0.9;
  c.strokeStyle = INK;
  c.stroke();
  // The tied neck of the sack.
  c.beginPath();
  c.rect(-r * 0.32, -r * 1.02, r * 0.64, 1.6);
  c.fillStyle = SACK_TIE;
  c.fill();
  if (size > 0) {
    c.beginPath();
    c.arc(0, r * 0.1, size === 2 ? 2 : 1.5, 0, Math.PI * 2);
    c.fillStyle = COIN;
    c.fill();
    c.lineWidth = 0.5;
    c.stroke();
  }
  c.restore();
}

// The ledger in the front hand: a dark book standing in the hand, pale page edge toward the front.
// Drawn after the body; the hand is painted again over the cover so the fingers are on it.
export function drawLedgerHeld(c: PropCtx, p: PropPose, skin: string, handR = 2.4): void {
  c.save();
  if (p.rot) c.rotate(p.rot);
  c.translate(p.hf.x, p.hf.y);
  const w = 5.2;
  const h = 7;
  c.beginPath();
  c.rect(-1.2, -h + 1.2, w, h);
  c.fillStyle = '#3b2616';
  c.fill();
  c.lineWidth = 0.8;
  c.strokeStyle = INK;
  c.stroke();
  // Pages on the far edge and two ruled lines.
  c.beginPath();
  c.rect(w - 2.2, -h + 1.8, 1.4, h - 1.2);
  c.fillStyle = '#e6dcc0';
  c.fill();
  c.beginPath();
  c.moveTo(-0.2, -h + 3.2);
  c.lineTo(1.6, -h + 3.2);
  c.moveTo(-0.2, -h + 4.8);
  c.lineTo(1.6, -h + 4.8);
  c.lineWidth = 0.5;
  c.strokeStyle = '#8a7a58';
  c.stroke();
  // The hand over the cover.
  c.beginPath();
  c.arc(0, 0, handR, 0, Math.PI * 2);
  c.fillStyle = skin;
  c.fill();
  c.lineWidth = 0.8;
  c.strokeStyle = INK;
  c.stroke();
  c.restore();
}
