// Graybox content (M1). Lead owns these numbers; Sim reads them. Ids match the art manifest
// types (`hero_<class>`, `mon_<type>`, `bld_<type>`), so `bld_${id}_t${tier}` finds the sprite.
import type { Attributes, GameData, LairDef, MonsterDef } from '../sim/types';

// Derived (Sim): hp = sta * 8 + str * 4, damage = str, attack time = weapon base reduced by dex.

export interface ClassDef {
  id: string;
  attrs: Attributes;
  // Seconds between attacks before dex; range in world units (melee about 40).
  weapon: { baseAttackS: number; range: number };
  // Gold a hero of this class carries on arrival (spends it in the town's shops).
  startGold: number;
}

// One of 3 cards offered when a party levels up. `effect` keys are read by Sim.
export interface UpgradeDef {
  id: string;
  name: string;
  text: string;
  effect: { attr?: Partial<Attributes>; healPct?: number; flee?: number };
}

// Recruited by temple_aesir in M1 (pantheon temples split this in M3).
export const CLASSES: readonly ClassDef[] = [
  {
    id: 'warrior',
    attrs: { str: 6, dex: 3, sta: 6, cha: 3, per: 3, int: 2, wp: 5 },
    weapon: { baseAttackS: 1.6, range: 40 },
    startGold: 40,
  },
  {
    id: 'ranger',
    attrs: { str: 4, dex: 6, sta: 4, cha: 3, per: 6, int: 3, wp: 4 },
    weapon: { baseAttackS: 1.4, range: 220 },
    startGold: 50,
  },
];

export const MONSTERS: readonly MonsterDef[] = [
  {
    id: 'draugr',
    attrs: { str: 4, dex: 3, sta: 4, cha: 1, per: 3, int: 1, wp: 6 },
    weapon: { baseAttackS: 1.8, range: 40 },
    bounty: 12,
    xp: 10,
  },
  {
    id: 'troll',
    attrs: { str: 8, dex: 2, sta: 9, cha: 1, per: 2, int: 1, wp: 4 },
    weapon: { baseAttackS: 2.4, range: 50 },
    bounty: 40,
    xp: 35,
  },
];

// M1 map: two lairs out in the fog; the troll den is the "final lair" (win when it falls).
export const LAIRS: readonly LairDef[] = [
  { id: 'barrow', monster: 'draugr', spawnS: 20, maxAlive: 4, hp: 300 },
  { id: 'troll-den', monster: 'troll', spawnS: 60, maxAlive: 2, hp: 600 },
];

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'iron-arms',
    name: 'Iron Arms',
    text: '+2 Strength for the whole party',
    effect: { attr: { str: 2 } },
  },
  {
    id: 'thick-hide',
    name: 'Thick Hide',
    text: '+2 Stamina for the whole party',
    effect: { attr: { sta: 2 } },
  },
  {
    id: 'odins-eye',
    name: "Odin's Eye",
    text: 'Heal 50% now; the party flees later (at 15% hp instead of 30%)',
    effect: { healPct: 50, flee: 0.15 },
  },
];

export const GRAYBOX: GameData = {
  startGold: 300,
  map: { width: 2400, height: 1600 },
  townHall: { x: 1200, y: 800 },
  monsters: MONSTERS,
  lairs: LAIRS,
  // M1 map: the barrow up left near town, the troll den far down right.
  lairSites: [
    { lair: 'barrow', pos: { x: 500, y: 450 } },
    { lair: 'troll-den', pos: { x: 2100, y: 1350 } },
  ],
  buildings: [
    { id: 'temple_aesir', cost: 150 },
    { id: 'market', cost: 100 },
    { id: 'shrine', cost: 120 },
    { id: 'tower', cost: 80 },
  ],
};
