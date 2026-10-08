# readability — FINISHED, fix round 1 applied (task `readability`, docs/EOS_SPEC.md §4, §0.4 tokens, §12.1)

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
   - It compensates held scales only for boxes born scaled (never a shrink the game made, never in the shrink games), and fits a word to its box (≥ 14 px rendered) so it never breaks mid-word.
   - It skips the listed EOS overlay roots (or `[data-eos-overlay]`), `.tsRewardSurge`, `svg` and aria-hidden decoration. Exception: aria-hidden copies of the user's words (`.tsBubbleTextContainer` name tags) are floored.
   - It never writes inside a scaled SVG viewBox; those cases are reported by `scan()`.
   - Test hook: `eosApi("readability")` / `window.__eos.readability` = `{scan, targets, pass, stats, reset, log, settle, targetOf, targetsOf}`.

**Exports:** `EOS_READ_CSS`, `EOS_READ_TARGETS`, `EosTextFloor`.

## Fix round 1 (docs/eos_status/readability.review_r1.json) — what changed
All 11 findings applied (2 majors, 9 minors). Only `src/eos/10_eos_readability.jsx` changed.
1. **DRAMA MACHINE (105) buttons, major.** `.dmCutButton` is out of the `max(14px,1em)` rule. Both machine buttons now get an explicit size: 14 px at 1280 (was 14/16) and 13 px at 390.
   - At ≤ 560 px the control room hugs its content (min-height 0, 70 px dial, tighter gaps).
   - Each label reads on two whole lines ("✦ MAKE IT / DRAMATIC", "✂ CUT THE / DRAMA") inside the machine.
   - Measured at 390: buttons y 541-583 against the machine bottom at 602. Not clipped, `sw = cw` and `sh = ch`, `elementFromPoint` at each centre hits the button. 1280: both 14 px, y 444-550, inside, hit OK.
2. **Held-scale compensation vs. shrink games, major.**
   - The floor compensates a held scale only for a box that was BORN scaled: a new per-element `full` WeakSet records every element ever drawn at scale ≥ .97, and those are never compensated.
   - Compensation is also skipped inside the shrink mechanics `.u26 .u29 .u30 .u53 .u58 .u104`.
   - One scale measure (the exact transform-chain scale) now drives every decision, including the .6 cut-off and the word-fit ratio.
   - Re-run of the reviewer's `shrink.mjs` at 390: ZOOM OUT renders 16 → 12.6 → 10 → 5.3 → 3.2 per word, and 16.3 → 12.9 → 10.5 → 6.3 → 3.3. MICROSCOPE renders 13.7 → 12 → 9.1 → 6 → 4.6. Within a word the size only goes down; it rises only when the next thought appears (progress steps with it). Same at 1280.
   - FINGER TRAP's born-scaled .86 tube is still compensated (13.9 → 16.2). SHELF IT words stay at 16.3-16.6.
3. **Memory.** The cleanup restores the inline size of every raised element still on the page, then clears `tagged` / `recheckQ` / `list` / `ctx` / `cursor` and drops the root's state. Detached trees are no longer held.
4. **Several instances.** State is now per arcade root: a WeakMap from root to its state, selected with `eosReadUse(root)` by every entry point (pass, MO and RO callbacks, cleanup, scan and test hooks). Each root keeps its own list, breakpoint, canvas scale, cursor and stats.
5–9. **Performance** (findings 4 and 9). Every floor pass now runs in the frame's ResizeObserver step, which comes after layout and before paint. A pass is requested by toggling the width of a 1 px invisible probe span, which replaces the old `hidden` marker span: `aria-hidden`, `visibility:hidden`, `pointer-events:none`, `contain:strict`, `position:absolute`.
   - There is no forced layout flush any more, since the timer-pass `void root.offsetWidth` is gone.
   - The MutationObserver does DOM reads only (no `getComputedStyle`), and new text is still floored before its first paint, even when React commits inside a rAF.
   - What a pass writes is painted in the same frame.
   - After a pass that wrote, the sweep waits for the next frame's clean layout.
   - The time box is checked before the costly per-element steps (chain scale, word fit), and a list pass hands back what it had no time for.
   - Continuations are requested from a rAF, never from inside the RO callback, so there are no RO loop errors.
   - A watchdog re-arms a request that never got its frame.
   - Without ResizeObserver, the old timing is the fallback.
   - Measured, solo runs (headless, software raster). Every pass now runs in the RO step:
     - flush max went from 108-179 ms to 0.1 ms
     - HOT POTATO full play at 1280: own p50 0.7 ms, p95 1.7-1.8 ms (was 4.5); finished in 39-63 s (the reviewer had 71.7 s against a 58.7 s baseline)
     - POP / ECHO / DRAMA at 390: p95 0.9-2.1 ms
     - CLEANSE at 390: p95 1.4-1.6 ms
   - Rare single passes still reach 6-17 ms, when a whole open menu or a HUD pill is first laid out after writes. That is the relayout the browser does before that paint anyway, now counted in our time.
   - Not yet measured on a real mid-range phone (needs Chrome remote profiling; left for Regression).
