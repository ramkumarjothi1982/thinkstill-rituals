# ThinkStill v61 — GitHub Final Release Package

Source of truth: `ThinkStill_750_v61_FINAL_RELEASE_MASTER_LOCKED.xlsx`

## Replace these live data files

Upload the files in this folder to the **root of the `main` branch** of `ramkumarjothi1982/thinkstill-rituals`.

Runtime-critical files for the current Framer console:

- `thinkstill-manifest.json`
- `rituals_glitch.json`
- `rituals_sync.json`
- `rituals_patch.json`
- `rituals_drop.json`
- `rituals_still.json`
- `rituals_rush.json`
- `rituals_loopie.json`
- `thinkstill-modes.json`
- `thinkstill_750_expression_map.json`

Additional v61 production maps:

- `thinkstill-mode-variants-full.json` — all 2,250 complete five-step voice cards with embedded safety.
- `thinkstill-ui-titles.json` — contextual MISSION / step / THE SHIFT titles.
- `thinkstill-safety.json` — explicit safety protocol for every ritual.
- `thinkstill-framer-export.json` — flattened Framer-facing release export.
- `thinkstill-safety-sources.json` — source registry retained from the master workbook.
- `release-validation.json` — expected counts and release gates.
- `validate_release.py` — local package validator.
- `SHA256SUMS.txt` — checksums for every generated release file.

## Release counts

- Canonical rituals: **750**
- Mode variants: **2,250** (750 Jolly + 750 Cheeky + 750 Unfiltered)
- Bubble distribution: GLITCH 108, SYNC 107, PATCH 107, DROP 107, STILL 107, RUSH 107, LOOPIE 107
- Tier-3 human-support rituals: **8** / **24 mode rows**, all `supportFirst=true`

## Compatibility

`thinkstill-manifest.json`, the seven ritual files, `thinkstill-modes.json`, and `thinkstill_750_expression_map.json` are shaped for the current ThinkStill Framer loader.

The ritual files also include the richer v61 fields (`uiTitles`, explicit safety, mechanism fingerprints, five canonical steps) so the renderer can be upgraded without regenerating the GitHub dataset.

`thinkstill-modes.json` is the lean current-runtime file and keeps full safety in every row.

`thinkstill-mode-variants-full.json` preserves the complete five-step v61 voice cards with embedded safety for the upgraded renderer / future builds.

## Important

Do **not** keep the previous `thinkstill-modes.json` in production. It maps the same IDs to the old ritual corpus. Replace it with this v61 file together with the new manifest and ritual files.

The existing `bubble-expressions/*.webp` assets are referenced, not duplicated in this package.

## Validate

```bash
python validate_release.py
```

Expected result: `PASS: ThinkStill v61 GitHub release package`.
