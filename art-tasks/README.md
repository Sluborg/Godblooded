# Art tasks for ChatGPT

The complete manual for the image generator (ChatGPT). It changes over time, so always fetch the
latest. Art (a Claude session) writes the tasks; you generate and upload; Art reviews and ships.

Fetch repo files as `https://raw.githubusercontent.com/Sluborg/Godblooded/main/<path>?t=<current time>`.

## Where things are

| What                  | Where                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| This manual           | `art-tasks/README.md`                                                                            |
| House style           | `art-tasks/STYLE.md` (every image, every chat)                                                   |
| Technical spec        | `docs/asset-spec.md` (views, framing, tiers)                                                     |
| Batch list            | `art-tasks/NEXT.md`                                                                              |
| Redo requests         | `art-tasks/REDO.md` (do these first)                                                             |
| Batch tasks           | `art-tasks/B<n>.md`                                                                              |
| Upload folder (Drive) | "Godblooded art-inbox": https://drive.google.com/drive/folders/1vVdOsRWXyz571xhMPKcae_loW-8AJgpC |
| Upload log (GitHub)   | `art-inbox/STATUS.md` on branch `art-inbox`                                                      |

## Tracks: one chat per track

| Track     | Makes                                  |
| --------- | -------------------------------------- |
| heroes    | Godblood heroes, all classes and tiers |
| monsters  | mythic monsters, all types and tiers   |
| buildings | town buildings and lairs, all tiers    |
| terrain   | ground tiles, trees, rocks, props      |
| ui        | icons, flags, buttons, effects         |

A chat works on one track for its whole life. Only take batches and redo rows of that track.

**Consistency:** heroes and monsters keep the same character across tiers and views. When a batch
says "reference: <file>", fetch that shipped image from the repo and match it exactly (face,
proportions, colours), changing only what the batch asks.

## Wake-ups

The draft pull request **Godblooded art wake** (branch `art-wake`) is the bell. Art pushes a
commit to it when there is new work; `art-wake/TRACKS.md` on that branch lists the tracks with
work. Watch that pull request (opened, reopened, new commits). When it fires: read
`art-wake/TRACKS.md`; if your track is listed, do "run all". If not, do nothing.

**No double work:** when you start a batch, append `<batch> | <date time> | started` to
`art-inbox/STATUS.md`. Skip a batch with a `started` line from the last 90 minutes or an
`uploaded` line.

## Commands from Stefan

- **"<track> start"** (e.g. "heroes start"): remember the track; read `STYLE.md`, `NEXT.md`,
  `REDO.md` and `docs/asset-spec.md`; check you can upload to the Drive folder and write to branch
  `art-inbox`; set up the wake-up watch; report in 3-5 lines; then do "test".
- **"test"**: make only the first item of your next batch, upload it as `test--<id>.png`, log it,
  report. It does not count as making the batch.
- **"next"**: re-read `REDO.md`, `NEXT.md` and the upload log. Open redo rows of your track
  first, otherwise the first Ready batch of your track not in the log. Make every item as its own
  image, deliver, report (batch, ids, anything that looked wrong).
- **"run all"**: repeat "next" until nothing is left for your track, then report once. Stop and
  report if an upload fails.
- **"status"**: what you made in this chat and what is left for your track.
- **"watch"**: set up the wake-up watch now, if this chat has none.

## Delivering

- **Images:** unchanged PNG, uploaded to the Drive folder "Godblooded art-inbox", named
  `<batch>--<id>.png` (e.g. `B2--hero_warrior_t1_front.png`). A redo reuses the name. Never resize,
  crop, convert or recompress.
- **Upload log:** after each batch append `<batch> | <date time> | <ids> | uploaded` to
  `art-inbox/STATUS.md` on branch `art-inbox`. Never write to `main`; never edit other files.
- **Fallbacks if Drive fails:** PNG to GitHub `art-inbox/<batch>/<id>.png` on branch
  `art-inbox`; if too large, base64 text `<id>.png.b64` (split `.b64.001`, `.002`, ... if needed).
  Last resort: show the images in the chat, labelled with their ids.

## Rules for every image

- One item per image, nothing else in it. No text, watermark, shadow or glow outside the object.
- Flat background in the key colour the batch gives (green #00FF00 unless it says otherwise).
  **Green or mint in the object:** use flat magenta #FF00FF instead.
- Square canvas at your normal output size. Framing per `docs/asset-spec.md`.
- Follow `STYLE.md`. If an item is unclear or impossible, make the rest, skip it, say why.
