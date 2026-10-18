import Phaser from 'phaser';
import type { Strike } from '../data/looks';
import { isSplashAsset, isUiAsset } from './assetPriority';
import { DIAG_KEY, type ArtDiag } from './artDiag';

export interface ManifestAsset {
  id: string;
  file: string;
  // 'mus' rows are audio (no extension in `file`, .ogg and .m4a shipped); never loaded as images.
  kind?: string;
  loopStartMs?: number;
  loopEndMs?: number;
  loopCrossfadeMs?: number;
  anchorX: number;
  anchorY: number;
  // Unit stills: the strike effect and where it starts (fractions 0..1 of the picture).
  strike?: Strike;
  weaponX?: number;
  weaponY?: number;
  weapon2X?: number;
  weapon2Y?: number;
  // Painted kit sheets (`kit_*`): picture pixels per drawing unit and a rectangle with pivots per
  // part id inside the image (ui/parts/painted.ts, data/heroKits.ts).
  pxPerUnit?: number;
  cells?: Record<
    string,
    { x: number; y: number; w: number; h: number; pivots?: Record<string, [number, number]> }
  >;
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
  // The interface kit is in: the title can open, the rest of the art is still streaming in behind
  // it. `done` (every image loaded) follows later.
  onTitleReady?: () => void;
}

// How many pictures the rest of the art loads at a time, and the pause between batches.
const REST_CHUNK = 8;
const REST_GAP_MS = 32;

// Set on the registry (and `ART_DONE_EVENT` emitted on the game) when every image has loaded.
export const ART_DONE_KEY = 'artDone';
export const ART_DONE_EVENT = 'art-done';

// Runs `go` now if all the art is in, else when it arrives (a scene that needs the map's pictures,
// started from the title while they are still loading).
export function whenArtReady(scene: Phaser.Scene, go: () => void): void {
  if (scene.registry.get(ART_DONE_KEY) === true) return go();
  const note = scene.add
    .text(scene.scale.gameSize.width / 2, 40, 'Loading the rest of the art…', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#f2c14e',
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(1e5);
  scene.game.events.once(ART_DONE_EVENT, () => {
    note.destroy();
    go();
  });
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
    const all = ((scene.cache.json.get('manifest') as { assets?: ManifestAsset[] } | null)
      ?.assets ?? []) as ManifestAsset[];
    for (const a of all) rows.set(a.id, a);
    // Music rows stay in `rows` for the music player but are not images.
    const assets = all.filter((a) => a.kind !== 'mus');
    diag.expected = assets.length;
    const splash = assets.filter((a) => isSplashAsset(a.id));
    const ui = assets.filter((a) => !isSplashAsset(a.id) && isUiAsset(a.id));
    const rest = assets.filter((a) => !isSplashAsset(a.id) && !isUiAsset(a.id));
    const finish = () => {
      hooks.onProgress?.(1);
      count();
      scene.registry.set(ART_DONE_KEY, true);
      done();
      scene.game.events.emit(ART_DONE_EVENT);
    };
    // The rest of the art, behind the title screen, a few pictures at a time: each upload to the
    // graphics card is a pause of the main thread, and one burst of a hundred of them freezes the
    // title for seconds on a phone.
    const loadRest = () => {
      if (rest.length === 0) return finish();
      let next = 0;
      const chunk = () => {
        const batch = rest.slice(next, next + REST_CHUNK);
        next += batch.length;
        if (batch.length === 0) return finish();
        for (const a of batch) scene.load.image(a.id, `assets/${a.file}`);
        scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
          // One frame to draw before the next pictures come in.
          scene.time.delayedCall(REST_GAP_MS, chunk);
        });
        scene.load.start();
      };
      chunk();
    };
    // The interface kit, with the loading bar; then the title opens.
    const loadUi = () => {
      hooks.onSplashReady?.();
      scene.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => hooks.onProgress?.(p));
      const afterUi = () => {
        scene.load.off(Phaser.Loader.Events.PROGRESS);
        hooks.onProgress?.(1);
        hooks.onTitleReady?.();
        loadRest();
      };
      if (ui.length === 0) return afterUi();
      for (const a of ui) scene.load.image(a.id, `assets/${a.file}`);
      scene.load.once(Phaser.Loader.Events.COMPLETE, afterUi);
      scene.load.start();
    };
    if (splash.length === 0) return loadUi();
    for (const a of splash) scene.load.image(a.id, `assets/${a.file}`);
    scene.load.once(Phaser.Loader.Events.COMPLETE, loadUi);
    scene.load.start();
  });
  scene.load.start();
}
