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

// The collector's sack on its back (left of the body, which faces right).
export function drawSack(
  g: Phaser.GameObjects.Graphics,
  size: 0 | 1 | 2,
  x: number,
  y: number,
): void {
  g.clear();
  const r = size === 0 ? 9 : size === 1 ? 13 : 18;
  g.fillStyle(TAX_STYLE.sack, 1).fillEllipse(x, y, r * 1.6, r * 1.9);
  g.lineStyle(2, 0x000000, 0.6).strokeEllipse(x, y, r * 1.6, r * 1.9);
  g.fillStyle(TAX_STYLE.sackTie, 1).fillRect(x - r * 0.35, y - r * 1.05, r * 0.7, 4);
  if (size > 0) drawCoin(g, x, y + 1, size === 2 ? 6 : 4);
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
