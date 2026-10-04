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
- 2026-10-04: Graybox derivations (Sim 20): move speed = 40 + dex * 8 world units/s, hp = sta * 8 +
  str * 4. Revisit in the M4 balance pass.
- 2026-10-04: Graybox combat (Sim 30): damage = str (min 1), attack time = weapon base / (1 + dex *
  0.1), dodge = 0.9 * dex / (dex + 10), aggro range = 150 + per * 15, monster leash 420 from the
  lair. No armor until gear exists. Heroes are knocked out, monsters die.
- 2026-10-04: Bounty amounts 25/50/100/200 for the graybox (Scene 30). A bounty on a monster is a
  spot for now; Sim 60 makes it follow the target.
- 2026-10-04: Workers message Lead only when their PR is green; Lead stops watching PR events.
  Lead messages Stefan only for tests, decisions and ChatGPT steps (less noise for Stefan).
