# readability — FINISHED, fix rounds 1, 2 and 3 applied (task `readability`, docs/EOS_SPEC.md §4, §0.4 tokens, §12.1)

## What I built
`src/eos/10_eos_readability.jsx` (one file, no imports/exports, every top-level name `EOS_READ_*` / `eosRead*`, the public names excepted). It has three layers, and none of them ever shrinks text:
1. **`EOS_READ_CSS`** (registered at top level with `eosCss("readability", EOS_READ_CSS)`). It sets explicit sizes for the chrome:
   - header: score bar 14/18 px; on phones the header shows "THINKSTILL" at 15 px, left-aligned and clear of the score pill
   - menu: group labels 13 px; game button label on 2 lines
   - HUD on phones: one slim full-width meter row with an always-visible LVL pill (plus sparks when there is room); TOKENS / CHAIN (and sparks where the meter is narrowed) show in a short hit ticker INSIDE that row (round 2), never over the arena
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
   - Every pass runs in the frame's ResizeObserver step (after layout, before paint). New text found by the MutationObserver is floored before its first paint, with no forced style or layout flush.
   - A time-boxed sweep runs every 900 ms, 250 ms after a pointerup, after a resize and on a stage change.
   - It re-checks elements it raised and removes its inline size once the game's own size is larger.
   - Held scales (round 2 rules): boxes born scaled or inside a static container (`.ftTrap`) are compensated to their full target; a box the game shrank itself (a parked / shelved card) only up to the plain 12.5 px floor; the shrink mechanics (`.u26 .u29 .u30 .u53 .u58 .u104`) and HUD chrome never. While the game shrinks a box the floor has sized, its size never rises.
   - It fits a word to its box (≥ 14 px, rendered only where the floor compensates the scale) so it never breaks mid-word. It climbs past a parent only when that parent is sized by its content (round 3). A word it stepped down keeps that size while it exactly fills its box (hysteresis).
   - It skips the listed EOS overlay roots (or `[data-eos-overlay]`), `.tsRewardSurge`, `svg` and aria-hidden decoration. Exception: aria-hidden copies of the user's words (`.tsBubbleTextContainer` name tags) are floored.
   - It never writes inside a scaled SVG viewBox; those cases are reported by `scan()`.
   - Test hook: `eosApi("readability")` / `window.__eos.readability` = `{scan, targets, pass, stats, reset, log, settle, targetOf, targetsOf}`.

**Exports:** `EOS_READ_CSS`, `EOS_READ_TARGETS`, `EosTextFloor`.

## Fix round 3 (docs/eos_status/readability.review_r3.json) — what changed
I changed only `src/eos/10_eos_readability.jsx`. Verified in the isolated integrated build `/tmp/v2_readability` (all `src/eos` modules, 0 stubs). Scripts are in `/tmp/v2_readability_t`.

