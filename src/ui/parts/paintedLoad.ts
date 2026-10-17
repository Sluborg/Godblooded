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
  return {
    parts,
    layers: pick(combo.layers, all),
    build: BUILDS[combo.build ?? 'standard'],
    mode,
    footSpread: combo.footSpread,
  };
}

// A kit part as a texture frame: the sheet's Phaser texture, the cell and the sheet's pixels per
// drawing unit. The skeleton rig (src/ui/skeleton) draws parts as images from these.
export interface PartRef {
  tex: string;
  id: string;
  cell: KitPart['cell'];
  ppu: number;
}

// The reference for a part id from any kit sheet, or null when the sheet is not loaded. The frame
// named `id` is added to the sheet's texture the first time.
// Parts registered at run time (the dev animation test): they win over the manifest's. Empty in the
// shipped game.
export const DEV_PARTS = new Map<string, PartRef>();

export function partRef(scene: Phaser.Scene, id: string): PartRef | null {
  const dev = DEV_PARTS.get(id);
  if (dev && scene.textures.exists(dev.tex)) {
    const tex = scene.textures.get(dev.tex);
    if (!tex.has(id)) tex.add(id, 0, dev.cell.x, dev.cell.y, dev.cell.w, dev.cell.h);
    return dev;
  }
  const rows = scene.registry.get(ASSETS_KEY) as Map<string, ManifestAsset> | undefined;
  if (!rows) return null;
  for (const row of rows.values()) {
    const cell = row.cells?.[id];
    if (!cell || !row.pxPerUnit || !scene.textures.exists(row.id)) continue;
    const tex = scene.textures.get(row.id);
    if (!tex.has(id)) tex.add(id, 0, cell.x, cell.y, cell.w, cell.h);
    return { tex: row.id, id, cell, ppu: row.pxPerUnit };
  }
  return null;
}
