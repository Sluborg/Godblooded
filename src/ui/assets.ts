import Phaser from 'phaser';
import type { Strike } from '../data/looks';
import { isSplashAsset } from './assetPriority';
import { DIAG_KEY, type ArtDiag } from './artDiag';

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
  // Counts for the corner report: failures as they happen, the loaded total when each batch ends.
  const glr = scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
  const gl = glr.gl as WebGLRenderingContext | undefined;
  const diag: ArtDiag = {
    expected: 0,
    loaded: 0,
    failed: 0,
    firstError: null,
    renderer: scene.game.config.renderType === Phaser.CANVAS ? 'CANVAS' : 'WEBGL',
    maxTexture: gl ? Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 0,
  };
  scene.registry.set(DIAG_KEY, diag);
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
    diag.failed++;
    const status = (file.xhrLoader as XMLHttpRequest | undefined)?.status ?? 0;
    diag.firstError ??= `${file.key} ${status}`;
  });
  const count = (): void => {
    diag.loaded = [...rows.keys()].filter((id) => scene.textures.exists(id)).length;
    // The renderer actually in use (AUTO may have fallen back to canvas).
    diag.renderer = scene.game.renderer.type === Phaser.CANVAS ? 'CANVAS' : 'WEBGL';
  };
  scene.load.json('manifest', 'assets/manifest.json');
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    const assets = ((scene.cache.json.get('manifest') as { assets?: ManifestAsset[] } | null)
      ?.assets ?? []) as ManifestAsset[];
    for (const a of assets) rows.set(a.id, a);
    diag.expected = assets.length;
    const splash = assets.filter((a) => isSplashAsset(a.id));
    const rest = assets.filter((a) => !isSplashAsset(a.id));
    const loadRest = () => {
      hooks.onSplashReady?.();
      if (rest.length === 0) {
        count();
        return done();
      }
      scene.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => hooks.onProgress?.(p));
      for (const a of rest) scene.load.image(a.id, `assets/${a.file}`);
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        hooks.onProgress?.(1);
        count();
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
