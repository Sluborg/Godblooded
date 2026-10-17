import type Phaser from 'phaser';
import { ASSETS_KEY, type ManifestAsset } from '../assets';
import {
  BUILDS,
  KIT_SLOTS,
  kitFor,
  type KitCombo,
  type KitMode,
  type KitSlot,
} from '../../data/heroKits';
import { kitComplete, type Kit, type KitPart, type PartMap } from './painted';

// Every kit part the manifest offers by id: the cells of all rows that have a `cells` object
// (`kit_*` sheets), with the sheet's picture and pixels per drawing unit.
function partsById(scene: Phaser.Scene): Map<string, KitPart> {
  const out = new Map<string, KitPart>();
  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  if (!rows) return out;
  for (const row of rows.values()) {
    if (!row.cells || !row.pxPerUnit || !scene.textures.exists(row.id)) continue;
    const img = scene.textures.get(row.id).getSourceImage() as CanvasImageSource;
    for (const [id, cell] of Object.entries(row.cells)) {
      out.set(id, { img, cell, ppu: row.pxPerUnit });
    }
  }
  return out;
}

const pick = (ids: Partial<Record<KitSlot, string>> | undefined, all: Map<string, KitPart>) => {
  const out: PartMap = {};
  for (const slot of KIT_SLOTS) {
    const id = ids?.[slot];
    const part = id ? all.get(id) : undefined;
    if (part) out[slot] = part;
  }
  return out;
};

// Kits registered at run time by look id (the dev animation test, src/dev/animStage.ts): they win
// over the manifest's combos. Empty in the shipped game.
export const RUNTIME_KITS = new Map<string, Kit>();

// The kit of a look (`odin_t1`) built from the manifest, or null when the look has no combo or a
// part it cannot do without has no picture (the code shapes are used then).
export function kitOf(scene: Phaser.Scene, lookId: string): Kit | null {
  const runtime = RUNTIME_KITS.get(lookId);
  if (runtime) return runtime;
  const combo: KitCombo | undefined = kitFor(lookId);
  if (!combo) return null;
  const all = partsById(scene);
  const parts = pick(combo.parts, all);
  // `?kitmode=floating|bent` overrides the combo's mode, for comparing the two on one sheet.
  const asked =
    typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('kitmode');
  const mode: KitMode =
    asked === 'floating' || asked === 'bent' ? asked : (combo.mode ?? 'floating');
  if (!kitComplete(parts, mode)) return null;
  return { parts, layers: pick(combo.layers, all), build: BUILDS[combo.build ?? 'standard'], mode };
}
