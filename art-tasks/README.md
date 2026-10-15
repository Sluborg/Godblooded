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
| Upload log (GitHub)   | `art-inbox/STATUS.md` on branch `art-inbox` (append at the bottom)                               |

## Tracks: one chat per track

| Track     | Makes                                  |
| --------- | -------------------------------------- |
| heroes    | Godblood heroes, all classes and tiers |
| monsters  | mythic monsters, all types and tiers   |
| buildings | town buildings and lairs, all tiers    |
| terrain   | ground tiles, trees, rocks, props      |
| ui        | icons, flags, buttons, effects         |

A chat works on one track for its whole life. Only take batches and redo rows of that track.

**Files win over memory.** Before every command, fetch `NEXT.md`, `STYLE.md`, `QA.md` and the
batch file fresh (with `?t=<current time>`). Make **only** items listed in a batch marked
**Ready** in that fresh `NEXT.md`. Never make anything from memory of earlier chats or old
batches (old looks, old gods, old ids): if you remember something the files do not say now, it
is out of date. Nothing Ready for your track: say so and stop.

**Consistency:** heroes and monsters keep the same character across tiers and views. When a batch
says "reference: <file>", fetch that shipped image from the repo and match it exactly (face,
proportions, colours), changing only what the batch asks.

## Orders and replies (Art runs the chats)

Stefan is out of the loop: **Art gives the orders, the chats answer Art.** Stefan's only phrase
is **"follow system"** (below); everything he used to type is now an order.

- **Orders:** `art-wake/orders/<track>.md` on branch `art-wake` (fetch raw with `?t=`). Art
  appends numbered orders, `O-<n>: <what to do>` (for example "upload your withheld finals of
  ui_item_axe", "remake bld_plot per B13.md item 1", "run all", "pause track", "stop"). A push of an
  order also rings the bell.
- **Replies:** `art-inbox/replies/<track>.md` on branch `art-inbox` (create it if missing;
  append only, same 409 rule as the upload log). After each order write one line:
  `O-<n> | <date time> | done | <ids uploaded>` or `O-<n> | <date time> | skipped | <why>` or
  `O-<n> | <date time> | question | <question>`.
- **Your last done order** is the highest `O-<n>` in your replies file. Do every newer order, in
  order, then continue with the first Ready batch of your track (`NEXT.md`).
- **An order never makes items from a Draft batch**: only items of Ready batches (Stefan's go,
  via Lead) and redo or upload orders for those items. An order naming a Draft batch: skip it and
  write the question in replies.
- **Questions go to Art, never to Stefan, never in the chat** (Stefan loses them there). If an
  order or a batch is unclear or blocked, write one line in replies:
  `question | <batch> | <the question, the options, your pick>`, then go on with your pick (the
  safe default; never a Draft-batch item) or skip that item. Never wait for an answer; Art answers with a new order.
- **"pause track"**: do nothing more for your track until an order says "resume". **"stop"**:
  stop the current run after the image in hand is uploaded.

**"follow system"** (Stefan's one phrase): forget earlier state and batches; fetch fresh
`README.md`, `STYLE.md`, `QA.md`, `NEXT.md` and your orders file; set up or confirm the wake-up
watch (pull request #3, new commits only); write `follow system | <date time> | watching` in your
replies file; then work on your own from orders and `NEXT.md` until an order or Stefan says
"stop".

## Wake-ups

The draft pull request **Godblooded art wake** (https://github.com/Sluborg/Godblooded/pull/3,
branch `art-wake`) is the bell. Art pushes a commit to it when there is new work;
`art-wake/TRACKS.md` on that branch lists the tracks with new work.

**The watch (every run costs Stefan's usage, so keep it narrow):**

- Watch **only pull request #3**, and **only new commits** on it. Not comments, reviews, checks
  or merges, and **never the whole repository** (the repo has many pull requests a day; each
  event would start a run). If your watch cannot be limited to pull request #3, do not create
  it: tell Stefan instead.
- When it fires, read **only** your orders file `art-wake/orders/<track>.md` (branch `art-wake`)
  and `art-wake/TRACKS.md`. If there is no order newer than your last reply and your track is not
  listed, stop at once: no other reads, no report.
- Otherwise: do the new orders (see "Orders and replies"), then, if your track is listed, read
  the upload log. If the next batch of your track has a `started` line from the **last 90
  minutes** and no `uploaded` line, a run is already working on it: stop. Otherwise do "run
  all".

**No double work:** there is exactly **one chat per track**. When you start a batch, append
`<batch> | <date time> | <track> | started` to `art-inbox/STATUS.md`.

- A batch with an `uploaded` line is done: skip it.
- A batch of your track with a `started` line **older than 90 minutes** and no `uploaded` line
  was interrupted (for example by a usage limit): continue it, skipping items already in the
  Drive folder.
- **Upload each image as soon as it is made**, not at the end of the batch, so nothing is lost
  if a run stops halfway. Write the `uploaded` log line when the whole batch is in.
- If writing the log fails with a conflict (HTTP 409), fetch the file again, check whether your
  line is already there, and append it once if not. Never stop because of a conflict.
- A direct command from Stefan always runs, even inside the 90 minutes; make each image once.

## Commands from Stefan (still work; prefer "follow system")

- **"<track> start"** (e.g. "heroes start"): forget earlier batches and looks; remember the track;
  fetch fresh `STYLE.md`, `QA.md`, `NEXT.md`, `REDO.md`, `docs/asset-spec.md` and the batch file of
  your first Ready batch; check you can upload to the Drive folder and write to branch
  `art-inbox`; set up the wake-up watch; report in 3-5 lines; then do "test".
- **"test"**: make only the first item of your next batch, upload it as `test--<id>.png`, log it,
  report. It does not count as making the batch.
- **"next"**: re-read `STYLE.md`, `QA.md`, `REDO.md`, `NEXT.md` and the upload log. Open redo rows of your track
  first, otherwise the first Ready batch of your track not in the log. Make every item as its own
  image, deliver, report (batch, ids, anything that looked wrong).
- **"run all"**: repeat "next" until nothing is left for your track, then report once. Stop and
  report if an upload fails.
- **"status"**: what you made in this chat and what is left for your track.
- **"watch"**: set up the wake-up watch now (see "Wake-ups": pull request #3, new commits
  only), replacing any older watch of this chat.

## Delivering

- **Images:** unchanged PNG, uploaded to the Drive folder "Godblooded art-inbox", named
  `<batch>--<id>.png` (e.g. `B2--hero_warrior_t1_front.png`). A redo reuses the name. Never resize,
  crop, convert or recompress.
- **Upload log:** after each batch append `<batch> | <date time> | <track> | <ids> | uploaded` to
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
- **Check every image against `QA.md` at full size before uploading it.** A fail is redone with
  a corrective prompt, up to 3 tries; then report the fault instead of uploading.
