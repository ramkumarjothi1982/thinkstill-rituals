# ThinkStill Rituals — v36 FINAL

Production GitHub package generated directly from:

`ThinkStill_400_Rituals_v36_FINAL_Clean_Consumer_MASTER.xlsx`

## Final consumer display

The ritual UI should render only:

1. **Title**
2. **Goal**
3. **Numbered ritual steps**
4. **One-line Win**
5. **Formula Flow**
6. **Safety**

### Deliberately hidden from consumer ritual
- Hook
- Game Move / PLAY
- HOW TO PLAY heading
- separate Power-Up section
- MY RESULT second block

Hook and Game Move are still present as internal metadata for routing/debugging, but they are **not included in the renderer-facing composite fields**.

## Renderer-facing fields

- `title`
- `trigger_play_time` — Trigger + Play Time only
- `goal_why_game_move` — Goal only
- `play_the_loop` — numbered ritual steps + Finish
- `win_reward` — exactly one Win line
- `formula_flow`
- `safety`

## Source integrity

- Rituals: **400**
- Thinking-error groups: **22**
- Precise patterns: **63**
- Bubble counts: **GLITCH 58; DROP/STILL/PATCH/LOOPIE/RUSH/SYNC 57 each**
- Global no-repeat key: `thinkstill_seen_ritual_ids_v36`

## Upload

Upload every file from this ZIP directly to the **root** of:

`ramkumarjothi1982/thinkstill-rituals`

Replace the existing:
- `manifest.json`
- all seven Bubble JSON files
- `rituals.json`
- routing/index files

Raw manifest:
`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`
