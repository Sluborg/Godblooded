import type { Vec2 } from '../sim/api';

// The hint engine (docs/systems/onboarding.md, hint-texts.md): teach by pointing, one hint at a
// time. Pure rules, no Phaser, so they are unit-tested; HintView draws the bubble and the pulse.

export type HintTarget =
  | { kind: 'none' }
  // The first free plot, or a plot from the build menu.
  | { kind: 'plot' }
  // The first building of this type, e.g. `temple_aesir`; `market` etc.
  | { kind: 'building'; type: string }
  // The unit named by the event that fired the hint (a hero, the downed hero, the boss).
  | { kind: 'unit' }
  // A monster a hero can see (the one the condition found).
  | { kind: 'monster' }
  | { kind: 'lair' }
  | { kind: 'flag' }
  // The spot the event named (a grave, where a raid comes from).
  | { kind: 'spot' }
  | { kind: 'ui'; id: string };

export interface HintDef {
  id: string;
  // Order in its group (beats first, then first-time hints).
  order: number;
  // 'beat' hints (the first 3 minutes) wait 8 s after the last hint, others 20 s.
  group: 'beat' | 'first';
  // A Sim event kind, or a Scene condition id (`start`, `buildMenu`, `monsterSeen`, `upgrade`).
  trigger: string;
  // The hint fires this long after another hint was shown (ms), if set.
  after?: { hint: string; ms: number };
  // Milestone: shown only when at or below the game's (M2 today).
  milestone: 2 | 3;
  line1: string;
  line2?: string;
  target: HintTarget;
}

export const MILESTONE = 2;
export const SHOW_MS = 8000;
export const GAP_BEAT_MS = 8000;
export const GAP_FIRST_MS = 20000;
export const MAX_LINE = 40;

export interface ShownHint {
  def: HintDef;
  // The unit the triggering event named, if any.
  unit: number | null;
  // The world spot the event named, if any (`spot` target).
  at: Vec2 | null;
  shownAt: number;
}

interface Pending {
  def: HintDef;
  unit: number | null;
  at: Vec2 | null;
}

// Decides which hint shows when. `now` is real time in ms. One hint shows at a time; it ends when
// tapped or after SHOW_MS; the next waits for the gap. A hint is shown once per player (`seen`).
export class HintEngine {
  private pending = new Map<string, Pending>();
  private shownAt = new Map<string, number>();
  private current: ShownHint | null = null;
  private lastEnd = -Infinity;

  constructor(
    private readonly defs: readonly HintDef[],
    private readonly seen: Set<string>,
    private on: boolean = true,
  ) {}

  setOn(on: boolean): void {
    this.on = on;
    if (!on) this.hide(0);
  }

  get isOn(): boolean {
    return this.on;
  }

  get showing(): ShownHint | null {
    return this.current;
  }

  // Something happened: a Sim event kind or a Scene condition id. `unit` names its unit.
  fire(trigger: string, unit: number | null = null, at: Vec2 | null = null): void {
    for (const def of this.defs) {
      if (def.trigger !== trigger || def.milestone > MILESTONE) continue;
      if (def.after) continue; // fires by time, see update()
      this.queue(def, unit, at);
    }
  }

  // The player did the thing a hint teaches: it is not needed any more (build before the first
  // hint shows skips the temple hints).
  skip(...ids: string[]): void {
    for (const id of ids) {
      this.seen.add(id);
      this.pending.delete(id);
    }
  }

  private queue(def: HintDef, unit: number | null, at: Vec2 | null): void {
    if (this.seen.has(def.id) || this.pending.has(def.id) || this.current?.def.id === def.id)
      return;
    this.pending.set(def.id, { def, unit, at });
  }

  // Dismiss the shown hint (a tap anywhere). Returns true if one was showing.
  dismiss(now: number): boolean {
    if (!this.current) return false;
    this.hide(now);
    return true;
  }

  private hide(now: number): void {
    if (!this.current) return;
    this.seen.add(this.current.def.id);
    this.lastEnd = now;
    this.current = null;
  }

