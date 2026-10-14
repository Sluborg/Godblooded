# Progression

Design owns this spec. Lead turns the proposed rows into backlog rows and data. Builds on what
Sim does today (decisions 2026-10-04 "Graybox parties", Sim 120 lair growth, Sim 130 building
tiers) and on `combat.md`, `paths-and-skills.md` and `items-and-shops.md`.

## Bottom line

- **The party is the only level.** Heroes have no XP of their own; the party shares XP, levels
  up together, and the party picks 1 of 3 cards by itself, weighted by its leader's trait
  (Stefan, 2026-10-13; `level-ups.md`). Keep today's curve (level n needs 30n XP), cap the
  party at **level 8**.
- **Card pool from 9 to 30,** plus 12 god's favour cards, in five families: stats, sustain, nerve, skill and pantheon.
  Rarity rises with party level; pantheon and skill cards only show for parties that can use
  them, so every offer feels made for this party.
- **Levels 3 and 6 stay the tier-ups** (path pick at 3, tier 3 art at 6). Levels 7 and 8 are
  the late game: a **god's favour** card, one per party per run.
- **Lairs grow on a staggered clock** and get **elites** at tier 2; monster stats at tier 3
  rise to x1.65 (today x1.3) to keep pace with skills and gear.
- **One run curve** with five beats and a Sim bot check for each, so balance has targets
  beyond "win rate and length".

## 1. Party levels

| Level | XP to reach (45n, Balance 2026-10-14) | Total | Unlocks                                     | Target time (best party) |
| ----- | ------------------------------------- | ----- | ------------------------------------------- | ------------------------ |
| 1     | 0                                     | 0     | arrives; level-1 parties merge (today)      | 0:30-2:00                |
| 2     | 45                                    | 45    | card                                        | 2:00-3:30                |
| 3     | 90                                    | 135   | card, tier 2: path pick and signature skill | 4:00-6:00                |
| 4     | 135                                   | 270   | card                                        | 6:00-8:00                |
| 5     | 180                                   | 450   | card                                        | 8:00-10:00               |
| 6     | 225                                   | 675   | card, tier 3: skill upgrade, new art        | 11:00-14:00              |
| 7     | 270                                   | 945   | god's favour card                           | 14:00-17:00              |
| 8     | 315                                   | 1260  | card (rare or better); the cap              | rare, a great run        |

- **XP** comes from kills and lairs as today (`MonsterDef.xp`, `lairXp`, times the lair tier's
  `rewardMult`). Every member gets the whole amount (shared, not split).
- **Late recruits** (decided 2026-10-13): a new hero may join a party of level 2 or lower
  with a free slot when they meet. It takes the party's cards at once. From level 3 on, a party
  is closed (today: closed from level 2).
- **Knocked out members** still share XP from kills made while they are down: a party is one
  unit of progress.

## 2. Upgrade cards

### Offer rules

1. A level-up offers 3 different cards, as today; the party picks one at once by the
   trait-weighted rule in `level-ups.md` (section 3). The player only picks paths.
2. **Rarity** by party level: level 2-3 common 70 / rare 30; level 4-5 common 50 / rare 40 /
   epic 10; level 6+ common 30 / rare 50 / epic 20.
3. **Fitted:** at least one card in each offer is a pantheon card of a pantheon in the party, or
   a skill card of a path in the party, when one is eligible.
4. **Stacking:** stat cards stack up to 3 times; every other card once per party.
5. **Requirement** per card (a god, path, pantheon, template or tier in the party); a card
   whose requirement fails is never offered.
6. **Level 7:** the offer is the god's favour cards of the gods in the party (or 3 epics if
   fewer than 3 gods).

### Families

| Family   | Does                                               | Count |
| -------- | -------------------------------------------------- | ----- |
| stats    | attributes for the whole party                     | 8     |
| sustain  | healing, potions, resting                          | 5     |
| nerve    | flee threshold, bonds, morale                      | 4     |
| skill    | changes the signature skills of the party's paths  | 4     |
| pantheon | boons in the pantheon's theme, need a member of it | 9     |
| favour   | level 7, one per god in the party                  | 12    |

### The pool (today's 9 marked "kept")

