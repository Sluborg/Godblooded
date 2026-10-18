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

// A plain code ball picture (a hand or a boot): a radial-shaded ellipse with a dark rim, `w` x `h` px.
function ballCanvas(color: string, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const grad = g.createRadialGradient(
    w * 0.38,
    h * 0.32,
    1,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.62,
  );
  grad.addColorStop(0, 'rgba(255,255,255,0.28)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.beginPath();
  g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#2a201b';
  g.stroke();
  return c;
}

// A part's picture multiplied by `color` (a neutral grey cape takes the party colour).
function tinted(part: KitPart, color: string): KitPart {
  const c = document.createElement('canvas');
  c.width = part.cell.w;
  c.height = part.cell.h;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const draw = () =>
    g.drawImage(
      part.img,
      part.cell.x,
      part.cell.y,
      part.cell.w,
      part.cell.h,
      0,
      0,
      c.width,
      c.height,
    );
  draw();
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-in';
  draw();
  return {
    img: c,
    cell: { x: 0, y: 0, w: c.width, h: c.height, pivots: part.cell.pivots },
    ppu: part.ppu,
  };
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
  if (combo.codeBalls) {
    // 7 x 7 units for a hand, 8.8 x 6.4 for a boot (the prototype's balls), at 16 px per unit.
    parts.hand = {
      img: ballCanvas(combo.codeBalls.skin, 112, 112),
      cell: { x: 0, y: 0, w: 112, h: 112, pivots: { wrist: [0.5, 0.5], grip: [0.5, 0.5] } },
      ppu: 16,
    };
    parts.boot = {
      img: ballCanvas(combo.codeBalls.leather, 140, 102),
      cell: { x: 0, y: 0, w: 140, h: 102, pivots: { ground: [0.5, 0.96], ankle: [0.5, 0.5] } },
      ppu: 16,
    };
  }
  for (const [slot, color] of Object.entries(combo.tint ?? {}) as [KitSlot, string][]) {
    const part = parts[slot];
    if (part) parts[slot] = tinted(part, color);
  }
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
