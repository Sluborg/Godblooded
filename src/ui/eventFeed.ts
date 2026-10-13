import type { SimEvent, UnitState, Vec2 } from '../sim/api';
import { heroLabel, pathName } from './partyLook';

// Short toasts for the sim events a player wants to notice (lair cleared, knockout, level up,
// raid, tier-up, building lost). Pure: the HUD draws them and sends the camera to `pos` on tap.

export interface ToastSpec {
  text: string;
  color: string;
  // Where the event happened, or null when unknown (a tap then does nothing).
  pos: Vec2 | null;
}

// What describeEvent needs to look things up in the last snapshot.
export interface FeedWorld {
  unit(id: number): Readonly<UnitState> | undefined;
  // Position of a lair or building that may already be gone from the snapshot.
  structure(id: number): Vec2 | undefined;
  // The leader (first member) of a party.
  leader(partyId: number): Readonly<UnitState> | undefined;
  townHall: Vec2;
}

const GOOD = '#2f6b3aee';
const BAD = '#8a1c2bdd';
const INFO = '#3a2a1cdd';

export function describeEvent(e: SimEvent, w: FeedWorld): ToastSpec | null {
  switch (e.kind) {
    case 'lairDestroyed':
      return {
        text: `${e.type} lair cleared! +${e.bounty} gold`,
        color: GOOD,
        pos: w.structure(e.lair) ?? null,
      };
    case 'knockout': {
      const u = w.unit(e.unit);
      if (!u || u.kind !== 'hero') return null;
      return { text: `${heroLabel(u)} knocked out`, color: BAD, pos: u.pos };
    }
    case 'levelUp': {
      const l = w.leader(e.party);
      return {
        text: `Party ${e.party} reached level ${e.level}`,
        color: GOOD,
        pos: l?.pos ?? null,
      };
    }
    case 'raid':
      return {
        text: `Raid! ${e.size} monsters march on the town`,
        color: BAD,
        pos: w.structure(e.lair) ?? w.townHall,
      };
    case 'tierUp': {
      const u = w.unit(e.unit);
      const what = e.path ? pathName(e.path) : `tier ${e.tier}`;
      return {
        text: `${u ? heroLabel(u) : 'A hero'} rose to ${what}`,
        color: INFO,
        pos: u?.pos ?? null,
      };
    }
    case 'buildingDestroyed':
      return {
        text: `${e.type.replace(/_/g, ' ')} destroyed`,
        color: BAD,
        pos: w.structure(e.building) ?? null,
      };
    default:
      return null;
  }
}

export interface Toast extends ToastSpec {
  id: number;
  // Milliseconds left.
  ttlMs: number;
}

export const MAX_TOASTS = 3;
export const TOAST_MS = 4500;
// The same text again inside this window is dropped (a brawl of knockouts must not flood).
export const DEDUPE_MS = 2000;

export class EventFeed {
  toasts: Toast[] = [];
  private nextId = 1;
  private recent = new Map<string, number>();
  private now = 0;

  push(spec: ToastSpec): Toast | null {
    const last = this.recent.get(spec.text);
    if (last !== undefined && this.now - last < DEDUPE_MS) return null;
    this.recent.set(spec.text, this.now);
    const t: Toast = { ...spec, id: this.nextId++, ttlMs: TOAST_MS };
    this.toasts.push(t);
    while (this.toasts.length > MAX_TOASTS) this.toasts.shift();
    return t;
  }

  update(dtMs: number): void {
    this.now += dtMs;
    for (const t of this.toasts) t.ttlMs -= dtMs;
    this.toasts = this.toasts.filter((t) => t.ttlMs > 0);
  }

  dismiss(id: number): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }
}
