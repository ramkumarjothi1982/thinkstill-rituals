# ThinkStill v58.19 — Framer Fixed One-Folder Release

This package is specifically matched to the uploaded **ThinkStill Unified Chat v38.4.3** Framer loader.

## Critical fixes

1. `manifest.json` now uses the exact structure the Framer loader expects: `bubbles[].bubble` + `bubbles[].parts[].filename`.
2. Each ritual now has a canonical `ritualText` / `plain` block containing TITLE, PLAY TIME, GOAL, HOW TO PLAY, numbered ritual steps, WIN, 5 TIPS, MIND BEND, FORMULA FLOW and SAFETY.
3. Routing fields are mirrored to the top level (`thinking_error`, `precise_subpattern`, `primary_trigger`, `keywords`) so the current router can score the v58.19 data.
4. All files remain in one folder.

## Upload

Extract the ZIP and upload **every extracted file directly to the root of** `ramkumarjothi1982/thinkstill-rituals` on the `main` branch.

After upload, this URL must return JSON, not 404:

`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/manifest.json`

Then hard refresh the Framer preview/published page.

## Counts

{
  "GLITCH": 108,
  "SYNC": 107,
  "PATCH": 107,
  "DROP": 107,
  "STILL": 107,
  "RUSH": 107,
  "LOOPIE": 107
}
Total: 750
