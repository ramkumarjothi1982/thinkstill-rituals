# ThinkStill v37.9 JSON Schema

Each bubble file:

```json
{
  "schema": "thinkstill-rituals-v37.9",
  "version": "v37.9",
  "release": "TRUE_ONE_OF_ONE_WIN_LOCKED",
  "bubble": "GLITCH",
  "count": 58,
  "rituals": []
}
```

## Consumer fields

- `title`
- `play_time`
- `goal`
- `ritual_steps`
- `win`
- `support_stack`
- `formula_flow`
- `safety`
- `final_consumer_ritual`

## Routing fields

- `release_routing_trigger`
- `secondary_routing_trigger`
- `release_routing_pattern`

Compatibility aliases:
- `thinking_error`
- `precise_subpattern`

## Internal / backend-only

- `hook_internal`
- `goal_internal`
- `game_move_internal`
- `source_trigger`
- `source_pattern`
- `emotional_distress_cue_internal`
- `if_not_helpful_internal`

## Support analytics fields

The master also contains the five support ingredients individually:

- `breath_support`
- `mindfulness_support`
- `positive_psychology_support`
- `contemplative_support`
- `affirmation_support`

Production rendering should use `support_stack`, which preserves the five plain lines
without category subtitles, exactly as required by v37.9.
