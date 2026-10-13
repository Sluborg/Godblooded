# Pacing review: the first 10 minutes (and the run)

Design owns this page (Lead row Design 260). It measures when the run's beats land today with
the headless bot and compares them with the targets in `progression.md` section 4 and
`content-roadmap.md` section 2, then proposes tuning targets for Balance.

## Bottom line

- **The early game runs fast, the end runs long.** Heroes reach tier 2 at 3.5 min (target
  4-6) and tier 3 at 8.8 min (target 11-14), and the boss emerges at about 9 min (target 12-16);
  yet the median run lasts 20 min (target 15-18) with a wide spread, and wins are 52% (target
  55-75%).
- **Fix the order, not just the speed:** slow the level curve by about a third, seal the boss
  lair until the late game, and stagger the lair clock as the spec says. Then re-measure once
  the Aesir skills, items and cards are switched on (`m2-plan.md`): they add power and will move
  every number.
- **Good already:** the first party forms in under 1:30, the longest quiet stretch is about 17 s
  (target under 60 s), and the first lair falls inside its window.

## 1. How it was measured

- `main` at `bf2b589` (2026-10-14), the bot of `scripts/sim/run.mjs` (builds temple, market,
  shrine, tower; buys tiers; one 50 gold flag on the nearest lair; first path), 100 runs from
  seed 1 and 40 from seed 1001, 35 min cap.
- A small probe records the time of the first event of each kind per run (`arrived`,
  `partyFormed`, `levelUp`, `tierUp`, `raid`, `lairTierUp`, `lairDestroyed`, `knockout`,
  `bossEmerged`) and the longest gap without a hit, level-up, raid, lair fall or tier-up.
- **No skill, passive, item or card rows are in the data yet**, so this is the bare game.

## 2. Results (minutes; median, with the middle half)

| Beat                | Seed 1 (100 runs)       | Seed 1001 (40 runs) | Target                          | Verdict           |
| ------------------- | ----------------------- | ------------------- | ------------------------------- | ----------------- |
| First hero          | 0.1                     | 0.1                 | right after the temple          | ok                |
| First party         | 0.9 (0.8-1.3)           | 1.2 (0.8-1.6)       | under 1:30                      | ok                |
| First party level 2 | 2.2 (1.7-2.7)           | 2.1 (1.5-2.6)       | 2:00-3:30                       | ok, early edge    |
| First tier 2        | 3.5 (2.8-4.1)           | 2.9 (2.4-3.6)       | 4:00-6:00                       | **early**         |
| First knockout      | 2.7 (1.9-5.1)           | 2.8 (1.8-5.3)       | (none)                          | fine              |
| First raid          | 7.0                     | 7.0                 | 5:00-6:00 (decision 2026-10-04) | **late**          |
| First lair falls    | 6.9 (5.6-10.2)          | 6.4 (5.4-7.4)       | 7:00-11:00                      | ok, early edge    |
| First lair tier-up  | 8.0 (all lairs at once) | 8.0                 | 6, 8, 10 by distance            | **not staggered** |
| First tier 3        | 8.8 (7.8-10.4)          | 8.5 (7.4-10.1)      | 11:00-14:00                     | **early**         |
| Boss emerges        | 9.1 (5.7-14.3)          | 8.6 (7.2-11.9)      | 12:00-16:00 (beat 40)           | **early**         |
| Run ends            | 20.1 (14.5-26.1)        | 17.0 (11.9-22.2)    | 15-18                           | **long and wide** |
| Longest quiet gap   | 17 s (13-20)            | 17 s (14-22)        | under 60 s                      | ok                |
| Wins                | 52%                     | 53%                 | 55-75%                          | low               |

**Reading it:** heroes grow fast and find the boss early (it emerges when its lair drops to
75%), then the boss fight drags or fails, and runs either end early in a loss or late after
retries. The early beats come too close together; the late beats spread out.

## 3. Proposed tuning targets (for Balance)

| Order | Change                                                                                                                                                                                                                                                                      | Why                                               | Expected                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| 10    | Level curve 30n to **40n** XP (`tuning.party.xpPerLevel` 40)                                                                                                                                                                                                                | tier 2 and 3 a third later                        | tier 2 at about 4.5, tier 3 at about 11.5 |
| 20    | **Seal the boss lair** until 12:00 or until 2 other lairs have fallen (Sim: heroes do not score it, bounties on it wait)                                                                                                                                                    | the boss is the finale, not a 9 min detour        | boss at 12-15                             |
| 30    | **Stagger the lair clock** as `progression.md` says: first tier-up 6:00 / 8:00 / 10:00 by distance (`tuning.lair` `firstTierUpMs` 360000, `tierUpStaggerMs` 120000, `tierUpEveryMs` 420000; Sim 340 shipped the rule, both are 0 today so every lair uses the 8:00 default) | spread the pressure                               | tier-ups at 6, 8, 10                      |
| 40    | First raid at **6:00** (`raidFirstMs` 360000), then every 3:00 as today                                                                                                                                                                                                     | the decision's 5-6 min; fills the 4-7 min stretch | first raid at 6                           |
| 50    | Re-measure after rows 10-40 **and** after the Aesir data is on (skills, passives, items, cards)                                                                                                                                                                             | those add hero power; tune wins last              | wins 55-75%, runs 15-18                   |
| 60    | Only then touch win rate: lair hp or boss hp, not the curve again                                                                                                                                                                                                           | one lever at a time                               |                                           |

- **First-run tuning** (`onboarding.md` section 4: raid at 8:00, lair tier-ups +2 min) stays on
  top of these numbers.
- **Run length spread:** if runs still spread past 22 min after row 50, look at boss retries
  (a lost boss fight lets the boss heal); a separate row then.

## 4. Proposed backlog rows

| Role    | Order | Row                                                                                                                                     |
| ------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Balance | 10    | `xpPerLevel` 40, `raidFirstMs` 360000, the lair clock keys of section 3 row 30                                                          |
| Sim     | 10    | Boss lair sealed until `bossUnsealMs` (720000) or `bossUnsealLairs` (2) lairs have fallen                                               |
| Sim     | 20    | Run stats for the beats (first party, tier 2, raid, lair fall, tier 3, boss) in `RunReport`, printed by `npm run sim` (part of Sim 450) |
| Balance | 20    | Re-measure with the bot after the Aesir data lands; then win-rate tuning                                                                |
