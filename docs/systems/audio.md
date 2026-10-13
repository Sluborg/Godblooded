# Audio

Design owns this spec. Lead turns the proposed rows into backlog rows. Audio is milestone M4
("Feel") in `docs/game-design.md`, but the sourcing choice and the id scheme should be settled
early. Follows the manifest rule in `CLAUDE.md`: every asset has a license and a source in
`public/assets/manifest.json`, and a missing id never breaks the game (silence instead).

## Bottom line

- **Sound effects made in code** (a small Web Audio synth with presets as data, like sfxr):
  no files to source, no license question, a few kilobytes. One preset per event, varied by a
  seeded pitch and volume wobble so repeats do not grate.
- **Music generated on Stefan's account** with an AI music tool, the same way ChatGPT makes the
  art, logged in the manifest with license and source. One calm and one tension loop per
  pantheon, crossfaded by danger, plus a title theme, a boss loop and two stings.
- **Sourcing is Stefan's call (OPEN 1):** the alternatives are CC0 packs (fast, but
  "downloaded" assets, which the art rule forbids today) or a hired composer.
- **Phone rules:** audio starts on the first tap (browsers block autoplay), sounds off-screen
  stay quiet, at most 4 copies of one sound at once, music volume and effects volume in
  Settings, everything mutes when the app is in the background.

## 1. Music

| Id                     | Plays                              | Length, loop | Feel                                          |
| ---------------------- | ---------------------------------- | ------------ | --------------------------------------------- |
| `mus_title`            | Boot, Title, Hall                  | 2 min loop   | the three pantheons in one theme, slow, grand |
| `mus_aesir_calm`       | a run leaning Aesir, quiet moments | 2 min loop   | frame drum, hurdy-gurdy, low voices           |
| `mus_aesir_tension`    | same tempo and key, danger         | 2 min loop   | the calm loop plus war drums and horns        |
| `mus_greek_calm`       | Greek lean                         | 2 min loop   | lyre, aulos, light percussion                 |
| `mus_greek_tension`    |                                    | 2 min loop   | plus timpani and brass                        |
| `mus_egyptian_calm`    | Egyptian lean                      | 2 min loop   | oud, ney flute, darbuka                       |
| `mus_egyptian_tension` |                                    | 2 min loop   | plus deep drums and sistrum                   |
| `mus_boss`             | the boss has emerged               | 1.5 min loop | all three palettes, heavy, fast               |
| `mus_victory`          | won                                | 8 s sting    | rising horns                                  |
| `mus_defeat`           | lost                               | 8 s sting    | a falling low drone                           |

- **Danger** (0-1) blends calm into tension over 2 s: raid warning or raiders within 500 of the
  town = 1; a hero party fighting an elite = 0.6; otherwise falls back to 0 over 10 s.
- **Calm and tension loops of a pantheon share tempo and key** and start together, so the
  crossfade never jumps. This is the one hard requirement for whoever makes the music.
- **Stings** duck the music to 30% for their length.
- **M2 needs only:** `mus_title`, `mus_aesir_calm`, `mus_aesir_tension`, the two stings.

## 2. Sound effects by event

Each Sim event (`src/sim/types.ts`, plus the ones the other specs add) maps to one preset.
Damage-type sounds follow `combat.md`.

| Event                                        | Sound                                                    | Preset id                     |
| -------------------------------------------- | -------------------------------------------------------- | ----------------------------- |
| windup                                       | short whoosh, heavier for slow weapons                   | `sfx_windup_light`, `_heavy`  |
| hit, physical                                | thud; a metal clang when armour took over 30%            | `sfx_hit_phys`, `_clang`      |
| hit, fire / frost / lightning / death / holy | whoosh / ice crack / zap / hiss / chime                  | `sfx_hit_<type>`              |
| hit, crit                                    | the hit plus a crunch and a 40 ms freeze (Scene)         | `sfx_crit`                    |
| dodged                                       | swish                                                    | `sfx_dodge`                   |
| heal                                         | soft rising chime                                        | `sfx_heal`                    |
| knockout                                     | heavy thud and a grunt-like low tone                     | `sfx_ko`                      |
| died (monster)                               | by role: brute groan, harrier shriek, swarm crackle      | `sfx_die_<role>`              |
| arrived                                      | temple bell                                              | `sfx_arrive`                  |
| built / upgraded                             | hammer knocks / the same plus a small fanfare            | `sfx_build`, `sfx_upgrade`    |
| bountyPlaced / bountyClaimed                 | coin drop / coin jingle                                  | `sfx_coin_drop`, `sfx_coin`   |
| shopped                                      | quiet coin, at most one per second                       | `sfx_shop`                    |
| levelUp                                      | rising choir chord                                       | `sfx_levelup`                 |
| tierUp                                       | a big shimmer                                            | `sfx_tierup`                  |
| raidWarning / raid                           | distant horn / closer horn                               | `sfx_horn_far`, `sfx_horn`    |
| lairTierUp                                   | roar                                                     | `sfx_roar`                    |
| lairDestroyed / buildingDestroyed            | collapse / crash                                         | `sfx_collapse`, `sfx_crash`   |
| omen                                         | deep gong                                                | `sfx_gong`                    |
| miracle (per pantheon)                       | thunder / owl cry and bell / sunrise swell               | `sfx_miracle_<pantheon>`      |
| skill cast                                   | by visual (`paths-and-skills.md`): bolt, burst, cone ... | `sfx_skill_<visual>`          |
| UI                                           | tap, back, disabled (a dull click)                       | `sfx_ui_tap`, `_back`, `_off` |

