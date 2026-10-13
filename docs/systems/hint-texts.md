# Hint texts

Design owns this spec. Lead turns the rows into `HintDef` data (`onboarding.md`, section 6).
This is the final English text for every Skald line: the 9 beats of the first 3 minutes, the
first-time hints, and the few fixed lines around them.

## Bottom line

- **29 lines in all:** 9 beats, 15 first-time hints (10 from `onboarding.md` plus 5 for M2
  features: skills, gear, potions, fleeing, quarrels), 5 fixed lines.
- **Phone-sized:** at most 2 lines of at most 40 characters each, broken by hand (the `line 1`
  and `line 2` columns), so the bubble never wraps on its own at 26 px.
- **One voice:** the Skald speaks like the world, short and a little grim. No UI words where a
  game word fits, no exclamation marks except where a beat needs one, no long dashes.
- **Milestone tag** on each row: M2 rows ship with "Aesir, alive" (`content-roadmap.md`); M3
  rows wait for their feature.

## 1. Rules for writing more lines

1. At most 2 lines, each at most 40 characters including spaces and punctuation.
2. Line 1 says what happens; line 2 (optional) says what the player can do or watch.
3. Name game things (temple, bounty, party), never controls (button, HUD, click).
4. "Tap" is allowed: it is the one verb the player has.
5. No hero is ever told what to do. The Skald talks to the player about the heroes.

## 2. The first 3 minutes (beats)

| Order | Id        | Trigger                      | Points at      | M   | Line 1                               | Line 2                                   |
| ----- | --------- | ---------------------------- | -------------- | --- | ------------------------------------ | ---------------------------------------- |
| 10    | b-temple  | run start (clock stopped)    | a free plot    | M2  | The gods have children among us.     | Raise a temple, and they will come.      |
| 20    | b-aesir   | build menu open              | temple button  | M2  | The Aesir temple.                    | Odin, Thor, Loki and Freyja will hear.   |
| 30    | b-arrive  | first `arrived`              | the hero       | M2  | A Godblood!                          | They answer to no king. Not even you.    |
| 40    | b-gold    | 10 s after beat 30           | none           | M2  | You cannot command them.             | But gold speaks to every god's child.    |
| 50    | b-market  | 10 s after beat 40           | a free plot    | M2  | Heroes spend what they earn.         | Build a market. The town takes a share.  |
| 60    | b-bounty  | first monster seen by a hero | the monster    | M2  | Tap a monster to put a bounty on it. |                                          |
| 70    | b-watch   | first `bountyPlaced`         | the flag       | M2  | Watch who goes for it.               | The greedy run. The cowards think twice. |
| 80    | b-party   | first `partyFormed`          | a party member | M2  | Those who fight together stay so.    | Tap a hero to see the party.             |
| 90    | b-levelup | first `levelUp`              | the cards      | M2  | They have grown.                     | Choose what the gods grant them.         |

## 3. First-time hints

| Order | Id        | Trigger (Sim event)                 | Points at          | M   | Line 1                          | Line 2                             |
| ----- | --------- | ----------------------------------- | ------------------ | --- | ------------------------------- | ---------------------------------- |
| 10    | h-raid    | first `raidWarning` (today: `raid`) | the arrow          | M2  | Horns at the edge of the land.  | Raiders are coming for the town.   |
| 20    | h-ko      | first `knockout`                    | the downed hero    | M2  | Down, not dead.                 | They wake at the town hall.        |
| 30    | h-path    | first `pathOffer`                   | the cards          | M2  | A path opens.                   | Each god's child walks one of two. |
| 40    | h-tier    | first `tierUp` to tier 2            | the hero           | M2  | Look at them now.               |                                    |
| 50    | h-skill   | first skill `cast`                  | the caster         | M2  | The blood of the gods wakes.    |                                    |
| 60    | h-gear    | first `shopped` with an item        | the hero           | M2  | New steel for a hero.           | The smith and the town both earn.  |
| 70    | h-potion  | first potion drunk                  | the hero           | M2  | Courage in a flask.             |                                    |
| 80    | h-flee    | first `fled`                        | the hero           | M2  | Not every god's child is brave. |                                    |
| 90    | h-argue   | first `argue`                       | the two heroes     | M2  | Heroes have tempers.            | Watch who they forgive.            |
| 100   | h-upgrade | first time gold covers an upgrade   | a building         | M2  | Your buildings can grow too.    | Tap one to see.                    |
| 110   | h-lair    | first `lairTierUp`                  | the lair           | M2  | The lair grows,                 | and its brood grows with it.       |
| 120   | h-boss    | the boss emerges                    | the boss           | M2  | There. The one that rules them. |                                    |
| 130   | h-ruin    | first `buildingDestroyed`           | the ruin           | M3  | Rubble can be raised again.     |                                    |
| 140   | h-omen    | first `omen`                        | the banner         | M3  | A sign in the sky.              | Something is coming.               |
| 150   | h-favour  | first full favour bar               | the miracle button | M3  | The gods are pleased.           | Call on them, once.                |

## 4. Fixed lines

| Id             | Where                                   | M   | Line 1                          | Line 2     |
| -------------- | --------------------------------------- | --- | ------------------------------- | ---------- |
| f-firstrun-end | end screen of the first run             | M2  | The world will not wait for you | next time. |
| f-won          | end screen, won (Skald under the title) | M2  | The songs will name them.       |            |
| f-lost         | end screen, lost                        | M2  | The town burns. The gods watch. |            |
| f-hints-label  | Settings row                            | M2  | Skald hints                     |            |
| f-hints-again  | Settings button                         | M2  | Hear the Skald again            |            |

## 5. Checks before shipping (Lead or Scene)

- Every line at most 40 characters; a unit test over the hint rows can enforce it.
- Every trigger exists as a Sim event or a Scene condition; the M3 rows stay in data with
  their milestone and are skipped while their event never fires.
- Read each line aloud once in the bubble on a phone: it must fit without wrapping.

## 6. Proposed backlog rows

| Role  | Order | Row                                                               |
| ----- | ----- | ----------------------------------------------------------------- |
| Lead  | 10    | HintDef rows from sections 2 to 4 (`line1`, `line2`, `milestone`) |
| Scene | 10    | Unit test: hint lines at most 40 characters, at most 2 lines      |

## OPEN (Stefan decides)

1. **The voice:** short and a little grim (this draft). Lighter, or more mythic?
2. **"A Godblood!"** is the only exclamation. Keep it as the first-hero moment?
