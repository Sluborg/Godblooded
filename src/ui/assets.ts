import Phaser from 'phaser';
import type { Strike } from './motionPose';

export interface ManifestAsset {
  id: string;
  file: string;
  anchorX: number;
  anchorY: number;
  // Unit stills: the strike effect and where it starts (fractions 0..1 of the picture).
  strike?: Strike;
  weaponX?: number;
  weaponY?: number;
  weapon2X?: number;
  weapon2Y?: number;
}

// Registry key under which Boot stores every loaded manifest row, by id.
export const ASSETS_KEY = 'assets';

// Loads public/assets/manifest.json, then every image it lists, keyed by manifest id.
// Calls `done` when finished. A missing or broken manifest means no art: the game falls
// back to placeholder shapes, so this never throws.
export function loadManifest(scene: Phaser.Scene, done: () => void): void {
  const base = import.meta.env.BASE_URL;
  const rows = new Map<string, ManifestAsset>();
  scene.registry.set(ASSETS_KEY, rows);
  scene.load.setBaseURL(base);
  scene.load.json('manifest', 'assets/manifest.json');
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    const assets = ((scene.cache.json.get('manifest') as { assets?: ManifestAsset[] } | null)
      ?.assets ?? []) as ManifestAsset[];
    if (assets.length === 0) return done();
    for (const a of assets) {
      rows.set(a.id, a);
      scene.load.image(a.id, `assets/${a.file}`);
    }
    scene.load.once(Phaser.Loader.Events.COMPLETE, done);
    scene.load.start();
  });
  scene.load.start();
}
