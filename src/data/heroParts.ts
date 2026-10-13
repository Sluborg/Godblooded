// How a hero looks when drawn from parts (Scene's part-based renderer, src/ui/parts/). The rows
// are GENERATED from the style prototype (docs/reference/style-test.html) into heroParts.gen.ts;
// this file only picks the right look for a hero: the god's row, then its path's tier 2 and tier 3
// overlays on top (a path never swaps the hero: it keeps the face, hair, palette and silhouette
// and adds gear and effects; tier 3 is the same path with more of it).
//
// Owner: Scene (look rows only, approved by Lead).
import { HERO_DEFS } from './heroParts.gen';

// A hero definition as the drawing reads it: colours, head, gear, `atk.style`, optional
// overlays. Loose on purpose: the prototype grows new keys as the look does.
export interface PartsDef {
  atk: { style: string; heavy?: boolean; [key: string]: unknown };
  [key: string]: unknown;
}
interface PathDefRaw {
  name: string;
  t2?: Record<string, unknown>;
  t3?: Record<string, unknown>;
}
interface HeroDefRaw extends PartsDef {
  paths?: PathDefRaw[];
}

const DEFS = HERO_DEFS as unknown as Record<string, HeroDefRaw>;

// The prototype names a path "Hammerborn"; the game's path id is "thor-hammerborn".
export function pathIdOf(god: string, name: string): string {
  return `${god}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export interface PartsLook {
  id: string; // one baked set per distinct look
  def: PartsDef; // resolved for the tier and path
}

// The look for a hero, or undefined when the data has none (the picture is used then).
// `path` is the path id taken at tier 2, `tier` the hero's tier (1 to 3).
export function heroPartsLook(
  god: string | null,
  path: string | null,
  tier: number,
): PartsLook | undefined {
  if (!god) return undefined;
  const base = DEFS[god];
  if (!base) return undefined;
  const t = Math.min(3, Math.max(1, tier));
  if (t === 1 || !base.paths) return { id: `${god}_t1`, def: { ...base } };
  const pth = path ? base.paths.find((p) => pathIdOf(god, p.name) === path) : undefined;
  if (!pth) return undefined;
  let d: PartsDef = { ...base, path: pth.name };
  for (const add of [pth.t2, t === 3 ? pth.t3 : undefined]) {
    if (add) d = { ...d, ...add, atk: { ...d.atk, ...((add.atk as object | undefined) ?? {}) } };
  }
  return { id: `${path}_t${t}`, def: d };
}

// Every god with a row, and the path ids it has (for the review page and tests).
export function partsGods(): { god: string; paths: string[] }[] {
  return Object.entries(DEFS).map(([god, d]) => ({
    god,
    paths: (d.paths ?? []).map((p) => pathIdOf(god, p.name)),
  }));
}
