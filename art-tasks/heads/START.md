# Heads track: start here (a new chat)

You are starting with no earlier context. Read this whole file, then do the four steps at the end.

## Who we are

- **Godblooded** is a mobile kingdom-builder game. Its repository is `Sluborg/Godblooded` on
  GitHub (public). Heroes in the game are drawn in code; **you paint their heads**, one head per
  image, over a template, and we put them on the code-drawn bodies.
- **Art** is a Claude session. It writes your orders, imports what you deliver and checks it.
- **Lead** is a Claude session that directs Art and the other sessions.
- **Stefan** owns the game. He only started this chat with one line. **Never ask him anything**
  and never wait for him: questions go in your replies file (below), and Art answers with an order.

## Where everything lives

Fetch every file fresh, adding `?t=<current time>` to the raw URL (cached copies hide changes):

| What                        | Raw URL                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| This file                   | `https://raw.githubusercontent.com/Sluborg/Godblooded/main/art-tasks/heads/START.md?t=<current time>`          |
| The heads workflow (rules)  | `https://raw.githubusercontent.com/Sluborg/Godblooded/main/art-tasks/heads/README.md?t=<current time>`         |
| The prompt rules            | `https://raw.githubusercontent.com/Sluborg/Godblooded/main/art-tasks/heads/PROMPT.md?t=<current time>`         |
| The template (image)        | `https://raw.githubusercontent.com/Sluborg/Godblooded/main/art-tasks/heads/head-template.png?t=<current time>` |
| The art manual (background) | `https://raw.githubusercontent.com/Sluborg/Godblooded/main/art-tasks/README.md?t=<current time>`               |
| Your orders                 | `https://raw.githubusercontent.com/Sluborg/Godblooded/art-wake/art-wake/orders/heads.md?t=<current time>`      |
| Your replies (you write)    | `art-inbox/replies/heads.md` on branch `art-inbox` (create it if missing; append only)                         |

The **heads workflow** (`art-tasks/heads/README.md`) is your rulebook; the art manual is
background for the other tracks. Where they differ, the heads workflow wins.

## Being woken

Art pushes a commit to the draft pull request **"Godblooded art wake"**
(https://github.com/Sluborg/Godblooded/pull/3, branch `art-wake`) whenever there is a new order
for any track, and writes the order to your orders file. You must notice new orders by yourself.

- **Primary: a pull request watch.** Watch **only pull request #3**, and **only new commits** on
  it (the art manual's "Wake-ups"). Never the whole repository, never comments, reviews or
  checks: every event costs a run. Earlier chats of this project did exactly this ("PR3
  new-commit watch enabled"), so try it first.
- **Fallback: a scheduled task**, only if the watch cannot be set up: a recurring task in this
  chat that does one heads run (the workflow's "Every run"), about once an hour.
- If you can set up neither, say so plainly.

## Do now, in order

1. **Read** the heads workflow and the art manual (fresh, with `?t=`).
2. **Set up your wake** as above. Note exactly what you created, with its interval, or why you
   could not.
3. **Report how you work.** Append one block to `art-inbox/replies/heads.md` and give the same
   text as your chat reply:

   ```
   hello | <date time> | heads
   - tools: <GitHub read and write, and how (connector or API); fetching raw URLs; image
     generation; Google Drive upload; anything else>
   - wake: <exactly what you set up, in the words your tool used (for example "PR #3
     new-commit watch enabled"), or why you could not>
   - interval: <how often you check>
   - cannot: <what you cannot do from our instructions>
   - quota: <what you know about your image generation limits>
   - unclear: <anything in our files that is unclear or impossible for you, or "nothing">
   ```

   If you cannot write to GitHub, say so in your chat reply; that is the most important line.

4. **Wait for orders.** Do not paint anything until an order tells you to. The first order is a
   wake test without images.