| Id             | Name             | Family   | Rarity | Needs    | Effect                                                          |
| -------------- | ---------------- | -------- | ------ | -------- | --------------------------------------------------------------- |
| iron-arms      | Iron Arms        | stats    | common |          | +2 Str (kept)                                                   |
| thick-hide     | Thick Hide       | stats    | common |          | +2 Sta (kept)                                                   |
| quick-feet     | Quick Feet       | stats    | common |          | +2 Dex (kept)                                                   |
| hawk-eyes      | Hawk Eyes        | stats    | common |          | +3 Per (kept)                                                   |
| iron-will      | Iron Will        | stats    | common |          | +2 Wp, +1 Sta (kept)                                            |
| battle-hymn    | Battle Hymn      | stats    | common |          | +1 Str, +1 Dex (kept)                                           |
| keen-mind      | Keen Mind        | stats    | common | a caster | +2 Int                                                          |
| giants-blood   | Giant's Blood    | stats    | rare   |          | +2 Str, +2 Sta, -1 Dex                                          |
| second-wind    | Second Wind      | sustain  | common |          | heal the party to full now (kept)                               |
| field-dressing | Field Dressing   | sustain  | common |          | rest 50% faster                                                 |
| deep-pockets   | Deep Pockets     | sustain  | rare   |          | +1 potion slot each                                             |
| mending-bond   | Mending Bond     | sustain  | rare   | a healer | heals also touch the most hurt second ally for 50%              |
| last-stand     | Last Stand       | sustain  | epic   |          | once per fight, a member at 0 hp stays up at 1 hp for 3 s       |
| odins-eye      | Odin's Eye       | nerve    | common |          | heal 50% now; flee at 15% (kept)                                |
| berserker      | Berserker        | nerve    | rare   |          | +3 Str, never flee (kept)                                       |
| oath-brothers  | Oath-Brothers    | nerve    | common |          | bonds grow twice as fast; a loyal member never flees alone (M3) |
| bounty-hunters | Bounty Hunters   | nerve    | common |          | bounty flags look 50% richer to this party (M3)                 |
| tight-purse    | Tight Purse      | nerve    | common |          | knocked-out members lose half as much gold                      |
| wolf-blood     | Wolf Blood       | nerve    | common |          | +25% damage while below 30% hp                                  |
| quick-hands    | Quick Hands      | skill    | rare   | tier 2   | signature skill cooldowns -20%                                  |
| wide-reach     | Wide Reach       | skill    | rare   | tier 2   | skill radius and range +25%                                     |
| twin-cast      | Twin Cast        | skill    | epic   | tier 2   | 25% chance a skill casts twice                                  |
| opening-gambit | Opening Gambit   | skill    | common | tier 2   | skills start every fight ready                                  |
| berserkergang  | Berserkergang    | pantheon | rare   | Aesir    | +20% damage below 50% hp                                        |
| fimbulwinter   | Fimbulwinter     | pantheon | epic   | Aesir    | basic strikes carry the chill rider                             |
| einherjar      | Einherjar        | pantheon | common | Aesir    | knocked out members wake 50% faster, at 50% hp                  |
| phalanx        | Phalanx          | pantheon | common | Greek    | +3 armour while 3 members stand within 100                      |
| kleos          | Kleos            | pantheon | rare   | Greek    | +50% gold from flags and lairs; a kill shout per kill           |
| metis          | Metis            | pantheon | epic   | Greek    | +10% crit; crits stagger                                        |
| scarab         | Scarab           | pantheon | common | Egyptian | heal 3% max hp per kill                                         |
| book-of-dead   | Book of the Dead | pantheon | rare   | Egyptian | death chances -10 points (boss), -5 (lair); +25% vs undead      |
| eye-of-ra      | Eye of Ra        | pantheon | epic   | Egyptian | every 4th strike is holy and carries sear                       |

Favour cards (level 7, one per god, epic): a stronger form of the god's passive for the
whole party (Odin: the party always wins first strike and sees through fog; Thor: +50% against
giants and bosses; and so on, written with the passives in `paths-and-skills.md`).
Lead writes them as data once the passives are in.

### As built (Sim, `sim/everynth2` f3423e7)

- **Card keys:** every card in the pool is a set of keys Sim implements once
  (`paths-and-skills.md` section 7, the key table and the notes under it).
- **Eye of Ra:** an `everyNth` with `strike` makes every 4th basic strike holy with sear. A
  killing 4th strike spends it.
