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

## 5. Re-measure on main 668fcc3 (2026-10-14, row 50)

All of section 3 is in the data, plus the Aesir skills, passives, items and cards (#235). Raids after a lair tier-up are **off** in
this measurement (`raidOnTierUp` false on main); section 5 is re-run once Balance's retune turns
them on. Same probe, 100 seeds, two bot variants: A places one 50 gold flag
on the nearest lair when gold is over 150 (as before); B places a 40 gold flag 150 from a hero
once a minute when gold is 60 or more (to measure steering).

| Event                      | Target     | A (median, middle half) | B                |
| -------------------------- | ---------- | ----------------------- | ---------------- |
| First party                |            | 1.1 (0.8-1.3)           | 1.1              |
| Party level 2              |            | 2.3 (1.8-2.7)           | 2.4              |
| Tier 2                     | 4-6        | 3.4 (2.7-4.1)           | 3.4              |
| First raid                 | 6          | 6.0                     | 6.0              |
| First lair tier-up         | 6          | 6.0                     | 6.0              |
| First lair falls           | 7-11       | 7.0 (5.6-9.1)           | 6.6              |
| Tier 3                     | 11-14      | 8.4 (7.5-9.9)           | 8.4              |
| Boss emerges               | 12-15      | 13.9 (11.3-17.1)        | 13.9             |
| Run ends                   | 15-18      | 17.0 (14.4-20.3)        | 15.7 (11.3-19.0) |
| Wins                       | 55-75%     | 66%                     | 56%              |
| Longest quiet stretch      | under 60 s | 17.6 s                  | 16.7 s           |
| Average gear level at 8:00 | 1 or more  | 0.1                     | 0.1              |
| Flags placed per run       |            |                         | 4 (2-6)          |
| Flags a party turns to     |            |                         | 50% (30-70%)     |
| Time until a party turns   |            |                         | 21 s (5-64)      |

- **Pacing is on target** except tier 2 and tier 3, which still come about 1 and 3 minutes
  early even with the 40n curve: the Aesir passives and skills add the XP the curve took away.
  Boss, raids, lair clock and run length land where section 3 aimed.
- **Gear fails the fun gate** (`m2-plan.md` 4: average gear level 1+ by 8:00). At 8:00 most
  heroes carry potions and level 0 weapon and armour: in a sample run 2 of 7 heroes had any.
  Not yet traced: likely the shopping order (potions first) or the smithy's level 1 price against a hero's purse.
- **Town gold is tight in the first 5 minutes:** with the build order done, the town holds
  about 50 to 140 gold between 3:00 and 5:00, so a 40 gold flag is a real choice but the
  player cannot place one every minute. B wins 56% against A's 66%; at n = 100 on one seed set (about ±5 points) that hints flags cost wins, it does not measure it.
- **Flags do steer, slowly:** half the flags get a party turning to them, the median after
  21 s; a flag on a lair reads as a lair goal (intent `lair`), not a flag.

### Proposals (for Balance and Sim)

| Order | Change                                                                                                                                                                                                   | Why                                         | Expected                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------- |
| 70    | Smithy level 1 weapon and armour cheaper, or heroes buy a weapon before a second potion (shopping order, `items-and-shops.md` 3); Sim traces first why heroes skip the smithy (owner: Sim, then Balance) | the gear gate                               | gear 1+ at 8:00                 |
| 80    | `xpPerLevel` 45 or a slower lair XP (`rewardMult` tier 1)                                                                                                                                                | tier 2 at 4-6 and tier 3 at 11-14           | tier 2 about 4, tier 3 about 10 |
| 90    | Start gold or early tax a little up (about +60 by 3:00), or a cheaper smallest flag (25)                                                                                                                 | a flag a minute must be affordable          | 6+ flags a run                  |
| 100   | Sim: `turnsPerFlag` and gear at 8:00 in `RunReport` (Sim row 150 run stats)                                                                                                                              | so the bot prints these, not Design's probe |                                 |

### Balance's answer (branch `balance/roles-raids`, 2026-10-14)

Level 1 weapon and armour 20 gold, start gold 480, `xpPerLevel` 45, raids every 3:30 growing
every 400 s, tier-up raids on (1 raider on every 2nd tier-up), wyrm nest 6000 hp, Snatch 2
gold. Balance's bot: 69-73% wins, median run 16-17 min, gear at 8:00 weapon 0.4 and armour
0.3 (up from about 0.1, still under the gate's 1). Design re-runs this section on that data
once it lands.

- **Gate redefined** (Lead, 2026-10-14): the gear gate is now "at least 80% of heroes alive at 8:00 (knocked-out ones count, slain ones do not) own a gear piece", not an average level of 1. Design's next re-run reports that share.

### Balance's second pass (branch `balance/gear-first-retune`, 2026-10-14)

`taxRate` 0.5, raids every 3:00, a one-raider raid on every lair tier-up, wyrm nest back to
8000 hp. Balance's bot: 68-69% wins, median run 15.6 min, boss out at 12.4-13.0, 88% of heroes
geared at 8:00 (the gate is 80%).

## 6. Re-measure on main 44bfefe (2026-10-14, after both Balance passes)

Probe variant B (a 40 gold flag 150 from a hero once a minute when gold allows), 100 seeds,
tier-up raids on.

| Event                            | Target     | Median (middle half) |
| -------------------------------- | ---------- | -------------------- |
| Tier 2                           | 4-6        | 3.6 (2.9-4.6)        |
| First raid                       | 6          | 6.0                  |
| First lair falls                 | 7-11       | 6.3 (5.2-7.6)        |
| Tier 3                           | 11-14      | 9.3 (7.7-10.5)       |
| Boss emerges                     | 12-15      | 13.4 (11.2-15.6)     |
| Run ends                         | 15-18      | 15.9 (12.9-18.4)     |
| Wins                             | 55-75%     | 63%                  |
| Longest quiet stretch            | under 60 s | 18.6 s               |
| Heroes with a gear piece at 8:00 | 80%+       | 100% (90-100%)       |
| Flags placed per run             |            | 5 (3-7)              |
| Flags a party turns to           |            | 50% (30-70%)         |
| Time until a party turns         |            | 27 s (7-66)          |

- **The gear gate passes** (100% median, 90% at the lower quarter) and wins, run length, boss
  and quiet stretches sit inside their targets, with a bot that spends on flags.
- **Still early:** the first lair fall (6.3, window 7-11) is the earliest miss and pulls tier 3
  forward; tier 2 (3.6) and tier 3 (9.3) also come a little before their windows. Not a fun
  gate; Stefan's playtest decides whether it matters.
- **Steering is the open fun-gate item.** The flags above sit 150 from a hero, and most claims
  are walk-overs. A flag on a monster 350-900 from the nearest hero (how a player uses it):
  at 50 gold almost no hero heads for it, at 100 gold one heads there after a median 115 s and
  half are never claimed, at 200 gold heroes head there at once but rarely claim it. Causes in
  `src/sim/heroes.ts`: the claim needs no monster within 250, each monster near the flag needs
  15 gold more for the flag to be worth it (plain exploring is worth 20), and goals hold 6 s. Proposals went to Lead
  (2026-10-14): a hunt bounty that follows its monster and pays the killer, a re-score on
  placement with a visible "considering" beat, then a Balance pass. Stefan's run 2 ("Steer")
  judges the result.

## 7. Flags after hunt bounties (main 845b1c5, 2026-10-14)

Sim's hunt bounties and fresh-flag re-scoring (`hero-ai.md` 5b, parts 1 and 2) are in;
Balance's part 3 (danger cost) is not yet. One flag at a time on a monster 350-900 from the
nearest hero, 60 seeds each; "heading" means a hero's snapshot `bounty` is that flag.

Shares are of the runs that placed a flag (one or two flags a run).

| Flag gold | A hero heads for it            | It gets paid                   | Before 5b (section 6)                |
| --------- | ------------------------------ | ------------------------------ | ------------------------------------ |
| 50        | in 18 of 56 runs, median 126 s | in 46 of 56 runs, median 358 s | heading almost never, paid by chance |
| 100       | in 40 of 48 runs, median 55 s  | in 40 of 48 runs, median 167 s | heading after 115 s, half paid       |

- **Hunt flags now pay, but a 50 gold flag pays without steering:** explorers run into the
  monster and kill it, and the flag follows it, so the bounty is no longer wasted; that is not
  the player steering anyone.
- **Responsiveness is not there yet:** the spec's target (a party heading within 5 s, paid 70%+)
  is met for payment but not for heading. A 50 gold flag still loses to exploring until
  Balance's part 3 lowers the danger cost; a 100 gold flag draws a party after about a minute.
- **The base pacing holds** with the flag bot (100 seeds, flags 150 from a hero): wins 68%,
  run 15.9 min, boss 13.0, gear gate 100% median.
