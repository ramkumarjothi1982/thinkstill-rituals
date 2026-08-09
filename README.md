# ThinkStill — 400 Rituals GitHub Package

**Release:** TRUE ONE-OF-ONE PRODUCT-READY LOCKED  
**Rituals:** 400  
**Bubble distribution:** GLITCH 58; DROP, STILL, PATCH, LOOPIE, RUSH and SYNC 57 each.

Upload the contents of this folder directly to the **root** of the GitHub repository.

## Files
- `manifest.json` — app entry point.
- `rituals.json` — complete canonical 400-ritual dataset.
- `glitch.json`, `drop.json`, `still.json`, `patch.json`, `loopie.json`, `rush.json`, `sync.json` — full bubble datasets.
- `ritual-index.json` — lightweight lookup index.
- `ritual.schema.json` — data schema.
- `thinkstill-loader.js` — browser/Framer data loader.
- `validate.py` — integrity checker.
- `ThinkStill_400_Rituals_TRUE_ONE_OF_ONE_PRODUCT_READY_LOCKED_MASTER.xlsx` — locked source workbook.
- `SHA256SUMS.txt` — checksums.

## Critical rendering rule
The complete consumer ritual is the `ritual` field. Render it as supplied.

Do **not** reconstruct the ritual from `goal_internal` or `game_move_internal`. Those fields are internal and should not appear above the ritual.

Keep `win` as the single reward line and `formula_flow` as its own bottom section.

Internal / do-not-render fields:
- `hook_internal`
- `goal_internal`
- `game_move_internal`
- `release_routing_trigger`
- `secondary_routing_trigger`
- `release_routing_pattern`

## Raw GitHub URLs
For repository `ramkumarjothi1982/thinkstill-rituals`, branch `main`:

Manifest:
`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/manifest.json`

All rituals:
`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/rituals.json`

Example bubble:
`https://raw.githubusercontent.com/ramkumarjothi1982/thinkstill-rituals/refs/heads/main/glitch.json`

## Validate
Run:
```bash
python3 validate.py
```
Expected:
`PASS — ThinkStill package integrity checks passed`
