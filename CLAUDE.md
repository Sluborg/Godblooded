# Godblooded, conventions

Auto-loaded by every Claude Code session in this repo. Read `docs/collaboration.md` next: it
says which session you are, what you own, and how sessions talk and wake each other.

## The game in one paragraph

Majesty-inspired kingdom builder with roguelite runs, landscape, phone first. The player builds
a town; Godbloods (mortal-born children of the Norse, Greek and Egyptian gods) form parties and
hunt monsters on their own. The player never commands a hero: only buildings, bounty flags and
the upgrade a party gets when it levels up. Heroes, monsters and buildings each have 3 visual
tiers. Full design: `docs/game-design.md` (Lead keeps it current).

## Stefan

- Owner. Works from a phone. Speaks to **Lead only**; Lead relays.
- Summaries for Stefan: bottom line first, tight bullets, file paths not code, no em-dash.
- He decides design and scope. Everything technical, the sessions decide themselves.

## Stack

- Phaser 3 + Vite + TypeScript (strict), PWA (`vite-plugin-pwa`, auto-update), vitest.
- Landscape design resolution 1280x720, `Phaser.Scale.FIT`. Touch targets >= `MIN_TOUCH` (80).
- ESLint + Prettier. Before any push: `npm run lint && npm run format:check && npm test && npm run build`.

## Layout

```
src/sim/      pure TypeScript simulation: no Phaser, no DOM, no Math.random (use sim/rng.ts)
src/data/     content as data rows: classes, monsters, buildings, upgrades, tiers
src/scenes/   Phaser scenes (render the sim, take input, never hold game rules)
src/ui/       reusable Phaser UI pieces
public/assets/  shipped art + manifest.json
art-tasks/    ChatGPT manual and batch queue (fetched raw by ChatGPT)
docs/         design, collaboration, inboxes, requests, sessions
```

## Rules

- **Sim is the truth.** Game rules live in `src/sim/` and are unit-tested and seeded. Scenes
  read a snapshot and send commands; they never decide outcomes.
- **Data-driven.** A new class, monster, building, upgrade or tier is a data row in `src/data/`.
  If it needs code, generalize once, then keep adding rows.
- **Art by manifest id.** Code uses ids from `public/assets/manifest.json`
  (`hero_<class>_t<tier>_<view>`, `mon_<type>_t<tier>_<view>`, `bld_<type>_t<tier>`, see
  `docs/asset-spec.md`). A missing id falls back to a placeholder shape: the game never breaks
  for lack of art. No downloaded art; every asset has license and source in the manifest.
- **Saves:** versioned; changing the save shape bumps the version and adds a migration.
- **Own your files.** Edit only files your role owns (`docs/collaboration.md`). Need a change
  elsewhere: write to that owner's inbox.

## Git

- Work on a branch, open a PR to `main`. CI (lint, format, test, build) must be green.
- Self-review the diff before the PR (`code-review` skill). Bigger PRs: comment `@codex review`
  on the PR and address its findings.
- **Lead merges.** Workers never merge their own PRs. Lead never merges red CI.
- `main` deploys to https://sluborg.github.io/Godblooded/ automatically.
- Small PRs, one topic each, conventional commit messages.

## Hard stops

- No commits straight to `main` (except Lead's docs-only commits).
- No editing another role's files; no merging red CI; no breaking saves.
- Never claim done without running the checks. Never invent APIs; if unsure, say so.
