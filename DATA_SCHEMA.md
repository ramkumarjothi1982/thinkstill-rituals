# ThinkStill TRUE ONE-OF-ONE LOCKED JSON Schema

Each bubble JSON file has:

```json
{
  "schema": "thinkstill-friend-rituals-final",
  "version": "TRUE_ONE_OF_ONE_LOCKED",
  "bubble": "GLITCH",
  "count": 58,
  "rituals": []
}
```

## Identity
- `id`
- `r`
- `bubble`
- `title`

## Balanced production routing
- `release_routing_trigger`
- `secondary_routing_trigger`
- `release_routing_pattern`
- compatibility: `thinking_error`, `precise_subpattern`

## Internal only
- `hook_internal`
- `goal_internal`
- `game_move_internal`
- `source_trigger`
- `source_pattern`

## Friend Edition consumer fields
- `emotional_distress_cue`
- `play_time`
- `friend_ritual`
- `win_reward`
- `if_not_helpful`
- `formula_flow`
- `safety`

## Friend Support
- `breath_support_friend`
- `mindfulness_support_friend`
- `positive_psychology_friend`
- `contemplative_support_friend`
- `friend_echo_affirmation`
- `optional_friend_support_stack`

Compatibility aliases are also included for older renderer logic:
`breathwork_support`, `mindfulness_support`, `positive_psychology_support`,
`spirituality_support`, `affirmation_support`, and `support_stack`.

## Replay
The UI maintains a global no-replay set and resets the pool only after all
400 ritual IDs have been served.
