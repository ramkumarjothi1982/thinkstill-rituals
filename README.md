# ThinkStill v58.20 — FINAL NO-TIPS GitHub Package

This folder matches `ThinkStill_750_v58_20_FINAL_NO_TIPS_CONSUMER_RELEASE_MASTER.xlsx`.

## Upload to GitHub

Upload **all files in this folder to the same GitHub folder**.

The Framer component only needs `manifest.json` plus the seven `rituals_*.json` files at runtime. The other files are QA/source files.

Set the Framer **Manifest URL** to the raw GitHub URL for:

`manifest.json`

Example pattern:

`https://raw.githubusercontent.com/YOUR-USER/YOUR-REPO/YOUR-BRANCH/YOUR-FOLDER/manifest.json`

`base_url` is intentionally blank. The current loader resolves each bubble filename relative to the manifest URL.

## Runtime files

- `manifest.json`
- `rituals_glitch.json` — 108 rituals
- `rituals_drop.json` — 107 rituals
- `rituals_loopie.json` — 107 rituals
- `rituals_patch.json` — 107 rituals
- `rituals_rush.json` — 107 rituals
- `rituals_still.json` — 107 rituals
- `rituals_sync.json` — 107 rituals

Total: **750 rituals**

## NO-TIPS lock

Tips are deliberately absent from every runtime ritual object and from every `plain` / `ritualText` / `fullRitual` card.

The 3,750 original Tips remain only in the Excel master as an internal archive.

Visible consumer flow:

**PLAY TIME → GOAL → STEPS → WIN → MIND BEND → FORMULA FLOW → SAFETY**

## Routing data

The routing taxonomy in these files is derived directly from the v58.20 workbook rather than hardcoded:

- Parent field: `Specialist`
- Parent groups in this workbook: **52**
- Precise field: `Precise Pattern`
- Precise patterns in this workbook: **236**

The runtime object also includes routing keywords, trigger text, mechanism, priority, safety tier and related route metadata used by the current Framer engine.

## QA files

- `rituals.json` — combined 750-row runtime library
- `routing.json`
- `thinking-errors.json`
- `patterns.json`
- `SCHEMA.json`
- `validate_package.py`
- `CHECKSUMS.sha256`
- source `.xlsx`
- matching Framer component `.tsx`

Run:

`python validate_package.py`

Expected result:

`PASS — ThinkStill v58.20 GitHub package is internally consistent and contains no runtime Tips.`
