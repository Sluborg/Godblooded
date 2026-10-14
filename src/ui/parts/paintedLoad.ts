import type Phaser from 'phaser';
import { ASSETS_KEY, type ManifestAsset } from '../assets';
import type { PaintedRow } from './painted';

// The painted picture and row of a look (`odin_t1`, `thor-hammerborn_t2`), or null when the manifest
// has none or the image has not loaded. A tier 3 look falls back to its tier 2 picture.
export function paintedFor(
  scene: Phaser.Scene,
  lookId: string,
): { img: CanvasImageSource; sheet: PaintedRow } | null {
  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  if (!rows) return null;
  const ids = [lookId];
  if (lookId.endsWith('_t3')) ids.push(`${lookId.slice(0, -3)}_t2`);
  for (const look of ids) {
    const id = `hero_${look}_parts`;
    const row = rows.get(id);
    if (!row?.parts || !row.pxPerUnit || !scene.textures.exists(id)) continue;
    return {
      img: scene.textures.get(id).getSourceImage() as CanvasImageSource,
      sheet: { pxPerUnit: row.pxPerUnit, parts: row.parts as PaintedRow['parts'] },
    };
  }
  return null;
}
