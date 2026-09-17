# ThinkStill v20 — GitHub Browser Upload

This is the **minimal live runtime package**. It intentionally excludes duplicate archives, the Excel master, combined analysis JSON, and versioned copies.

## Upload these files to the repository root

- `manifest.json`
- `thinkstill-modes.json`
- `rituals_glitch.json`
- `rituals_drop.json`
- `rituals_still.json`
- `rituals_patch.json`
- `rituals_loopie.json`
- `rituals_rush.json`
- `rituals_sync.json`

## GitHub web steps

1. Extract this ZIP on your computer.
2. In the repository root choose **Add file → Upload files**.
3. Upload the nine files above — **do not upload the ZIP itself**.
4. Commit the changes. If GitHub is still unhappy with one combined commit, upload in two batches: first `manifest.json`, `thinkstill-modes.json`, `rituals_glitch.json`, `rituals_drop.json`, `rituals_still.json`; then the remaining four bubble files.
5. Keep the Framer Manifest URL pointed to the raw root `manifest.json`.

## Runtime contract

- 750 ritual IDs
- 2,250 Vibe records
- Jolly / Cheeky / Unfiltered
- Default: Cheeky
- Switching Vibe keeps the same ritual ID/mechanism
- 25 Support First rituals retained

The source Excel master is deliberately not included in this browser-upload bundle. Keep it as your offline/content-authority archive rather than loading it at runtime.
