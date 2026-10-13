# Level-ups as a moment

Design owns this spec. Stefan, after the playtest: "level-ups are boring". Today a level-up
freezes the whole run, dims the screen and shows 3 text cards (`src/scenes/LevelUpScene.ts`);
the pick changes numbers nobody sees.

**Stefan decided (2026-10-13):** parties pick their own level-up card, weighted by
personality, with no pause; the player only chooses paths. Option A (celebrate on the map)
stays, option C's auto-pick becomes the rule, option B (fewer, bigger choices) comes later.

## Bottom line

- **The party chooses its card.** At each level-up the Sim draws 3 cards as today and the
  party picks one at once, weighted by the leader's trait. No freeze, no modal, no timer.
- **The player watches it happen (option A):** the camera swings in, a pillar of light, a
  choir chord, the leader barks, and the chosen card rises over the banner with the god who
  offered it. After the pick the effect shows on the heroes.
- **The player still chooses paths.** At party level 3 each hero's path offer opens a card
  tray at the bottom while the run slows to 30%; it waits for the player.
- **Option B later:** fewer, bigger cards at levels 2, 4, 6 and 8, if level-ups still feel
  small after the next playtest.

## 1. What was wrong

| Problem                         | Where                                         | Now                                     |
| ------------------------------- | --------------------------------------------- | --------------------------------------- |
| The run freezes                 | Sim freezes on an offer (decision 2026-10-04) | upgrades never pause; paths slow to 30% |
| A full-screen dim hides the map | `LevelUpScene` dims and covers the party      | the celebration happens on the map      |
| Cards are text about stats      | 9 graybox cards, mostly "+2 Strength"         | a god offers each card, with its sigil  |
| No visible result               | after the pick nothing on the map changes     | aura, glint or flash on the heroes      |
| Every level asks                | levels 2-8, about every 1.5 minutes           | only the path pick asks, once per hero  |

## 2. The celebration (option A)

| Beat | What happens                                                                                                                                                              | Who builds |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1    | The camera eases to the party (0.5 s), the game slows to 25% for 1 s                                                                                                      | Scene      |
| 2    | A pillar of light in the party colour, a choir chord (`sfx_levelup`), "Level 4!" over the banner                                                                          | Scene      |
| 3    | The party leader barks (`barks.md`, `level_up`)                                                                                                                           | Scene      |
| 4    | The chosen card rises over the banner for 2.5 s: god sigil, card name, the offer line ("Thor offers: Iron Arms"); a tap on it opens the party card                        | Scene      |
| 5    | The card's effect shows on the heroes (red aura for Str, a shield glint for armour, quicker swings and a dodge flash for Dex), and the party banner gains a pip per level | Scene      |

- Sim already emits `levelUp` and `upgradePicked`; beat 4 reads the picked card from
  `upgradePicked`.
- Nothing waits for the player: the run goes on during and after the beats.
- Two parties levelling at once: beats 1 and 2 play for the first, the second gets beats 2 to
  5 without the camera swing.
- Reduced motion (setting): skip the camera swing and the slow-down, keep the light and sound.

## 3. The auto-pick rule

1. The offer is drawn as today (`progression.md`, offer rules: 3 different cards, rarity by
   level, fitted, needs, stacking).
2. Each card gets a weight: 1, times `traitPickWeight` (3) when it matches the leader's
   trait (table below). The pick is a weighted draw with the sim's seeded RNG.
3. The pick applies at once and emits `upgradePicked { party, upgrade, god }`.

| Leader trait | Favours (x3)                               |
| ------------ | ------------------------------------------ |
| brave        | `attack` cards                             |
| coward       | `defence` cards                            |
| greedy       | `gold` cards (no match: `attack`)          |
| curious      | `sight` cards                              |
| loyal        | `sustain` cards and cards from its own god |
| proud        | `attack` cards and cards from its own god  |
| vengeful     | `attack` and `nerve` cards                 |

- A party's cards over a run say who leads it: a coward's party grows tough, a greedy one
  grows rich. The weights keep it from being the same pick every time.
- **The leader** is `members[0]`, or the next member who is not knocked out (as in
  `barks.md`).
- **Which god offers:** each card is tagged with a god of the party (stat cards to the god
  whose template uses that stat most; pantheon cards to a god of that pantheon). No god in the
  party (template-only heroes, dev and tests): the line reads "The gods offer".
- **Level 7 (god's favour):** the same rule; loyal and proud favour their own god's favour
  card.

## 4. Path picks (the player's choice)

- **A path offer opens a tray:** 2 path cards at the bottom (300 x 190 px each, 16 px gap),
  the map visible above y 500, the hero's portrait and god sigil to the left.
- **The run slows to 30%** (`offerSlowdown` 0.3) while the tray is open, whatever speed button
  is set (2x and 4x come back when it closes). No timeout: the tray waits.
- **Upgrade first, path after:** at party level 3 the upgrade card is auto-picked at once,
  then each hero's path offer opens in turn (today `pickUpgrade` refuses until the path is
  picked; that order flips).
- **Two offers:** the tray shows the oldest, with a "+1" badge for the next.
- **A hold-to-peek Map button** is no longer needed: the map stays visible.

## 5. Option B, later

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
  stat cards come in pairs; skill and pantheon cards carry the rest. The party still picks.
- Cost: the card pool and balance change (Balance re-runs the bot).

## 6. Supersedes

- `docs/decisions.md` 2026-10-04 ("a level up freezes the run"): Lead updates it.
- `ui-flows.md` section 6, LevelUp row, and its hold-to-peek row and OPEN 1 (updated here).
- The earlier option C draft of this spec (timeout, Settings toggle "Parties choose for
  themselves", `autoPick` in the world config): dropped, the auto-pick is always on.

## 7. Proposed rows

| Role    | Order | Row                                                                                                                                                                                                                                     |
| ------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sim     | 10    | Upgrade offers auto-pick at once by the trait-weighted rule (seeded RNG); `upgradePicked` carries `god`; no freeze for upgrades. Old saves with an open upgrade offer auto-pick it on load (bump the save version if the shape changes) |
| Sim     | 20    | Path offers no longer freeze: `offerSlowdown` 0.3 while one is open (Scene applies it to the run speed); the upgrade is picked before the path at level 3                                                                               |
| Scene   | 10    | Celebration beats 1 to 5 (camera, slow-down, light, sound, bark, card rising over the banner, visible effect, banner pips)                                                                                                              |
| Scene   | 20    | Path tray at the bottom instead of the full-screen LevelUp modal; 0.3 run speed while open; "+1" badge                                                                                                                                  |
| Balance | 10    | On each upgrade card: `god` (who offers it), `offerLine`, `pickTag` (attack, defence, sustain, sight, gold, nerve); `tuning.party.traitPickWeight` 3                                                                                    |
| Art     | 10    | 12 god sigils (small badges) for the cards and the path tray                                                                                                                                                                            |

## OPEN (Stefan decides)

1. **Path tray waits** at 30% speed with no timeout (this draft), or freeze the run for the
   path pick as today?
2. **Trait weight x3:** a clear personality (this draft), or stronger (always the trait's
   card when there is one)?
