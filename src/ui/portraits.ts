import Phaser from 'phaser';
import { heroPartsLook } from '../data/heroParts';
import { faceOf, kitFor } from '../data/heroKits';
import { drawPortrait } from './parts/painted';
import { kitOf } from './parts/paintedLoad';
import { artCandidates } from './unitLook';
import { RENDER_SCALE } from '../config';

// Hero portraits match the in-game face (Stefan, 2026-10-14). In order: the kit portrait Art paints
// for the hero's head (`por_<face>`, face = the head part's id without `head_`), else a head and
// shoulders crop of the painted kit baked here from the same parts, else the hero's still picture.
export const PORTRAIT_PX = 128;

export interface PortraitHero {
  type: string;
  tier: number;
  path: string | null;
  god: string | null;
}

// Picture ids to try, best first (the caller takes the first that exists as a texture). The baked
// crop is created now when the kit is complete, so its id only appears when it works.
export function portraitIds(scene: Phaser.Scene, u: PortraitHero): string[] {
  const out: string[] = [];
  const look = u.god ? heroPartsLook(u.god, u.path, u.tier) : undefined;
  const combo = look ? kitFor(look.id) : undefined;
  if (look && combo?.parts.head) {
    out.push(`por_${faceOf(combo.parts.head)}`);
    const baked = bakePortrait(scene, look.id);
    if (baked) out.push(baked);
  }
  out.push(...artCandidates('hero', u.type, u.tier, u.path, u.god));
  return out;
}

// A head and shoulders crop of a look's painted kit, baked once into `por_kit_<look>`; null when the
// look has no complete kit.
export function bakePortrait(scene: Phaser.Scene, lookId: string): string | null {
  const key = `por_kit_${lookId}`;
  if (scene.textures.exists(key)) return key;
  const kit = kitOf(scene, lookId);
  if (!kit) return null;
  const px = Math.round(PORTRAIT_PX * Math.min(2, RENDER_SCALE));
  const tex = scene.textures.createCanvas(key, px, px);
  const ctx = tex?.getContext();
  if (!tex || !ctx) return null;
  drawPortrait(ctx, kit, px);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}
