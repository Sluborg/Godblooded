import type { GameData, Tuning } from './types';

// Defaults for every tunable number the sim reads. Lead overrides any subset through
// `GameData.tuning` in src/data/, so design numbers live in data and these are only the
// fallback (tests and data files that set nothing keep today's behaviour).
export const DEFAULT_TUNING: Tuning = {
  combat: {
    windupMs: 300,
  },
  hero: {
    firstRecruitMs: 5_000,
    recruitMs: 15_000,
    maxPerTemple: 4,
    maxPerClass: 2,
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
    lairBounty: 60,
    lairXp: 40,
    lairAggro: 350,
  },
  town: {
    townHallHp: 500,
    buildingHp: 200,
    raidFirstMs: 240_000,
    raidEveryMs: 120_000,
    raidSize: 2,
    raidGrowEveryMs: 300_000,
    defendHp: 0.5,
  },
  bounty: {
    dangerRadius: 250,
    lairDanger: 3,
    costPerDanger: 15,
    claimRadius: 100,
    greedyGoldMult: 1.5,
    curiousGoldMult: 1.2,
    braveFearMult: 0.5,
    cowardFearMult: 2,
    proudMinGold: 40,
  },
};

export function resolveTuning(data: GameData): Tuning {
  const t = data.tuning;
  return {
    combat: { ...DEFAULT_TUNING.combat, ...t?.combat },
    hero: { ...DEFAULT_TUNING.hero, ...t?.hero },
    party: { ...DEFAULT_TUNING.party, ...t?.party },
    monster: { ...DEFAULT_TUNING.monster, ...t?.monster },
    town: { ...DEFAULT_TUNING.town, ...t?.town },
    bounty: { ...DEFAULT_TUNING.bounty, ...t?.bounty },
  };
}
