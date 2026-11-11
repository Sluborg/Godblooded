# Heads track: the whole workflow

You paint **hero heads** for Godblooded, one head per image, over a template. **Art** (a Claude
session) gives the orders and imports what you deliver. Stefan does not talk to you: never ask him
anything, never wait for him. Everything you need is in the repo.

Fetch every repo file fresh, with `?t=<current time>` on the raw URL (cached copies hide changes):
`https://raw.githubusercontent.com/Sluborg/Godblooded/<branch>/<path>?t=<current time>`.

## Files

| What                   | Branch      | Path                                                                                             |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| Start (a new chat)     | `main`      | `art-tasks/heads/START.md`                                                                       |
| This workflow          | `main`      | `art-tasks/heads/README.md`                                                                      |
| The prompt rules       | `main`      | `art-tasks/heads/PROMPT.md`                                                                      |
| The template (image)   | `main`      | `art-tasks/heads/head-template.png`                                                              |
| Your orders            | `art-wake`  | `art-wake/orders/heads.md`                                                                       |
| Your replies           | `art-inbox` | `art-inbox/replies/heads.md` (create it if missing; append only)                                 |
| Upload log             | `art-inbox` | `art-inbox/STATUS.md` (append at the bottom)                                                     |
| Upload folder (Drive)  |             | "Godblooded art-inbox": https://drive.google.com/drive/folders/1vVdOsRWXyz571xhMPKcae_loW-8AJgpC |
| Upload fallback (repo) | `art-inbox` | `art-inbox/heads/<file name>` (see "Delivering")                                                 |

## Every run

1. Fetch fresh: this file, `PROMPT.md`, the template, and your orders file.
2. Read the orders **from the bottom up**. Your last handled order is the highest `O-<n>` in your
   replies file. If there is no newer order, stop at once: no other reads, no report.
3. For the oldest order you have not handled, **before painting anything**, append one line to
   your replies file: `O-<n> | <date time> | confirmed | starting`.
4. Paint each head the order lists, following `PROMPT.md`, with the template as the image
   reference. Check each against `PROMPT.md` "Check" before you deliver it; redo a failing head up
   to 3 times, then skip it and say why in the done line.
5. Deliver each head as soon as it passes (see "Delivering"), not at the end.
6. When the order is finished, append:
   `O-<n> | <date time> | done | <file names, each with where it is: drive or repo>`.
7. Then do the next newer order, if any. An order ending "then pause" ends the run.

## Delivering

- **Name:** `heads--O-<n>--<id>.png`, the id from the order (for example
  `heads--O-1--head_thorblood_01.png`). Unchanged PNG: never resize, crop, convert or recompress.
- **Drive first:** upload to the Drive folder above. Then **check it is really there** (list the
  folder or open the file). An upload you cannot see in the folder did not happen.
- **If Drive fails or you cannot attach the generated image as a file:** commit the PNG to branch
  `art-inbox` as `art-inbox/heads/<file name>`. If that fails too, commit base64 text
  `art-inbox/heads/<file name>.b64` (split `.b64.001`, `.002` if needed).
- **Log:** append `heads O-<n> | <date time> | heads | <file names> | uploaded` to
  `art-inbox/STATUS.md`.
- A write to `art-inbox` that fails with a conflict (HTTP 409): fetch the file again, check
  whether your line is already there, append it once if not. Never stop because of a conflict.

## When something goes wrong

Write one line and stop the run; Art answers with a new order. Never retry in a loop.

- Image generation refused or rate-limited (quota):
  `O-<n> | <date time> | stopped | quota: <what the tool said>`.
- Every delivery route failed: `O-<n> | <date time> | stopped | upload: <what failed, each route>`.
- An order is unclear: `O-<n> | <date time> | question | <the question, the options, your pick>`,
  then go on with your pick.

## Rules

- Only make what an order lists. Never paint from memory of earlier chats or orders.
- One head per image, nothing else in it: no text, no labels, no template marks, no body.
- Never write to `main`. Write only your replies file, the upload log and `art-inbox/heads/`.
