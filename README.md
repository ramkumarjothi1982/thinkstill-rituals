# ThinkStill 400 — FINAL PRODUCT-READY MASTER

This is the **complete GitHub-ready release package** generated from:

`ThinkStill_400_Rituals_FINAL_PRODUCT_READY_MASTER.xlsx`

All deployable files can be uploaded directly to the **root** of the existing
`ramkumarjothi1982/thinkstill-rituals` repository.

## Final consumer experience

**Emotional-distress cue → Ritual Title / Play Time → Goal → Numbered Ritual → 5 Supports → You Win When → If This Ritual Doesn't Help → Formula Flow → Safety**

The five support categories are:

1. Breathwork
2. Mindfulness
3. Positive Psychology
4. Spirituality
5. Affirmation

## Critical rendering rules

Never render these source/internal fields directly:

- `hook_internal`
- `goal_internal`
- `game_move_internal`
- `source_trigger`
- `source_pattern`

The user-facing Goal is already contained in `goal_why_game_move` / `Goal + Steps`.
Do **not** print `goal_internal` separately.

## Production routing

The chatbot routes from the balanced release taxonomy:

- `release_routing_trigger`
- `secondary_routing_trigger`
- `release_routing_pattern`

Do not route from the uneven original/source taxonomy.

Final routing depth:

- 22 release triggers
- 18–19 primary rituals per trigger
- exactly 20 eligible rituals per trigger after secondary routing
- 63 release patterns
- 6–7 rituals per release pattern
- global 400-ritual no-replay cycle

## Bubble files

- `glitch.json` — 58
- `drop.json` — 57
- `loopie.json` — 57
- `patch.json` — 57
- `rush.json` — 57
- `still.json` — 57
- `sync.json` — 57

Total: **400**

## Files

- `manifest.json`
- `glitch.json`
- `drop.json`
- `loopie.json`
- `patch.json`
- `rush.json`
- `still.json`
- `sync.json`
- `ThinkStillUnifiedChat.tsx`
- `ThinkStillUnifiedChat.txt`
- `validate.js`
- `package.json`
- `.gitignore`
- `DATA_SCHEMA.md`
- `DEPLOY.md`
- `ThinkStill_400_Rituals_FINAL_PRODUCT_READY_MASTER.xlsx`

## Validate before publishing

```bash
npm run validate
```

Expected:

```text
VALIDATION PASSED — ThinkStill 400 FINAL PRODUCT-READY
```

## Raw manifest URL

```text
https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/main/manifest.json
```

The included Framer component loads the same seven JSON files and keeps the
global no-repeat history in browser storage so rituals do not replay until the
400-ritual cycle has been exhausted.

## Final release rule

The ritual dataset is **frozen**. Future UI/design changes should be made in
`ThinkStillUnifiedChat.tsx` without regenerating the 400 ritual mechanisms.
