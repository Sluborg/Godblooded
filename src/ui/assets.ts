import Phaser from 'phaser';
import type { Strike } from '../data/looks';
import { isSplashAsset } from './assetPriority';

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
  // 9-slice rows (ui_panel, ui_button*): the four corner sizes in shipped pixels.
  sliceLeft?: number;
  sliceRight?: number;
  sliceTop?: number;
  sliceBottom?: number;
}

// Registry key under which Boot stores every loaded manifest row, by id.
export const ASSETS_KEY = 'assets';

export interface LoadHooks {
  // Overall progress 0..1 of the image loading.
  onProgress?: (p: number) => void;
  // The splash assets (key art, logo) are in; the rest is still loading.
  onSplashReady?: () => void;
}

// Loads public/assets/manifest.json, then every image it lists, keyed by manifest id. The splash
// assets go first (see assetPriority.ts). Calls `done` when finished. A missing or broken
// manifest means no art: the game falls back to placeholder shapes, so this never throws.
export function loadManifest(scene: Phaser.Scene, done: () => void, hooks: LoadHooks = {}): void {
  const base = import.meta.env.BASE_URL;
  const rows = new Map<string, ManifestAsset>();
  scene.registry.set(ASSETS_KEY, rows);
  scene.load.setBaseURL(base);
  scene.load.json('manifest', 'assets/manifest.json');
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    const assets = ((scene.cache.json.get('manifest') as { assets?: ManifestAsset[] } | null)
      ?.assets ?? []) as ManifestAsset[];
    for (const a of assets) rows.set(a.id, a);
    const splash = assets.filter((a) => isSplashAsset(a.id));
    const rest = assets.filter((a) => !isSplashAsset(a.id));
    const loadRest = () => {
      hooks.onSplashReady?.();
      if (rest.length === 0) return done();
      scene.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => hooks.onProgress?.(p));
      for (const a of rest) scene.load.image(a.id, `assets/${a.file}`);
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        hooks.onProgress?.(1);
        done();
      });
      scene.load.start();
    };
    if (splash.length === 0) return loadRest();
    for (const a of splash) scene.load.image(a.id, `assets/${a.file}`);
    scene.load.once(Phaser.Loader.Events.COMPLETE, loadRest);
    scene.load.start();
  });
  scene.load.start();
}
