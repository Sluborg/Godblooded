import type { GameData, Tuning } from './types';

// Defaults for every tunable number the sim reads. Lead overrides any subset through
// `GameData.tuning` in src/data/, so design numbers live in data and these are only the
// fallback (tests and data files that set nothing keep today's behaviour).
export const DEFAULT_TUNING: Tuning = {
  combat: {
    windupMs: 300,
    healRange: 260,
    healBelow: 0.7,
    healPower: 1,
    dodgeK: 40,
    attackK: 15,
    critK: 40,
    armourK: 20,
    resistK: 30,
    critMult: 1.5,
    buildingFireMult: 1.5,
  },
  hero: {
    firstRecruitMs: 5_000,
    recruitMs: 15_000,
    maxPerTemple: 4,
    maxPerGod: 2,
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
    rivalBelow: -2,
    argueRange: 200,
    argueEveryMs: 20_000,
    friendBond: 3,
    revengeMs: 90_000,
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
  lair: {
    tierUpEveryMs: 480_000,
    maxTier: 3,
    spawnMult: [1, 0.85, 0.7],
    maxAliveAdd: [0, 1, 1],
    statMult: [1, 1.15, 1.3],
    hpMult: [1, 1.25, 1.5],
    rewardMult: [1, 1.5, 2],
  },
  building: {
    maxTier: 3,
    upgradeCostMult: [1.5, 2.5],
    hpMult: [1, 1.5, 2],
    templeRecruitMult: [1, 0.8, 0.6],
    templeCapAdd: [0, 2, 4],
    marketTaxMult: [1, 1.25, 1.5],
    marketStock: [120, 240, 480],
    towerRange: [300, 360, 420],
    towerDamage: [8, 14, 22],
    towerCooldownMs: [2000, 1800, 1600],
  },
  save: { autosaveMs: 30_000 },
  stats: { goldSampleMs: 15_000 },
  town: {
    townHallHp: 500,
    buildingHp: 200,
    raidFirstMs: 240_000,
    raidEveryMs: 120_000,
    raidSize: 2,
    raidLairs: 1,
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
    lair: { ...DEFAULT_TUNING.lair, ...t?.lair },
    building: { ...DEFAULT_TUNING.building, ...t?.building },
    save: { ...DEFAULT_TUNING.save, ...t?.save },
    stats: { ...DEFAULT_TUNING.stats, ...t?.stats },
    town: { ...DEFAULT_TUNING.town, ...t?.town },
    bounty: { ...DEFAULT_TUNING.bounty, ...t?.bounty },
  };
}
