import type { GameData, Tuning } from './types';

// Defaults for every tunable number the sim reads. Lead overrides any subset through
// `GameData.tuning` in src/data/, so design numbers live in data and these are only the
// fallback (tests and data files that set nothing keep today's behaviour).
export const DEFAULT_TUNING: Tuning = {
  hero: {
    firstRecruitMs: 5_000,
    recruitMs: 15_000,
    maxPerTemple: 4,
    koMs: 10_000,
    // Fraction of max hp a revived hero wakes with.
    reviveHp: 0.25,
    // Fraction of max hp healed per second while resting; shrines multiply it.
    restPerS: 0.1,
    shrineMult: 3,
    shopMinGold: 20,
    spendShare: 0.6,
    // Share of what heroes spend that the town collects.
    taxRate: 0.5,
    // How close counts as arrived, in world units.
    arrive: 50,
    lairSearchRadius: 250,
    // Share of explore trips aimed at a lair instead of a random spot.
    lairSearchShare: 0.7,
  },
  party: {
    maxParty: 4,
    mergeRange: 250,
    mergeEveryTicks: 20,
    // Party level n needs xpPerLevel * n xp.
    xpPerLevel: 30,
    offerSize: 3,
    bondCap: 10,
    // Hp fraction a hero flees at before upgrades and personality.
    baseFlee: 0.3,
  },
  monster: {
    wanderRadius: 160,
    idleMinMs: 1_000,
    idleMaxMs: 4_000,
    // A chase ends this far from the monster's lair.
    leash: 420,
  },
};

export function resolveTuning(data: GameData): Tuning {
  const t = data.tuning;
  return {
    hero: { ...DEFAULT_TUNING.hero, ...t?.hero },
    party: { ...DEFAULT_TUNING.party, ...t?.party },
    monster: { ...DEFAULT_TUNING.monster, ...t?.monster },
  };
}
