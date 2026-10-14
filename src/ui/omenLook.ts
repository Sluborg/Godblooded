import type { OmenDef, OmenView } from '../sim/api';

// How an omen looks (pure; the scenes draw it). A sky tint over the map while it is announced and
// active, a banner, a top-bar icon and a marker for a fallen star. Colours come from the omen's id
// where we know it, else from what its mods do, so a new omen row looks like something at once.

export interface OmenSky {
  color: number;
  // Peak alpha of the tint over the map while the omen is active (half of it while announced).
  alpha: number;
}

const BY_ID: Readonly<Record<string, OmenSky>> = {
  red_sky: { color: 0xc4281e, alpha: 0.18 },
  fimbul_frost: { color: 0x9cc8ff, alpha: 0.2 },
  eclipse: { color: 0x120a24, alpha: 0.32 },
  eclipse_of_ra: { color: 0x120a24, alpha: 0.32 },
  caravan: { color: 0xf2c14e, alpha: 0.1 },
  merchant_caravan: { color: 0xf2c14e, alpha: 0.1 },
  fallen_star: { color: 0x9fb7ff, alpha: 0.12 },
};

const NEUTRAL: OmenSky = { color: 0xb8a4ff, alpha: 0.12 };

export function omenSky(
  def: Pick<OmenDef, 'id' | 'mods' | 'star'> | undefined,
  id: string,
): OmenSky {
  const known = BY_ID[id];
  if (known) return known;
  const m = def?.mods;
  if (m?.undeadDamage !== undefined) return BY_ID.eclipse;
  if (m?.monsterDamage !== undefined && m.monsterDamage > 1) return BY_ID.red_sky;
  if (m?.moveSpeed !== undefined && m.moveSpeed < 1) return BY_ID.fimbul_frost;
  if (m?.shopDiscount !== undefined) return BY_ID.caravan;
  if (def?.star) return BY_ID.fallen_star;
  return NEUTRAL;
}

// The tint alpha now: fades in over the announce, full while active, fades out in its last second.
export function skyAlpha(sky: OmenSky, view: Readonly<OmenView> | null, leadMs: number): number {
  if (view === null) return 0;
  if (view.phase === 'announced') {
    const t = leadMs > 0 ? 1 - Math.max(0, Math.min(1, view.msLeft / leadMs)) : 1;
    return sky.alpha * 0.5 * t;
  }
  return sky.alpha * Math.min(1, view.msLeft / 1000);
}

// "Red Sky in 0:45" while announced, "Red Sky 1:20" while it lasts.
export function omenLabel(view: Readonly<OmenView>): string {
  const s = Math.max(0, Math.ceil(view.msLeft / 1000));
  const t = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return view.phase === 'announced' ? `${view.name} in ${t}` : `${view.name} ${t}`;
}
