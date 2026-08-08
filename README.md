# ThinkStill v23.2 FINAL — Exact Chatbot Schema

This package fixes the partial ritual rendering seen in the current ThinkStill UI.

## Why content was missing
The chatbot renderer does not directly read workbook fields such as `hook`,
`mission`, `game_move`, `how_to_play`, or `power_up_1`.

It expects these composite fields:
- `trigger_play_time`
- `goal_why_game_move`
- `play_the_loop`
- `win_reward`
- `formula_flow`

The POWER-UP-enabled builds also expect:
- `potency_stack`, or
- `potency_1`, `potency_2`, `potency_3`

v23.2 provides ALL of these for every ritual.

## What should now render
For every ritual:
- Bubble
- Ritual title
- Trigger
- Play time
- Hook
- Goal / Mission
- Game Move
- Full How to Play
- POWER-UP 1
- POWER-UP 2
- POWER-UP 3
- Win Signal
- My Result
- Formula Flow
- Safety

## Upload
Replace the current ritual package files at the ROOT of:
`ramkumarjothi1982/thinkstill-rituals`

At minimum replace:
`manifest.json`
and all seven bubble JSON files.

Recommended: replace all files in the ZIP.

## Counts
GLITCH 58
DROP 57
STILL 57
PATCH 57
LOOPIE 57
RUSH 57
SYNC 57
TOTAL 400
