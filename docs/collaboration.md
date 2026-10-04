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
- **Lead also:** `docs/sessions.md`, `docs/inbox/*.md` (see "Talking").
- **Shared, small careful commits:** `package.json`, `vite.config.ts`, `.github/`.

## Talking: messages and inboxes

Only Lead pushes to `main` (worker sessions are blocked: `main` deploys). So workers never edit
inbox files, `docs/backlog.md` or `docs/sessions.md`, not even inside a PR: parallel PRs that
append to the same file conflict on every merge.

- **Message = ring.** To ask, tell or hand over, call `send_message` (Claude_Code_Remote MCP)
  with the recipient's session id from `docs/sessions.md`. It wakes the recipient at once and
  carries the content. Format: `<from role> to <role>: <what, in a few lines; link PR, file or
backlog row>`. Copy Lead on anything that changes a contract, the backlog or a decision.
- **Inbox = Lead's durable log.** `docs/inbox/<role>.md` holds what Lead hands a role
  (assignments, review fixes, answers) so it survives a restart. Only Lead writes it. On every
  wake a worker reads its inbox; entries marked `open` are for it. When done, it tells Lead in a
  message and Lead flips the word to `done`.
- **Backlog status:** the worker tells Lead "row X Doing / Review" in its message; Lead updates
  `docs/backlog.md`.
- **Art's `art-tasks/`** changes go as docs-only PRs (`art/docs-<topic>`); Lead merges them the
  same round, because ChatGPT reads `art-tasks/` from `main`.
- Decisions never live only in a message: the changed rule goes into the file it belongs to.

## Waking each other

All sessions run under Stefan's one account, so GitHub comments between them are filtered as
self-echo and **do not wake anyone**. `send_message` is the bell (above).

- **Message only when the other side must act before its next round:** a PR ready for review, a
  blocker, a contract change, a merge that unblocks them.
- **Fallback ring:** if `send_message` fails, `create_trigger` with `persistent_session_id` = the
  target's id, `run_once_at` = now + 1 minute (UTC, RFC3339), `initiation: "own_followup"`,
  `name: "wake <role>"`, and the message as `prompt`.
- **Safety net:** on first start every session creates its own recurring Routine (self-bind,
  every 2 hours, `CRON_TZ=Europe/Stockholm`), prompt: `safety-net <role>: pull main, read
docs/inbox/<role>.md and docs/backlog.md, act on anything open for you; if nothing, end
silently.` A missed message then costs at most 2 hours. Lead records its trigger id in
  `docs/sessions.md`.
- **ChatGPT:** Art rings the GPT chats by pushing a commit to the draft PR "Godblooded art wake"
  (branch `art-wake`, file `art-wake/TRACKS.md` lists tracks with work). The GPT chats watch
  that PR; it is never merged.

## Work flow

1. Lead keeps `docs/backlog.md`: rows per role, ordered 10, 20, 30, each small enough for one
   PR. Lead assigns by adding rows, writing to the inbox and ringing.
2. A worker takes its top `Open` row, branches (`<role>/<topic>`), builds, runs the checks,
   self-reviews, opens a PR (code only, no inbox or backlog edits), **waits until CI on the PR
   is green** (fix it if red), then messages Lead. Lead does not watch PRs; the message is the
   signal that a PR is ready to merge.
3. Lead reviews (and asks `@codex review` on bigger PRs), writes fixes to the worker's inbox and
   messages it, or merges on green and sets the row `Done`.
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
