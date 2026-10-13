# Music prompts

Design owns this spec. Stefan makes the music himself with an AI music tool (decision
2026-10-13); this page gives him ready-to-paste prompts and the numbers each file must hit.
Ids, mixing and playback rules are in `audio.md`; the manifest row format is in `audio.md`
section 6.

## Bottom line

- **10 files:** a title theme, a calm and a tension loop for each pantheon (6), a boss loop,
  and 2 stings (victory, defeat).
- **Every loop is a whole number of bars,** so it loops without a click: the loop length in
  the table below is exact (bars x 4 beats x 60 / BPM).
- **Calm and tension of a pantheon are twins:** same tempo, key, chord progression and bar
  count. The game crossfades them by danger, so they must line up beat for beat.
- **Instrumental only,** no vocals with words. Wordless low choir is fine where the prompt
  says so.
- **Per file:** paste the prompt, generate a few takes, pick one, trim it to the loop points,
  export `.ogg` and `.m4a`, and send it to Art with the tool's name and the date for the
  manifest.

## 1. The numbers

| Order | Id                     | BPM | Key                         | Bars | Loop length | Use                   |
| ----- | ---------------------- | --- | --------------------------- | ---- | ----------- | --------------------- |
| 10    | `mus_title`            | 72  | D minor                     | 36   | 120.0 s     | Boot, Title, Hall     |
| 20    | `mus_aesir_calm`       | 84  | E minor (Dorian)            | 48   | 137.143 s   | Aesir lean, quiet     |
| 30    | `mus_aesir_tension`    | 84  | E minor (Dorian)            | 48   | 137.143 s   | Aesir lean, danger    |
| 40    | `mus_greek_calm`       | 96  | A minor (Dorian)            | 48   | 120.0 s     | Greek lean, quiet     |
| 50    | `mus_greek_tension`    | 96  | A minor (Dorian)            | 48   | 120.0 s     | Greek lean, danger    |
| 60    | `mus_egyptian_calm`    | 90  | D Phrygian dominant (Hijaz) | 48   | 128.0 s     | Egyptian lean, quiet  |
| 70    | `mus_egyptian_tension` | 90  | D Phrygian dominant (Hijaz) | 48   | 128.0 s     | Egyptian lean, danger |
| 80    | `mus_boss`             | 128 | C minor                     | 48   | 90.0 s      | the boss has emerged  |
| 90    | `mus_victory`          | 90  | D major                     | 3    | 8.0 s       | won (sting, no loop)  |
| 100   | `mus_defeat`           | 60  | D minor                     | 2    | 8.0 s       | lost (sting, no loop) |

- All in 4/4. A bar is 240 / BPM seconds (84 BPM: 2.857 s). If a take comes out shorter than
  the loop length, ask the tool to extend it, or generate again.
- **Loop points:** `loopStartMs` 0 and `loopEndMs` the loop length, unless the file keeps a
  short intro (then start at the first bar after it and end the same number of bars later).
  Round to whole milliseconds (Aesir: 137143).
- **The twins' chord progressions** (one chord per 2 bars, 16 bars per pass; a 48-bar loop is
  exactly 3 passes, so the seam falls at the start of the progression):
  - Aesir: Em, C, D, Em, then Em, G, D, Bm.
  - Greek: Am, G, F, E, then Am, C, G, E.
  - Egyptian: D, Eb, D, Cm, then D, Eb, Gm, D.

## 2. Prompts

Paste each block as the prompt. Where the tool has separate fields, the first line is the
style, the rest the description. Turn on "instrumental" if the tool has it.

### 10 Title theme (`mus_title`)

```text
Epic mythic orchestral theme, instrumental, 72 BPM, D minor, 4/4, 2 minutes, seamless loop.
One theme that blends three ancient worlds: Norse (frame drum, low horns, hurdy-gurdy),
Greek (lyre, warm strings) and Egyptian (oud, ney flute). Slow and grand, a strategy game's
main menu. Starts softly with the lyre stating the melody, the full ensemble joins at the
midpoint, then eases back so the end flows into the start. No vocals, no sudden ending.
```

### 20 Aesir calm (`mus_aesir_calm`)

Trim the chosen take to exactly 137.143 s (section 1), not the length the tool gives.

```text
Nordic folk ambient, instrumental, 84 BPM, E Dorian, 4/4, 2 minutes 20 seconds, seamless loop.
Chords, one per two bars: Em, C, D, Em, Em, G, D, Bm, repeating. Frame drum on a soft
heartbeat pattern, hurdy-gurdy drone, low wordless male choir pads, a lone kantele or
nyckelharpa melody. A small Viking village at peace by a cold sea. Calm, steady, no build-up,
the end flows straight into the start.
```

### 30 Aesir tension (`mus_aesir_tension`)

Trim the chosen take to exactly 137.143 s (section 1), not the length the tool gives.

```text
Nordic battle folk, instrumental, 84 BPM, E Dorian, 4/4, 2 minutes 20 seconds, seamless loop.
Exactly the same chords and tempo as the calm piece: one chord per two bars, Em, C, D, Em,
Em, G, D, Bm, repeating. Keep the frame drum, hurdy-gurdy drone and low choir, and add heavy
war drums, deep lur horns and tagelharpa. Monsters are at the gate. Driving but not frantic,
constant energy, no breakdowns, the end flows straight into the start.
```

