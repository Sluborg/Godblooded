# Hint texts

Design owns this spec. Lead turns the rows into `HintDef` data (`onboarding.md`, section 6).
This is the final English text for every hint: the 10 beats of the first 3 minutes, the
first-time hints, and the few fixed lines around them.

## Bottom line

- **Plain hints, no narrator** (Stefan, 2026-10-13): short, clear sentences in a hint bubble.
  They say what happened and what the player can do. No Skald, no portrait.
- **33 lines in all:** 10 beats (1 for the tax collector's tills), 18 first-time hints (10 from
  `onboarding.md`, 5 for M2 features: skills, gear, potions, fleeing, quarrels, 1 for
  permadeath, 1 for hunt flags and 1 for a fallen tax collector), 5 fixed lines.
- **Phone-sized:** at most 2 lines of at most 40 characters each, broken by hand (the `line 1`
  and `line 2` columns), so the bubble never wraps on its own at 26 px.
- **Milestone tag** on each row: M2 rows ship with "Aesir, alive" (`content-roadmap.md`); M3
  rows wait for their feature.

## 1. Rules for writing more lines

1. At most 2 lines, each at most 40 characters including spaces and punctuation.
2. Line 1 says what happened; line 2 (optional) says what the player can do or watch.
3. Plain words. "Tap" and the names of game things (temple, bounty, party) are fine; avoid
   jargon (HUD, UI, click).
4. No exclamation marks; no long dashes.
5. No hero is ever told what to do. Hints talk to the player about the heroes.

## 2. The first 3 minutes (beats)

| Order | Id        | Trigger                      | Points at      | M   | Line 1                            | Line 2                                |
| ----- | --------- | ---------------------------- | -------------- | --- | --------------------------------- | ------------------------------------- |
| 10    | b-temple  | run start (clock stopped)    | a free plot    | M2  | Build a temple on a free plot.    | Heroes come to temples, not to you.   |
| 20    | b-aesir   | build menu open              | temple button  | M2  | Tap the Aesir temple to see it,   | then tap it again to build.           |
| 30    | b-arrive  | first `arrived`              | the hero       | M2  | A hero has arrived.               | Heroes act on their own.              |
| 40    | b-gold    | 10 s after beat 30           | none           | M2  | You can't command heroes.         | Gold and bounties guide them.         |
| 50    | b-market  | 10 s after beat 40           | a free plot    | M2  | Heroes spend their gold in shops. | Build a market: the town takes a tax. |
| 55    | b-till    | first till reaches 10        | that building  | M2  | Gold builds up in your buildings. | The tax collector brings it home.     |
| 60    | b-bounty  | first monster seen by a hero | the monster    | M2  | Tap a monster to place a bounty.  |                                       |
| 70    | b-watch   | first `bountyPlaced`         | the flag       | M2  | Heroes pick bounties by trait.    | The greedy run, cowards wait.         |
| 80    | b-party   | first `partyFormed`          | a party member | M2  | Heroes have formed a party.       | Tap a hero to see it.                 |
| 90    | b-levelup | first `upgradePicked`        | the party      | M2  | The party levelled up             | and chose its own upgrade.            |

## 3. First-time hints

