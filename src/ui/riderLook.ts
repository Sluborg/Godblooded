import { DEFAULT_TUNING } from '../sim/api';
import type { RiderId, RiderTuning } from '../sim/api';

// How a rider shows on its target (docs/systems/combat.md, "What the player sees"): a tint and a
// small icon over the head (flame, snowflake, spark, skull, sun) while it lasts. Pure data and a
// duration helper, so the numbers can be tested; UnitView draws the icon.

export interface RiderLook {
  // Tint over the unit (0xRRGGBB) and the icon's colour.
  tint: number;
  icon: number;
  // The icon shape UnitView draws.
  shape: 'flame' | 'snowflake' | 'spark' | 'skull' | 'sun';
}

export const RIDER_LOOK: Record<RiderId, RiderLook> = {
  burn: { tint: 0xff7a2a, icon: 0xffa040, shape: 'flame' },
  chill: { tint: 0x7fd4ff, icon: 0xbfeaff, shape: 'snowflake' },
  arc: { tint: 0xfff06a, icon: 0xfff06a, shape: 'spark' },
  wither: { tint: 0x9a6fd0, icon: 0xe8ddff, shape: 'skull' },
  sear: { tint: 0xfff2b0, icon: 0xffd75a, shape: 'sun' },
};

// A one-hit rider (arc jumps, sear bonus) has no lasting state: its icon just flashes briefly.
export const BRIEF_RIDER_MS = 700;

// How long the icon stays up: burn while it still ticks, chill and wither for their effect time.
export function riderDurationMs(id: RiderId, t: RiderTuning = DEFAULT_TUNING.rider): number {
  switch (id) {
    case 'burn':
      return t.burnTicks * t.burnEveryMs;
    case 'chill':
      return t.chillMs;
    case 'wither':
      return t.witherMs;
    default:
      return BRIEF_RIDER_MS;
  }
}
