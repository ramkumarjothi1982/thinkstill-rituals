# ThinkStill — GitHub Final 1000

Release: `2026-09-19-final-1000`  
Status: **FINAL RELEASE LOCKED**

## Runtime files to upload to the same GitHub folder

- `thinkstill-manifest.json`
- `thinkstill-modes.json`
- `rituals_glitch.json`
- `rituals_drop.json`
- `rituals_still.json`
- `rituals_patch.json`
- `rituals_loopie.json`
- `rituals_rush.json`
- `rituals_sync.json`

Recommended supporting runtime files:

- `thinkstill-rituals.json`
- `thinkstill-routing.json`
- `thinkstill-safety.json`
- `thinkstill-release.json`

`manifest.json` is included as a compatibility alias.

## Framer

Set **Manifest URL** to the RAW GitHub URL for:

`thinkstill-manifest.json`

The current Reset Console can automatically look for `thinkstill-modes.json`
in the same folder as the manifest, so the separate Modes URL can remain blank.

## Counts

- Rituals: **1000**
- Vibe records: **3000**
- GLITCH: 150
- DROP: 150
- STILL: 150
- PATCH: 150
- LOOPIE: 150
- RUSH: 150
- SYNC: 100

Default vibe: **Cheeky**

## Important

Keep filenames and letter case exactly as supplied.

This package does not replace your existing character expression assets.
If your repository already contains the `bubble-expressions/` folder and
expression-map JSON used by the Reset Console, leave those assets in place.

## Validation

Run from this folder:

```bash
node validate-release.mjs
```

Expected output:

`PASS — 1000 rituals, 3000 mode records, all bubble counts and IDs valid.`

The locked source workbook is included under `source/`.
