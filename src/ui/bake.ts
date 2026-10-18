import Phaser from 'phaser';
import { RENDER_SCALE } from '../config';

// Phaser's WebGL Graphics re-triangulates every fill path (ellipses, circles, polygons) on every
// frame it draws, even when nothing changed. A ground decal or a unit ring never changes, so it is
// drawn once into a texture (at the device render scale, so it stays sharp) and shown as an Image.
// Profile 2026-10-14: that triangulation (earcut, indexCurve, GraphicsWebGLRenderer) was the
// largest cost the game's own code could remove from a frame.

// The render scale a baked texture was made at: it is the last part of its id (`bake:<key>:<r>`).
// The scale can change in a run (ui/scaleGovernor.ts), so an image that keeps a baked texture must
// size itself by THIS, not by the live RENDER_SCALE; a texture of another kind counts as the live one.
export function textureScale(textureKey: string): number {
  if (!textureKey.startsWith('bake:')) return RENDER_SCALE;
  const r = Number(textureKey.slice(textureKey.lastIndexOf(':') + 1));
  return r > 0 ? r : RENDER_SCALE;
}

// `k` design units per design unit: the image's scale for the texture it shows now.
export function bakedScale(img: Phaser.GameObjects.Image, k = 1): number {
  return k / textureScale(img.texture.key);
}

// An image of what `draw` paints round the point (0, 0), within +-halfW x +-halfH world units.
// `key` names the picture: the same key reuses the texture, so it must describe everything `draw`
// does (colours, sizes). The image's origin is that point.
export function bake(
  scene: Phaser.Scene,
  key: string,
  halfW: number,
  halfH: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, bakeTexture(scene, key, halfW, halfH, draw))
    .setScale(1 / RENDER_SCALE);
}

// Just the texture id (baked once per key), for a caller that swaps the texture of its own image.
export function bakeTexture(
  scene: Phaser.Scene,
  key: string,
  halfW: number,
  halfH: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): string {
  const r = RENDER_SCALE;
  const id = `bake:${key}:${r}`;
  if (!scene.textures.exists(id)) {
    const g = scene.make.graphics({}, false);
    // The canvas transform is part of the command list, so generateTexture honours it (the game
    // object's own position and scale it does not).
    g.translateCanvas(halfW * r, halfH * r).scaleCanvas(r, r);
    draw(g);
    g.generateTexture(id, Math.ceil(2 * halfW * r), Math.ceil(2 * halfH * r));
    g.destroy();
  }
  return id;
}

// A ground ellipse: optional fill, optional outline.
export interface RingSpec {
  w: number;
  h: number;
  // The ellipse's centre, from the image centre.
  cx?: number;
  cy?: number;
  fill?: [color: number, alpha: number];
  line?: [width: number, color: number, alpha: number];
}

// A stack of ellipses (a unit's ring, a decal) baked as one image, centred on (0, 0).
export function bakeRings(
  scene: Phaser.Scene,
  specs: readonly RingSpec[],
): Phaser.GameObjects.Image {
  let hw = 1;
  let hh = 1;
  for (const s of specs) {
    const lw = s.line?.[0] ?? 0;
    hw = Math.max(hw, Math.abs(s.cx ?? 0) + s.w / 2 + lw);
    hh = Math.max(hh, Math.abs(s.cy ?? 0) + s.h / 2 + lw);
  }
  hw = Math.ceil(hw) + 1;
  hh = Math.ceil(hh) + 1;
  return bake(scene, `rings:${hw}x${hh}:${JSON.stringify(specs)}`, hw, hh, (g) => {
    for (const s of specs) {
      const cx = s.cx ?? 0;
      const cy = s.cy ?? 0;
      if (s.fill) g.fillStyle(s.fill[0], s.fill[1]).fillEllipse(cx, cy, s.w, s.h);
      if (s.line) g.lineStyle(s.line[0], s.line[1], s.line[2]).strokeEllipse(cx, cy, s.w, s.h);
    }
  });
}
