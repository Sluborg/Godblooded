# Level-ups as a moment

Design owns this spec. Stefan, after the playtest: "level-ups are boring". Today a level-up
freezes the whole run, dims the screen and shows 3 text cards (`src/scenes/LevelUpScene.ts`);
the pick changes numbers nobody sees. This spec lays out three options and recommends a mix.

## Bottom line

- **Why it is boring:** it stops the show (the run freezes), the cards are text about stats,
  the choice is small (+2 Str or +2 Sta), and nothing on the map changes after the pick.
- **Option A, celebrate on the map:** the party glows, the camera swings in, the game slows for
  a second, a choir hits, and after the pick the change is visible (aura, size, a bark).
  Cheapest, no rule change.
- **Option B, fewer but bigger choices:** cards only at party levels 2, 4, 6 and 8, with big
  effects (a new trick, a god's boon, double a stat); the levels between give small automatic
  gains. Half the interruptions, each one matters.
- **Option C, the gods offer, the run flows:** each card is offered by one of the party's gods
  in its colour and voice; the run keeps going in slow motion while the cards sit in a tray;
  the party picks by itself after 15 s (by personality) if the player does not.
- **Recommendation: A + C now, B as the follow-up** if level-ups still feel small after the
  next playtest. A+C keeps the rules and fixes the two worst parts (the freeze and the
  invisibility); B touches the card pool and balance.

## 1. What is wrong today

| Problem                         | Where                                         |
| ------------------------------- | --------------------------------------------- |
| The run freezes                 | Sim freezes on an offer (decision 2026-10-04) |
| A full-screen dim hides the map | `LevelUpScene` dims and covers the party      |
| Cards are text about stats      | 9 graybox cards, mostly "+2 Strength"         |
| No visible result               | after the pick nothing on the map changes     |
| Every level asks                | levels 2-8, about every 1.5 minutes           |

## 2. Option A: celebrate on the map

| Beat | What happens                                                                                                                                                                              | Who builds |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1    | The camera eases to the party (0.5 s), the game slows to 25% for 1 s                                                                                                                      | Scene      |
| 2    | A pillar of light in the party colour, a choir chord (`sfx_levelup`), "Level 4!" over the banner                                                                                          | Scene      |
| 3    | The party leader barks (`barks.md`, `level_up`; needs #158)                                                                                                                               | Scene      |
| 4    | The cards come up (option C tray, or today's modal)                                                                                                                                       | Scene      |
| 5    | After the pick: the card's effect shows on the heroes (red aura for Str, a shield glint for armour, quicker swings and a dodge flash for Dex), and the party banner gains a pip per level | Scene      |

- No rule change; Sim already emits `levelUp` and `upgradePicked`.
- Reduced motion (setting): skip the camera swing and the slow-down, keep the light and sound.

## 3. Option B: fewer, bigger choices

| Party level | Today                          | Option B                                                    |
| ----------- | ------------------------------ | ----------------------------------------------------------- |
| 2           | 1 of 3                         | 1 of 3 big cards                                            |
| 3           | 1 of 3 + path                  | path pick only (already a big moment), plus +1 to all stats |
| 4           | 1 of 3                         | 1 of 3 big cards                                            |
| 5           | 1 of 3                         | automatic: +1 to all stats, a bark                          |
| 6           | 1 of 3                         | 1 of 3 big cards, tier 3                                    |
| 7           | favour card (`progression.md`) | god's favour card                                           |
| 8           | 1 of 3                         | 1 of 3 big cards                                            |

- **Big cards** merge today's small ones: "Giant's Blood" becomes +4 Str and +4 Sta, -1 Dex;
  stat cards come in pairs; skill and pantheon cards (`progression.md`) carry the rest.
- Cost: the card pool and balance change (Balance re-runs the bot); progression.md's offer
  rules change.

## 4. Option C: the gods offer, the run flows

| Rule       | Today               | Option C                                                                                                                                                  |
| ---------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Freeze     | the run stops       | the run slows to 30% while the tray is open                                                                                                               |
| Where      | full-screen modal   | a tray of 3 cards at the bottom, the map stays visible above                                                                                              |
| Card voice | plain name and text | each card is offered by a god of the party: its sigil, its colour, a line ("Thor offers: Iron Arms")                                                      |
| No answer  | waits forever       | after `offerTimeoutMs` 4500 of **sim** time (about 15 s of real time at the 0.3 slow-down) the party picks by itself (rules below); always on in option C |
| Auto-pick  | none                | a Settings toggle "Parties choose for themselves" (off by default): when on, the party picks at once and no tray opens, only a toast                      |

- **Which god offers:** each card is tagged with a god of the party (stat cards to the god
  whose template uses that stat most; pantheon cards to a god of that pantheon). With one god
  in the party, it offers all three.
- **Auto-pick rule (deterministic, no RNG):** the party leader's trait decides. brave: first
  `attack` card; coward: first `defence`; greedy: first `gold` (falls back to `attack` when the
  offer has none); curious: first `sight`; loyal and proud: the first card offered by the
  leader's own god; vengeful: first `attack`. "First" is in offer order (the offer is already
  seeded). No match: the first card. The toast names the leader: "Bjorn chose Iron Arms".
- **Path offers too:** a pending `pathOffer` slows the run and times out the same way; the
  auto-pick takes the hero's first free path in data order. The upgrade offer opens after it,
  with a fresh timer (today `pickUpgrade` refuses until the path is picked).
- **Slow-downs do not stack:** option A's 25% runs for its 1 s beat, then the tray holds 30%.
- **Two parties with offers:** the tray shows the oldest offer, with a "+1" badge for the
  next; each offer has its own timer.
- **No god in the party** (template-only heroes, dev and tests): cards say "The gods offer".
- **Card size:** 3 cards of 300 x 190 px at the bottom (960 px wide, 16 px gaps), each one tap
  target well above `MIN_TOUCH`; the map stays visible above y 500.
- **Supersedes, if Stefan picks C:** `docs/decisions.md` 2026-10-04 ("a level up freezes the
  run") and `ui-flows.md` section 6 (LevelUp freeze and hold-to-peek, which C makes moot).
- Cost: Sim changes the freeze to a slow-down and adds an offer timer and the auto-pick rule;
  Scene builds the tray; data adds `god?` to each card.

## 5. Recommendation and rows (A + C now)

| Role    | Order | Row                                                                                                                                                                                                                                                                                                                                    |
| ------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sim     | 10    | Offers (upgrade and path) no longer freeze the run: `offerSlowdown` 0.3 while one is open; `offerTimeoutMs` 4500 sim time, then the auto-pick rule; `autoPick` in world config at `createWorld` and a `setAutoPick` command, both saved; an open offer and its timer saved (bump the save version, migrate old saves to no open offer) |
| Scene   | 10    | Option A beats 1-5 (camera, slow-down, light, sound, bark, visible effect, banner pips)                                                                                                                                                                                                                                                |
| Scene   | 20    | Card tray at the bottom instead of the full-screen modal; god sigil, colour and line per card; countdown ring                                                                                                                                                                                                                          |
| Scene   | 30    | Settings toggle "Parties choose for themselves"                                                                                                                                                                                                                                                                                        |
| Balance | 10    | On each upgrade card: `god` (who offers it), `offerLine`, and `pickTag` (attack, defence, sustain, sight, gold, nerve)                                                                                                                                                                                                                 |
| Art     | 10    | 12 god sigils (small badges) for the cards; frames stay by rarity with a family icon (`progression.md`)                                                                                                                                                                                                                                |

Option B stays in this spec as the next step; if Stefan wants it now, it adds a Balance row
for the big-card pool and a Sim row for the automatic levels.

## OPEN (Stefan decides)

1. **A + C now, B later** (recommendation), or B right away too?
2. **The run keeps going at 30% speed** while cards are open, or keep the freeze?
3. **Auto-pick after 15 s:** good, or should the cards wait for you?
