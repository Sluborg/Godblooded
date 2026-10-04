import Phaser from 'phaser';

export interface ManifestAsset {
  id: string;
  file: string;
  anchorX: number;
  anchorY: number;
}

// Registry key under which Boot stores the anchors of every loaded manifest entry.
export const ANCHORS_KEY = 'anchors';

// Loads public/assets/manifest.json, then every image it lists, keyed by manifest id.
// Calls `done` when finished. A missing or broken manifest means no art: the game falls
// back to placeholder shapes, so this never throws.
export function loadManifest(scene: Phaser.Scene, done: () => void): void {
  const base = import.meta.env.BASE_URL;
  const anchors = new Map<string, { x: number; y: number }>();
  scene.registry.set(ANCHORS_KEY, anchors);
  scene.load.setBaseURL(base);
  scene.load.json('manifest', 'assets/manifest.json');
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    const assets = ((scene.cache.json.get('manifest') as { assets?: ManifestAsset[] } | null)
      ?.assets ?? []) as ManifestAsset[];
    if (assets.length === 0) return done();
    for (const a of assets) {
      anchors.set(a.id, { x: a.anchorX, y: a.anchorY });
      scene.load.image(a.id, `assets/${a.file}`);
    }
    scene.load.once(Phaser.Loader.Events.COMPLETE, done);
    scene.load.start();
  });
  scene.load.start();
}
