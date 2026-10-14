import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { FILL_W } from './view';

// The backdrop spans any view (a centred scene reaches past the 1280 area on both sides).
const X0 = (GAME_WIDTH - FILL_W) / 2;

// Scale at which a picture of this size covers the screen (cover-fit, centred).
export function coverScale(picW: number, picH: number, w = GAME_WIDTH, h = GAME_HEIGHT): number {
  return Math.max(w / picW, h / picH);
}

// How much the key art is pushed: the title read muted and grainy on a phone, so the picture gets
// more contrast and saturation (still the warm palette) and a lighter veil.
// Stefan (run 2): the title was grainy. A contrast boost makes the painting's grain louder, so the
// art is shown as it is (contrast and saturation 1) with smooth dark scrims above and below.
export const BACKDROP_STYLE = {
  contrast: 1,
  saturation: 1,
  veilTop: 0.18,
  veilBottom: 0.5,
} as const;

// Contrast about mid grey, then saturation, on RGBA pixels in place.
export function punchPixels(
  data: Uint8ClampedArray,
  contrast: number = BACKDROP_STYLE.contrast,
  saturation: number = BACKDROP_STYLE.saturation,
): void {
  for (let i = 0; i < data.length; i += 4) {
    let r = (data[i] - 128) * contrast + 128;
    let g = (data[i + 1] - 128) * contrast + 128;
    let b = (data[i + 2] - 128) * contrast + 128;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

// The key art with the punch applied, baked once into its own texture; the plain art when a canvas
// cannot be made (then the veil is all there is).
function punchedSplash(scene: Phaser.Scene): string {
  if (BACKDROP_STYLE.contrast === 1 && BACKDROP_STYLE.saturation === 1) return 'art_splash';
  const key = 'art_splash_punch';
  if (scene.textures.exists(key)) return key;
  try {
    const src = scene.textures.get('art_splash').getSourceImage() as HTMLImageElement;
    const tex = scene.textures.createCanvas(key, src.width, src.height);
    const ctx = tex?.getContext();
    if (!tex || !ctx) return 'art_splash';
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, src.width, src.height);
    punchPixels(img.data);
    ctx.putImageData(img, 0, 0);
    tex.refresh();
    return key;
  } catch {
    return 'art_splash';
  }
}

// The splash and title backdrop: the key art (`art_splash`) when it has loaded, else a code-drawn
// dusk (purple sky, orange horizon glow, dark hills). A dark veil keeps text readable on top.
export function drawBackdrop(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  if (scene.textures.exists('art_splash')) {
    const img = scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, punchedSplash(scene));
    img.setScale(coverScale(img.width, img.height, FILL_W));
    out.push(img);
  } else {
    const sky = scene.add.graphics();
    sky.fillGradientStyle(0x140f26, 0x140f26, 0xc4682f, 0xc4682f, 1);
    sky.fillRect(X0, 0, FILL_W, GAME_HEIGHT);
    sky.fillGradientStyle(0x140f26, 0x140f26, 0x4a2347, 0x4a2347, 1);
    sky.fillRect(X0, 0, FILL_W, GAME_HEIGHT * 0.55);
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
  const { veilTop, veilBottom } = BACKDROP_STYLE;
  veil.fillGradientStyle(
    0x000000,
    0x000000,
    0x000000,
    0x000000,
    veilTop,
    veilTop,
    veilBottom,
    veilBottom,
  );
  veil.fillRect(X0, 0, FILL_W, GAME_HEIGHT);
  out.push(veil);
  return out;
}

function ridge(baseY: number, amp: number, phase: number): Phaser.Types.Math.Vector2Like[] {
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: X0, y: GAME_HEIGHT }];
  for (let x = X0; x <= X0 + FILL_W; x += 40)
    pts.push({
      x,
      y: baseY + Math.sin(x / 130 + phase) * amp * 0.5 + Math.sin(x / 57 + phase * 2) * amp * 0.25,
    });
  pts.push({ x: X0 + FILL_W, y: GAME_HEIGHT });
  return pts;
}
