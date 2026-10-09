# ThinkStill Release: Gap Audit (Part 26)

Date: 2026-10-09. Branch `claude/jolly-hopper-ognrxj`. Binding source: `FOUNDER_REQUIREMENTS.md` (the founder's newest explicit words win). The criteria are listed in `ACCEPTANCE_CRITERIA.md`.

**What this is.** This file merges the four verification slices (`verify_bubbles-characters.json`, `verify_console-input.json`, `verify_finales-perf.json`, `verify_game-specific.json`, **339 rows**) into one report. Every row, with its full evidence, is in `gap_rows.json` (`rows`). The 39 criterion ids that no slice covered (Part 8 and group H) are given a derived status in `gap_rows.json` (`derived_rows`). These are counted separately below. Each one is tagged *derived*.

**Builds compared.** INT is the integrated build (`dev/eos_integrate.py`, all 15 `src/eos` modules, 0 stubs). BASE is the arcade plus Pixar with no EOS integration (`build.py --modules 00_eos_core.jsx`), and its `00_arcade.jsx` is the founder-approved baseline `485500c`. All scratch builds were under `/tmp`. For this merge, one lean confirmation sweep (10 to 14 runs, one worker) ran on a fresh INT build of committed HEAD (`/tmp/ga_int_gap`) against BASE (`/tmp/ga_base_fp`). See §3.0.

**State of the code at the time of the audit.**

- Commit `7b3df77` (12:34) applied the I1-I3 integration edits in place, so `00_arcade.jsx` now differs from `485500c` by 143 lines.
- That diff contains no line of `RewardSurgeBurst`, `wrappedDone`, `tsRewardSurge` or any finale code (`git diff 485500c HEAD -- framer/src/00_arcade.jsx | grep -E 'Surge|wrappedDone|finale|burst'` returns nothing). **The approved burst code is untouched.** Every regression below comes from the EOS layers (`src/eos/*`) drawn on top of it.
- The parallel release-v2 workflow has an uncommitted 5-line fix in `00_arcade.jsx` (keys on `.plug`/`.leafWord`/`.meteorRock`/`.fileCard`) aimed at P0-1. It is not in any build audited here.

**Honesty limits.** Every browser run used headless Chromium.

- Sound is evidenced only as *scheduled or triggered*, never as heard.
- Performance is *relative only*: there is no GPU, and the CPU was shared with another workflow (load average 11 to 24 during the slices).
- No row has real-device evidence (P22-g).
- Sweeps that timed out under load are labelled that way and are not counted as game defects unless they were reproduced.

---------------------------------------------------------------------------------------------------

## 1. Summary

### 1.1 The 339 verification rows

| group | rows | VERIFIED | IMPLEMENTED-UNTESTED | PARTIAL | MISSING | REGRESSION | SUPERSEDED |
|---|---:|---:|---:|---:|---:|---:|---:|
| A Console, layout, header, feedback, controls (P3, P10, P14) | 50 | 14 | 15 | 14 | 2 | 4 | 1 |
| B Input, personalisation, upload (P4, P6) | 25 | 5 | 10 | 7 | 3 | 0 | 0 |
| C Bubbles and characters (P5, P7) | 36 | 2 | 3 | 21 | 3 | 7 | 0 |
| D Gameplay, navigation, arc (P8, P9, P16) | 23 | 3 | 6 | 6 | 1 | 3 | 4 |
| E Finales, sound, performance (P11, P12, P15) | 45 | 7 | 9 | 18 | 4 | 5 | 2 |
| F Game-specific corrections (P13) | 134 | 40 | 40 | 46 | 5 | 3 | 0 |
| G Vibes, safety, sharing, architecture (P2, P17-P20) | 26 | 16 | 5 | 1 | 4 | 0 | 0 |
| H Process and approval (P21-P24, P26) | 0 | – | – | – | – | – | – |
| **All rows** | **339** | **87** | **88** | **113** | **22** | **22** | **7** |

Two slices both measured P14-a to P14-g, so 7 rows are duplicates. Merging them gives **332 unique ids**: 87 VERIFIED, 82 IMPLEMENTED-UNTESTED, 112 PARTIAL, 22 MISSING, 22 REGRESSION and 7 SUPERSEDED. When the slices disagreed, the better-measured failing status was kept. For example, P14-f is REGRESSION from the console slice, against IMPLEMENTED-UNTESTED from the bubbles slice. The full list is in `gap_rows.json` (`merged_duplicates`).

### 1.2 Ids no slice covered (derived in this merge)

| group | ids | VERIFIED | IMPLEMENTED-UNTESTED | PARTIAL | MISSING | REGRESSION |
|---|---:|---:|---:|---:|---:|---:|
| D Part 8 (active play, mechanics, progression) | 15 | 0 | 4 | 10 | 0 | 1 (same defect as P9.3-c) |
| H Parts 21-24, 26 | 24 | 5 | 4 | 14 | 1 (P22-g real devices) | 0 |

**All 371 criterion ids:** 92 VERIFIED, 90 IMPLEMENTED-UNTESTED, 136 PARTIAL, 23 MISSING, 23 REGRESSION and 7 SUPERSEDED.

### 1.3 In one paragraph

Nothing in the approved arcade code was edited. However, the new EOS layers now change what the player sees and hears during the approved dopamine bursts, and they hide the end-of-game navigation on phones. These are the most serious items, and **all 22 regressions can be undone in shared EOS code without touching a single game**.

The biggest global gap is older than the new work. Bubbles still do not follow the founder's bubble rules:

- 14 of the 20 bubble games show no picture.
- 45 games put dark boxes behind the picture or the text.
- No multi-bubble game puts the text below the picture inside the bubble.
- Uploaded images are cropped and grouped AAABBB.

One shared bubble component fixes most of this.

The confirmed P0 blockers are:

- UNFOLLOW (47) stalls on the phone. A fix is in flight.
- VACUUM's SUCK button is hidden behind the LIVE GUIDE.
- CLEANSE (109) failed 2 of 2 on the phone in the slices. It finished 3 of 3 on HEAD, but 5 of 5 is needed to close it.

---------------------------------------------------------------------------------------------------

## 2. Confirmed regressions: approved behaviour that the new work changed

There are 22 REGRESSION rows, which reduce to 8 defects. Each defect is the difference between INT and BASE. Older defects of the same kind are tracked in §3.

None of these fixes changes an approved burst. Each one removes an EOS layer from the burst, or restores the BASE behaviour, so **no founder approval is needed to make them**. Keeping any of the overlays *would* need approval (C2, P11.3-e).

| # | defect (rows) | evidence (INT vs BASE) | fix (shared, EOS only) | test |
|---|---|---|---|---|
| **R1** | **EOS layers and words are painted over the approved dopamine burst**: P11.3-a, P11.3-c, P11.1-g (all P0), P13.1-c POP, P13.19-l HOT POTATO, P13.23-b BURN | The burst DOM is identical: the H10 signature is equal on 10 games (231 descendants, 177 animations). The *rendered* burst is not. In a frozen-frame diff at mega +0.6 s, the EOS layers change the burst rect by 3.07-6.18% and the core by 3.3-13.96% (POP 5.52/13.67, CLEANSE 6.18/13.96, BURN 5.38/7.32, HOT POTATO 5.63/4.02, RAIN OUT 3.07/3.35; the control re-shot diff is ≤ 0.12%). The causes are a teal colour grade, a Still-Point glow, flip words in the burst core (15, 18, 24, 41, 104, 1, 100, 110, and BURN at 1280), and the companion line "nice hit — now let it cool". BASE shows none of these. In code, `src/eos/14_eos_mood.jsx` L636 `EOS_MOOD_DONE_SEL = ".globalPlayGuide.isComplete, .tsRewardSurge.mega"` starts the bloom *on* the burst. Every layer has opacity 1 during the burst. | While `.tsRewardSurge.mega` is mounted, set `.eosMoodGrade`, `.eosMoodAir`, `.eosMoodFlip`, `.eosCompanion` and the `.eosThoughtFlow` glow to opacity 0 (or unmount them), and start the flip bloom only after the burst unmounts. Also move the existing 100-110 finish card off the burst core until +1.8 s. | `fp_freeze2.mjs` on 1, 18, 100, 109, 110 at V1 then V2: the all-EOS diff is ≤ 3% in the burst rect. A text-node scan shows 0 text in the core from mount to +1.8 s on ALL114. The founder then confirms side-by-side tiles. |
| **R2** | **A second finale sound plays before the burst**: P11.1-f | BASE: the only finale cue is `sfx('win')` ×3 in `wrappedDone`. INT adds an EOS chime (`eosTone` 1175/1568/1976 Hz) at progress 100, which is 0.7-1.2 s *before* the burst in POP. This breaks the founder's 2026-10-09 rule of no double sound (CREATIVE_STANDARDS L66). The evidence is a scheduled log only. | Play the chime after the burst ends, or drop it during the finale. | H8 log: no non-burst cue between progress 100 and mega unmount. Then a sound-capable device check. |
| **R3** | **Rain sound plays without the washout**: P12.4-a | INT: `EosStillMoment` calls the rain buffer on the reveal (`src/eos/50_eos_shift.jsx` L472 `rainRef.current?.(4)`) with no rain visual. It was logged in SHRED and 104. RAIN OUT itself is still correct. Scheduled only. | Give the Still Moment its own breath sound. It already plays an `eosTone` sigh at L475. | H8: every `rain:*` cue has a rain or washout visual within -100 ms, ALL114 including the reveal. |
| **R4** | **End-of-game navigation is hidden, slow and crowded on phones**: P3.4-j, P9.3-c (lost control, P0 tier), P9.3-d, P9.3-e, P14-f, and derived P8.3-h | BASE: ‹ PREVIOUS / NEXT › appear on the reveal at once, with 3 primary buttons. INT: the side nav has `visibility:hidden` until the shift meter is `done` (`50_eos_shift.jsx` L1481 at HEAD). At V1 it then sits under the composer (y 743/785). Reaching the next game takes 3 taps and about 6-7 s. The done step has 4 primary buttons (I'M GOOD, ONE MORE ▶ <GAME>, SHARE, AGAIN), plus a link, 2 chips and 2 arrows. | Remove the hide rule. Implement F3's single **Next** (from the rotation), **Again** and **New thought**, reachable from 0 s and above the composer. Move SHARE to a quiet link. | Accessible-name diff BASE vs INT at input/play/reveal: every function within 1 tap. At most 3 primary buttons per reveal step. Reveal to next game in ≤ 2 taps and ≤ 3 s, at V1 and V2. |
| **R5** | **The how-it-works explanation is hidden on the first screen**: P10-b | BASE shows `.releaseIdleStory` (4 steps). With INT's default check-in it gets `display:none` (`src/eos/40_eos_checkin.jsx` L1239). | Keep a compact how-it-works line, or the founder's supporting line, visible together with the check-in. Reword step 2 for F3. | Steps visible at input with the check-in on and off, ≤ 12 words each, ≥ 12 px, at V1 and V2. |
| **R6** | **The header title is left-aligned on phones**: P3.2-a | INT V1: EOS hides `.releaseTitleMain/.releaseTitleBy` (`src/eos/10_eos_readability.jsx` L306), and the brand sits -84 px off centre. BASE is centred, but its text is clipped to 7-10 px. | Keep the title centred in the phone block and fit a short title between the close button and the score pill. | Centre offset ≤ 4 px at V1, V2 and V3 with no clipping. |
| **R7** | **The EOS work made pictures smaller or cropped**: P5.3-a (105 faces), P5.3-b (105, 106), P7.3-b, P5.6-c | 106 TINY SOUNDTRACK avatar went from 40 to 24 px (`10_eos_readability.jsx` L239 `.u106 .tsndAvatar 26px`). In 105 DRAMA MACHINE the take-chip faces went from 32 to 20 px and the visible face band from 1.0 to 0. Per-game bubble overrides grew (60_eos_fixes L509/L515 `.u107`; 10_eos_readability L238-246). | Revert the 105/106 shrink. Move the per-game overrides into the shared bubble component (§5 batch 2). | `bub/run.mjs` size and band probe at V1/V2: 105 and 106 are at least their BASE size. `override.py` count does not exceed BASE. |
| **R8** | **The text-size floor was raised without growing the bubble**: P5.5-c, P5.5-e, P5.4-a (ZAP) | The floor lifted words from 8 to 15 px inside a bubble that did not change size. Effects: POP with 6 uploads breaks words mid-word ("zebr\|a", "kettl\|e"). Letters leave the circle in 19, 21, 43, 88 (new) and in 94, which now has 6 bubbles. In ZAP (6), the dark `b.zapBubbleCount` now covers the word in all 6 bubbles (BASE: 0). | Couple the floor to the bubble: the circle grows (`--tsb`) or the text splits, and it never shrinks again. Make the ZAP counter glass and move it clear of the word. | H7 line boxes inside r-2 and no mid-word breaks for 0/1/6 uploads, at V1 and V2. |

---------------------------------------------------------------------------------------------------

## 3. Gaps by priority

The tiers follow the founder's Part 21:

- **P0**: the game freezes, stalls, cannot be finished, or an essential control is lost.
- **P1**: a global founder rule is broken.
- **P2/P3**: the rest.

The slices rated the bubble-rule failures P0. Under Part 21 they are Priority 1, so they appear in §3.2. Their original severity is kept in `gap_rows.json` (`severity`), and the tier used here is in `report_tier`.

### 3.0 Confirmation sweep run for this merge (INT = committed HEAD, V1 390×844, one worker, load 1.5-3)

The goal was to separate real stalls from runs that only timed out because the machine was loaded. Driver: `finishGame` (`dev/eos_drive.mjs`). Results are in `gap_rows.json` (`confirm_runs`).

| game | INT (committed HEAD) | BASE (`485500c` arcade) | earlier slice result (loaded machine) | conclusion |
|---|---|---|---|---|
| 47 UNFOLLOW | **stuck at 17%** (21 actions / 46 s) | not run (baseline `metrics.json`: stuck) | stuck at 17%, 0 of 2 | **Confirmed P0 at HEAD (0 of 3).** The fix is uncommitted in the parallel workflow. |
| 109 CLEANSE | **3 of 3 reached the reveal** (37.6 s, 58.7 s, 45.8 s) | reached 100% but **no reveal within 160 s** | stuck at 0% and at 50%, 0 of 2 | Better at HEAD (probably the release-list fix in `13f870f`). Stays P0 until 5 of 5 at V1 and V2. The BASE ending problem matches `metrics.json` ("finished, reason timeout"). |
| 24 SLINGSHOT | reveal, 25.7 s | stuck at 33% | INT stuck at 86%, BASE stuck at 0% | Not a regression. The driver is flaky on this drag (it happens in BASE too). |
| 106 TINY SOUNDTRACK | reveal, 75.0 s | reveal, 30.1 s | INT timeout 182 s | Completes. INT took 2.5× longer (relative, load 2.3 vs 2.9), so watch it under P15.1-d. |
| 15 SHRED | reveal, 30.3 s | reveal, 77.3 s | timeout at 97% | Completes. The earlier timeout was load. |
| 18 BURN | reveal, 71.5 s | reveal, 61.2 s | timeout at 93% | Completes. The earlier timeout was load. |

Each result above is one to three runs, not H1 5/5. No page errors were logged in any run.

### 3.1 P0: broken or blocked

| id(s) | affected | current | required | correction | shared / game | test |
|---|---|---|---|---|---|---|
| **P0-1** P13.31-b, P8.3-i | 47 UNFOLLOW (phone) | Stuck at **17%** at V1 in 3 of 3 runs, including this merge's run on HEAD (the "17%" the founder reported). The dragged `.plug` is parked off the stage edge. The router documents the problem but still serves the game: `45_eos_router.jsx` L108 `EOS_ROUTER_PHONE_FRAGILE` applies only a 0.5 score penalty. V2 is OK, and 45 MAGNETS is now OK at V1. | Can be won on a phone, 5 of 5 runs with touch | Keep the plug inside the phone stage. A fix is in flight in the parallel workflow (key per index on `.plug`, uncommitted; its run r1 shows 47 passing at 390 and 1280). Until it is committed and re-run, remove 47 from routing on phones. | game (+ router) | H1 5/5 at V1 with touch, then V2 |
| **P0-2** P13.2-c | 109 CLEANSE (phone) | Earlier slices: stuck at 0% (49 s) and a 181 s timeout at 50% at V1 (0 of 2); V2 1 of 2. On committed HEAD it finished 3 of 3 at V1 (§3.0), so it is **probably fixed, but not yet proven**. CLEANSE is the founder's reference game and a Pilot A game. | Ends reliably, 5 of 5 at V1 and at V2 | Make the hold/let-go release window robust at 390. The CleanseEngine `releasedRef` change is now in HEAD. Re-run H1 five times. | game | H1 ×5 at V1 then V2 |
| **P0-3** P13.16-d, P3.1-e (F2) | 23 VACUUM; also 105, 85, and the 91 games where the "+STILL HIT · CHAIN" toast lands on a control | At V1 the **VACUUM SUCK** button (y 649-704) is hidden behind the LIVE GUIDE dock, so the main control is lost. The founder reported this as F2. | No container covers a control (elementFromPoint returns the control) | Dock the LIVE GUIDE as one reserved line, or collapse it after the first success. Keep the toast and companion out of gesture-target rects. This is one shared layout fix, not per-game patches. | shared | H3 overlap probe plus elementFromPoint on every control, at start, mid-play and pre-finale, ALL114 at V1 then V2 |
| **P0-4** P3.4-j, P9.3-c | Reveal on every game (phone) | Navigation is hidden until the meter is done, then sits under the composer | One tap to Next / Again / New thought | See **R4** | shared | See R4 |
| **P0-5** P11.1-g, P11.3-a, P11.3-c | Approved bursts on every game | EOS grade, glow, words and companion appear over the burst | The burst is shown exactly as approved, with no text over its core | See **R1** | shared | See R1 |
| **P0-6** P13.31-a, P8.3-i, P13.31-c, P9.1-f | The catalogue | Fresh completion data exists only for the NAMED set: V1 36 of 39 reached the reveal, V2 14 of 25 under load (4 of 4 re-runs passed). Since then, 15 SHRED and 18 BURN finish on HEAD (§3.0). Still open: 21 BIN (V2 timeout at 83%, not re-run idle) and 110 RAIN OUT (flaky drag at V2, and stalls at 1280 in both builds). The parallel workflow found 34 stalling intermittently at 390. Baseline `metrics.json` stalls: 8, 21, 45 and 47 at 390, and 34 at 1280 (reported). The router still routes ids reported as stalling (8, 14, 21, 28, 34, 45, 47, 51, 71, 77, 107), and the menu does not mark them. | Every game can be won at V1 (touch) and V2, and no broken game is ever served | (1) Feed routing and the F3 rotation only from a fresh H1 pass list per width. (2) Fix each confirmed stall. (3) Run ALL114 at V1, then V2, in sweeps of 25 or fewer on an idle machine. | shared (router) + game | H1 ALL114 at V1 then V2; the rotation excludes failures |

These were checked and are **not** P0:

- 24 SLINGSHOT and 106 TINY SOUNDTRACK stalled in the loaded slices (P15.1-d/e). Both finished on HEAD INT in this merge's sweep. BASE 24 stalled at 33%, which points to driver flakiness, not a regression.
- No black screen and no page errors were seen in any finished run (P11.1-h, P15.1-b).

### 3.2 P1: global founder rules (Part 21, Priority 1)

| # | rule | ids | affected | current | required | correction | shared / game | test |
|---|---|---|---|---|---|---|---|---|
| 1 | **No empty emotional bubble** (F8, mandatory) | P5.2-a, P5.2-c, P7.2-c | 14 of 20 BUBBLE games (1, 3, 4, 6, 9, 19, 21, 23, 41, 43, 91, 94, 99, 103); same in BASE | Gradient spheres with only the word | A default character or expression picture in every bubble. Uploads replace the defaults and removing them restores the defaults. | Extend the shared `tsStandardBubble` auto-picture (`bubblePhotoSelectors` L18672/L19945 + `.tsAutoEmotionPic`) to the legacy engines (`.popBubbleV2`, crack, stomp, zap, laser, erase, bin, vacuum, unhook, cut, priority, juggle, echo) | shared | `bub/run.mjs` with 0/1/6 uploads and remove, at V1/V2 |
| 2 | **No black masks** | P5.4-a, P5.4-b, P5.4-c, P13.19-j, P14-a | 45 games at INT 390 (44 for text), e.g. 2 CRUSH, 100, 103, 109 tag `rgba(5,18,30,.94)` (L14), 110; same set in BASE | Dark fills behind the picture or text, and no lint guard | No dark box anywhere in a bubble | Remove the dark fills in `GLOBAL_BUBBLE_STANDARDIZE_CSS` (L14) and the capsule/shell/tag rules; use a soft text glow. Add a lint to `build.py` with a reviewed whitelist. | shared | H6 runtime probe + lint, V1/V2 |
| 3 | **Picture on top, text below, inside the same bubble** (C1) | P5.5-a (MISSING), P5.5-b, P5.5-d, P5.5-f, P13.19-g, P13.19-h | Every multi-bubble game. Only 7, 33, 90 and 92 pass. Ids below 100 centre text over the picture (L28). 109 puts the tag outside the bubble. 86/87/88/100 print words over faces. | Text over the picture, or outside the bubble | Picture in about the top 60% of the circle, text block below it inside the circle, ≥ 15 px. The bubble grows rather than the text shrinking. | One shared bubble layout replacing the L14/L28 rules | shared | H7 on every line box, V1/V2 |
| 4 | **True circles** | P5.1-a, P3.1-j, P5.1-b, P13.11-b, P13.19-d | 1 (`.popBubbleV2` 84×92), 94 JUGGLE, 102 FINGER TRAP, 103 queue, 105 chips; squashed images in 102 (desktop), 93, 100 | Ovals at rest | `aspect-ratio:1` with squash only as a transient | One shared rule on every bubble root | shared | H4 \|w-h\| ≤ 1 at V1/V2/V3 |
| 5 | **No image cropping; pictures large enough** | P5.3-a, P5.3-b, P7.3-b, P5.7-b | Uploads: 100, 103, 107, 109, 110 lose whole edge bands (`object-fit:cover` + `scale(1.04-1.22)` + `clip-path circle(49%)`, L13/L28). Library faces cropped in 15, 105, 110. Pictures under 40 px in 32 sticker games. | Cropped; 14-30 px faces | The whole image is inside the circle and at least 48 px on a phone | `contain` framing with no scale-ups, plus a shared minimum picture size. Zoom ≥ 3× is a host property (confirm in Framer). | shared | Geometric plus pixel H5 with 1:1, 4:3 and 3:4 fixtures |
| 6 | **Upload distribution, popup and label** | P6.3-b (MISSING), P6.3-c, P6.1-a, P6.1-d/e, P6.2-a, P6.4-a | Every upload game | `expandUploadImageSlots` (L6815) fills in blocks (2 images → AAABBB, 4 → AABBCD; RAIN OUT shows both A copies side by side). The popup is not anchored to +. It does not close on typing focus or when the 6th image is added. Excess files are dropped silently. The "UPLOADED IMAGE" sentinel is internal only (untested beyond the games sampled). | ABABAB / ABCABC / ABCDAB / ABCDEA. A small popup right above + that closes correctly. "MAX 6" feedback. No label. | Round-robin fill `src[k % n]` (one line repairs every game). Anchor the popup and close it on focus or completion. | shared | n = 2..5: no adjacent duplicates; games 1, 100, 109, 110 at V1 |
| 7 | **Header and progress** | P3.2-a (R6); P3.2-b and P3.2-c VERIFIED | Header | Title left on phones | Centred title; progress then sound at top right | See R6 | shared | See R6 |
| 8 | **Feedback bubble** | P3.3-a (MISSING), P3.3-c, P3.3-d | All games (same in BASE) | The toast floats at the hit point (upper/left) and is re-keyed too fast | Bottom right, light, about 1-2 s, never over game elements | Pin `.globalStepFeedbackCopy/.globalFinishFeedbackCopy` to the stage's bottom-right corner, above the composer and clear of the companion. Merge chain updates into one toast. | shared | Centre in the bottom-right quadrant, ≥ 1 s, 0 overlap, V1/V2 |
| 9 | **One screen on mobile** | P3.1-a, P3.1-b (IMPLEMENTED-UNTESTED), P3.1-c, P3.1-f | Shell | POP fits exactly (844/844 at V1). ALL114 is not swept. Several controls are below 44 px (close, sound, mic, icon buttons, menu items). Long per-game paragraphs remain. | No scrolling and ≥ 44 px targets on every game | Larger hit boxes (visual size unchanged); fold paragraphs into the one-line guide (F2) | shared | ALL114 at V1, FRONT at V3 |
| 10 | **Shared music from Reset** | P12.1-a (IMPLEMENTED-UNTESTED), P12.1-b VERIFIED, P3.2-d | Every game | `useSharedMusic` (L2815) reads `__ts_reset_shared_media_v1`. Not run end to end. The sound toggle has no `aria-pressed`. | Release plays the user's per-bubble Reset music; the toggle covers all audio | Verify with a seeded Reset key; add `aria-pressed` | shared | Seeded key → music source, at V1 and on a device |
| 11 | **Navigation (F3 supersedes manual selection)** | P3.4-f, P9.1-a/b/d, P9.3-b (SUPERSEDED, see §4); P9.3-a, P3.4-g, P9.1-f | Menu and reveal | The user menu "CHOOSE TO RELEASE" is still visible, there is no `Show game menu` property (grep finds 0), and the reveal names the next game ("ONE MORE ▶ COOL THE VOLCANO") | No game picking for users. ThinkStill picks with no repeats until the group is played. Next / Again / New thought. Menu only as an owner property. | Implement F3 using `EosRouteGame` plus a persistent no-repeat rotation. Hide the menu behind the property and keep a test hook so `drive.mjs`/`eos_drive.mjs` keep working. | shared | F3 unit test (group size + 3 sessions) and UI test at V1/V2 |
| 12 | **Founder prompt** | P4.1-a, P4.1-b (MISSING) | First screen | Placeholder "Put your emotion, feeling or thought into words to release it." (L22413). The check-in title is "Who's at the controls?" | "What emotion are you carrying?" plus "Your thoughts are materialised to be released." | Composer prompt and supporting line. The check-in title waits on the C3 answer. | shared | Exact strings visible with the check-in on and off, V1/V2 |
| 13 | **Guide arrows (F6)** | P8.3-a (derived), P3.1-e | Many games (founder report) | Missing or pointing at the guide row | An arrow on the real next control at every stage, never over text or controls | Fix the target table in `src/eos/30_eos_arrows.jsx` (shared) | shared | arrowState + tap-advances sweep, ALL114, V1/V2 |
| 14 | **Finales work and are the game's own** | P11.1-a (PARTIAL), P11.2-a (MISSING), P11.2-c, P16-d/e, P11.1-d/e/i, P12.4-c | All | The burst mounts in every finished run, but 0.5-5.5 s after progress 100. All games use one burst (POP and UNHOOK even drew the same variant 106). No game-owned climax except RAIN OUT and 111-114. EOS finish work lands on the burst frame. | A unique game climax **before** the unchanged approved burst (founder decision 2026-10-09). The finale starts within 300 ms. No long task over 100 ms. | Pause EOS rAF loops and finish work during the burst (shared, now). Build a per-game climax with the Pilot A finale toolkit (**founder approval per batch**). | shared + game | H10 + H12 per game; H9 relative + device |
| 15 | **Safety: no amplified violent intent** | P18-b (MISSING) | All | "I want to hurt my boss John" launches POP and prints the sentence on the bubbles. At HEAD, `EOS_REAL_THREAT` (`00_eos_core.jsx` L405) needs the subject *before* the verb, and the card needs fear words or "… me", so threats against others are still not caught. | The gentle path with neutral words | Add a threat-to-others class (verb + person, role or name) to `EosSafetyScan` | shared | That input runs the safety path; no copy pairs the person with violent verbs |
| 16 | **Characters alive and progressing** | P7.2-a/b/c, P7.3-c, P7.1-b | Arcade games | Static faces with no per-gesture reaction; faces chosen by word chunk | React within 150 ms, at least 3 states, from loud to calm by progress | A shared reaction layer and progress-driven expression in the bubble component | shared | Per-step frame sampling, NAMED-a |
| 17 | **Game-specific P1 corrections** | P13.3-a CRUSH (no deformation; MISSING), P13.16-a VACUUM (2 columns, should be 1; MISSING), P13.29-b/a MAGIC TRAPDOOR (no door; MISSING), P13.20-b UNHOOK strings not attached (F1), P13.26-b CRACK spanner (F5), P13.26-c ZAP real zapper (F4), STOMP real boot (addendum; P13.26-a), P13.4-c/d/e/f RAIN OUT (text, images and objects not fully removed by the washout), P13.7-d JUGGLE exact how-to text (C18), P13.8-b KEEP/DROP picture, P13.9-a VOLUME KNOB ≥ 64 px with grip, P13.17-d SHRED strips + tear cue, P13.26-e BIN at V2, P13.16-e VACUUM travel, P13.19-g HOT POTATO text below | Named games | See each row | Founder text in Part 13 and F1/F4/F5 | Game work, reusing the shared bubble component and tool art | game | Each row's test in `gap_rows.json` |
| 18 | **Proof on real devices** | P22-g (MISSING), P15.2-a | Process | Headless only | Touch, audio, performance and responsiveness checked on named devices before any "complete" claim | An iPhone (Safari) and a mid-range Android (Chrome) run of FRONT + NAMED | process | Device log (model, OS, browser) |

### 3.3 P2 and P3 (kept short; full rows in `gap_rows.json`)

- **Console/feedback/idle (A):** safety card takes over the arena (P3.3-f, dock it as a sheet of 25% or less); reduced-motion idle (P10-f); 1-2 s toast hold (P3.3-c).
- **Vibe (A/G):** there is no Jolly/Cheeky/Unfiltered selector in Release, and there never was at `485500c` (P3.4-a, P17-a, P17-c MISSING). The host's `thinkstill-modes.json` has `vibePolicy USER_CHOICE`. A shared vibe setting plus vibe-keyed copy is needed. Intensity is unclear (P17-b, founder question).
- **Input (B):** fewer than 6 user chunks are padded with placeholders (P4.2-d). The rest is untested beyond POP (P4.1-e, P4.2-c/e/f).
- **Bubbles (C):** fewer than 5 bubbles for short inputs (P5.1-d, C12 exceptions); resting overlap at phone width in 1, 3, 4 (P5.1-e); CLEANSE as the measured reference (P5.6-b); the `bubbleTextPx` selector does not apply (P5.7-a); words under decals (P14-d).
- **Sharing (G):** SHARE calls `navigator.share` with no preview or confirm step (P19-b; `52_eos_rewards.jsx` L1160 shares first by design).
- **Audio and performance (E):** rain keeps playing after a switch or close (P9.2-c, P12.4-d); one AudioContext and stop EOS rAF loops at input (P15.2-c/d/e); Event Timing missing from `metrics.json` (P15.2-b); 70% coverage, centre and strobe checks not measured (P11.1-b/c, P11.4-b); action-specific cue kinds (P12.2-a).
- **Arc (D):** opening anticipation (P16-a); no benefit claimed before the user reports one (P16-g); escalation not measured (P16-c).
- **Game-specific P2/P3 (F, 70+ rows):** X-RAY hint should mention BURN ALL (P13.5-c); SCRATCH progress should follow coverage (P13.6-d/f); KEEP/DROP drag and text (P13.8-c/d); SPACE MAKER gaps (P13.11-a); COIN FLIP picture placement (P13.12-b, founder question); SINKING PLATFORM arrows and "Activate tool" (P13.18-a/b, C15); FLUSH lever and water cue (P13.24-a/b); TAP OUT credits wrong-order taps (P13.26-d); five different disappearances for STOMP/CRACK/ZAP/TAP OUT/BIN (P13.26-f, F7); ECHO overflow (P13.28-c); MELT vs BURN cues (P13.21-b). The many IMPLEMENTED-UNTESTED rows need the P5 suite or a founder H12 review, never an auto-claim.

---------------------------------------------------------------------------------------------------

## 4. Superseded instructions (7 rows)

| id | older instruction | newer founder decision (cited) | what replaces it (tracked under) |
|---|---|---|---|
| P3.4-f | Part 3 "Game navigation kept" | FEEDBACK_LOG **F3** (2026-10-09, reiterated: "don't show any options to select games — just let ThinkStill decide") + FOUNDER_REQUIREMENTS addendum L1613 | One Next from the rotation, Again, New thought; the menu only behind an owner property (§3.2 #11) |
| P9.1-a | Part 9 "Let ThinkStill choose" as a menu item | F3 + L1613: ThinkStill always picks | Composer Go launches the router pick with the no-repeat rotation |
| P9.1-b | Part 9: games can be picked by hand | F3 + L1613 | Owner/test property + test hook (`?menu=1` / `window.__eos`) |
| P9.1-d | Part 9: menu compact and discoverable | F3 + L1613 (no user-facing menu) | n/a once the menu is owner-only |
| P9.3-b | Part 9: contextual "Try <game>" | F3.6 forbids named "Try <GAME>" buttons | Unnamed Next from the rotation |
| P11.2-b | L614 "not the same burst in another colour" and L1611 "bursts must differ per game" | L1616 (2026-10-09, a9b97ca; CREATIVE_STANDARDS L66; F7 option a): **keep the approved burst exactly as is as the final beat; add a unique game climax BEFORE it** | P11.2-a (per-game climax) |
| P11.3-d | "Shared bursts get a per-game version" | Same L1616 / F7 decision | P11.2-a |

Still open founder questions from the conflict register:

- **C2**: which bursts count as "approved"?
- **C3**: should the check-in title adopt "What emotion are you carrying?", or should the check-in be off by default?
- **C5**: the reveal label mapping.
- **C11**: how UNHOOK's 6 chunks map onto 3 strings.
- **C12**: the exceptions to the 5-bubble rule.
- **C14**: which game "KNOB" means.
- **C15**: what "Activate tool" means for 103.
- **C17**: whether the label should be "Kill/Burn All".
- **P17-b**: what "intensity" means.
- **P13.12-b**: where COIN FLIP's picture goes.

---------------------------------------------------------------------------------------------------

## 5. Fix plan (ordered batches)

The rules for every batch:

- Play at 390×844 first, then 1280×860.
- Attach before and after tiles.
- Stage only the batch's own paths.
- Never change the burst code (`RewardSurgeBurst`, `wrappedDone`) or an approved mechanic.

| batch | what | fixes | where | founder approval? |
|---|---|---|---|---|
| **0. Undo the regressions** (shared EOS, about 1 day) | (a) EOS layers to opacity 0 while `.tsRewardSurge.mega` is mounted; bloom and chime after the burst (14_eos_mood, 12_eos_dots, 40_eos_checkin companion). (b) Remove the reveal-nav hide rule; ≤ 3 primaries (50_eos_shift L1481). (c) Still Moment's own breath sound (50_eos_shift L472). (d) Keep the how-it-works story with the check-in (40_eos_checkin L1239). (e) Phone header centred (10_eos_readability L306). (f) Revert the 105/106 picture shrink (10_eos_readability L239). (g) ZAP counter clear and glass. | R1-R8: 22 REGRESSION rows; also P11.1-d/e/i and P12.4-c (finale frame work) and P8.3-h | `src/eos/*` only | **No.** This restores the approved look. Approval is needed only to *keep* any overlay (C2, P11.3-e, P15.3-b). |
| **1. P0 blockers** | 47 UNFOLLOW (commit the in-flight plug fix and re-run), 34 at 390, 109 CLEANSE at V1, the VACUUM control hidden by the LIVE GUIDE (shared guide dock, F2), routing and rotation fed only from a fresh H1 pass list, then an ALL114 H1 sweep (V1, then V2, ≤ 25 per sweep). | P13.31-a/b/c, P13.2-c, P13.16-d, P3.1-e, P9.1-f, P8.3-i | game + shared (guide dock, router) | No |
| **2. One shared bubble component (F8)**: one change repairs most games | Default picture resolver for the legacy engines; `contain` framing with no scale-ups; no dark fills plus a lint guard; picture on top and text below inside the bubble, with the bubble growing; `aspect-ratio:1`; a 48 px minimum picture; expression driven by progress (negative to positive); per-game `.u<ID>` image overrides folded in. Also the round-robin upload distribution and the popup fixes. | P5.1-a/b/c/e, P5.2-a/c/d, P5.3-a/b, P5.4-a/b/c, P5.5-a/b/d/e/f, P5.6-a/c, P7.2-c, P7.3-b/c, P6.3-b/c, P6.1-a/d/e, P6.2-a, P6.4-b, P13.11-b, P13.19-d/g/h/j, P14-a, P3.1-j (about 45 games) | `00_arcade.jsx` L13/L14/L28 CSS, `expandUploadImageSlots`, bubble picture selectors; EOS readability floor | No, but the founder must check that the mechanics and bursts look unchanged |
| **3. Shared console rules** | F3 navigation (rotation, owner-only menu, Next / Again / New thought); founder prompt and supporting line; feedback toast bottom right for 1-2 s; 44 px hit boxes; guide arrows on real targets (F6, 30_eos_arrows); threat-to-others safety; share preview; audio stop on switch and one AudioContext; Event Timing in the sweep. | P3.4-f/g, P9.1-*, P9.3-a/b, P4.1-a/b, P3.3-a/c/d, P3.1-c/f, P8.3-a, P18-b, P19-b, P9.2-c, P12.4-d, P15.2-b/c/d/e, P3.2-d | shared | Only the C3 (check-in title/default) and C5 (labels) answers |
| **4. Game-specific founder corrections** | F1 UNHOOK (measured strings, one hook), F4 ZAP (real zapper + angry helper), F5 CRACK (spanner), the STOMP boot, CRUSH deformation, VACUUM single column and travel, MAGIC TRAPDOOR door, RAIN OUT full removal, HOT POTATO, JUGGLE text, X-RAY hint, SCRATCH coverage, KEEP/DROP, VOLUME KNOB, SPACE MAKER, FLUSH lever, SHRED strips and tear cue, MELT vs BURN cues, TAP OUT order. Uses the batch-2 component, so no new per-game bubble CSS. | P13.* rows tagged game | per game | Only where a mechanic changes (UNHOOK 6→3 is C11) |
| **5. Waits for founder approval** | A unique per-game climax *before* the unchanged burst (F7, Pilot A finale toolkit), shown in batches with recordings; designed twists (P16-d); keeping any EOS colour grade, flip bloom or lightened reveal overlay (12_eos_dots L1581); Pilot A rollout; the vibe source (host/Reset); C2/C11/C12/C14/C15/C17 answers. | P11.2-a/c, P16-d/e, P13.26-f, P11.3-e, P15.3-b, P23-a/c, P3.4-a, P17-a/c | game + shared | **Yes**, before anything ships |
| **6. Verification debt** | ALL114 H1 and overlap sweeps at V1/V2/V3; the P5 suite on every bubble game (0-6 uploads, long, empty, mic); real-device runs (iPhone Safari, Android Chrome) for touch, sound sync and frame rate; founder H12 reviews. | All IMPLEMENTED-UNTESTED rows, P21-b, P22.*, P26-a/b/d | process | n/a |

**How each fix is proven.**

- Each row in `gap_rows.json` names its `test`.
- A row moves to VERIFIED only when that test's output file or tile is linked.
- Sound and performance rows stay "scheduled/relative" until a device run exists.
