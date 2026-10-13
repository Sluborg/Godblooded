# M2 fun check (3 short runs, phone)

For Stefan, when M2 "Aesir, alive" is live (`docs/systems/m2-plan.md`, step 9). Design owns it
(Lead row: the M2 fun check script). It checks the fun gate in `m2-plan.md` section 4. Three
runs, about 25 minutes in all; then one chat message to Lead.

## Bottom line

- **Run 1, Watch (8 min, 1x):** follow the hints, build, place no bounties. Is it fun to watch?
- **Run 2, Steer (8 min, 1x):** bounties all the time, read every level-up. Do you steer?
- **Run 3, To the end (4x after minute 3):** play until you win or fall. Does it hold up late?
- **After:** answer 6 questions, send 2 screenshots (run 3's end screen, and one moment you liked).
- **We read alongside:** the end screen, plus a bot run of the same build (section 4).

## Before you start

- Phone in landscape, sound on, https://sluborg.github.io/Godblooded/ (reload once to get the
  newest build).
- Each run is a new run from the Title. Keep this page closed while you play.

## 1. Run 1: Watch (8 minutes, 1x)

| Min | Do                                                     | Notice                                            |
| --- | ------------------------------------------------------ | ------------------------------------------------- |
| 0-3 | Follow the hints only. Build what they suggest.        | Do the hints help or get in the way?              |
| 3-6 | No bounties. Tap a hero now and then (shows its party) | Can you tell heroes apart, by look and by manner? |
| 6-8 | Hands off. Just watch.                                 | Any stretch where nothing happens?                |

Then Pause, Quit to title.

## 2. Run 2: Steer (8 minutes, 1x)

| Min | Do                                                | Notice                                  |
| --- | ------------------------------------------------- | --------------------------------------- |
| 0-3 | Build fast. Place a bounty as soon as you can.    | Who goes for it, and can you guess why? |
| 3-6 | A bounty every minute, on monsters and on a lair. | Does a bounty change who goes where?    |
| 6-8 | At every level-up, read the cards before picking. | Is the choice hard in a good way?       |

Then Pause, Quit to title.

## 3. Run 3: To the end (4x after minute 3)

| Min   | Do                                                   | Notice                                                                     |
| ----- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| 0-3   | 1x. Build as you like.                               |                                                                            |
| 3-end | Speed 4x. Play as you like; slow down when it's busy | Raid warnings: time to react? Skills and damage colours readable at speed? |
| End   | Screenshot the end screen.                           | Does the MVP match the hero you remember?                                  |

## 4. Questions (one message to Lead, a word or a line each)

1. **Fun to watch,** 1 to 5, for each run?
2. **Name one hero** and one thing it did.
3. **Steering:** did a bounty ever change what a party did? Yes, no, sometimes.
4. **Quiet:** any minute where nothing happened? Which run, which minute?
5. **Readability:** could you see skills, damage colours and gear on the phone? What could you not read?
6. **One thing** you want more of, and one to cut.

## 5. What we read alongside (Design and Lead, not Stefan)

| Fun gate (`m2-plan.md` 4)            | Stefan's answer | Number we read                                                       |
| ------------------------------------ | --------------- | -------------------------------------------------------------------- |
| A skill in 60%+ of fights after 6:00 | 5               | share of fights with a cast (run stats, Sim row 150)                 |
| A decision every minute              | 1, 4            | decisions per minute (run stats, row 150)                            |
| No 60 s quiet                        | 4               | longest quiet gap (row 150; bot `maxQuietS` until then)              |
| 2+ damage types after tier 2         | 5               | share of fights with 2+ types (row 150)                              |
| Gear level 1+ by 8:00                | 5               | average gear level at 8:00 (Design adds it to the pacing probe)      |
| A hero to remember                   | 2               | run 3 end screen: MVP, kills, lairs, KOs per hero                    |
| Bounties steer                       | 3               | parties that turn toward a flag (Design adds it to the pacing probe) |

- **The bot:** Design runs its pacing probe (it plays like `scripts/sim/run.mjs`) on the same build, 100 seeds, and reports
  first-event times (party, level 2, tier 2, raid, lair fall, boss), run length, win rate and the
  longest quiet gap next to Stefan's answers (as in `docs/systems/pacing-review.md`).
- **Run 3's end screen:** run time, win or fall, the hero table and the gold curve.
- **If "a hero to remember" or "bounties steer" fails,** M3 waits and Design proposes the fix
  (`m2-plan.md` section 4).

Lead turns the answers into backlog rows; Design changes the specs the answers move.
