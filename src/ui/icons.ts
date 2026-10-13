import Phaser from 'phaser';

// UI icons from the kit (`ui_icon_gold`, `ui_icon_menu`, ...). Each is optional: a missing picture
// means the caller keeps its text, so the game never depends on the art.

// Scale that fits a picture of this size inside a square of `size` px.
export function iconScale(picW: number, picH: number, size: number): number {
  return size / Math.max(1, Math.max(picW, picH));
}

// Adds the icon centred on (x, y), fitted to `size`, or returns null when there is no picture.
export function addIcon(
  scene: Phaser.Scene,
  id: string,
  x: number,
  y: number,
  size: number,
): Phaser.GameObjects.Image | null {
  if (!scene.textures.exists(id)) return null;
  const img = scene.add.image(x, y, id);
  img.setScale(iconScale(img.width, img.height, size));
  return img;
}
