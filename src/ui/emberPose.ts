// Where an ember of a lair is at a moment (pure; lairFx.ts draws it).
export interface EmberPose {
  x: number;
  y: number;
  alpha: number;
}

// Where an ember is `timeMs` in: it rises from the lair's ground, sways and fades out at the top.
// `reach` is how high it climbs (world units).
export function emberPose(
  phase: number,
  speed: number,
  dx: number,
  timeMs: number,
  reach: number,
): EmberPose {
  const t = ((((timeMs / 1000) * speed + phase) % 1) + 1) % 1;
  return {
    x: dx + Math.sin(t * 6.2 + phase * 9) * 6,
    y: -t * reach,
    alpha: Math.min(1, t * 5) * (1 - t),
  };
}
