# v1 tools-crack-stomp — progress (F5 CRACK spanner + STOMP boot)

## Findings (calls 1-12)
- CRACK (id 3) = `CrackEngine` src/00_arcade.jsx L6870-7189; STOMP (id 4) = `StompEngine` L4263-4542; switch `RoutedGameContentLegacy` L18684 (case 3 / case 4). ZAP (case 6) already routes to an EOS module engine with a `typeof … === "function"` fallback — follow that pattern.
- Arcade base CSS is a gzip blob: inspect with `cd dev && node eos_drive.mjs css --grep "crackToolDock|…"`. Current CRACK tool = cartoon hammer (.crackCursorTool .hammerHead), dock = round glass button; STOMP boot = `.stompCursorBoot` (no real boot art).
- Arrows table src/eos/30_eos_arrows.jsx L27-28 (ids 3/4: `button.crackToolDock`/.selected then `.crackBubbleSlot`; `button.stompToolDock` then `.stompBubbleSlot`). 60_eos_fixes EOS_FIXES_TOOLS pulses `.crackToolDock,.stompToolDock` while un-armed → keep those class names.
- F8 face contract (16_eos_bubble_face): host class `tsFaceObject`, per-bubble picture via `data-tsf-src`, words in `<span class="tsExactUserText">`; translation-only jolts (scale/rotate on the host re-fits the words).
- Build: `python3 build.py --dev-dir /tmp/v1_tools-crack-stomp` OK (11 s).

## Plan
1. New module src/eos/25_eos_game_tools.jsx: `EosCrackEngine` (forged spanner SVG tool, crack lines grow per hit, shards, recoil, clank, face neg→shocked→softer→freed happy) + `EosStompEngine` (leather boot SVG: laces, eyelets, lugged sole; anticipation lift, slam, squash, dust, shockwave, thud) + CSS.
2. Edit arcade switch case 3 / case 4 (2 small Edits), arrows labels/selectors (L27-28).
3. Play both to the reveal at 390 then 1280 (scratch script), contact sheets, f6/f8/pic probes for ids 3,4.
4. Commit src + docs; results table docs/founder/v1_fix_tools-crack-stomp.md; F5 line in FEEDBACK_LOG.

## Status
- [ ] module written  - [ ] build OK  - [ ] 390 played  - [ ] 1280 played  - [ ] probes  - [ ] committed
