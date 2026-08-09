# ThinkStill Rituals — v35 FINAL

Production GitHub package generated directly from:

`ThinkStill_400_Rituals_v35_FINAL_10of10_EXPERIENCE_MASTER.xlsx`

## Source
- Rituals: **400**
- Thinking-error groups: **22**
- Precise patterns: **63**
- Bubble counts: **GLITCH 58; DROP/STILL/PATCH/LOOPIE/RUSH/SYNC 57 each**

## v35 experience
Every ritual contains:
1. Title
2. Hook
3. Goal
4. PLAY / Game Move
5. Numbered ritual sequence with the integrated micro-moves
6. Finish
7. Win Signal
8. MY RESULT
9. Formula Flow
10. Safety

There is **no separate Power-Up section**. The useful potency functions are already integrated into the numbered ritual sequence in the v35 source master.

## Upload
Upload every file from this ZIP directly to the **root** of:

`ramkumarjothi1982/thinkstill-rituals`

Replace the existing package files, especially:
- `manifest.json`
- all seven Bubble JSON files
- `rituals.json`
- routing/index files

Raw manifest:
`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`

## No-repeat
The loader uses:
`thinkstill_seen_ritual_ids_v35`

The global ritual pool resets only after all **400 IDs** have been seen.

## Renderer contract
The package supplies:
- `trigger_play_time`
- `goal_why_game_move`
- `play_the_loop`
- `win_reward`
- `my_result`
- `formula_flow`
- `safety`

`potency_stack` and the old `potency_1/2/3` fields are intentionally empty because v35 integrates those functions directly inside the ritual sequence.
