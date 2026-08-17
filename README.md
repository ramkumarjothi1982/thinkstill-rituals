# ThinkStill v58.20.5 — FINAL GitHub Package

Production data package generated directly from:

`ThinkStill_750_v58_20_5_FINAL_10of10_ZERO_LEAK_LOCK_MASTER.xlsx`

## Release contract

- 750 rituals: `TS-001` → `TS-750`
- APP order: **Ritual Name → Play Time → Goal → Numbered Steps → WIN → Mind Bend → Formula Flow → Safety → Feedback**
- Tips remain internal only and are not included in `rituals.json`
- Automatic routing; no manual Bubble picker
- Browser-local no-repeat memory: `thinkstill_v58_20_5_seen_ids`
- No ritual repeats until the 750-ID pool is exhausted, then the pool resets
- Tier-3 human-support rituals are excluded from ordinary/random routing
- Explicit high-risk/crisis language is routed inside the Tier-3 human-support pool
- If all Tier-3 cards were previously served, crisis routing stays in Tier-3 rather than falling back to ordinary self-help
- Existing five trauma-safety corrections are preserved

## Bubble counts

```json
{
  "GLITCH": 108,
  "DROP": 107,
  "SYNC": 107,
  "STILL": 107,
  "RUSH": 107,
  "LOOPIE": 107,
  "PATCH": 107
}
```

## Current routing dimensions

- Worlds: 7
- Specialists / routing groups: 52
- Moment / User Need values: 372
- Precise Patterns: 236

Selection path:

`user issue → world → specialist → moment / user need → precise pattern → highest-scoring globally unused ritual`

Bubble assignment is automatic from the ritual's locked `Legacy Visual Mode`.

## Upload to GitHub

Upload **every file in this package to the repository root**. Filenames are case-sensitive.

GitHub Pages:

`Settings → Pages → Deploy from a branch → main → / (root)`

Raw manifest URL:

`https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/refs/heads/main/manifest.json`

For your existing Framer/chat UI, point its manifest/data loader at that raw `manifest.json`. Do **not** replace your existing UI unless you intentionally want to use the included demo `index.html`.

## Main files

- `manifest.json` — production source-of-truth manifest
- `rituals.json` — consumer-safe 750 ritual library
- `rituals.backend.json` — routing/safety/backend metadata
- `rituals.normalized.json` — compact pre-normalized matching index
- `rituals_glitch.json`, etc. — Bubble-specific consumer arrays
- `glitch.json`, etc. — backward-compatible aliases
- `routing.json` — full hierarchical routing tree
- `routing-groups.json` — current 52 Specialist routing groups
- `thinking-errors.json` — backward-compatible alias of routing groups
- `patterns.json` — current 236 Precise Patterns
- `SCHEMA.json` — consumer ritual JSON schema
- `thinkstill-loader.js` — browser ES-module loader
- `ThinkStillData.ts` — Framer/TypeScript manifest loader
- `app.js`, `index.html`, `styles.css` — optional no-build demo
- `ThinkStill_750_v58_20_5_FINAL_10of10_ZERO_LEAK_LOCK_MASTER.xlsx` — locked source workbook
- `VERSION.txt` — package version
- `CHECKSUMS.sha256` — integrity hashes

## Data boundary

`rituals.json` contains only the consumer fields required by the current display contract plus Bubble. Backend fields and internal Tips remain outside the normal consumer ritual object.

## Access note

GitHub Pages/raw GitHub hosting is public static hosting. It does not securely enforce Circle-only access. Continue using your existing server-side access/unlock mechanism if the ritual page must be gated.
