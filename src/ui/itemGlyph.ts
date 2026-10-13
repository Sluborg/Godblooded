import Phaser from 'phaser';
import type { Glyph } from './gearLook';

// A small item picture drawn in code (about 24 px), centred on (0, 0): the icon that rises over a
// hero after a purchase. Art's item icons (U2 kit style) replace it when they ship.
export function drawGlyph(g: Phaser.GameObjects.Graphics, glyph: Glyph): void {
  g.fillStyle(0x1a1410, 0.75).fillCircle(0, 0, 15);
  switch (glyph) {
    case 'sword':
      g.lineStyle(3, 0xdfe8f0, 1).lineBetween(-7, 7, 7, -7);
      g.lineStyle(3, 0xb08a4a, 1).lineBetween(-8, -2, 2, 8);
      break;
    case 'shield':
      g.fillStyle(0xb08a4a, 1).fillTriangle(-8, -7, 8, -7, 0, 9);
      g.fillStyle(0xdfe8f0, 1).fillRect(-8, -9, 16, 5);
      break;
    case 'charm':
      g.fillStyle(0xf2c14e, 1);
      g.fillTriangle(0, -9, -3, -2, 3, -2);
      g.fillTriangle(0, 9, -3, 2, 3, 2);
      g.fillTriangle(-9, 0, -2, -3, -2, 3);
      g.fillTriangle(9, 0, 2, -3, 2, 3);
      break;
    default:
      g.fillStyle(0xdfe8f0, 1).fillRect(-2, -9, 4, 5);
      g.fillStyle(0xcf4f6f, 1).fillCircle(0, 2, 7);
      g.lineStyle(1.5, 0xffffff, 0.7).strokeCircle(0, 2, 7);
  }
  g.lineStyle(2, 0xf2c14e, 0.9).strokeCircle(0, 0, 15);
}
