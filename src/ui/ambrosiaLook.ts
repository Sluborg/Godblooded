import type Phaser from 'phaser';

// Ambrosia in code (docs/systems/nodes.md): a gatherer carries a jar home, a dropped jar lies on
// the ground for the next gatherer, a "+N" pop at the hall when it arrives.
export const AMBROSIA_STYLE = {
  jar: 0xc9a14a,
  jarEdge: 0x5a3d12,
  liquid: 0xfff0b0,
  glow: 0xb98cff,
  text: '#e8d9ff',
} as const;

export function ambrosiaPop(amount: number): string {
  return `+${Math.round(amount)} Ambrosia`;
}

// A small amphora centred on (x, y), `s` times its 36 px height.
export function drawJar(g: Phaser.GameObjects.Graphics, x: number, y: number, s = 1): void {
  const { jar, jarEdge, liquid } = AMBROSIA_STYLE;
  g.fillStyle(jarEdge, 1).fillEllipse(x, y + 4 * s, 24 * s, 28 * s);
  g.fillStyle(jar, 1).fillEllipse(x, y + 3 * s, 21 * s, 25 * s);
  g.fillStyle(jarEdge, 1).fillRect(x - 5 * s, y - 13 * s, 10 * s, 6 * s);
  g.fillStyle(jar, 1).fillRect(x - 4 * s, y - 12 * s, 8 * s, 5 * s);
  g.fillStyle(liquid, 0.9).fillCircle(x, y + 2 * s, 5 * s);
}

// A jar on the ground with its glow.
export function drawJarOnGround(g: Phaser.GameObjects.Graphics, amount: number): void {
  g.clear();
  g.fillStyle(0x24140a, 0.3).fillEllipse(0, 0, 44, 14);
  g.fillStyle(AMBROSIA_STYLE.glow, 0.25).fillCircle(0, -16, 26);
  drawJar(g, 0, -16, amount >= 20 ? 1.3 : 1);
}