| Order | Id          | Trigger (Sim event)                                                                               | Points at       | M   | Line 1                           | Line 2                                |
| ----- | ----------- | ------------------------------------------------------------------------------------------------- | --------------- | --- | -------------------------------- | ------------------------------------- |
| 10    | h-raid      | first `raidWarning` (today: `raid`)                                                               | the arrow       | M2  | Raiders are coming.              | The arrow shows where from.           |
| 20    | h-ko        | first `knockout`                                                                                  | the downed hero | M2  | Knocked out, not dead.           | Heroes wake up at the town hall.      |
| 30    | h-path      | first `pathOffer`                                                                                 | the cards       | M2  | Pick a path for this hero.       | Each god offers two.                  |
| 40    | h-tier      | first `tierUp` to tier 2                                                                          | the hero        | M2  | This hero reached tier 2.        | New look, new skill.                  |
| 50    | h-skill     | first skill `cast`                                                                                | the caster      | M2  | A hero used a skill.             | Skills come with the hero's path.     |
| 60    | h-gear      | first `shopped` of a weapon or armour                                                             | the hero        | M2  | Heroes buy gear at the smithy.   | The town gets a share.                |
| 70    | h-potion    | first potion drunk                                                                                | the hero        | M2  | A hero drank a potion.           | The market sells them.                |
| 80    | h-flee      | first `fled`                                                                                      | the hero        | M2  | Hurt heroes flee to town.        | Cowards flee first.                   |
| 90    | h-argue     | first `argue`                                                                                     | the two heroes  | M2  | Heroes can fall out.             | Rivals won't share a party.           |
| 100   | h-upgrade   | first time gold covers an upgrade                                                                 | a building      | M2  | You can upgrade buildings.       | Tap one to see the cost.              |
| 110   | h-lair      | first `lairTierUp`                                                                                | the lair        | M2  | A lair grew stronger.            | So did its monsters.                  |
| 120   | h-boss      | the boss emerges                                                                                  | the boss        | M2  | The boss has emerged.            | Slay it to win the run.               |
| 125   | h-collector | first `collectorFell` (`tax-collector.md`)                                                        | the pile        | M2  | Your tax collector has fallen.   | The gold lies where it fell.          |
| 130   | h-slain     | first `slain`                                                                                     | the grave       | M2  | A hero has died.                 | Bosses and tier 3 lairs can kill.     |
| 135   | h-hunt      | first `bountyPlaced` with a `target` (hunt flag, `hero-ai.md` 5b; Sim puts `target` on the event) | the flag        | M2  | This bounty follows its monster. | The hero who kills it gets the gold.  |
| 140   | h-ruin      | first `buildingDestroyed`                                                                         | the ruin        | M3  | A building was destroyed.        | Tap the ruin to rebuild at half cost. |
| 150   | h-omen      | first `omen`                                                                                      | the banner      | M3  | An omen: something is coming.    | Watch the banner.                     |
| 160   | h-favour    | first full favour bar                                                                             | the favour bar  | M3  | A god's favour is full.          | The god acts when heroes need it.     |

## 4. Fixed lines

| Id             | Where                         | M   | Line 1                       | Line 2 |
| -------------- | ----------------------------- | --- | ---------------------------- | ------ |
| f-firstrun-end | end screen of the first run   | M2  | The next run will be harder. |        |
| f-won          | end screen, won (under title) | M2  | The boss is slain.           |        |
| f-lost         | end screen, lost              | M2  | The town hall has fallen.    |        |
| f-hints-label  | Settings row                  | M2  | Hints                        |        |
| f-hints-again  | Settings button               | M2  | Show hints again             |        |

## 5. Checks before shipping (Lead or Scene)

- Every line at most 40 characters; a unit test over the hint rows can enforce it.
- Every trigger exists as a Sim event or a Scene condition.
- **The hint engine filters by milestone, not by event absence:** a row shows only when its
  milestone is at or below the game's current milestone (a data constant). `h-ruin` needs
  this: `buildingDestroyed` already fires in M2, before ruins exist.
- Read each line once in the bubble on a phone: it must fit without wrapping.

## 6. Proposed backlog rows

| Role  | Order | Row                                                               |
| ----- | ----- | ----------------------------------------------------------------- |
| Lead  | 10    | HintDef rows from sections 2 to 4 (`line1`, `line2`, `milestone`) |
| Scene | 10    | Unit test: hint lines at most 40 characters, at most 2 lines      |

## Decided (Stefan, 2026-10-13)

1. **Plain hints, no narrator:** the lines above replace the Skald's voice.
