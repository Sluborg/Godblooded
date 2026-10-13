import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';

// Scale at which a picture of this size covers the screen (cover-fit, centred).
export function coverScale(picW: number, picH: number, w = GAME_WIDTH, h = GAME_HEIGHT): number {
  return Math.max(w / picW, h / picH);
}

// The splash and title backdrop: the key art (`art_splash`) when it has loaded, else a code-drawn
// dusk (purple sky, orange horizon glow, dark hills). A dark veil keeps text readable on top.
export function drawBackdrop(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  if (scene.textures.exists('art_splash')) {
    const img = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'art_splash');
    img.setScale(coverScale(img.width, img.height));
    out.push(img);
  } else {
    const sky = scene.add.graphics();
    sky.fillGradientStyle(0x140f26, 0x140f26, 0xc4682f, 0xc4682f, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    sky.fillGradientStyle(0x140f26, 0x140f26, 0x4a2347, 0x4a2347, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.55);
    sky.fillStyle(0xf2c14e, 0.25).fillCircle(GAME_WIDTH * 0.7, GAME_HEIGHT * 0.72, 170);
    sky.fillStyle(0xf2c14e, 0.55).fillCircle(GAME_WIDTH * 0.7, GAME_HEIGHT * 0.72, 70);
    // Two ridges of hills in front of the glow.
    sky.fillStyle(0x2a1a2e, 1);
    sky.fillPoints(ridge(GAME_HEIGHT * 0.74, 60, 0.9), true);
    sky.fillStyle(0x120c14, 1);
    sky.fillPoints(ridge(GAME_HEIGHT * 0.86, 40, 2.3), true);
    out.push(sky);
  }
  const veil = scene.add.graphics();
  veil.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.1, 0.1, 0.65, 0.65);
  veil.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  out.push(veil);
  return out;
}

function ridge(baseY: number, amp: number, phase: number): Phaser.Types.Math.Vector2Like[] {
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: GAME_HEIGHT }];
  for (let x = 0; x <= GAME_WIDTH; x += 40)
    pts.push({
      x,
      y: baseY + Math.sin(x / 130 + phase) * amp * 0.5 + Math.sin(x / 57 + phase * 2) * amp * 0.25,
    });
  pts.push({ x: GAME_WIDTH, y: GAME_HEIGHT });
  return pts;
}
