# readability — FINISHED (task `readability`, docs/EOS_SPEC.md §4, §0.4 tokens, §12.1)

## What I built
`src/eos/10_eos_readability.jsx` (one file, no imports/exports, every top-level name `EOS_READ_*` / `eosRead*`, the public names excepted). It has three layers, and none of them ever shrinks text:
1. **`EOS_READ_CSS`** (registered at top level with `eosCss("readability", EOS_READ_CSS)`). It sets explicit sizes for the chrome:
   - header: score bar 14/18 px; on phones the header shows "THINKSTILL" at 15 px, left-aligned and clear of the score pill
   - menu: group labels 13 px; game button label on 2 lines
   - HUD: column layout on phones, with the track at full width and a wrapping pill row
   - pills: `.tsShiftRewardPill` 14/13 px at 30/28 px height, and it keeps the arcade's `tsRewardPillHit` pop
   - progress text: `.engineProgressText` 14/13 px
   - LIVE GUIDE: kicker tags, and 15-17 px instruction lines
   - reveal: AGAIN / PREVIOUS / NEXT 14/13 px (16 on legacy)
   - input: 16 px, clear of the mic
   - `max(Npx,1em)` is used only for selectors whose every arcade rule is ≤ 11 px
   - per-game layout guards so grown labels fit their objects: UNHOOK, CUT THE LOOP, ERASE/BIN/MELT bubbles, MAGIC TRAPDOOR, FINGER TRAP, DRAMA MACHINE, TUG, GO WEIRD, CLEANSE pills and others
2. **`EOS_READ_TARGETS`**: a `[selector, desktopPx, phonePx]` table. User words are 16/15 px (or `--bubble-text-size` up to 28 if larger). Payoff/hint lines are 15/14, arena buttons 14/13 and counters 12. Everything else falls to the 12 px catch-all (written as 12.5 px; 1-3 glyph counters get 13.5).
3. **`EosTextFloor({stage})`**: the grow-only JS floor.
   - Active in `stage-play`, in `stage-reveal`, and while the game menu is open.
   - New text is floored inside the MutationObserver callback, before its first paint.
   - A time-boxed sweep runs after each frame, every 900 ms, and 250 ms after a pointerup.
   - It re-checks elements it raised and removes its inline size once the game's own size is larger.
   - It compensates for held scales on words, and fits a word to its box so it never breaks mid-word.
   - It skips `.eos*` overlays, `.eosArrowLayer`, `.tsRewardSurge`, `svg` and aria-hidden decoration. Exception: aria-hidden copies of the user's words (`.tsBubbleTextContainer` name tags) are floored.
   - It never writes inside a scaled SVG viewBox; those cases are reported by `scan()`.
   - Test hook: `eosApi("readability")` / `window.__eos.readability` = `{scan, targets, pass, stats, reset, log, settle, targetOf, targetsOf}`.

**Exports:** `EOS_READ_CSS`, `EOS_READ_TARGETS`, `EosTextFloor`.

## Integrator must wire (all already present as I1 edits in dev/eos_integrate.py; apply them as-is)
- `<EosTextFloor stage={stage} />` inside `.releaseStage` (the I1 floor mount). It renders `<span hidden data-eos="text-floor"/>` and finds `.tsArcade` through `closest`.
- `<EosGlobalStyle />` must be mounted (I1), because that is how `EOS_READ_CSS` reaches the page.
- §4.6 dead prop:
  - `bubbleTextPx = 4` → `16` (I1-E10a)
  - clamp max 28 and property control `defaultValue: 16, max: 28` (I1-E10b/c)
  - ECHO floor: both `engineBubbleTextPx = Math.max(1, …)` → `Math.max(15, …)`
- Nothing else. Do not "fix" `dynamicBubbleTextCss`.