## 3. Mixing rules

1. **Off-screen is quiet:** map sounds play only within the camera view plus 20%; volume falls
   with distance from the screen centre (100% at centre, 40% at the edge). UI, music, stings,
   horns and the omen gong ignore position.
2. **No pile-ups:** at most 4 copies of one preset at once and 60 ms between starts; extra
   requests drop. At 4x speed, hit sounds play at half the rate.
3. **Wobble:** every effect gets a seeded pitch shift of +-6% and volume of +-10%.
4. **Priority:** stings and horns over everything; when more than 12 sounds play, the quietest
   drops.
5. **Background:** all audio pauses when the page is hidden and resumes on return.

## 4. Phone and PWA

- **Unlock:** audio starts on the first tap (the Title screen's Play counts). Before that,
  nothing plays and nothing errors.
- **Formats:** each music file in `.ogg` and `.m4a` (Phaser picks what the browser plays).
- **Size:** music at about 96 kbps, about 1.5 MB per 2 min loop; all audio under 12 MB.
  Sound effects are code, about 0 MB.
- **Caching:** effects need nothing; music is cached at runtime the first time it plays (not
  pre-cached), so the first install stays small.
- **Vibration** (Android): optional, off by default, a short buzz on a knockout, a boss
  emerging and a lost town hall. A Settings toggle.

## 5. Settings

| Setting        | Values          | Default |
| -------------- | --------------- | ------- |
| Music volume   | 0-100%, 5 steps | 60%     |
| Effects volume | 0-100%, 5 steps | 80%     |
| Vibration      | on, off         | off     |

Saved with the other settings (`godblooded.settings.v1`, bump to v2 with a migration that
adds the defaults).

## 6. Manifest

- Music rows like art rows: `{ id: "mus_aesir_calm", kind: "mus", file: "audio/mus_aesir_calm"
(no extension; .ogg and .m4a both shipped), loopStartMs, loopEndMs, bpm, key, license,
source }`.
- Effect presets are data in code (`src/data/sfx.ts`, Lead), not manifest rows: they are not
  assets.

## 7. Proposed backlog rows

### Scene

| Order | Row                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------- |
| 10    | Audio core: unlock on first tap, settings (music, effects, vibration), pause on hidden            |
| 20    | Synth for effects: presets as data, wobble, pile-up and distance rules; map Sim events to presets |
| 30    | Music player: loops with loop points, calm and tension crossfade by danger, stings with ducking   |
| 40    | Vibration on knockout, boss and loss (Android)                                                    |

### Art (audio becomes an Art track, as it ships into `public/assets/`)

| Order | Row                                                                                           |
| ----- | --------------------------------------------------------------------------------------------- |
| 10    | Music batch M1: title, Aesir calm and tension (same tempo and key), victory and defeat stings |
| 20    | Music batch M2: Greek and Egyptian calm and tension, boss loop                                |
| 30    | Manifest rows and a ship script for audio (`kind: "mus"`, two formats, loop points)           |

### Lead (data)

| Order | Row                                                      |
| ----- | -------------------------------------------------------- |
| 10    | `src/data/sfx.ts`: the effect presets in the table above |

## OPEN (Stefan decides)

1. **Music source:** AI-generated on your account (recommendation; you confirm the tool's
   terms allow use in the game), CC0 packs (would need an exception to the "no downloaded
   assets" rule), or a composer?
2. **Sound effects made in code** (recommendation), or recorded and generated files?
3. **Vibration** on Android as an option: yes or skip?
