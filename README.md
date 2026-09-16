# ThinkStill 750 — v20.3 Final Release

Production data generated from `ThinkStill_750_v20_3_FINAL_RELEASE_MASTER.xlsx`.

## Counts
- 750 rituals
- 2,250 intensity rows: 750 Jolly + 750 Cheeky + 750 Unfiltered
- 25 Support First rituals (bypass intensity)
- 50 First Session rituals
- Default intensity: Cheeky
- Lookup for wording: `ID + Mode`

## GitHub files
The root JSON files are convenient for direct GitHub/raw hosting. The identical files under `public/data/` match the existing app loader convention.

Core files:
- `thinkstill-manifest.json`
- `thinkstill-rituals.json` — 750 records, backward-compatible Cheeky/default fields + nested all-three-mode copy
- `thinkstill-modes.json` — flat 2,250-row `ID + Mode` production copy
- `thinkstill-routing.json`
- `thinkstill-safety.json`
- `thinkstill-first-session.json`
- `thinkstill-mode-guide.json`

Versioned copies (`*.v20.3.json`) are immutable release assets.

## UI rule
Route to a ritual ID first. Then select the wording with the saved intensity (`Jolly`, `Cheeky`, or `Unfiltered`). Support First always bypasses intensity.

Storage key: `thinkstill.intensity`
Legacy migration key: `thinkstill.vibe`

## Deployment
If your app uses the current loader pattern, copy `public/data/*` into your deployed project's `public/data/` folder. Browser URLs become `/data/thinkstill-manifest.json`, `/data/thinkstill-rituals.json`, etc.

## Validation
Run:
```bash
node scripts/validate-thinkstill.mjs
```

## Compatibility
`thinkstill-rituals.json` keeps the existing one-record-per-ID/default-Cheeky fields and adds nested `modes`, so the existing router can continue using the legacy fields while the UI adopts intensity selection. Keep the existing `thinkstillRouter.ts`; replace/add the files in `UPLOAD_TO_EXISTING_REPO`.

Schema files: `thinkstill-ritual.schema.json`, `thinkstill-modes.schema.json`, `thinkstill-manifest.schema.json`.