  // Call every frame (or twice a second). Returns the hint to show, if one is showing.
  update(now: number): ShownHint | null {
    if (this.current && now - this.current.shownAt >= SHOW_MS) this.hide(now);
    if (!this.on) return null;
    // Hints that wait on another hint's time.
    for (const def of this.defs) {
      if (!def.after || def.milestone > MILESTONE) continue;
      const at = this.shownAt.get(def.after.hint);
      if (at !== undefined && now - at >= def.after.ms) this.queue(def, null, null);
    }
    if (this.current) return this.current;
    let next: Pending | null = null;
    for (const p of this.pending.values()) {
      if (this.seen.has(p.def.id)) continue;
      if (!next || order(p.def) < order(next.def)) next = p;
    }
    if (!next) return null;
    const gap = next.def.group === 'beat' ? GAP_BEAT_MS : GAP_FIRST_MS;
    if (now - this.lastEnd < gap) return null;
    this.pending.delete(next.def.id);
    this.current = { def: next.def, unit: next.unit, at: next.at, shownAt: now };
    this.shownAt.set(next.def.id, now);
    return this.current;
  }
}

// Beats before first-time hints, each by its order.
function order(d: HintDef): number {
  return (d.group === 'beat' ? 0 : 1000) + d.order;
}

// The lines of a hint as shown (line 2 only when there is one).
export function hintLines(def: HintDef): string[] {
  return def.line2 ? [def.line1, def.line2] : [def.line1];
}

// What a Sim event means to the hint engine: triggers to fire (with the unit to point at) and
// hints the event makes unnecessary (the player already did it).
export interface HintFromEvent {
  fire: { trigger: string; unit: number | null; at?: Vec2 }[];
  skip: string[];
}

export function hintsFromEvent(
  e: {
    kind: string;
    [k: string]: unknown;
  },
  itemSlot: (item: string) => string | undefined = () => undefined,
): HintFromEvent {
  const n = (v: unknown): number | null => (typeof v === 'number' ? v : null);
  const atOf = (v: unknown): { at?: Vec2 } => {
    const p = v as { x?: unknown; y?: unknown } | null | undefined;
    return typeof p?.x === 'number' && typeof p.y === 'number' ? { at: { x: p.x, y: p.y } } : {};
  };
  const f = (trigger: string, unit: unknown = null): HintFromEvent => ({
    fire: [{ trigger, unit: n(unit) }],
    skip: [],
  });
  switch (e.kind) {
    case 'arrived':
    case 'knockout':
    case 'drank':
    case 'fled':
    case 'bossEmerged':
      return f(e.kind, e.unit);
    case 'slain':
      return { fire: [{ trigger: 'slain', unit: n(e.unit), ...atOf(e.pos) }], skip: [] };
    case 'raidWarning':
      return { fire: [{ trigger: 'raidWarning', unit: null, ...atOf(e.from) }], skip: [] };
    case 'partyFormed':
      return f('partyFormed', Array.isArray(e.members) ? e.members[0] : null);
    case 'upgradePicked':
      return f('upgradePicked', e.hero);
    case 'pathOffer':
      return f('pathOffer', e.hero);
    case 'tierUp':
      return e.tier === 2 ? f('tierUp', e.unit) : { fire: [], skip: [] };
    case 'cast':
      return f('cast', e.caster);
    case 'argue':
      return f('argue', e.a);
    case 'lairTierUp':
      return f('lairTierUp', e.lair);
    case 'shopped': {
      const slot = typeof e.item === 'string' ? itemSlot(e.item) : undefined;
      return slot === 'weapon' || slot === 'armour'
        ? f('shoppedGear', e.unit)
        : { fire: [], skip: [] };
    }
    case 'built':
      // Building before the hint shows makes the build hints needless.
      return {
        fire: [],
        skip:
          typeof e.type === 'string' && e.type.startsWith('temple')
            ? ['b-temple', 'b-aesir']
            : e.type === 'market'
              ? ['b-market']
              : [],
      };
    case 'bountyPlaced':
      // A flag with a `target` is a hunt flag: it follows its monster (hero-ai 5b).
      return typeof e.target === 'number'
        ? {
            fire: [
              { trigger: 'bountyPlaced', unit: null },
              { trigger: 'huntFlag', unit: null },
            ],
            skip: [],
          }
        : f(e.kind);
    case 'buildingDestroyed':
    case 'omen':
      return f(e.kind);
    default:
      return { fire: [], skip: [] };
  }
}
