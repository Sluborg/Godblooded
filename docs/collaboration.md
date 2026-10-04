# How the sessions work together

Four Claude Code sessions build Godblooded in parallel, plus ChatGPT chats that draw the art.
Every session reads this file at the start of every wake.

## Roles

| Role  | Job                                                                       | Talks to                    |
| ----- | ------------------------------------------------------------------------- | --------------------------- |
| Lead  | Design, backlog, reviews and merges every PR, the only contact for Stefan | Stefan, all sessions        |
| Sim   | The simulation: units, AI, parties, combat, economy, runs. Pure TS, tests | Lead, Scene                 |
| Scene | Phaser: map, camera, rendering the sim, input, HUD, menus, phone feel     | Lead, Sim, Art              |
| Art   | Writes ChatGPT batches, checks and ships images, the asset spec           | Lead, Scene, ChatGPT chats  |
| GPT   | ChatGPT chats, one per art track; fetch `art-tasks/README.md` and draw    | Art (via the art wake bell) |

Session ids, models and wake bells: `docs/sessions.md`. On your first start, fill in your own
row there (your id comes from `get_session` with no arguments).

## File ownership

Only the owner edits. Everyone else asks through the owner's inbox.

- **Lead:** `CLAUDE.md`, `docs/game-design.md`, `docs/backlog.md`, `docs/decisions.md`,
  `docs/collaboration.md`, `project-status.md`, `src/data/` (design numbers), `README.md`.
- **Sim:** `src/sim/` (and its tests). Owns the contract `src/sim/api.ts` that Scene consumes.
- **Scene:** `src/scenes/`, `src/ui/`, `src/main.ts`, `src/config.ts`, `index.html`.
- **Art:** `art-tasks/`, `public/assets/`, `assets/source/`, `scripts/art/`,
  `docs/asset-spec.md`, `docs/art-requests.md` (status column; anyone adds rows).
- **Shared, small careful commits:** `package.json`, `vite.config.ts`, `.github/`, `docs/sessions.md`
  (own row only), `docs/inbox/*.md` (append only).

## Talking: inboxes

Each role has an inbox: `docs/inbox/lead.md`, `sim.md`, `scene.md`, `art.md`.

- **To ask, tell or hand over:** append an entry to the **recipient's** inbox:

  ```
  ### 2026-10-04 15:10 | from Sim | open
  What you need, in a few lines. Link the PR, file or backlog row.
  ```

- **The owner** handles each `open` entry in the same round: does it, answers it (append a line
  `> Lead: answer` under the entry), or turns it into a backlog row. Then flips `open` to `done`.
- Inboxes are append-only for everyone except the status word. Pull first
  (`git pull --rebase origin main`), append, run `npx prettier --write docs/inbox`, commit
  `docs(inbox): <role> <topic>`, and push straight to `main` (inbox, `docs/sessions.md` and Art's
  `art-tasks/` are the only direct-to-main exceptions; they do not trigger a deploy).
- Decisions never live only in an inbox: the changed rule goes into the file it belongs to.

## Waking each other

All sessions run under Stefan's one account, so GitHub comments between them are filtered as
self-echo and **do not wake anyone**. The bell is a one-shot Routine fired into the target
session:

- **Ring:** `create_trigger` (Claude_Code_Remote MCP) with `persistent_session_id` = the
  target's session id from `docs/sessions.md`, `run_once_at` = now + 1 minute (UTC, RFC3339),
  `initiation: "own_followup"`, `name: "wake <role>"`, and `prompt`:
  `wake <role>: <why in one line>. Read docs/inbox/<role>.md.`
- **Write first, ring second.** The inbox entry carries the content; the ring only says "look".
- **Ring only when the other side must act before its next round:** a PR ready for review, a
  blocker, a contract change, a merge that unblocks them. FYI goes in the inbox without a ring.
- **Safety net:** on first start every session creates its own recurring Routine (self-bind,
  every 2 hours, `CRON_TZ=Europe/Stockholm`), prompt: `safety-net <role>: pull main, read
docs/inbox/<role>.md and docs/backlog.md, act on anything open for you; if nothing, end
silently.` A missed ring then costs at most 2 hours. Record its trigger id in
  `docs/sessions.md`.
- **ChatGPT:** Art rings the GPT chats by pushing a commit to the draft PR "Godblooded art wake"
  (branch `art-wake`, file `art-wake/TRACKS.md` lists tracks with work). The GPT chats watch
  that PR; it is never merged.

## Work flow

1. Lead keeps `docs/backlog.md`: rows per role, ordered 10, 20, 30, each small enough for one
   PR. Lead assigns by adding rows, writing to the inbox and ringing.
2. A worker takes its top `Open` row, sets it `Doing`, branches (`<role>/<topic>`), builds,
   runs the checks, self-reviews, opens a PR, sets the row `Review`, writes to Lead's inbox and
   rings Lead.
3. Lead reviews (and asks `@codex review` on bigger PRs), requests changes through the worker's
   inbox, or merges on green and sets the row `Done`.
4. Work that crosses roles is split: Sim ships the rule plus its API, Scene ships the view.
   Scene may stub against an agreed `api.ts` shape before Sim lands.

## Contracts

- **Sim ↔ Scene:** `src/sim/api.ts` only. Scene never imports anything else from `src/sim/`.
  Changing it: Sim writes to Scene's inbox first.
- **Art ↔ Scene:** manifest ids. Scene loads every manifest entry and falls back to a placeholder
  when an id is missing. Formats: `docs/asset-spec.md`.
- **Art requests:** anyone adds a row to `docs/art-requests.md`; Art turns rows into ChatGPT
  batches and sets them `Done` with the manifest ids.

## Status for Stefan

`project-status.md` is Lead's one-screen summary. Lead updates it whenever something ships
and is the one who tells Stefan what to test.
