# ThinkStill v23.1 FINAL GitHub Package — Chatbot Compatible

This package is designed specifically to fix the chatbot error:

> No parts listed for bubble GLITCH.

## What changed
- `manifest.json` now exposes Bubble files in **multiple compatible shapes**:
  - `files` array
  - `parts` array
  - `bubbles[].parts`
  - `by_bubble`
- Each Bubble JSON file is now a **bare array of ritual objects**, which older front ends commonly expect.
- Each ritual includes BOTH:
  - exact workbook field names such as `Ritual Title`, `How to Play`, `POWER-UP 1`
  - developer aliases such as `title`, `how_to_play`, `power_up_1`
- The 400 v23 ritual contents are preserved.
- No Replay.
- No Level Up.
- Bubble selection remains automatic.
- No-repeat policy remains global across all 400 rituals.

## Upload
Delete/replace the current ritual package files in the root of:

`ramkumarjothi1982/thinkstill-rituals`

Then upload ALL files from this ZIP to the repository root.

The most important files to replace are:
- `manifest.json`
- `glitch.json`
- `drop.json`
- `still.json`
- `patch.json`
- `loopie.json`
- `rush.json`
- `sync.json`

## Raw manifest
https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json

## Expected Bubble counts
- GLITCH: 58
- DROP: 57
- STILL: 57
- PATCH: 57
- LOOPIE: 57
- RUSH: 57
- SYNC: 57

Total: 400.
