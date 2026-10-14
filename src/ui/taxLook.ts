import type Phaser from 'phaser';

// The tax collector's pictures in code (docs/systems/tax-collector.md section 2): a coin with a
// number over a building that holds gold, a sack on the collector in 3 sizes, a pile of gold.
export const TAX_STYLE = {
  coin: 0xf2c14e,
  coinEdge: 0x7a5a12,
  text: '#f4ead5',
  plate: 0x1a1410,
  sack: 0x6b4320,
  sackTie: 0xf2c14e,
} as const;

// A till shows once it reaches the smallest worth a trip (tuning.collector.minTill).
export function tillShown(till: number | undefined, minTill: number): boolean {
  return till !== undefined && till >= minTill;
}

// 0 empty, 1 under half the carry cap, 2 half or more.
export function sackSize(carried: number, cap: number): 0 | 1 | 2 {
  if (carried <= 0) return 0;
  return cap > 0 && carried >= cap / 2 ? 2 : 1;
}

export function popText(gold: number): string {
  return `+${Math.round(gold)}`;
}

export function drawCoin(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.fillStyle(TAX_STYLE.coinEdge, 1).fillCircle(x, y + 1.5, r);
  g.fillStyle(TAX_STYLE.coin, 1).fillCircle(x, y, r);
  g.lineStyle(2, TAX_STYLE.coinEdge, 0.9).strokeCircle(x, y, r * 0.62);
}

// The tax collector, drawn facing right with its feet at the origin: a stocky hooded figure in a
// brown robe with a gold belt, and a big sack on its back (left) in 3 sizes. The sack is the
// point: it is what tells it from a hero, and it grows with what the collector carries.
export function drawCollector(g: Phaser.GameObjects.Graphics, size: 0 | 1 | 2): void {
  g.clear();
  const ink = 0x1a0f08;
  // Sack first, behind the body.
  const r = size === 0 ? 18 : size === 1 ? 26 : 34;
  const sx = -30;
  const sy = -26 - r * 0.2;
  g.fillStyle(TAX_STYLE.sack, 1).fillEllipse(sx, sy, r * 1.7, r * 2);
  g.lineStyle(3, ink, 0.85).strokeEllipse(sx, sy, r * 1.7, r * 2);
  g.fillStyle(TAX_STYLE.sackTie, 1).fillRect(sx - r * 0.3, sy - r * 1.05, r * 0.6, 6);
  if (size > 0) drawCoin(g, sx, sy + 2, size === 2 ? 9 : 7);
  // Robe: a wide rounded bell.
  g.fillStyle(0x7a5a30, 1).fillEllipse(0, -26, 54, 56);
  g.lineStyle(3, ink, 0.85).strokeEllipse(0, -26, 54, 56);
  g.fillStyle(TAX_STYLE.coin, 1).fillRect(-26, -30, 52, 6);
  g.fillStyle(TAX_STYLE.coinEdge, 1).fillRect(-4, -31, 8, 8);
  // Hood and face.
  g.fillStyle(0x5a3f20, 1).fillCircle(6, -58, 19);
  g.lineStyle(3, ink, 0.85).strokeCircle(6, -58, 19);
  g.fillStyle(0x24140a, 1).fillEllipse(13, -57, 15, 17);
  g.fillStyle(0xf4ead5, 1).fillCircle(15, -59, 2).fillCircle(20, -59, 2);
  // A pouch hand and a short staff.
  g.lineStyle(4, 0x4b2e1a, 1).lineBetween(26, -2, 26, -52);
  g.fillStyle(TAX_STYLE.coin, 1).fillCircle(26, -54, 5);
}

// A pile of gold: a few coins heaped, more for more gold.
export function drawPile(g: Phaser.GameObjects.Graphics, gold: number): void {
  g.clear();
  g.fillStyle(0x24140a, 0.3).fillEllipse(0, 0, 70, 22);
  const n = gold >= 100 ? 7 : gold >= 40 ? 5 : 3;
  const spots: [number, number][] = [
    [-14, -4],
    [12, -5],
    [0, -9],
    [-4, -17],
    [-22, -2],
    [22, -2],
    [6, -22],
  ];
  for (const [x, y] of spots.slice(0, n)) drawCoin(g, x, y, 9);
}