- **Switches** (Balance's numbers): `tuning.party.joinBelowLevel` 3 and
  `building.hallJoinBelowLevel` 5 (who may join a party late), `tuning.town.buildMs` (a build
  or upgrade scaffold, default 0), `tuning.ai.discovery` (off).

## 3. Lairs and monster tiers

### Clock

- **Staggered:** each lair site has its own first tier-up time, so the map does not jump all
  at once. Proposed: the near lair at 6:00, the next at 8:00, the final lair at 10:00, then
  every 7 minutes after (in data: `firstTierUpMs` 6:00, `tierUpStaggerMs` 2:00, `tierUpEveryMs`
  7:00, Balance 2026-10-14).
- **Pressure:** a lair that knocks out 6 heroes tiers up early (the map punishes losing).
- **Cap** tier 3, as today. A cleared lair is gone.

### Numbers (`tuning.lair`)

| Key         | Today        | Proposed      | Why                                                           |
| ----------- | ------------ | ------------- | ------------------------------------------------------------- |
| statMult    | 1, 1.15, 1.3 | 1, 1.3, 1.65  | heroes gain skills, cards and gear (about x2 power at tier 3) |
| hpMult      | 1, 1.25, 1.5 | 1, 1.3, 1.65  | same pace as stats                                            |
| rewardMult  | 1, 1.5, 2    | 1, 1.6, 2.4   | keeps XP to level 6 on time                                   |
| spawnMult   | 1, 0.85, 0.7 | unchanged     |                                                               |
| maxAliveAdd | 0, 1, 1      | 0, 1, 2       |                                                               |
| eliteShare  | none         | 0, 0.25, 0.35 | share of spawns that are elites                               |

### Elites (new)

- An elite is a normal monster row with x1.5 hp, x1.2 Str, a gold shimmer on top of its tier
  colour and double bounty and XP.
- From tier 3 an elite also has one monster skill (monsters spec, later: troll regeneration,
  draugr frost breath).
- Scene: tier colour as today (green, yellow, red) plus a gold edge for elites.

## 4. The run curve

| Beat | Time        | What the player sees                                       | Sim bot check (median)      |
| ---- | ----------- | ---------------------------------------------------------- | --------------------------- |
| 10   | 0:00-3:00   | build temples and a shop, first heroes, first parties form | first party formed < 1:30   |
| 20   | 3:00-7:00   | first fights at the near lair, first path pick, first raid | first tier 2 at 4:00-6:00   |
| 30   | 7:00-12:00  | lairs at tier 2, elites, shop tier 2, the near lair falls  | first lair falls 7:00-11:00 |
| 40   | 12:00-16:00 | tier 3 heroes, tier 3 lairs, the boss emerges              | first tier 3 at 11:00-14:00 |
| 50   | 15:00-20:00 | the boss fight; win or the town hall falls                 | run 15-18 min, wins 55-75%  |

The bot reports these times (new run stats), so a balance pass can see which beat is off.

## 5. What the player sees

- **XP bar** under each party banner (thin, party colour).
- **The picked card** rises over the party banner (`level-ups.md`) with its rarity frame
  colour (iron, bronze, gold) and family icon; a pantheon card shows the pantheon sigil.
- **Lair tier-up** keeps today's event; Scene adds a short roar and the new colour (no screen
  shake, decision 2026-10-14).
- **Elites** have a gold edge and a bigger health bar.

## 6. Proposed data rows

| Row          | Change                                                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UpgradeDef   | `family`, `rarity`, `needs` ({ god, path, pantheon, template, tier }), `stack`; effect keys from combat and skills (`crit`, `armour`, `restMult`, `potionSlots`, `cooldownMult`, `rangeMult`, `rider`, `vsTag`, `koMult`) |
| tuning.party | `maxLevel` 8, `joinBelowLevel` 3, `rarity` weights by level band                                                                                                                                                          |
| tuning.lair  | `firstTierUpMs` per lair site, `tierUpEveryMs` 420000, `pressureKos` 6, `eliteShare`, new mults above                                                                                                                     |
| LairSite     | `firstTierUpMs` (optional; else the tuning default)                                                                                                                                                                       |
| MonsterDef   | `elite`: { hpMult 1.5, strMult 1.2, rewardMult 2 } defaults in tuning                                                                                                                                                     |

## 7. Proposed backlog rows

### Sim

| Order | Row                                                                               |
| ----- | --------------------------------------------------------------------------------- |
| 10    | Card offers: families, rarity by level, needs, fitted rule, stacking, level cap 8 |
| 20    | New card effects (combat and skill keys above)                                    |
| 30    | Late recruits join parties below level 3; party cards apply on join               |
| 40    | Lair clock: staggered first tier-up, pressure tier-up, new mults                  |
| 50    | Elites: share by lair tier, stat and reward mults, `elite` flag in the snapshot   |
| 60    | Run stats for the curve: first party, first tier 2, first lair fall, first tier 3 |

### Scene

| Order | Row                                                         |
| ----- | ----------------------------------------------------------- |
| 10    | Party XP bar under the banner                               |
| 20    | Card rarity frames and family icons on the picked card      |
| 30    | Elite look: gold edge, bigger health bar; lair tier-up roar |

### Art

| Order | Row                                                                                  |
| ----- | ------------------------------------------------------------------------------------ |
| 10    | Card frames (iron, bronze, gold) and 5 family icons, 3 pantheon sigils, UI kit style |

### Lead

| Order | Row                                                                                |
| ----- | ---------------------------------------------------------------------------------- |
| 10    | Data: the 30 cards (the 12 favour cards after the passives), lair and elite tuning |
| 20    | Balance pass against the five beats                                                |

## Decided (Stefan, 2026-10-13)

1. **Level cap 8** with a god's favour at level 7.
2. **Late recruits** join parties below level 3.
3. **Pressure tier-up:** kept (6 knockouts).
4. **Elites** from lair tier 2.