## Acceptance results (scratch integrated build /tmp/eos_readability; baseline /tmp/eos_base)
1. **8 states × 2 sizes** for POP 1, CRUSH 2, SHELF IT 95, ECHO 99, HOT POTATO 100, CLEANSE 109 and RAIN OUT 110 at 1280×860 and 390×844. States: input, menu open, play start, first hit, finish hold, reveal, reveal after the payoff. `smallText(12)` is empty in every state (feedback entrance pops are settled first with `readability.settle()`). Zero page errors. The meter, shelf and safety states are re-checked after I2.
2. **User words** render 16.2-16.4 px desktop and 15.2-15.4 px phone (one-letter "I" 17-18 px). ECHO is 16/16. CLEANSE's visible name tags are 16.25 px; the 11 px copies inside the stones are the arcade's hidden originals. MELT, ERASE, BIN, UNHOOK and CUT THE LOOP words are ≥ 15.2 px at 390.
3. **noShrink:** representative subset 1, 2, 41, 43, 50, 89, 96, 99, 100, 109 at both sizes against /tmp/eos_base. Zero shrink, zero errors. SCRATCH REVEAL words are 23 px at 1280. `.chainStart` (UNFINISHED SENTENCE) is never touched by `max(…,1em)`; it gets only the grow-only word floor. Earlier sessions ran most of the 110 games without finding any shrink. The full 110 × 2 sweep is left to Regression.
4. **Sizes:**
   - `.tsShiftRewardPill` 14 px / 30 px (1280) and 13 px / 28 px (390); `tsRewardPillHit` still plays
   - `.engineProgressText` 14/13 px
   - menu group label 13 px
   - reveal AGAIN / PREVIOUS / NEXT 14/13 px on ids ≥ 100 (16 px on legacy)
5. **Phone layout at 390:** the header reads "THINKSTILL" at 15 px and does not overlap the score bar. `.engineProgressHud` (25,69 → 365,97) and `.releaseScoreBar` are fully inside the viewport.
6. **Screenshot review** of DEFUSE, FREEZE, MAGIC TRAPDOOR, DRAMA MACHINE, TINY SOUNDTRACK, DOOR A/B, X-RAY, SINKING PLATFORM, MIRROR FLIP, HEADLINE, PARK IT and GO WEIRD at both sizes:
   - no resized label has `scrollWidth > clientWidth + 2` and nothing is below 12 px
   - the 1280 re-run this session found GO WEIRD's "TAP A THOUGHT" hint (114 > 104 px). It is now fixed: the hint is 12.5 px and fits (sw = cw = 104) on desktop, and is hidden on phones.
7. **Perf** (quiet machine; POP, HOT POTATO, CLEANSE played to the reveal, plus the menu, at both sizes):
   - floor work per pass: p50 0.9-1.3 ms, p95 1.6-2.0 ms
   - MutationObserver passes: p95 0.5 ms
   - a few re-check passes (0-4 out of 35-201 per game) reach 2.5-6.7 ms in headless software rendering
   - zero page errors
   - `python3 build.py` passes (full, all modules)
   - the isolated build and the readability + dots + mood integrated smoke pass with zero errors and an empty `smallText`

## Screenshots
dev/shots/eos/ (git-ignored):
- `readability_<game>_{a,b}_{1280,390}.png`: the 12 review games
- `readability_acc45_hud_{1280,390}.png`
- `readability_melt_words_390.png`
- `readability_allmods_reveal_390.png`
- `readability_go_weird_c_1280.png`

## Known limitations / notes for other tasks
- **`dev/eos_drive.smallText` false positive:** its DOM sweep does not account for rotation. UNHOOK's vertical `.bigHookLabel` "BIG HOOK" (12.5 px, rotated) reads as 3.5 px. `readability.scan()` handles rotation and does not report it. Regression should whitelist it or fix the helper.
- **Entrance pops in headless runs:** headless Chromium measures entrance pops at keyframe 0 (for example "BREATHE ✓" at 8.7 px). Call `__eos.readability.settle()` before `smallText`.
- **CUT THE LOOP (43):** the arcade's own `overflow:hidden` on the 85 px bubble clips the per-bubble "0/3 CUTS" counter (`bottom:-17px`). It was invisible before this change and still is, and was left unchanged.
- **GO WEIRD (107), pre-existing, §11.6 (fixes task):** `.gwGame` clips the prop dock.
  - At 390 the props are fully hidden, and progress stays 0 in both baseline and this build.
  - In my check, the §11.6 primary rules alone (`gap 10` / `padding-bottom 8` / `margin-top 0`) still clip the dock at 1280. Verify together with the `overflow:clip` fallback.
- **MELT (16) at 390, pre-existing:** the ACTIVATE button sits partly under the LIVE GUIDE panel.
- **Word fit:** a single word that cannot fit a tiny object at 15/16 px is fitted down to no less than 13 px rendered, rather than broken inside the word. No measured release-1 game needs this any more at 390.