1. **The user's words flipped between two sizes on every pass (major).** Cause: the round-2 "hug" climb also climbed past boxes that really constrain the word (a block that fills its parent, a box with a set width).
   - New `eosReadSizedByContent(box)`. The fit climbs past a parent only when that parent is sized by its content:
     - width `auto` (Typed OM; an inline width when Typed OM is missing) or `fit-content` / `max-content`
     - or `inline-*` / `table` display, a float, an absolute / fixed box that is not stretched, a flex row item that does not grow, or a flex column / grid item that is not stretched
     - A block that fills its parent, or any box with a set width, is the constraint.
   - Hysteresis: the pass passes in `rec.px`. A word the fit stepped down that now exactly fills its box keeps that size. No pass re-fits it against a farther box.
   - The fit cache also checks the width of the box the answer was measured against.
   - Unit test (`unit.mjs`, the reviewer's 115 px 'overwhelmingly' case): block, flex item, inline-block and grid cell all hold 15.08 on all 8 passes, with or without hysteresis. Words that hug their text inside a wide inline-block, absolute or flex-column parent still get the full 16.25.
   - Floor-reversal sweep (`osc.mjs`, ids 1-110, 'my boss yelled at me in the meeting today'):
     - 390: 0 elements with ≥ 2 reversals, 0 page errors
     - 1280: 0 elements, 549 floored elements tracked, 0 page errors
   - MICROSCOPE 58 (`micro.mjs`, focus knob every 1.5 / 1.8 s):
     - upsScaled 0, fsUpScaled 0
     - one font size per word at full scale (15.25 at 390, 16.25 at 1280), so the birth creep stays gone
   - Full plays (`fin2.mjs`): VACUUM 23, RED LIGHT 64 and TINY SOUNDTRACK 106 finish at 390 and at 1280, with 0 errors.
2. **TINY SOUNDTRACK 106 at 390: "meetin|g" broke in a 53 px column.** I found this while verifying. At the 14 px fit minimum the word did not fit.
   - The phone guard lets `.tsndText` also use the 26 px badge's column (`margin:2px 0 0 -31px; width:calc(100% + 31px)`). The word starts below the badge.
   - The word fit now counts a negative margin as extra line width.
   - `t106.mjs` at 390: every word holds 16.25 px in an 84 px line, with no font-size change in the 8 s after the first sample. "my boss", "yelled at" and "meeting" each read on one line. 1280 is unchanged.
3. **The narrowed-meter pop was dead CSS (minor).** The `(max-width:560px) and (prefers-reduced-motion:no-preference)` rules now use `.tsShiftRewardHud.tsShiftRewardHud`, so they win over the plain 560 rules further down.
   - `hud.mjs` at 390: on DRAMA 105 and RAIN OUT 110, spark, token and chain run `eosReadTick, tsRewardPillHit`.
   - With reduced motion they run `eosReadTick` only.
4. **The band faded out before the TOKENS / CHAIN pills (minor).** The band has its own keyframes. It fades in first, holds until the pills are gone, then fades out:
   - `eosReadBand`, 1.75 s, full-width meter (holds to 1.60 s)
   - `eosReadBand2`, 2.75 s, narrowed meter (holds to 2.60 s)
   - `hud.mjs` (np and rm): every sample where a pill is visible (opacity .42-1) has the band at opacity 1. The band reaches 0 only after the pills.
5. **TOKENS and CHAIN overlapped during the pop (minor).** `transform-origin` is now right centre on `.token` and left centre on `.chain`, so each pill grows away from the 4 px gap.
   - FINGER TRAP 102 during the pop: token 132-210 and chain 214-275.
   - DRAMA 105 mid-pop: token 166-276 and chain 280-365. The gap stays 4 px.
6. **The feedback headline read 7.7-8.9 px (minor): no change, confirmed to be a frame-starvation artifact.**
   - The headline runs the arcade's `tsCursorWordPunch`: 780 ms, scale .48 → 1.18 in the first 11 % (86 ms), with blur(3px) and brightness 2.4.
   - It is under 12 px only for about 20-30 ms (1-2 frames at 60 fps), as a blurred flash.
   - The rAF trace (`card_raf.mjs`, 102 at 1280) got only 29 frames in about 35 s on this loaded machine. Each "episode" is the same 2 sampled frames, so headless runs see the flash as held.
   - The arcade's entrance animation stays as it is (owner policy: never remove or alter animations).
7. **Progressive flooring at play start under load (optional minor): not changed.**
   - It was not reproduced on phone, and the reviewer ties it to machine load.
   - Re-ordering the sweep would change the core pass loop for an effect that only shows in a starved headless run.
   - The per-pass time box stays within the perf budget.

## Fix round 2 (docs/eos_status/readability.review_r2.json) — what changed
I applied all 6 findings (1 major, 5 minors) and changed only `src/eos/10_eos_readability.jsx`.

1. **MICROSCOPE (58): the word grew back while the game shrank it (major).**
   - Cause: the word fit divided its 14 px minimum by the game's scale (14 / .78 = 17.9), so the font rose to the target again.
   - The fit now uses the scale only where the floor compensates it: ratio = `(scaled || 1) * k`.
   - While the game shrinks a box that the floor has sized, or saw at full size, its size never rises (`want ≤ rec.px`).
   - A NEW word that enters small (growing in) is still floored at once, before its first paint.
   - Birth creep (16.25 → 15.6 → 15.1 → 14.7 → 14 within about 1 s) is gone.
     - Cause: the box hugs its one-line text, so "exactly as wide as its box" read as "does not fit", and every pass trimmed a little more.
     - The fit now climbs past boxes that hug their child (up to 3 levels) and measures against the first real constraint.
   - Per-frame trace (`/tmp/rev_rd2/micro2.mjs`, focus knob every 1.8 s):
     - 1280: the font holds at 16.25 on every word, and the rendered size only falls (16 → 13.2 → 9.9 → 6.6) until the next word. `upsWhileScaled` 0.
     - 390: font constant, `upsWhileScaled` 0.
   - `shrink.mjs` at 390: MICROSCOPE and ZOOM OUT both give `maxFsGrowth` 0 and 0 bounces. Rendered size at full scale is ≥ 14.8 (MICROSCOPE, 15.25 × .97) and 16 (ZOOM OUT).
2. **SHELF IT (95): shelved words were 11.9 px.**
   - A box the game shrank itself (in `S.full`, outside the shrink list and static containers) is now compensated, once its scale has held for 350 ms, up to the plain floor only: 12.5 / (sc·k), i.e. 12.5 px rendered, never the 16 / 15 word target.
   - `minw.mjs`, full plays:
     - 390: two isolated samples at 11.2-11.3 px (single 250 ms samples, during the shelving motion before the hold). The resting state is no longer under 12.
     - 1280: minimum 13.1.
     - 0 errors, both finished.
3. **FINGER TRAP (102): words rendered at 13.9-14 px.**
   - `.ftTrap` is now a static container (`EOS_READ_STATIC_SEL`). Its tube rests at `scaleX(.86)` (the arcade sets `--ft-scale = .86 + progress × .14`), so its words get the full target even though they were first drawn at full size during the entrance.
   - When the game grows a compensated box (the tube opening with each push), the floor keeps its size. The word grows with the trap instead of dropping back 350 ms after each push. It is lowered once the scale is ≥ .97 (the release flash).
   - Measured (`ft2.mjs`, 24 s window): 390 goes 13.9 → 15.2 px rendered (font 17.7); 1280 goes 14.0 → 16.2 px (font 18.9).
4. **Reduced motion: TOKENS / CHAIN still slid.** The slide and its RM overrides are gone.
   - The new ticker animates only opacity and visibility (`@keyframes eosReadTick`), so reduced motion needs no override.
   - The arcade's `tsRewardPillHit` pop is added only inside `@media (prefers-reduced-motion:no-preference)` blocks.
   - Measured with reducedMotion at 390: computed `translate` on token and chain is `none`.
5. **and 6. Phone hit toast: 2-3 stacked pills covered the arena for 3.2 s.** The toast is replaced by a hit TICKER inside the meter row (y 72-95 at 390). It never reaches the arena.
   - `.tsShiftRewardHud` is `position:static` on phones, so a glass band (`::before`, opaque HUD glass, gold hairline) and the ticker pills position against the meter row itself. The row box never changes size.
   - Full-width meter (102, 103, 106, 107 and legacy games without a counter pill): the band covers the row for 1.6 s, with TOKENS and CHAIN as one pair split at 55 % (token 115-210, chain 214-288 at 390). Sparks and LVL stay in the row between hits.
   - Narrowed meter (games with the `.literalProgress` counter pill, e.g. 100, 101, 104, 105, 108, 109, 110). Two phases in the same row:
     - SPARKS centred, 0-1.3 s, with its pop (203-333).
     - then TOKENS + CHAIN, 1.3-2.6 s (180-276 and 280-354).
     - The game's own counter pill beside the row keeps showing progress during the ticker.
   - The ticker plays once per hit streak (`.isHit` stays on while hits keep coming) and then hands the row back to the meter.
   - Verified at 390 on 100, 105, 108 and 110, with screenshots at both phases. DRAMA's "0 / 6 TAKES CUT" counter and TAKE cards, RAIN OUT's word clouds and WORD SALAD's "boss" tile are all clear. Desktop (1280) is unchanged: 4 pills at 14 px, no band.
7. **HUD chrome is never scale-compensated** (`EOS_READ_NO_SCALE_SEL`: `.tsShiftRewardHud`, `.engineProgressHud`, `.releaseScoreBar`).
   - The pills' `tsRewardPillHit` pop starts at scale .82. On a slow headless frame that read as a held scale and raised the sparks pill to 15.24 px.
   - The guard does not depend on frame rate.
8. **A bug introduced and caught during this round:** a stray `}` (left over from replacing the RM block) dropped the whole `@media (max-width:560px)` block. The HUD probe caught it (the meter was not narrowed), and it was fixed. A brace-balance check of `EOS_READ_CSS` now passes (depth 0, never negative).

## Fix round 2 acceptance (scratch integrated build /tmp/eos_readability_int; isolated build /tmp/eos_readability OK)
- **Small text and errors:** `smallText(12)` is empty at play start for POP 1, HOT POTATO 100, DRAMA 105, WORD SALAD 108 and RAIN OUT 110 at 390. 0 page errors in every run.
- **Full plays:**
  - DRAMA 105 at 390: finished in 23 s, `smallText` 0, floor avg 0.94 ms per pass, flush max 0.1 ms.
  - HOT POTATO 100 at 1280, run alone: finished in 69 s (the round-1 runs took 39-72 s, the baseline 58.7 s, all headless). Floor avg 0.84 ms per pass, 3 of 160 passes over 2 ms, own total 134 ms, flush max 0.1 ms. It missed a 120 s limit once while sharing the machine with another browser.
- **Scripts:**
  - `/tmp/eos_readability_work/r2_tick.mjs` (ticker geometry and timing, `rm` flag)
  - `r2_phase.mjs` (phase screenshots)
  - `r2_anim.mjs` (animation trace)
  - `r2_shrinkx.mjs` (`shrink.mjs` plus growth and low-at-full detail)
  - `r2_minwx.mjs` (`minw.mjs` plus font and scale)
  - `r2_ft_long.mjs`
  - `r2_perf.mjs`
  - the reviewers' `/tmp/rev_rd2/micro2.mjs` and `/tmp/rev_read_r2/minw.mjs`
- **Screenshots looked at:** `/tmp/eos_readability_work/r2_sheet390.png` (105 / 110 / 108 ticker phase 1) and `r2p_sheet.png` (105 phase 2 at 390, 102 at 390, 105 desktop).
- Not re-run this round: the full `python3 build.py` (FULL.txt is not mine to commit) and the 110 × 2 noShrink sweep (left to Regression, as before).

## Fix round 1 (docs/eos_status/readability.review_r1.json) — what changed
All 11 findings applied (2 majors, 9 minors). Only `src/eos/10_eos_readability.jsx` changed.
1. **DRAMA MACHINE (105) buttons, major** (finding 1). `.dmCutButton` is out of the `max(14px,1em)` rule. Both machine buttons now get an explicit size: 14 px at 1280 (was 14/16) and 13 px at 390.
   - At ≤ 560 px the control room hugs its content (min-height 0, 70 px dial, tighter gaps).
   - Each label reads on two whole lines ("✦ MAKE IT / DRAMATIC", "✂ CUT THE / DRAMA") inside the machine.
   - Measured at 390: buttons y 541-583 against the machine bottom at 602. Not clipped, `sw = cw` and `sh = ch`, `elementFromPoint` at each centre hits the button. 1280: both 14 px, y 444-550, inside, hit OK.
2. **Held-scale compensation vs. shrink games, major** (finding 8).
   - The floor compensates a held scale only for a box that was BORN scaled: a new per-element `full` WeakSet records every element ever drawn at scale ≥ .97, and those are never compensated.
   - Compensation is also skipped inside the shrink mechanics `.u26 .u29 .u30 .u53 .u58 .u104`.
   - One scale measure (the exact transform-chain scale) now drives every decision, including the .6 cut-off and the word-fit ratio.
   - Re-run of the reviewer's `shrink.mjs` at 390: ZOOM OUT renders 16 → 12.6 → 10 → 5.3 → 3.2 per word, and 16.3 → 12.9 → 10.5 → 6.3 → 3.3. MICROSCOPE renders 13.7 → 12 → 9.1 → 6 → 4.6. Within a word the size only goes down; it rises only when the next thought appears (progress steps with it). Same at 1280.
   - (Round 1 claimed FINGER TRAP was still compensated and SHELF IT words stayed at 16.3-16.6. The round-2 review showed both claims were wrong. Round 2 fixes both, see below.)
3. **Memory** (finding 2). The cleanup restores the inline size of every raised element still on the page, then clears `tagged` / `recheckQ` / `list` / `ctx` / `cursor` and drops the root's state. Detached trees are no longer held.
4. **Several instances** (finding 3). State is now per arcade root: a WeakMap from root to its state, selected with `eosReadUse(root)` by every entry point (pass, MO and RO callbacks, cleanup, scan and test hooks). Each root keeps its own list, breakpoint, canvas scale, cursor and stats.
5. **Performance** (review findings 4 and 9). Every floor pass now runs in the frame's ResizeObserver step, which comes after layout and before paint. A pass is requested by toggling the width of a 1 px invisible probe span, which replaces the old `hidden` marker span: `aria-hidden`, `visibility:hidden`, `pointer-events:none`, `contain:strict`, `position:absolute`.
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
6. **Overlay skip** (finding 5). The `/eos[A-Z]/`-on-any-ancestor test is gone. The floor now skips only an explicit list of EOS overlay roots or a `data-eos-overlay` attribute:
   - the list: `.eosCheckIn` / `CheckInChip` / `ShiftMeter` / `SafetyCard` / `SupportPill` / `OrbShelf` / `Companion` / `Arena` / `StillMoment` / `WorldChips` / `ArrowLayer` / `SrOnly`, the mood layers, `eosThoughtFlow` / `Core` / `Dial` / `Lane`
   - the walk stops before checking the classes of `.releaseStage` / `.tsArcade`
   - marker classes such as `.eosNext` no longer switch the floor off
7. **Word-fit minimum** (finding 7): 13 → 14 px rendered (§4.1).
8. **Phone HUD, owner rule** (finding 6). At ≤ 700 px:
   - Always visible in the meter row: the LVL pill, and the sparks pill when the meter has room (13 px, 22 px tall).
   - TOKENS and CHAIN drop in as a hit toast under the meter while `.isHit` is set, with `tsRewardPillHit` still playing.
   - Where a legacy `.literalProgress` pill narrows the meter (for example DRAMA MACHINE's "0 / 6 THOUGHTS"), LVL stays on and the sparks pill joins the toast as its first row ("✦ 0 SHIFT SPARKS" is one text node, so it cannot be shortened). That keeps the meter ("SHIFT · 0%") visible.
   - (Superseded in round 2: the stacked toast is replaced by an in-row ticker.)
9. **MIND BEND on phones** (finding 10). At ≤ 560 px the reframe line stays visible as one 13 px line (ellipsis) until the first hit; `.globalPlayGuide.isActive` hides it (spec rule). The "How to play" kicker is back on phones as an inline kicker.
10. **Legacy reveal on phones** (finding 11). At ≤ 760 px both wrappers use the "card / PREVIOUS | NEXT" grid. The legacy card keeps its own 313 px width and is centred (x 39-351 at 390). PREVIOUS and NEXT sit in one row under it with no overlap (POP and ECHO checked after the card settled).
11. **Not changed:** GO WEIRD's 7 px prop hint is still hidden on phones. It cannot fit a 65 px button at a readable size, and the LIVE GUIDE plus the arrow carry it. This is a documented exception, not a removal of gameplay.

## Fix-round acceptance (scratch integrated build /tmp/eos_readability_int; baseline /tmp/eos_rev_read_base_int)
- **390** (POP, ECHO, DRAMA MACHINE, CLEANSE):
  - play start and reveal: `smallText(12)` empty, 0 page errors, all reach the reveal (CLEANSE 36 s against a 32 s baseline when run alone)
  - DRAMA buttons as above; HUD pills as above; MIND BEND shown at start
  - the legacy reveal grid is centred
- **1280** (HOT POTATO, DRAMA MACHINE, CLEANSE): `smallText(12)` empty, 0 errors, all reach the reveal. Pills 14 px; the DRAMA buttons are 14 / 14.
- **Shrink:** ZOOM OUT is monotonic per word at both sizes. (MICROSCOPE was not monotonic per frame because of the word-fit path, and FINGER TRAP was not compensated. Both are fixed in round 2.)
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
- **Held-scale rule (round 2):** a word the game itself shrinks during play is never raised while it shrinks. Once a parked or shelved card holds still (350 ms), it is lifted to the plain 12.5 px floor. For the length of the shelving motion (< 0.5 s) the word can read 11.2-11.5 px. A held-scale rule cannot compensate a scale that is still moving.
- **Phone ticker in a tap streak:** the CSS ticker restarts only when `.isHit` toggles. During one unbroken streak of hits it plays once, and the per-hit "STILL HIT · CHAIN ×n" card at the hit point carries every later hit.
