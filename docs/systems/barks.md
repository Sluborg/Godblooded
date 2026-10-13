# Barks

Design owns this spec. Balance (or Lead) turns section 4 into a data file
(`src/data/barks.ts`); Scene replaces `src/ui/speechLines.ts` with a picker that follows the
rules in section 2. Stefan, after the playtest: he likes the hero comments, wants lots of
them, but not too often.

## Bottom line

- **386 lines** in 26 situations, flavoured by the 12 gods and the 7 traits, so the same
  moment sounds different from Thor's child and a greedy coward.
- **Rare and precise:** at most one bubble every 3 s on screen, at most 2 at once, each hero
  at most once per 20 s, and most small events speak only sometimes. Big moments (a knockout,
  a flight, a boss, a revenge) always speak.
- **Never the same line twice in 5 minutes,** and a hero never repeats itself until it has
  used every line it can say in that situation.
- **Data, not code:** each line is one row `{ situation, text, god?, trait? }`; a picker
  prefers god and trait lines, falls back to the generic ones.

## 1. Situations

| Id           | Fires on (Sim event or Scene condition)                                                                             | Priority | Chance       |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| arrive       | `arrived`                                                                                                           | high     | 100%         |
| explore      | intent `explore` (`hero-ai.md` `intent` event)                                                                      | low      | 10%          |
| spot_lair    | a lair becomes discovered by this hero                                                                              | mid      | 50%          |
| fight_start  | the hero's fight starts (`combat.md` fight boundary)                                                                | mid      | 25%          |
| low_hp       | hp drops below 35% (once per fight)                                                                                 | mid      | 40%          |
| flee         | `fled`                                                                                                              | high     | 100%         |
| ko           | `knockout` (the hero itself)                                                                                        | high     | 100%         |
| revive       | `revived`                                                                                                           | mid      | 60%          |
| kill         | the hero lands a killing blow                                                                                       | mid      | 20%          |
| level_up     | `upgradePicked` (after the card closes): the party leader (`members[0]`, or the next member not knocked out) speaks | high     | 100%         |
| path_pick    | `tierUp` to tier 2                                                                                                  | high     | 100%         |
| shop         | `shopped`                                                                                                           | low      | 25%          |
| rest         | intent `rest` (`hero-ai.md` `intent` event)                                                                         | low      | 15%          |
| bounty_seen  | a flag is placed in the hero's aggro range                                                                          | low      | 30%          |
| bounty_taken | the hero (or its party) commits to a flag                                                                           | mid      | 50%          |
| raid         | `raidWarning` (planned, `events.md`) or today's `raid`, a hero in town speaks                                       | high     | 100%         |
| boss         | the boss emerges, a hero in view speaks                                                                             | high     | 100%         |
| argue        | `argue` (one of the two)                                                                                            | mid      | 100%         |
| revenge      | `revenge` (the oath taker)                                                                                          | high     | 100%         |
| idle         | a hero has said nothing for 60 s and is not fighting                                                                | low      | 10% per 15 s |
| lair_go      | intent `lair` (party leader)                                                                                        | mid      | 50%          |
| retreat      | intent `retreat` / `partyRetreat` (party leader)                                                                    | high     | 100%         |
| defend       | intent `defend` / `defend` event                                                                                    | mid      | 60%          |
| slain        | the hero is slain by a boss (`combat.md` section 6)                                                                 | high     | 100%         |
| mourn        | a party mate was slain; one member speaks                                                                           | high     | 100%         |
| omen         | `omenStart` (`events.md`): a hero of the omen's pantheon in view                                                    | mid      | 100%         |

This table **replaces the speech column of `hero-ai.md` section 2**: intents speak through
the `explore`, `lair_go`, `retreat`, `rest`, `defend`, `bounty_taken` (flag) and `revenge`
situations here, with these chances instead of "one in three".

**Skill-name bubbles** (`paths-and-skills.md`, one cast in four) are their own pool of
lines (the skill names) but share the global gap and the 2-bubble cap below, at mid priority.

## 2. Frequency rules

1. **Global gap:** at least 3 s of real time between two bubbles starting; at most 2 bubbles
   on screen. Real time, not game time, so 4x speed does not turn into chatter.
2. **Per hero:** at most one bubble per 20 s of game time. High-priority barks ignore this
   rule, never the global gap.
