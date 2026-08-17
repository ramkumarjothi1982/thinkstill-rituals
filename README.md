# ThinkStill v58.20.5 — GitHub Package — FRAMER COMPAT FIXED

Source master:

`ThinkStill_750_v58_20_5_FINAL_10of10_ZERO_LEAK_LOCK_MASTER.xlsx`

## Why this corrected package exists

The previous package used nested JSON objects for fields such as `safety`, `feedback`, and step data.
The existing ThinkStill Framer component converts several library fields with JavaScript `String(...)`.
When an object is passed into `String(...)`, the browser renders:

`[object Object]`

This corrected package removes that mismatch.

## Compatibility fix

The Bubble JSON files now use **flat primitive display fields**.

Every ritual contains:

- `title` — string
- `playTime` / `play_time` — string
- `goal` — string
- `steps` / `numberedSteps` / `numbered_steps` — string
- `win` — string
- `mindBend` / `mind_bend` — string
- `formulaFlow` **and** `formula_flow` — string
- `safety` **and** `safety_notes` — string
- `feedbackPrompt` / `feedback_prompt` — string
- `feedbackOptions` / `feedback_options` — string

It also includes the exact older full-workbook fields used by the existing ThinkStill Framer reader:

- `trigger_play_time`
- `goal_why_game_move`
- `play_the_loop`
- `win_reward`
- `formula_flow`

Therefore the existing Framer code can safely call `String(...)` on these fields without producing `[object Object]`.

## What to upload

Upload **all files in this ZIP directly to the GitHub repository root**.

You do **not** need to change your Framer UI code for this correction.

Continue using the raw manifest URL:

`https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/refs/heads/main/manifest.json`

If GitHub/browser caching is showing old data after upload, add a temporary cache-buster to the Framer Manifest URL, for example:

`https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/refs/heads/main/manifest.json?v=58205fixed`

## Package contents

- `manifest.json`
- `rituals.json`
- `rituals.backend.json`
- `rituals_glitch.json`
- `rituals_drop.json`
- `rituals_still.json`
- `rituals_patch.json`
- `rituals_loopie.json`
- `rituals_rush.json`
- `rituals_sync.json`
- legacy aliases: `glitch.json`, `drop.json`, `still.json`, `patch.json`, `loopie.json`, `rush.json`, `sync.json`
- `routing.json`
- `routing-groups.json`
- `thinking-errors.json`
- `patterns.json`
- `SCHEMA.json`
- `thinkstill-loader.js`
- `ThinkStillData.ts`
- `index.html` / `app.js` — optional data-compatibility check page
- `PACKAGE_COMPATIBILITY_AUDIT.json`
- `CHECKSUMS.sha256`
- `VERSION.txt`
- final source workbook

## Bubble counts

- GLITCH: 108
- DROP: 107
- STILL: 107
- PATCH: 107
- LOOPIE: 107
- RUSH: 107
- SYNC: 107

Total: **750**

## Important

The final Excel ritual content is unchanged. This package changes only the GitHub JSON representation so the Framer reader receives strings instead of nested JavaScript objects.
