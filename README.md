# ThinkStill 750 v58.19 — APP-COMPATIBLE ONE-FOLDER GITHUB PACKAGE

This package fixes the loader mismatch seen in the ThinkStill app.

## Critical files

- `manifest.json` — exact filename the existing app requests.
- `rituals.json` — all 750 rituals in the legacy app contract **plus v58.19 aliases**.
- `routing.json` — legacy routing indexes plus all v58.19 routing records.
- `triggers.json` — trigger/specialist metadata.
- `bubble-*.json` — seven legacy visual-mode files.

## What changed

The v58.19 content itself was **not rewritten**. The data wrapper was made backward-compatible:

- `name` → also available as `title`
- `playTime` → also available as `play_time`
- step array → also available as legacy numbered `steps` string
- `tips` → also available as bullet `supports`
- formula array → also available as `formula_flow` string
- `legacyVisualMode` → available as `bubble`
- `manifest.json` added at the repository root

## Upload

Upload **every file in this folder directly into the root of the `main` branch**. Do not put them inside another folder.

After GitHub finishes the commit, this URL must return JSON rather than 404:

`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/manifest.json`

Then hard-refresh/reload the ThinkStill app so it does not use a cached failed fetch.

## Release data

- Rituals: 750
- IDs: TS-001 → TS-750
- Bubble files: 7
- Source workbook included unchanged