3. **Queue:** a high bark that hits the global gap waits up to 1.5 s, then drops; mid and low
   barks drop at once.
4. **On screen only:** a hero speaks only if it is inside the camera view. `raid` and `boss`
   may speak from the nearest hero in view.
5. **No repeats:** a line is not used again within 5 minutes of game time (run-wide); a hero
   cycles through all its candidate lines for a situation before reusing one.
6. **Pick:** candidates = generic lines of the situation + lines tagged with the hero's god +
   lines tagged with its trait. Weight god and trait lines x3. The pick is Scene-side and
   deterministic per unit (unit id plus how often it spoke, like today's `pickLine`); it never
   draws from the sim RNG. Which barks play at all depends on the viewer (camera, real time),
   so replays need not show the same bubbles.
7. **Placeholders:** `{friend}` is the `revenge` event's `victim` (its name), `{gold}` a
   bounty's amount. A line whose placeholder has no value is skipped. Templates with a
   placeholder stay at most 30 characters so a 10-character name still fits in 40; hero
   names (`meta.md` name lists) are at most 10 characters.
8. **Bubble:** 22 px text, one line, max 40 characters, 2.2 s on screen (3 s for high).

## 3. Proposed data rows

| Row                                                      | Fields                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BarkDef                                                  | `situation`, `text` (max 40 chars), `god?` (GodDef id), `trait?` (TraitId)                                                                                          |
| BARK_TUNING (in `src/data/barks.ts`, Scene-only numbers) | `globalGapMs` 3000, `maxOnScreen` 2, `heroGapMs` 20000, `queueMs` 1500, `noRepeatMs` 300000, `tagWeight` 3, `idleAfterMs` 60000, `chance` per situation (section 1) |

Scene owns the picker and the bubble; the rows live in `src/data/barks.ts` (Balance or
Lead). A test checks every line is at most 40 characters and every tag is a real id.

## 4. The lines

Format: `- text` for every hero, `- [god] text` or `- [trait] text` for tagged lines.

### arrive

- Reporting in.
- Where is the fight?
- Fresh blood for the old gods.
- So this is the town.
- I heard there was work.
- Point me at the monsters.
- [odin] The ravens led me here.
- [odin] One eye is enough to see this.
- [thor] Who needs a hammer to the head?
- [thor] Thunder brought me. I stay.
- [loki] Don't mind me. Just visiting.
- [loki] Nice town. Shame if it burned.
- [freyja] The slain need a chooser.
- [freyja] My mother sends her regards.
- [athena] I have a plan already.
- [athena] Show me your walls.
- [ares] I smell a war. Good.
- [ares] Finally, something to kill.
- [apollo] The sun rose with me today.
- [apollo] I come with arrows and songs.
- [poseidon] The ground shook when I came.
- [poseidon] Far from the sea. Pity.
- [horus] I saw this town from the sky.
- [horus] The falcon flies where I go.
- [anubis] The dead whisper of this place.
- [anubis] I keep the scales. Who is due?
- [sekhmet] I am hungry. Where is the prey?
- [sekhmet] The lioness has come.
- [isis] Life follows where I walk.
- [isis] I know the words that heal.
- [greedy] What does this place pay?
- [coward] Is it safe here? Mostly?
- [proud] You may thank the gods for me.
- [curious] What is out there in the fog?
- [brave] Bring me your worst.
- [loyal] Who needs a sword at their side?
- [vengeful] I remember every wrong.

### explore

- Let's see what's out there.
- Into the wild.
- Something moved over there.
- Keep your eyes open.
- [odin] Every path has a lesson.
- [loki] Wrong way? Even better.
- [horus] I see far. Follow me.
- [poseidon] I miss the waves.
- [curious] I have never been this way!
- [curious] What's behind that hill?
- [coward] Do we have to go this far?
- [greedy] Treasure hides in places like this.

### spot_lair

- A lair! Over there!
- That's where they come from.
- I found their nest.
- Smell that? Monsters.
- [odin] The ravens say: there.
- [thor] A den. My hammer is ready.
- [athena] Mark it. We strike at dawn.
- [anubis] A barrow. The dead don't rest.
- [sekhmet] Their den. My hunting ground.
- [curious] A lair! Let's look inside.
- [coward] A lair. Let's... remember it.
- [brave] Their home. Our battlefield.

### fight_start

- Here they come!
- For the gods!
- Stand together!
- Steel up!
- Take them!
- Don't let them flank us!
- [odin] For the All-Father!
- [odin] Your fate is written already.
- [thor] Thunder take you!
- [thor] Come closer, little troll.
- [loki] Watch this. Or don't.
- [loki] I have a trick for you.
- [freyja] Valhalla is watching!
- [freyja] Fight well, or don't fight.
- [athena] Hold the line. Then break theirs.
- [athena] Wisdom first, then the spear.
- [ares] Blood! Finally!
- [ares] Glory waits! Charge!
- [apollo] Let the sun guide my aim.
- [apollo] One shot, one song.
- [poseidon] I'll break you like a wave.
- [poseidon] Feel the earth shake!
- [horus] I see you from above.
- [horus] The eye of the sky is open.
- [anubis] Your heart will be weighed.
- [anubis] Come. The dead are waiting.
- [sekhmet] Run. It makes the hunt fun.
- [sekhmet] I'll paint the sand red.
- [isis] I'll keep you standing.
- [isis] Magic, wake!
- [brave] Me first!
- [coward] You first. I'll... cover you.
- [proud] Watch how it's done.
- [greedy] Every one of them is worth coin.
- [vengeful] This is for last time.
- [loyal] I'm with you. Go!

### low_hp

- I'm hurt!
- This is bad.
- Need a healer!
- Just a scratch. A big one.
- I can still fight. Barely.
- [odin] Even the All-Father bled.
- [thor] Is that all you've got?
- [loki] Ouch. I'll remember that.
- [freyja] Not yet, Valkyries. Not yet.
- [ares] Pain? Pain is good.
- [poseidon] The tide turns. Not on me.
- [anubis] Not my heart. Not today.
- [sekhmet] Wounded lions bite harder.
- [isis] Breathe. Heal. Fight.
- [coward] I'm done. I'm so done.
- [proud] I meant to do that.
- [brave] Good. Now it's a fight.

### flee

- Run!
- Not today!
- Fall back!
- I'll be back!
- Too many of them!
- [odin] Wisdom says: run.
- [loki] Retreat is a trick too!
- [athena] A tactical withdrawal.
- [ares] Just this once. Just once!
- [apollo] Sing of my courage later.
- [horus] Up and away!
- [coward] I was never here!
- [coward] Every hero for themselves!
- [proud] Nobody saw that.
- [greedy] My gold stays with me!

### ko

- Ugh...
- I'm down!
- Cover me!
- Tell them I fought...
- [odin] I see... darkness...
- [thor] Just... resting my eyes.
- [loki] This wasn't the plan.
- [freyja] Not Valhalla. Not yet.
- [athena] Miscalculated...
- [ares] More... blood...
- [apollo] The sun... fades...
- [poseidon] Pulled under...
- [horus] Wings... broken...
- [anubis] I'll weigh my own heart.
- [sekhmet] I'll be back. Hungrier.
- [isis] Mother... help...
- [proud] This is embarrassing.
- [vengeful] Remember who did this.

### revive

- I live again.
- Back on my feet!
- Gods, my head...
- Where's my weapon?
- What did I miss?
- [odin] I have seen the other side.
- [thor] Who hit me? Show me.
- [loki] Death got bored of me.
- [freyja] The Valkyries sent me back.
- [anubis] The scales said: not yet.
- [isis] Life returns. As it does.
- [vengeful] Now where is that beast?
- [coward] Can I stay in town a while?

### kill

- Got one!
- Down you go.
- Next!
- That's for the town.
- One less.
- [odin] Fated.
- [thor] Smashed!
- [loki] Too easy.
- [freyja] Chosen. Not for Valhalla.
- [athena] As planned.
- [ares] More!
- [apollo] Bullseye.
- [poseidon] Swept away.
- [horus] Struck from the sky.
- [anubis] Weighed and found wanting.
- [sekhmet] Prey.
- [isis] Rest now.
- [greedy] Cha-ching!
- [proud] Did you all see that?
- [vengeful] And stay down.

### level_up

- We grow stronger!
- Feel that? Power.
- The gods are watching us.
- Another step to glory.
- [odin] Wisdom earned in blood.
- [thor] Stronger than a storm!
- [loki] Nobody saw this coming.
- [freyja] Worthy of the hall.
- [athena] Strategy pays.
- [ares] More war, more power!
- [apollo] Sing it, we're rising!
- [poseidon] The tide is ours.
- [horus] Higher than ever.
- [anubis] The dead remember us now.
- [sekhmet] Fear us more.
- [isis] Blessed, all of us.
- [proud] As expected.
- [loyal] Together. Always together.

### path_pick

- I know my path now.
- My blood is waking.
- The gods have chosen.
- I feel... different.
- [odin] I walk Odin's road.
- [thor] The thunder answers me!
- [loki] A new trick for every day.
- [freyja] I choose. As she chose.
- [athena] I know what I am now.
- [ares] I am war itself.
- [apollo] Light and song are mine.
- [poseidon] The sea rises in me.
- [horus] My wings are open.
- [anubis] I guard the threshold now.
- [sekhmet] The lioness wakes.
- [isis] Her magic is mine.

### shop

- Worth every coin.
- Nice kit!
- Gold well spent.
- Sharp. I like it.
- Does this come in my size?
- [loki] Was that price a joke?
- [athena] Good steel. Good plan.
- [ares] Sharper is better.
- [apollo] New strings for my bow.
- [isis] A potion or two. Or five.
- [greedy] Too expensive. I'll take it.
- [greedy] I want a discount.
- [proud] Only the best for me.
- [coward] Armour first. Lots of armour.
- [curious] What does this one do?

### rest

- Finally, a bed.
- Five minutes. Just five.
- Patch me up.
- Ale. Then sleep.
- [thor] Mead. Then more mead.
- [freyja] Rest well. Fight well.
- [apollo] The sun heals all.
- [isis] Sleep heals what magic can't.
- [coward] I could stay here forever.
- [brave] Hurry. They're still out there.

### bounty_seen

- A bounty! {gold} gold!
- Somebody's paying for that one.
- Gold on that flag.
- Is it worth it?
- [loki] Gold? I'll think about it.
- [athena] Is it worth the risk?
- [greedy] {gold} gold? Mine!
- [greedy] I hear coins calling.
- [coward] Too dangerous. Even for gold.
- [proud] Too cheap for me.
- [curious] What's over there? And gold!

### bounty_taken

- I'll take that bounty.
- That flag is ours.
- Easy money.
- Follow the gold!
- [odin] Fate and gold agree.
- [thor] Gold for a smash? Done.
- [ares] Paid to fight? Perfect.
- [sekhmet] The hunt pays today.
- [greedy] Out of my way! It's mine!
- [brave] Danger and gold. My favourite.
- [loyal] If they go, I go.

### raid

- Raiders! To the town!
- They're attacking the town!
- Protect the gates!
- To arms! To arms!
- [odin] I foresaw this.
- [thor] They come to us? Good.
- [athena] Defend the walls!
- [ares] They brought the war home.
- [poseidon] Let them break on us.
- [horus] I saw them coming!
- [coward] Is there a back door?
- [loyal] Nobody touches our town!

### boss

- What is THAT?
- By all the gods...
- That's the big one.
- Hold. Hold!
- [odin] Even I did not see this.
- [thor] Finally, a worthy giant!
- [loki] Can we leave? No? Fine.
- [freyja] The hall will be full tonight.
- [athena] Everyone. Together. Now.
- [ares] Now THIS is a fight!
- [apollo] Make it a song worth singing.
- [poseidon] I've seen bigger. In the sea.
- [horus] Strike its eyes!
- [anubis] Its heart is heavy. Good.
- [sekhmet] The biggest prey. Mine.
- [isis] Stand behind me. All of you.
- [coward] Nope. Nope. Nope.
- [brave] It dies today!
- [proud] It's afraid of me. I can tell.

### argue

- Watch where you swing that!
- You ran last time!
- Out of my way.
- Don't tell me what to do.
- I'd do better alone.
- [loki] You started it. Probably.
- [athena] Your plan is foolish.
- [ares] Want to fight me instead?
- [sekhmet] Say that again. Go on.
- [proud] I don't take orders.
- [vengeful] I haven't forgotten.
- [greedy] That was MY gold!

### revenge

- For {friend}!
- You'll pay for that!
- {friend}, I'm coming!
- Nobody hurts my friend.
- [odin] Your fate is sealed.
- [thor] Thunder for {friend}!
- [freyja] {friend} will be avenged.
- [ares] Blood for blood!
- [anubis] Your heart is mine to weigh.
- [sekhmet] I'll rip it apart.
- [vengeful] I swore it. Now I do it.
- [loyal] For {friend}! Always!

### lair_go

- To the lair!
- Their nest. Let's burn it.
- We end this at the source.
- Into the den.
- [thor] Knock knock, trolls.
- [athena] Strike where they sleep.
- [ares] Their home is our war.
- [sekhmet] Into the lion's den. Mine.
- [brave] Finally, the real fight.
- [coward] Do we have to go inside?

### retreat

- Fall back!
- Back to town, all of us!
- Regroup! Regroup!
- We fight again tomorrow.
- [odin] A wise retreat. Go.
- [athena] Withdraw in order!
- [ares] We'll be back for more!
- [loyal] Nobody gets left behind!
- [proud] I'll hold. You go.

### defend

- The town!
- They're at the walls!
- Back! Defend the town!
- Not our homes!
- [thor] Nobody touches my town.
- [athena] To the gates!
- [poseidon] Let them crash on us.
- [loyal] Our town. Our people.

### slain

- Valhalla... or wherever...
- Remember me...
- This is the end of my song.
- [odin] I see the hall now.
- [freyja] Take me, Valkyries.
- [anubis] Weigh it well.
- [isis] Mother, I'm coming home.

### mourn

- They're gone. Gone.
- We'll sing for them.
- I'll carry their name.
- Rest well, friend.
- [freyja] Chosen. Truly chosen.
- [anubis] Their heart was light.
- [vengeful] Someone will pay for this.
- [loyal] I should have been there.

### omen

- A sign in the sky!
- The gods are speaking.
- Did you see that?
- [odin] The ravens are restless.
- [thor] Thunder without clouds.
- [apollo] The sun turns strange.
- [poseidon] The ground is restless.
- [horus] The sky has changed.
- [anubis] Death walks tonight.
- [isis] Magic hangs in the air.

### idle

- Quiet. Too quiet.
- Anyone else hungry?
- Nice weather for a fight.
- Wonder what's for supper.
- [odin] The ravens are late today.
- [thor] I miss my goats.
- [loki] I'm bored. Let's set a fire.
- [freyja] My cats would love this town.
- [athena] I'm counting the exits.
- [ares] Nothing to kill. Sad.
- [apollo] La la la. Sorry.
- [poseidon] Is there a lake nearby?
- [horus] I'll go check the sky.
- [anubis] Someone here will die soon.
- [sekhmet] I could eat a whole troll.
- [isis] Everyone is healthy. Good.
- [greedy] I could be earning right now.
- [curious] I wonder what's in the hills.

## 5. Proposed backlog rows

| Role            | Order | Row                                                                                                                                                                                                                                                                                                    |
| --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Balance or Lead | 10    | `src/data/barks.ts` from section 4 (BarkDef rows) and `BARK_TUNING`                                                                                                                                                                                                                                    |
| Scene           | 10    | Bark picker: situations, tags, weights, global and per-hero gaps, queue, no-repeat, on-screen only                                                                                                                                                                                                     |
| Scene           | 20    | Bubble: one line, 22 px, 2.2 s (3 s high), at most 2 on screen                                                                                                                                                                                                                                         |
| Sim             | 10    | Events Scene needs that are missing: `fightStart` per unit, `lowHp` once per fight, the killer on `died` is there already (`by`); depends on `intent` (`hero-ai.md` row 10), `discovered` (`hero-ai.md` row 25), `raidWarning` and `omenStart` (`events.md` rows 10, 20), `slain` (`combat.md` row 80) |
| Scene           | 30    | Test: every line at most 40 characters, every tag a real god or trait id                                                                                                                                                                                                                               |

## OPEN (Stefan decides)

1. **Tone:** mostly heroic with some jokes (Loki, idle lines). More jokes, or more grim?
2. **Frequency:** one bubble every 3 s at most, each hero at most every 20 s. More, less?
