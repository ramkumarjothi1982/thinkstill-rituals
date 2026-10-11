# ThinkStill Release Console · Mobile V2 ("Eclipse")

A mobile-first Release Console that runs **the desktop ritual engines unchanged** (same games, same router,
strict no-repeat rotation, check-in, shift meter, rewards, safety) inside a new phone-native shell.

## Install in Framer
1. Assets → Code → **New file** → name it `ThinkStillReleaseMobile`.
2. Paste the whole of [`ThinkStillReleaseMobile.tsx`](ThinkStillReleaseMobile.tsx) and save.
3. Drag `ThinkStillReleaseMobile` onto a 390 × 844 frame (it is fully responsive; respects safe areas).
4. Optional: wire **On Close** to close the overlay/page that hosts the console.

The Framer file is tiny: it loads `release/thinkstill-mobile-app.js` from this repository at one exact
commit, checks its SHA-256 and runs it (the same contract as the desktop `ThinkStillRelease_LOADER`).

## Layout of this folder
| Path | What |
| --- | --- |
| `desktop/` | Desktop Release Console source (launch build a2612e9) + the v6–v19 edits ported back into source + mobile fixes |
| `mobile/` | The mobile shell (TypeScript): theme, Breathing Eclipse + transitions, header, composer, story strip, reveal, settings, sheets, music |
| `tools/build.mjs` | `node tools/build.mjs` (dev) · `--release` (payload + sha) · `--loader <commit>` (Framer file) |
| `release/` | The hosted payload + its fingerprint |
| `ThinkStillReleaseMobile.tsx` | The file you paste into Framer |

## Storage compatibility
Reads/writes the same keys as the desktop console (`eos_rotation_strict_v2`, `eos_sessions_v1`,
`eos_days_v1`, `eos_prefs_v1`, `__ts_release_arcade_played_v1`, `__ts_release_arcade_score_v1`,
`ts_release_haptics`, `ts_release_music_volume`, …) plus `ts_release_theme`.
