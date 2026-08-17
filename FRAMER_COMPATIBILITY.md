# FRAMER COMPATIBILITY NOTE

Keep your existing ThinkStill Framer component.

Replace the GitHub data files with this package and keep using `manifest.json`.

The critical compatibility fields are:

- `formula_flow`: string
- `safety`: string
- `trigger_play_time`: string
- `goal_why_game_move`: string
- `play_the_loop`: string
- `win_reward`: string

Modern aliases are also present:

- `formulaFlow`
- `mindBend`
- `feedbackPrompt`
- `feedbackOptions`
- `steps`

No nested object is used for any presentation field.
