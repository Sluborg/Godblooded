import type { SkillDef, Vec2 } from '../sim/api';
import { TYPE_COLORS } from './damageLook';

// Pure rules for how skills look (docs/systems/paths-and-skills.md sections 4 and 8): which
// colour a skill takes from its damage type, the geometry of its shapes and which status sign a
// unit wears. The drawing is in skillFx.ts; this part has no Phaser, so it is unit-tested.

export const SKILL_VISUALS = [
  'bolt',
  'burst',
  'cone',
  'line',
  'chain',
  'aura',
  'shield',
  'dash',
  'mark',
  'pillar',
] as const;
export type SkillVisual = (typeof SKILL_VISUALS)[number];

export function isSkillVisual(id: string): id is SkillVisual {
  return (SKILL_VISUALS as readonly string[]).includes(id);
}

// The picture ids of a skill that Scene can draw (unknown ids are skipped).
export function skillVisuals(def: Pick<SkillDef, 'visual'> | undefined): SkillVisual[] {
  return (def?.visual ?? []).filter(isSkillVisual);
}

// A skill row as a caster of this tier sees it: at tier 3 the `t3` fields replace the row's (the
// same merge Sim does in sim/skills.ts).
export function skillAtTier<T extends { t3?: object }>(
  def: T | undefined,
  tier: number,
): T | undefined {
  return def && tier >= 3 && def.t3 ? { ...def, ...def.t3 } : def;
}

const HEAL_TINT = 0xb6ffb0;

// Colour of a skill: its first damage effect's type, else healing green when it heals, else the
// caster's own damage type, else plain white.
export function skillTint(
  def: Pick<SkillDef, 'effects'> | undefined,
  casterType = 'physical',
): number {
  const effects = def?.effects ?? [];
  const dmg = effects.find((e) => e.kind === 'damage');
  const type = dmg && dmg.kind === 'damage' ? (dmg.type ?? casterType) : undefined;
  if (type) return parseInt((TYPE_COLORS[type] ?? '#ffffff').slice(1), 16);
  if (effects.some((e) => e.kind === 'heal')) return HEAL_TINT;
  return parseInt((TYPE_COLORS[casterType] ?? '#ffffff').slice(1), 16);
}

export interface ShapeBox {
  radius: number;
  // Cone opening in degrees (0 when the shape is not a cone).
  angle: number;
  // Line length and width (0 when the shape is not a line).
  length: number;
  width: number;
}

// The numbers the drawing needs from a skill's shape; a single-target skill gets a small radius.
export function shapeBox(def: Pick<SkillDef, 'shape'> | undefined): ShapeBox {
  const s = def?.shape;
  const none = { radius: 60, angle: 0, length: 0, width: 0 };
  if (!s) return none;
  switch (s.kind) {
    case 'circle':
      return { ...none, radius: s.radius };
    case 'cone':
      return { ...none, radius: s.radius, angle: s.angle };
    case 'line':
      return { ...none, radius: s.length, length: s.length, width: s.width ?? 40 };
    case 'chain':
      return { ...none, radius: s.radius };
    default:
      return none;
  }
}

// Angle (radians) from `a` toward `b`; 0 (to the right) when they coincide.
export function angleTo(a: Vec2, b: Vec2): number {
  return a.x === b.x && a.y === b.y ? 0 : Math.atan2(b.y - a.y, b.x - a.x);
}

// A jagged polyline through `points` (chain lightning): between each pair, `bends` offsets
// sideways by up to `jitter`, from a seed so the same cast always looks the same.
export function jagged(points: readonly Vec2[], seed: number, bends = 3, jitter = 12): Vec2[] {
  let s = seed | 0 || 1;
  const rnd = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
  const out: Vec2[] = points.length ? [{ ...points[0] }] : [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const nx = -(b.y - a.y);
    const ny = b.x - a.x;
    const len = Math.hypot(nx, ny) || 1;
    for (let k = 1; k <= bends; k++) {
      const t = k / (bends + 1);
      const off = rnd() * jitter;
      out.push({
        x: a.x + (b.x - a.x) * t + (nx / len) * off,
        y: a.y + (b.y - a.y) * t + (ny / len) * off,
      });
    }
    out.push({ ...b });
  }
  return out;
}

// ---------- statuses ----------

export type StatusKind =
  | 'shield'
  | 'mark'
  | 'buff'
  | 'taunt'
  | 'bind'
  | 'hot'
  // Boss moves (monsters-and-bosses.md section 3): poisoned (venom), afraid (howl), turned to
  // stone (riddle), swallowed (Apep: out of sight until it ends).
  | 'poison'
  | 'fear'
  | 'stone'
  | 'swallowed';

// A shield is a bubble over the unit, a mark, taunt or bind a sign over its head, and a buff or
// heal over time a ring under its feet (at most one ring per unit: the newest).
export interface StatusLook {
  style: 'bubble' | 'sign' | 'ring' | 'tint' | 'hide';
  color: number;
  glyph?: string;
}

export const STATUS_LOOK: Record<StatusKind, StatusLook> = {
  shield: { style: 'bubble', color: 0x9fe0ff },
  mark: { style: 'sign', color: 0xff5a4a, glyph: '▼' },
  taunt: { style: 'sign', color: 0xffa13a, glyph: '!' },
  bind: { style: 'sign', color: 0xc8c8d0, glyph: '#' },
  buff: { style: 'ring', color: 0xf2c14e },
  hot: { style: 'ring', color: 0x7fe08a },
  poison: { style: 'sign', color: 0x8ae04a, glyph: 'drop' },
  fear: { style: 'sign', color: 0xf4f0e0, glyph: '!' },
  stone: { style: 'tint', color: 0x9a9a9a },
  swallowed: { style: 'hide', color: 0x201020 },
};

export function isStatusKind(s: string): s is StatusKind {
  return s in STATUS_LOOK;
}

// The statuses still running at run time `nowMs`, and whether any were dropped.
export function liveStatuses(
  held: Map<StatusKind, { until: number; seq: number }>,
  nowMs: number,
): StatusKind[] {
  const live: StatusKind[] = [];
  for (const [k, v] of held)
    if (v.until > nowMs) live.push(k);
    else held.delete(k);
  return live;
}

// Of the ring statuses, the newest one (highest `seq`); null when there is none.
export function newestRing(
  held: ReadonlyMap<StatusKind, { until: number; seq: number }>,
  live: readonly StatusKind[],
): StatusKind | null {
  let best: StatusKind | null = null;
  let seq = -1;
  for (const k of live) {
    if (STATUS_LOOK[k].style !== 'ring') continue;
    const s = held.get(k)?.seq ?? 0;
    if (s > seq) {
      seq = s;
      best = k;
    }
  }
  return best;
}