### 40 Greek calm (`mus_greek_calm`)

```text
Ancient Greek pastoral, instrumental, 96 BPM, A Dorian, 4/4, 2 minutes, seamless loop.
Chords, one per two bars: Am, G, F, E, Am, C, G, E, repeating. Lyre arpeggios, aulos (double
reed) melody, light frame drum and finger cymbals, soft strings underneath. A sunny town
square below a marble temple. Calm and bright, no build-up, the end flows into the start.
```

### 50 Greek tension (`mus_greek_tension`)

```text
Ancient Greek battle music, instrumental, 96 BPM, A Dorian, 4/4, 2 minutes, seamless loop.
Exactly the same chords and tempo as the calm piece: one chord per two bars, Am, G, F, E, Am,
C, G, E, repeating. Keep the lyre and aulos, add timpani, low brass, marching snare and a
bronze shield-clash on the downbeats. A phalanx braces for the charge. Driving, constant
energy, no breakdowns, the end flows straight into the start.
```

### 60 Egyptian calm (`mus_egyptian_calm`)

Trim the chosen take to exactly 128.0 s (section 1), not the length the tool gives.

```text
Ancient Egyptian ambient, instrumental, 90 BPM, D Phrygian dominant (Hijaz), 4/4, 2 minutes
10 seconds, seamless loop. Chords, one per two bars: D, Eb, D, Cm, D, Eb, Gm, D, repeating. Oud melody,
ney flute, soft darbuka pattern, a low drone of strings. Dawn over the Nile, a desert town
waking up. Calm and warm, no build-up, the end flows into the start.
```

### 70 Egyptian tension (`mus_egyptian_tension`)

Trim the chosen take to exactly 128.0 s (section 1), not the length the tool gives.

```text
Ancient Egyptian battle music, instrumental, 90 BPM, D Phrygian dominant (Hijaz), 4/4,
2 minutes 10 seconds, seamless loop. Exactly the same chords and tempo as the calm piece: one chord per
two bars, D, Eb, D, Cm, D, Eb, Gm, D, repeating. Keep the oud and ney, add deep frame drums,
darbuka rolls, sistrum rattles and low brass stabs. Jackal warriors in the dunes. Driving,
constant energy, no breakdowns, the end flows straight into the start.
```

### 80 Boss (`mus_boss`)

```text
Dark epic boss battle, instrumental, 128 BPM, C minor, 4/4, 90 seconds, seamless loop.
All three ancient palettes at once: war drums and lur horns (Norse), timpani and brass
(Greek), darbuka and oud riffs (Egyptian), with low wordless choir and driving low strings.
A monster from myth wakes and the whole town fights it. Heavy, fast, relentless, no quiet
section, the end flows straight into the start.
```

### 90 Victory sting (`mus_victory`)

```text
Short triumphant fanfare, instrumental, 90 BPM, D major, 8 seconds, no loop.
Rising horns and strings over a timpani roll, ending on a bright held D major chord that
rings out. The town is saved.
```

### 100 Defeat sting (`mus_defeat`)

```text
Short sorrowful sting, instrumental, 60 BPM, D minor, 8 seconds, no loop.
A low drone and a falling cello line over a slow last drum hit, ending on a dark held D minor
chord that fades. The town hall has fallen.
```

## 3. Making the twins line up

- **Make the calm piece first,** then the tension piece. If the tool can extend, remix or
  "cover" an existing track, start the tension piece from the calm one and add the
  instruments of its prompt: that keeps the timing identical.
- **Otherwise:** generate the tension piece from its prompt, then line both up in an audio
  editor (Audacity is free): cut both to start on the first downbeat and trim both to the exact
  loop length.
- **Test:** play both at once, the tension one muted halfway through. If the beat stutters at
  the switch, the twins are off; re-trim or regenerate.

## 4. Export and hand-off

- **Trim** to the loop length in section 1, cut at a zero crossing, and do not fade the ends of
  a loop (fades click at the seam). Stings keep their natural tail.
- **Loudness:** loops about -16 LUFS, stings about -14 LUFS, so nothing jumps when the game
  switches. Peaks below -1 dB.
- **Formats:** `.ogg` and `.m4a`, stereo, 44.1 kHz, about 96 kbps (`audio.md` section 4).
- **File names:** the id plus the extension, for example `mus_aesir_calm.ogg`.
- **For the manifest (required for every file, `CLAUDE.md`):** the licence (the tool's terms
  must allow use in a game; no file ships without it) and the source: the tool's name, the
  date, and that it was made on Stefan's account. Art adds the row with `loopStartMs`,
  `loopEndMs`, `bpm` and `key` from section 1.

## 5. Proposed backlog rows

| Role   | Order | Row                                                                                 |
| ------ | ----- | ----------------------------------------------------------------------------------- |
| Stefan | 10    | Batch M1: title, Aesir calm and tension, both stings (prompts 10, 20, 30, 90, 100)  |
| Stefan | 20    | Batch M2: Greek and Egyptian twins, boss loop (prompts 40 to 80)                    |
| Art    | 10    | Ship the files to `public/assets/audio/` with manifest rows (loop points, bpm, key) |
