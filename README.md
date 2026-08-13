# ThinkStill 750 v40.6 — complete GitHub + Framer package

This is the full deployable package generated from `ThinkStill_750_v40_6_SIMPLE_FAST_RESET_MASTER.xlsx`.

It contains 750 complete rituals split across seven JSON libraries, the manifest, the corrected Framer component, an identical copy-paste file, upload instructions, source checksum, and a package verifier.

## What this fixes

- Uses the correct GitHub owner: `ramkumarjothi1982`.
- Loads `manifest.json` from the repository root.
- Resolves every ritual part against the GitHub raw folder, not the Framer page.
- Keeps the app on the prompt screen when loading fails instead of showing an empty ritual card.
- Displays only complete rituals with Goal, numbered steps, WIN, five tips, Mind Bend, Formula Flow, and Safety/PAUSE.
- Uses a new `v406_750` no-repeat storage key so the new library starts a clean 750-ritual cycle.

## Upload to GitHub

Upload the **files inside this folder directly into the root** of:

```text
ramkumarjothi1982/thinkstill-rituals
```

The required live files are:

```text
manifest.json
rituals_glitch.json
rituals_drop.json
rituals_loopie.json
rituals_patch.json
rituals_rush.json
rituals_still.json
rituals_sync.json
ThinkStillUnifiedChat.tsx
```

Do not upload the outer package folder as a nested directory. Preserve every filename exactly, including lowercase ritual filenames.

Commit the files to the `main` branch. The repository must remain public for the raw URLs to load without authentication.

## Verify the GitHub upload

After GitHub finishes the commit, open these URLs in a normal browser:

```text
https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/manifest.json
https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/rituals_glitch.json
```

The manifest must show `"version": "v40.6"`. If either URL still shows 404 immediately after upload, wait briefly and refresh; then confirm the files are in the repository root on `main`, not inside another folder.

## Replace the Framer component

1. Open the current ThinkStill code component in Framer.
2. Select all old component code.
3. Paste the complete contents of `ThinkStillUnifiedChat.tsx` or `ThinkStillUnifiedChat_COPY_PASTE.txt`.
4. Save the code component.
5. Keep the included Manifest URL unchanged.
6. Publish the Framer project again.
7. Hard-refresh the published page and press **Reset Quest** once.

The included Manifest URL is:

```text
https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/manifest.json
```

## Local package verification

With Node.js installed, run this inside the package folder:

```bash
npm run verify
```

The verifier checks all 750 unique ritual IDs and complete records, all seven libraries, the v40.6 manifest, the corrected loader, the source checksum, panic routing coverage, and the absence of the empty-card fallback.

## File guide

- `manifest.json` — live library index and GitHub base URL.
- `rituals_*.json` — all 750 ritual records across seven visual modes.
- `ThinkStillUnifiedChat.tsx` — Framer code component.
- `ThinkStillUnifiedChat_COPY_PASTE.txt` — identical code for easy copying.
- `verify-package.mjs` and `package.json` — local validation.
- `UPLOAD_THESE_FILES.txt` — shortest upload checklist.
- `GITHUB_UPLOAD_CHECKLIST.txt` — detailed 404-proof checklist.
- `SOURCE_MASTER_SHA256.txt` — source workbook identity used for this package.
