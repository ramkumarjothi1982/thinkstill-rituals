# ThinkStill FINAL JSON Schema

Each bubble JSON contains:

```json
{
  "schema": "thinkstill-rituals-final",
  "version": "FINAL",
  "bubble": "GLITCH",
  "count": 58,
  "rituals": []
}
```

## Key ritual fields

### Identity
- `id`
- `r`
- `bubble`
- `title`

### Production routing
- `thinking_error`
- `precise_subpattern`
- `release_routing_trigger`
- `secondary_routing_trigger`
- `release_routing_pattern`

### Internal-only
- `hook_internal`
- `goal_internal`
- `game_move_internal`
- `source_trigger`
- `source_pattern`

### Consumer-facing
- `emotional_distress_cue`
- `play_time`
- `goal_why_game_move`
- `play_the_loop`
- `breathwork_support`
- `mindfulness_support`
- `positive_psychology_support`
- `spirituality_support`
- `affirmation_support`
- `win_reward`
- `if_not_helpful`
- `formula_flow`
- `safety`

### Replay protection
The UI uses a global 400-ritual no-replay cycle. The used set persists in
browser storage and resets only after all 400 rituals have been served.
