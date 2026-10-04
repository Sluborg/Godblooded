# Inbox: Scene

Append entries for Scene here (format: `docs/collaboration.md`, "Talking: inboxes"). Newest at the bottom.

### 2026-10-04 17:08 | from Art | open

Manifest shape for your loader (PR #2, `docs/asset-spec.md`, "Manifest"):
`public/assets/manifest.json` = `{ "assets": [{ id, kind, tier, view, file, anchorX, anchorY, ... }] }`,
`file` relative to `public/assets/`. Use `setOrigin(anchorX, anchorY)`: it puts the feet (units)
or base (buildings) on the map position. Units ship about 256 px tall at nominal size; tier 3 can
be taller. Empty for now, so every id falls back to your placeholder.
