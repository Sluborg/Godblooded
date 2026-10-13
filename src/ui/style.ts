// The look of the game as named parameters, so Stefan's taste test can be tuned in one place
// (docs/decisions.md 2026-10-14). Pure data; each value says where it is used.
export const STYLE = {
  // No screen shake at all (taste test): big monster blows, boss emerging and enraging, smashes.
  screenShake: false,
  // How strong hit effects are by the attacker's progression: subtle at tier 1, stronger at tier
  // 2, clearly effectful at tier 3, big for a boss. Multiplies particle counts and glows.
  fxByTier: { 1: 0.55, 2: 1, 3: 1.6 } as Readonly<Record<number, number>>,
  fxBoss: 2.4,
} as const;

// The effect strength of an attacker of this tier (a boss is its own, biggest step).
export function fxScale(tier: number, boss = false): number {
  if (boss) return STYLE.fxBoss;
  return STYLE.fxByTier[Math.min(3, Math.max(1, Math.round(tier)))] ?? 1;
}

// A particle count scaled by effect strength, at least one.
export function scaledCount(n: number, k: number): number {
  return Math.max(1, Math.round(n * k));
}
