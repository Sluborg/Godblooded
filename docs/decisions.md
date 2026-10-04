# Decisions

Lead owns this file. One dated line per decision that changes how the game or the team works.

- 2026-10-04: Project started. Majesty-inspired kingdom builder with roguelite runs, Godblood
  lore (StefanCoda "Godblood Knowledge"). Phaser 3 + Vite + TS, landscape 1280x720, phone first.
- 2026-10-04: Text prototypes (Guild Ledger, Asset Report) judged not fun by Stefan: the player
  must see the heroes act. Hence graphics first, graybox before art.
- 2026-10-04: Every hero, monster and building has 3 tiers. Units have 2 painted views (front,
  back), left is mirrored. Party level-up = pick 1 of 3 upgrades; tier-ups at party levels 3, 6.
- 2026-10-04: Four Claude sessions (Lead, Sim, Scene, Art) and one ChatGPT chat per art track.
  Inboxes for talk, one-shot Routines for waking (`docs/collaboration.md`).
- 2026-10-04: Worker sessions cannot push to `main` (auto-mode blocks it as a deploy). Workers send
  inbox, sessions and art-tasks edits as docs-only PRs; Lead merges them in the same round.
- 2026-10-04: Worker messages go by `send_message` (instant wake plus content), not inbox edits:
  inbox appends in parallel PRs conflicted on every merge. Inboxes, backlog and sessions are
  Lead-only files; Lead keeps them current.
- 2026-10-04: First `src/sim/api.ts` (PR #4): `createWorld(seed, data)`, `step(world, dtMs)` with
  fixed 50 ms ticks (Scene passes frame time times game speed), `snapshot(world)` returns a plain
  copy and drains `events`, `command(world, cmd)` returns `{ok, id}` or `{ok:false, reason}`.
  Commands: `build`, `placeBounty`. Scene imports nothing else from `src/sim/`.