6. **Overlay skip.** The `/eos[A-Z]/`-on-any-ancestor test is gone. The floor now skips only an explicit list of EOS overlay roots or a `data-eos-overlay` attribute:
   - the list: `.eosCheckIn` / `CheckInChip` / `ShiftMeter` / `SafetyCard` / `SupportPill` / `OrbShelf` / `Companion` / `Arena` / `StillMoment` / `WorldChips` / `ArrowLayer` / `SrOnly`, the mood layers, `eosThoughtFlow` / `Core` / `Dial` / `Lane`
   - the walk stops before checking the classes of `.releaseStage` / `.tsArcade`
   - marker classes such as `.eosNext` no longer switch the floor off
7. **Word-fit minimum:** 13 → 14 px rendered (§4.1).
8. **Phone HUD, owner rule.** At ≤ 700 px:
   - Always visible in the meter row: the LVL pill, and the sparks pill when the meter has room (13 px, 22 px tall).
   - TOKENS and CHAIN drop in as a hit toast under the meter while `.isHit` is set, with `tsRewardPillHit` still playing.
   - Where a legacy `.literalProgress` pill narrows the meter (for example DRAMA MACHINE's "0 / 6 THOUGHTS"), LVL stays on and the sparks pill joins the toast as its first row ("✦ 0 SHIFT SPARKS" is one text node, so it cannot be shortened). That keeps the meter ("SHIFT · 0%") visible.
   - Reduced motion: no slide.
9. **MIND BEND on phones.** At ≤ 560 px the reframe line stays visible as one 13 px line (ellipsis) until the first hit; `.globalPlayGuide.isActive` hides it (spec rule). The "How to play" kicker is back on phones as an inline kicker.
10. **Legacy reveal on phones.** At ≤ 760 px both wrappers use the "card / PREVIOUS | NEXT" grid. The legacy card keeps its own 313 px width and is centred (x 39-351 at 390). PREVIOUS and NEXT sit in one row under it with no overlap (POP and ECHO checked after the card settled).
11. **Not changed:** GO WEIRD's 7 px prop hint is still hidden on phones. It cannot fit a 65 px button at a readable size, and the LIVE GUIDE plus the arrow carry it. This is a documented exception, not a removal of gameplay.

## Fix-round acceptance (scratch integrated build /tmp/eos_readability_int; baseline /tmp/eos_rev_read_base_int)
- **390** (POP, ECHO, DRAMA MACHINE, CLEANSE):
  - play start and reveal: `smallText(12)` empty, 0 page errors, all reach the reveal (CLEANSE 36 s against a 32 s baseline when run alone)
  - DRAMA buttons as above; HUD pills as above; MIND BEND shown at start
  - the legacy reveal grid is centred
- **1280** (HOT POTATO, DRAMA MACHINE, CLEANSE): `smallText(12)` empty, 0 errors, all reach the reveal. Pills 14 px; the DRAMA buttons are 14 / 14.
- **Shrink:** ZOOM OUT / MICROSCOPE are monotonic per word at both sizes; FINGER TRAP is still compensated.
- **Builds:** isolated `build.py --dev-dir /tmp/eos_readability --modules 00_eos_core.jsx,10_eos_readability.jsx` OK, integrated scratch OK, full `python3 build.py` OK (FULL.txt restored, not mine to commit).
- **Screenshots** (looked at): `/tmp/eos_readability_work/fy_105_390_a.png` (DRAMA 390 play), `fy_1_390_c.png` (POP 390 reveal), `fx_*_390_*.png`.
- **Test scripts:**
  - `/tmp/eos_readability_work/fx_states.mjs` (state probe: smallText, pills, MIND BEND, DRAMA buttons, reveal rects, floor stats)
  - `/tmp/eos_readability_work/cl.mjs` (CLEANSE occlusion)
  - `/tmp/rev_read_exp/shrink.mjs` (the reviewer's)
- **Load note:** two CLEANSE-at-390 runs that shared the machine with another browser hit the 90 s limit. CLEANSE finished every time it ran alone (36 s with the probe, 45-53 s in a plain run alongside the baseline). Regression should watch its 390 timing.

## Integrator must wire (all already present as I1 edits in dev/eos_integrate.py; apply them as-is)
- `<EosTextFloor stage={stage} />` inside `.releaseStage` (the I1 floor mount, unchanged). It renders a 1 px invisible `aria-hidden` probe span `data-eos="text-floor"` (absolute, `pointer-events:none`) and finds `.tsArcade` through `closest`.
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
- **Word fit:** a single word that cannot fit a tiny object at 15/16 px is fitted down to no less than 14 px rendered (§4.1), rather than broken inside the word. No measured release-1 game needs this any more at 390.
- **Born-scaled rule:** a word the game itself shrinks during play (seen at full size before) is never compensated, so a card that shrinks when parked or shelved renders its words at font × scale (≥ 12 px in every game measured).
