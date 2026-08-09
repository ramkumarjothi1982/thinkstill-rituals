# ThinkStill Rituals — v30 FINAL

GitHub-ready production package generated directly from:

`ThinkStill_400_Rituals_v30_LITERAL_10of10_Consumer_Copy_MASTER.xlsx`

## Source integrity
- Rituals: **400**
- User-facing thinking errors: **22**
- Precise patterns: **63**
- Bubbles: **GLITCH 58; DROP/STILL/PATCH/LOOPIE/RUSH/SYNC 57 each**
- No Replay / Level Up layer
- No user-facing `HOW TO PLAY`
- No user-facing Power-Up section

## User-facing render order
1. Hook
2. Goal
3. Game Move
4. Numbered steps
5. Finish (when present)
6. Win Signal
7. Formula Flow
8. Safety

## Upload
Upload every file in this ZIP to the **root** of:

`ramkumarjothi1982/thinkstill-rituals`

Replace the existing `manifest.json` and all seven Bubble JSON files.

## Raw manifest URL
`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`

## Main files
- `manifest.json` — chatbot entry point
- `glitch.json`, `drop.json`, `still.json`, `patch.json`, `loopie.json`, `rush.json`, `sync.json`
- `rituals.json` — all 400 renderer-ready rituals
- `rituals.normalized.json` — clean v30 source representation
- `routing.json` — v30 routing taxonomy and global no-repeat policy
- `thinking-errors.json` — 22 thinking-error groups
- `patterns.json` — 63 precise patterns
- `SCHEMA.json` — renderer/package schema
- `thinkstill-loader.js` — reference browser loader
- `ThinkStill_400_Rituals_v30_LITERAL_10of10_Consumer_Copy_MASTER.xlsx` — exact source workbook
- `CHECKSUMS.sha256` — integrity hashes

## Important
The package intentionally leaves `potency_stack` / `potency_1` / `potency_2` / `potency_3` empty. v30 does not use the old Power-Up layer.

The composite fields are generated specifically for the ThinkStill premium renderer:
- `trigger_play_time`
- `goal_why_game_move`
- `play_the_loop`
- `win_reward`
- `formula_flow`
- `safety`
