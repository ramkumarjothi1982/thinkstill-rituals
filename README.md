# ThinkStill v37.9 — GitHub Package

Static, no-build GitHub Pages package for the **400-ritual TRUE ONE-OF-ONE WIN locked master**.

## Upload
Upload **every file in this folder to the repository root**. Do not create subfolders.

GitHub Pages: `Settings → Pages → Deploy from a branch → main → / (root)`.

## Raw manifest URL
After upload, use:

`https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/refs/heads/main/manifest.json`

The filenames are case-sensitive.

## Runtime contract
User-facing ritual order:

**TITLE → GOAL → NUMBERED RITUAL → WIN → 5 ritual-matched support moves → FORMULA FLOW → SAFETY**

Do not render backend fields such as distress cue, fallback, routing metadata, Hook, Game Move, or internal audit fields in the normal ritual card.

## Routing
- 22 release trigger groups
- 63 precise patterns
- no manual bubble selector
- free text → best trigger → best precise pattern → highest-scoring globally unused ritual
- if that precise-pattern pocket is exhausted, the engine remains within the matched trigger before global fallback

## No-repeat
`app.js` stores served IDs in browser `localStorage` under:

`thinkstill_v37_9_seen_ids`

No ritual repeats until all 400 have been used. Then the pool resets.

This is browser-local persistence. For account-wide / cross-device history, mirror served ritual IDs in your authenticated backend.

## Main files
- `manifest.json` — production manifest
- `rituals.json` — consumer-safe 400 ritual library
- `rituals.backend.json` — routing + hidden fallback copy
- `rituals_glitch.json`, `rituals_drop.json`, etc. — bubble-specific consumer files
- `routing.json` — trigger/pattern routing map
- `thinking-errors.json` — 22 top-level trigger groups and aliases
- `patterns.json` — 63 precise patterns
- `SCHEMA.json` — consumer ritual JSON schema
- `thinkstill-loader.js` — manifest/data loader
- `app.js` — routing + no-repeat engine
- `index.html`, `styles.css` — no-build demo/production starter
- `ThinkStill_400_Rituals_v37_9_TRUE_ONE_OF_ONE_WIN_LOCKED_MASTER.xlsx` — locked source workbook
- `CHECKSUMS.sha256` — package integrity

## Important
The Emotional Distress Cue / fallback fields are retained in `rituals.backend.json` only. They are intentionally not rendered by the included UI.
