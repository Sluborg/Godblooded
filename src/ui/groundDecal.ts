import Phaser from 'phaser';

// What stands on the ground tells friend from foe at a glance: a town building sits on a warm,
// trodden patch; a monster lair on dark cracked earth with a blood-red ring, a faint red glow and
// a red name plate with a skull. Drawn with shapes, so it needs no art.

export const DECAL_DATA = 'decal';

// "wyrm-nest" -> "Wyrm Nest".
export function lairTitle(type: string): string {
  return type
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// Fixed crack lines (unit coordinates, half-width 1) so every lair has the same cracked look.
const CRACKS: [number, number, number, number, number, number][] = [
  [-0.95, 0.05, -0.55, -0.2, -0.3, 0.1],
  [0.95, -0.05, 0.6, 0.25, 0.35, 0.05],
  [-0.2, 0.55, 0.05, 0.25, 0.3, 0.5],
  [-0.5, -0.55, -0.25, -0.25, 0.0, -0.4],
  [0.45, -0.5, 0.25, -0.3, 0.1, -0.15],
];

export function lairDecal(scene: Phaser.Scene, boss: boolean): Phaser.GameObjects.Graphics {
  const w = boss ? 440 : 300;
  const h = w * 0.42;
  const g = scene.add.graphics();
  g.fillStyle(0xff3020, 0.07).fillEllipse(0, -6, w * 1.35, h * 1.45);
  g.fillStyle(0x140a10, 0.6).fillEllipse(0, -6, w, h);
  g.lineStyle(boss ? 7 : 5, 0x8a1c2b, 0.75).strokeEllipse(0, -6, w, h);
  g.lineStyle(2, 0x050205, 0.8);
  for (const [x1, y1, x2, y2, x3, y3] of CRACKS) {
    g.beginPath()
      .moveTo((x1 * w) / 2, -6 + (y1 * h) / 2)
      .lineTo((x2 * w) / 2, -6 + (y2 * h) / 2)
      .lineTo((x3 * w) / 2, -6 + (y3 * h) / 2)
      .strokePath();
  }
  return g.setData(DECAL_DATA, true);
}

export function townPatch(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0xc9a45c, 0.2).fillEllipse(0, -6, 250, 104);
  g.fillStyle(0xe0c27a, 0.14).fillEllipse(0, -6, 170, 70);
  g.lineStyle(3, 0xe0c27a, 0.3).strokeEllipse(0, -6, 250, 104);
  return g.setData(DECAL_DATA, true);
}

// The red plate under a lair: a drawn skull and its name.
export function lairPlate(scene: Phaser.Scene, type: string): Phaser.GameObjects.Container {
  const text = scene.add
    .text(14, 0, lairTitle(type), {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#ffe3dc',
      backgroundColor: '#8a1c2bee',
      padding: { x: 10, y: 3 },
    })
    .setOrigin(0.5, 0.5);
  const skull = scene.add.graphics();
  const sx = -text.width / 2 - 2;
  skull
    .fillStyle(0xf4ead5, 1)
    .fillCircle(sx, -3, 9)
    .fillRect(sx - 5, 2, 10, 7);
  skull
    .fillStyle(0x1a0f14, 1)
    .fillCircle(sx - 3.5, -3, 2.6)
    .fillCircle(sx + 3.5, -3, 2.6);
  skull.fillRect(sx - 1, 3, 2, 5);
  text.x = 0;
  const plate = scene.add.container(0, 30, [text, skull]);
  return plate.setData(DECAL_DATA, true);
}
