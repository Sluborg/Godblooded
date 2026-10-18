// Art that is loaded when a run needs it, not at start-up (Lead, 2026-10-18): tier 2 and up of a
// building (most early runs never see them) and the lairs (a run places only some of them). Together
// about 15 MB of GPU memory and 2 MB of download that no longer wait in front of every launch.
import Phaser from 'phaser';
import { ASSETS_KEY, type ManifestAsset } from './assets';
import { missingIds } from './assetPriority';

// When the scene stops (a run ends) its loader is torn down with a batch maybe in flight: forget
// the queue and what never arrived, so the next run asks for it again.
export function releaseLazyArt(scene: Phaser.Scene): void {
  running = false;
  queue.length = 0;
  for (const id of [...requested]) if (!scene.textures.exists(id)) requested.delete(id);
}

const requested = new Set<string>();
const queue: string[] = [];
let running = false;

// Fetches the pictures (once each, one batch at a time on the scene's loader) and calls `arrived`
// with the ids that came in. A picture that fails to load stays absent: the callers fall back to
// the tier below or the placeholder, as they do for art the manifest does not have.
export function ensureArt(
  scene: Phaser.Scene,
  ids: readonly string[],
  arrived: (ids: string[]) => void,
): void {
  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  if (!rows) return;
  const todo = missingIds(
    ids,
    (id) => rows.has(id),
    (id) => scene.textures.exists(id),
    requested,
  );
  if (todo.length === 0) return;
  todo.forEach((id) => requested.add(id));
  queue.push(...todo);
  if (!running) pump(scene, rows, arrived);
}

function pump(
  scene: Phaser.Scene,
  rows: Map<string, ManifestAsset>,
  arrived: (ids: string[]) => void,
): void {
  const batch = queue.splice(0, queue.length);
  if (batch.length === 0) {
    running = false;
    return;
  }
  running = true;
  scene.load.setBaseURL(import.meta.env.BASE_URL);
  for (const id of batch) {
    const file = rows.get(id)?.file;
    if (file) scene.load.image(id, `assets/${file}`);
  }
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    const got = batch.filter((id) => scene.textures.exists(id));
    if (got.length) arrived(got);
    pump(scene, rows, arrived);
  });
  scene.load.start();
}
