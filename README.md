# ThinkStill Rituals — v23 FINAL Micro-Polish

Production data package for the ThinkStill 400-ritual library.

## Release
- Version: **23.0**
- Rituals: **400**
- User-facing thinking-error groups: **22**
- Distinct pattern labels in this workbook: **62**
- Bubbles: **7**
- Bubble split: **GLITCH 58; DROP 57; STILL 57; PATCH 57; LOOPIE 57; RUSH 57; SYNC 57**
- Replay: **removed**
- Level Up: **removed**
- Bubble choice: **automatic routing**
- Repeat policy: **no ritual repeats until the complete 400-ID pool is exhausted**

## Files
- `manifest.json` — package entry point and raw GitHub URLs.
- `rituals.json` — all 400 rituals using the exact workbook column names.
- `rituals.normalized.json` — all 400 rituals using developer-friendly snake_case keys.
- `glitch.json`, `drop.json`, `still.json`, `patch.json`, `loopie.json`, `rush.json`, `sync.json` — Bubble-specific libraries.
- `routing.json` — routing and no-repeat policy.
- `thinking-errors.json` — 22 Trigger/thinking-error groups and their ritual IDs.
- `patterns.json` — pattern index generated from v23.
- `thinkstill-loader.js` — browser/JavaScript loading + persistent seen-ID helper.
- `ThinkStill_400_Rituals_v23_FINAL_Micro_Polish_Product_Ready.xlsx` — exact source workbook used to build this package.
- `CHECKSUMS.sha256` — integrity hashes.

## Upload to GitHub
Upload **every file in this folder to the root of**:

`ramkumarjothi1982/thinkstill-rituals`

Do not put these files inside another folder unless you also change the raw URLs in `manifest.json` and `thinkstill-loader.js`.

## Raw manifest URL
`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`

## Recommended app boot sequence
1. Fetch `manifest.json`.
2. Fetch `rituals.normalized.json`.
3. Classify the user's issue into a thinking error and pattern.
4. Rank matching ritual candidates.
5. Exclude IDs in the persistent seen-ID pool.
6. Serve the best eligible ritual.
7. Save the ritual ID after serving it.
8. Reset the global pool only when all 400 IDs have been served.

## Persistence
The example loader stores seen IDs in browser `localStorage`, so the viewed history survives normal page refreshes and browser close/reopen on the same browser profile. For account-level cross-device persistence, save the seen-ID list server-side.

## Important
The JSON content is generated directly from the v23 `USER RITUALS` sheet. The underlying workbook is included unchanged.
